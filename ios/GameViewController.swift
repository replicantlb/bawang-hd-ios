import UIKit
import WebKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
        guard let scene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: scene)
        window.rootViewController = GameViewController()
        window.makeKeyAndVisible()
        self.window = window
    }
}

final class GameViewController: UIViewController, WKNavigationDelegate {
    private var server: LocalGameServer?
    private var web: WKWebView!
    private let status = UILabel()
    private let retry = UIButton(type: .system)
    private var attempt: UUID?

    override var prefersStatusBarHidden: Bool { true }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .landscape }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        let settings = WKWebViewConfiguration()
        settings.websiteDataStore = .default()
        settings.defaultWebpagePreferences.preferredContentMode = .mobile
        settings.allowsInlineMediaPlayback = true
        settings.mediaTypesRequiringUserActionForPlayback = []
        let bridge = settings.userContentController
        bridge.add(GameStatusBridge(self), name: "gameStatus")
        if let url = Bundle.main.url(forResource: "mobile", withExtension: "js"),
           let source = try? String(contentsOf: url, encoding: .utf8) {
            bridge.addUserScript(.init(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        web = WKWebView(frame: .zero, configuration: settings)
        web.navigationDelegate = self
        web.isOpaque = false
        web.backgroundColor = .black
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.scrollView.bounces = false
        web.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(web)

        status.textColor = .white
        status.textAlignment = .center
        status.numberOfLines = 0
        retry.setTitle("重试", for: .normal)
        retry.addAction(UIAction { [weak self] _ in self?.loadGame() }, for: .touchUpInside)
        let message = UIStackView(arrangedSubviews: [status, retry])
        message.axis = .vertical
        message.alignment = .center
        message.spacing = 8
        message.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(message)

        let safe = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            web.leadingAnchor.constraint(equalTo: safe.leadingAnchor),
            web.trailingAnchor.constraint(equalTo: safe.trailingAnchor),
            web.topAnchor.constraint(equalTo: safe.topAnchor),
            web.bottomAnchor.constraint(equalTo: safe.bottomAnchor),
            message.centerXAnchor.constraint(equalTo: safe.centerXAnchor),
            message.centerYAnchor.constraint(equalTo: safe.centerYAnchor),
            message.widthAnchor.constraint(lessThanOrEqualTo: safe.widthAnchor, multiplier: 0.9),
        ])
        loadGame()
    }

    private func loadGame() {
        let token = UUID()
        attempt = token
        status.text = "正在载入游戏…"
        status.isHidden = false
        retry.isHidden = true
        web.stopLoading()
        guard let root = Bundle.main.url(forResource: "app", withExtension: nil) else {
            failed("找不到游戏文件。")
            return
        }
        if server != nil {
            web.load(URLRequest(url: LocalGameServer.entry, cachePolicy: .reloadIgnoringLocalCacheData))
        } else {
            do {
                let server = try LocalGameServer(root: root)
                self.server = server
                server.start { [weak self] state in
                    DispatchQueue.main.async {
                        guard let self, self.attempt == token else { return }
                        switch state {
                        case .ready:
                            self.web.load(URLRequest(url: LocalGameServer.entry, cachePolicy: .reloadIgnoringLocalCacheData))
                        case .failed:
                            self.server = nil
                            self.failed("无法读取本机的游戏文件。")
                        default: break
                        }
                    }
                }
            } catch {
                failed("无法读取本机的游戏文件。")
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 45) { [weak self] in
            guard let self, self.attempt == token else { return }
            self.failed("游戏载入时间过长。")
        }
    }

    private func failed(_ message: String) {
        attempt = nil
        status.text = message
        status.isHidden = false
        retry.isHidden = false
    }

    func acceptStatus(_ details: [String: Any]) {
        #if DEBUG
        if let data = try? JSONSerialization.data(withJSONObject: details),
           let cache = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first {
            try? data.write(to: cache.appendingPathComponent("HD2DBoot.json"), options: .atomic)
        }
        #endif
        if details["state"] as? String == "ready" {
            attempt = nil
            status.isHidden = true
            retry.isHidden = true
        } else if details["state"] as? String == "error", attempt != nil {
            failed("游戏未能载入。")
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        let url = navigationAction.request.url
        let local = url?.scheme == "http" && url?.host == "127.0.0.1" && url?.port == 53687
        decisionHandler(local ? .allow : .cancel)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code != NSURLErrorCancelled { failed("游戏页面未能打开。") }
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        failed("游戏画面已中断。")
    }
}

private final class GameStatusBridge: NSObject, WKScriptMessageHandler {
    weak var controller: GameViewController?

    init(_ controller: GameViewController) { self.controller = controller }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, let details = message.body as? [String: Any] else { return }
        controller?.acceptStatus(details)
    }
}
