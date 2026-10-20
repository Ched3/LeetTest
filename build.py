"""Build store-ready zips for Chrome and Firefox from this folder.

    python3 build.py            # both
    python3 build.py chrome     # Chrome Web Store zip only
    python3 build.py firefox    # Firefox add-ons zip (+ unpacked folder) only

manifest.json is the Chrome manifest, so "Load unpacked" in Chrome works with no warnings.
The Firefox build gets its own manifest:
  - background runs as an event page ("scripts"); Firefox doesn't support "service_worker"
  - adds browser_specific_settings.gecko (add-on ID, minimum version)
  - drops "sandbox", which Firefox doesn't support (sandbox.html then runs the bundled
    interpreter instead of eval; see scripts/sandbox-runner.js)

Output goes to ../dist/: a zip per browser, plus an unpacked firefox/ folder for
about:debugging -> Load Temporary Add-on.
"""
import argparse
import json
import os
import shutil
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(os.path.dirname(ROOT), "dist")
EXCLUDE_DIRS = {".git", "__pycache__", "node_modules"}
EXCLUDE_FILES = {".DS_Store", "build.py", ".gitignore"}

GECKO = {
    "id": "leet@test.com",
    "strict_min_version": "121.0",
}


def source_files():
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for name in filenames:
            if name in EXCLUDE_FILES or name == "manifest.json":
                continue
            full = os.path.join(dirpath, name)
            yield full, os.path.relpath(full, ROOT)


def firefox_manifest(chrome):
    m = json.loads(json.dumps(chrome))
    worker = m["background"]["service_worker"]
    m["background"] = {"scripts": [worker]}
    m.pop("sandbox", None)
    m["browser_specific_settings"] = {"gecko": GECKO}
    return m


def write_zip(path, manifest):
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("manifest.json", json.dumps(manifest, indent=2) + "\n")
        for full, rel in sorted(source_files(), key=lambda f: f[1]):
            z.write(full, rel)


def build_chrome(chrome, version):
    path = os.path.join(DIST, f"leettest-chrome-{version}.zip")
    write_zip(path, chrome)
    return [path]


def build_firefox(chrome, version):
    ff = firefox_manifest(chrome)
    path = os.path.join(DIST, f"leettest-firefox-{version}.zip")
    write_zip(path, ff)

    unpacked = os.path.join(DIST, "firefox")
    shutil.rmtree(unpacked, ignore_errors=True)
    for full, rel in source_files():
        os.makedirs(os.path.dirname(os.path.join(unpacked, rel)), exist_ok=True)
        shutil.copy2(full, os.path.join(unpacked, rel))
    with open(os.path.join(unpacked, "manifest.json"), "w") as f:
        json.dump(ff, f, indent=2)
    return [path, unpacked]


def main():
    parser = argparse.ArgumentParser(description="Build LeetTest for Chrome and/or Firefox.")
    parser.add_argument("target", nargs="?", choices=["chrome", "firefox", "all"], default="all")
    target = parser.parse_args().target

    with open(os.path.join(ROOT, "manifest.json")) as f:
        chrome = json.load(f)
    version = chrome["version"]
    os.makedirs(DIST, exist_ok=True)

    outputs = []
    if target in ("chrome", "all"):
        outputs += build_chrome(chrome, version)
    if target in ("firefox", "all"):
        outputs += build_firefox(chrome, version)

    for path in outputs:
        rel = os.path.relpath(path, os.path.dirname(ROOT))
        if os.path.isdir(path):
            print(f"{rel}/  (unpacked, for about:debugging)")
        else:
            print(f"{rel}  ({os.path.getsize(path) // 1024} KB)")


if __name__ == "__main__":
    main()
