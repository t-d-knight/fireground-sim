#!/usr/bin/env python3
"""Build dist/index.html: inject data/map.json into src/index.template.html."""
import pathlib, sys, json
root = pathlib.Path(__file__).resolve().parent.parent
tpl = (root / "src" / "index.template.html").read_text(encoding="utf-8")
data = (root / "data" / "map.json").read_text(encoding="utf-8")
json.loads(data)  # fail early if the map data is not valid JSON
if "/*MAPDATA*/" not in tpl:
    sys.exit("template has no /*MAPDATA*/ marker")
hyd = root / "data" / "hydrants.local.json"
html = tpl.replace("/*MAPDATA*/", data)
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
print(f"built {out} ({out.stat().st_size/1e6:.2f} MB)")
