# 霸王的大陆 HD-2D · iPhone 移植版

把《霸王的大陆 HD-2D》试玩版装到 iPhone 上，横屏点选城池、拖动地图，在支持缩放的视图中双指捏合。战略图和战地图还提供「＋」「−」按钮；可取消当前选择时会出现「返回」。进入白兵战后，点「开始交战」即可开打。

iOS 移植版本为 **0.3.4（build 4）**，对应桌面试玩版 **0.3.3**，游戏构建标识为 `ee58a6ac`。应用使用 Swift、WKWebView 和设备内的回环 HTTP 服务加载游戏。地图、美术、字体和音频随本地构建打包，游玩时可离线。存档保存在这份应用的 WebKit 数据中。想保留进度，更新时请沿用相同的签名团队和 Bundle Identifier，直接覆盖安装。

## 从原版资源构建

需要 macOS、Xcode、Python 3 和一份自己持有的上述桌面试玩版游戏资源。目标设备为 iOS 17 或更高版本的 iPhone。仓库提供原生外壳、触控补丁和资源校验清单。美术、音乐、字体与原版程序需从本地导入，相关权利归各自权利人。

1. 找到原版游戏中同时含有 `index.html`、`src/`、`assets/` 和 `vendor/` 的 `app/` 目录。如果发行包使用 Electron 的 `resources/app.asar`，先用 ASAR 解包工具提取它，再选择解包后的 `app/` 子目录。
2. 在仓库根目录执行下面两行命令，将示例路径换成原版资源的实际位置。脚本逐个核对 2,944 个文件，应用两处触控补丁，并从本地标题图生成应用图标。如需沿用已有 iOS 图标，可在第一行末尾加上 `--icon "/path/to/AppIcon.png"`。

   ```sh
   python3 tools/import_game.py "/path/to/original/app"
   open ios/BawangHD2DiOS.xcodeproj
   ```

3. 在 Xcode 选择 `BawangHD2DiOS` target，打开 **Signing & Capabilities**，选择自己的 Team。如果默认 Bundle Identifier 已被占用，改用自己可签名的标识。
4. 接入 iPhone，选它作为运行设备，点击 **Run**。首次通过 Xcode 安装时，请按设备提示完成信任并启用开发者模式。

如果只想验证构建，可在导入资源后执行以下命令。它生成面向 iPhone 的未签名 Release 包。

```sh
xcodebuild -project ios/BawangHD2DiOS.xcodeproj -scheme BawangHD2DiOS \
  -configuration Release -destination 'generic/platform=iOS' \
  -derivedDataPath build CODE_SIGNING_ALLOWED=NO build
```

## English

**BaWang HD-2D for iPhone** adapts desktop demo 0.3.3 (`ee58a6ac`) for landscape touch play. Tap to select a city, drag to move the map, and pinch or use the zoom buttons where available. Game content is bundled locally and saves stay in the app’s WebKit storage.

To build port **0.3.4 (4)**, use macOS with Xcode and Python 3. Supply your own copy of the original demo’s `app/` folder. Run the import command above, open the Xcode project, select your development team and an iPhone running iOS 17 or later, then click **Run**. The importer checks 2,944 original files before applying the touch adaptations. Keep your signing team and bundle identifier when installing an update over an existing game.
