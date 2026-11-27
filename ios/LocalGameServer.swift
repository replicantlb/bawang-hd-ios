import Foundation
import Network
import UniformTypeIdentifiers

// The fixed loopback origin supports ES modules, fetch, media seeking and persistent WebKit storage.
final class LocalGameServer {
    static let authority = "127.0.0.1:53687"
    static let entry = URL(string: "http://\(authority)/index.html")!

    private let root: URL
    private let queue = DispatchQueue(label: "local.bawang.hd2d.content")
    private let listener: NWListener

    init(root: URL) throws {
        self.root = root.resolvingSymlinksInPath()
        let parameters = NWParameters.tcp
        parameters.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: 53687)
        listener = try NWListener(using: parameters)
    }

    func start(_ stateChanged: @escaping (NWListener.State) -> Void) {
        listener.stateUpdateHandler = stateChanged
        listener.newConnectionHandler = { [weak self] connection in
            guard let self else { connection.cancel(); return }
            connection.start(queue: self.queue)
            self.queue.asyncAfter(deadline: .now() + 15) { [weak connection] in connection?.cancel() }
            self.receive(connection, buffer: Data())
        }
        listener.start(queue: queue)
    }

    deinit { listener.cancel() }

    private func receive(_ connection: NWConnection, buffer: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 16_384) { [weak self] data, _, complete, error in
            guard let self, error == nil else { connection.cancel(); return }
            var request = buffer
            request.append(data ?? Data())
            if let end = request.range(of: Data("\r\n\r\n".utf8)), end.upperBound <= 16_384,
               let header = String(data: request[..<end.lowerBound], encoding: .utf8) {
                self.serve(header, on: connection)
            } else if request.count >= 16_384 || complete {
                connection.cancel()
            } else {
                self.receive(connection, buffer: request)
            }
        }
    }

    private func serve(_ header: String, on connection: NWConnection) {
        let lines = header.components(separatedBy: "\r\n")
        let request = lines[0].split(separator: " ")
        let headers = lines.dropFirst().reduce(into: [String: String]()) { values, line in
            let pair = line.split(separator: ":", maxSplits: 1)
            if pair.count == 2 {
                values[pair[0].lowercased()] = pair[1].trimmingCharacters(in: .whitespaces)
            }
        }
        guard request.count == 3, headers["host"] == Self.authority,
              request[0] == "GET" || request[0] == "HEAD" else {
            send("400 Bad Request", connection: connection)
            return
        }
        guard let file = resource(String(request[1])),
              let attributes = try? FileManager.default.attributesOfItem(atPath: file.path),
              attributes[.type] as? FileAttributeType == .typeRegular,
              let length = (attributes[.size] as? NSNumber)?.intValue else {
            send("404 Not Found", connection: connection)
            return
        }

        let part: Range<Int>
        var fields = ["Content-Type": contentType(file), "Accept-Ranges": "bytes"]
        let status: String
        if let range = headers["range"] {
            guard let selection = bytes(range, length: length) else {
                send("416 Range Not Satisfiable", headers: ["Content-Range": "bytes */\(length)"], connection: connection)
                return
            }
            part = selection
            status = "206 Partial Content"
            fields["Content-Range"] = "bytes \(part.lowerBound)-\(part.upperBound - 1)/\(length)"
        } else {
            part = 0..<length
            status = "200 OK"
        }
        fields["Content-Length"] = String(part.count)
        if request[0] == "HEAD" {
            send(status, headers: fields, connection: connection)
            return
        }
        do {
            let handle = try FileHandle(forReadingFrom: file)
            defer { try? handle.close() }
            try handle.seek(toOffset: UInt64(part.lowerBound))
            let body = try handle.read(upToCount: part.count) ?? Data()
            guard body.count == part.count else { throw CocoaError(.fileReadUnknown) }
            send(status, headers: fields, body: body, connection: connection)
        } catch {
            send("500 Internal Server Error", connection: connection)
        }
    }

    private func resource(_ target: String) -> URL? {
        guard target.hasPrefix("/"), !target.hasPrefix("//"),
              let parts = URLComponents(string: target),
              let path = parts.percentEncodedPath.removingPercentEncoding,
              !path.contains("\\"), !path.contains("\0") else { return nil }
        let segments = path.split(separator: "/")
        guard !segments.contains(where: { $0 == "." || $0 == ".." }) else { return nil }
        let relative = segments.isEmpty ? "index.html" : segments.joined(separator: "/")
        let file = root.appendingPathComponent(relative).resolvingSymlinksInPath()
        return file.path.hasPrefix(root.path + "/") ? file : nil
    }

    private func bytes(_ header: String, length: Int) -> Range<Int>? {
        guard length > 0, header.hasPrefix("bytes=") else { return nil }
        let bounds = header.dropFirst(6).split(separator: "-", maxSplits: 1, omittingEmptySubsequences: false)
        guard bounds.count == 2 else { return nil }
        if bounds[0].isEmpty {
            guard let suffix = Int(bounds[1]), suffix > 0 else { return nil }
            return (length - min(suffix, length))..<length
        }
        guard let start = Int(bounds[0]), start >= 0, start < length else { return nil }
        guard !bounds[1].isEmpty else { return start..<length }
        guard let end = Int(bounds[1]), end >= start else { return nil }
        return start..<(min(end, length - 1) + 1)
    }

    private func contentType(_ file: URL) -> String {
        switch file.pathExtension.lowercased() {
        case "html": return "text/html; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "js": return "text/javascript; charset=utf-8"
        case "json": return "application/json"
        case "glb": return "model/gltf-binary"
        case "woff2": return "font/woff2"
        default: return UTType(filenameExtension: file.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
        }
    }

    private func send(_ status: String, headers: [String: String] = [:], body: Data = Data(), connection: NWConnection) {
        let policy = "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; form-action 'none'; base-uri 'none'"
        var response = "HTTP/1.1 \(status)\r\nConnection: close\r\nCache-Control: no-cache\r\nContent-Security-Policy: \(policy)\r\nX-Content-Type-Options: nosniff\r\n"
        if headers["Content-Length"] == nil { response += "Content-Length: \(body.count)\r\n" }
        for (name, value) in headers { response += "\(name): \(value)\r\n" }
        var packet = Data((response + "\r\n").utf8)
        packet.append(body)
        connection.send(content: packet, isComplete: true, completion: .contentProcessed { _ in connection.cancel() })
    }
}
