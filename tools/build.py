#!/usr/bin/env python3
"""Build dist/index.html: inject data/map.json into src/index.template.html."""
import pathlib, sys, json, os, subprocess, datetime
root = pathlib.Path(__file__).resolve().parent.parent
tpl = (root / "src" / "index.template.html").read_text(encoding="utf-8")
data = (root / "data" / "map.json").read_text(encoding="utf-8")
json.loads(data)  # fail early if the map data is not valid JSON
if "/*MAPDATA*/" not in tpl:
    sys.exit("template has no /*MAPDATA*/ marker")
def sha():
    for k in ("WORKERS_CI_COMMIT_SHA", "GITHUB_SHA", "CF_PAGES_COMMIT_SHA"):
        if os.environ.get(k):
            return os.environ[k][:7]
    try:
        return subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], cwd=root, stderr=subprocess.DEVNULL).decode().strip()
    except Exception:
        return "nogit"
ver = json.loads((root / "package.json").read_text())["version"]
stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%MZ")
info = f"v{ver} {sha()} {stamp}"
hyd = root / "data" / "hydrants.local.json"
html = tpl.replace("/*MAPDATA*/", data).replace("/*BUILDINFO*/dev", info)
if hyd.exists():
    h = json.loads(hyd.read_text(encoding="utf-8"))
    for k, key in (("fps", "FPS"), ("m", "M"), ("g", "G"), ("e", "E")):
        html = html.replace("/*HYD_%s*/[]" % key, json.dumps(h[k], separators=(",", ":")))
    print("hydrant layer: included (data/hydrants.local.json)")
else:
    print("hydrant layer: not found, building without hydrants (see NOTICE.md)")
out = root / "dist" / "index.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding="utf-8")
(out.parent / "_headers").write_text("/*\n  Cache-Control: no-cache\n", encoding="utf-8")
print("build info:", info)
print(f"built {out} ({out.stat().st_size/1e6:.2f} MB)")
