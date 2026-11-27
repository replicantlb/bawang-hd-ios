#!/usr/bin/env python3
"""Prepare HD-2D 0.3.3 game files for the iPhone port."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
PATCHED = {
    "src/app.js": "11630b170ad4fa55a014f1e5499af1ac4087fe65e590721301aecfb6b7c43f6c",
    "src/tacticalhud.js": "d5347fa0b01aeb9fb0bcebc4939bdb807088b10010b9cc9de3fe4dcc9257c2e8",
}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def icon_catalog(stage, icon):
    catalog = stage / "AppIcon.xcassets"
    app_icon = catalog / "AppIcon.appiconset"
    app_icon.mkdir(parents=True)
    info = {"version": 1, "author": "xcode"}
    (catalog / "Contents.json").write_text(json.dumps({"info": info}) + "\n")
    item = {"filename": "AppIcon.png", "idiom": "universal", "platform": "ios", "size": "1024x1024"}
    (app_icon / "Contents.json").write_text(json.dumps({"images": [item], "info": info}) + "\n")
    # Keep artwork local. The title illustration also works for a fresh desktop copy.
    source = icon or stage / "app/assets/ai/title.webp"
    dimensions = subprocess.check_output(
        ["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(source)], text=True
    )
    width, height = [
        int(line.split()[-1]) for line in dimensions.splitlines()
        if line.strip().startswith(("pixelWidth:", "pixelHeight:"))
    ]
    side = str(min(width, height))
    output = app_icon / "AppIcon.png"
    subprocess.run(["sips", "-s", "format", "png", "-c", side, side, str(source), "--out", str(output)],
                   check=True, stdout=subprocess.DEVNULL)
    subprocess.run(["sips", "-z", "1024", "1024", str(output)], check=True, stdout=subprocess.DEVNULL)


def import_game(source, icon):
    manifest = dict(
        (name, checksum) for checksum, name in
        (line.split("  ", 1) for line in (TOOLS / "game-files.sha256").read_text().splitlines())
    )
    destination = ROOT / "unpacked"
    with tempfile.TemporaryDirectory(prefix=".hd-import-", dir=ROOT) as temporary:
        stage = Path(temporary) / "unpacked"
        game = stage / "app"
        for name, expected in manifest.items():
            original = source / name
            if not original.is_file():
                raise ValueError(f"原版资源缺失：{name}")
            copied = game / name
            copied.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(original, copied)
            if digest(copied) != expected:
                raise ValueError(f"资源与原版 0.3.3 (ee58a6ac) 不匹配：{name}")
        subprocess.run(["git", "apply", "--no-index", "--directory=app", str(TOOLS / "ios-controls.patch")],
                       cwd=stage, check=True)
        for name, expected in PATCHED.items():
            if digest(game / name) != expected:
                raise ValueError(f"iOS 触控补丁校验失败：{name}")
        icon_catalog(stage, icon)
        if destination.exists():
            expected_files = {f.relative_to(stage) for f in stage.rglob("*") if f.is_file()}
            existing_files = {f.relative_to(destination) for f in destination.rglob("*")
                              if f.is_file() and f.name != ".DS_Store"}
            if expected_files != existing_files or any(
                digest(stage / name) != digest(destination / name) for name in expected_files
            ):
                raise ValueError("现有 unpacked/ 内容有变化，请将它移至备份位置后重新导入。")
        else:
            os.rename(stage, destination)
    print(f"已核对 {len(manifest)} 个原版文件并应用 iOS 触控适配。")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("app", type=Path, help="原版游戏中含 index.html 的 app 目录")
    parser.add_argument("--icon", type=Path, help="可选的本地图标，建议 1024×1024 PNG")
    args = parser.parse_args()
    try:
        import_game(args.app.resolve(), args.icon.resolve() if args.icon else None)
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        sys.exit(str(error))
