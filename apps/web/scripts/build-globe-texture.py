#!/usr/bin/env python3
"""
Builds the equirectangular earth texture used by the globe discovery view.

Input:  public/globe/countries-110m.json  (Natural Earth via world-atlas, public domain)
Output: public/globe/earth-texture.png    (2048x1024, Trevu palette)

The texture is generated rather than downloaded on purpose: it keeps the globe
on the brand palette (globals.css tokens), adds no third-party image licence to
the repo, and stays reproducible — re-run this script after changing colours.

    python3 scripts/build-globe-texture.py
"""

import json
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:
    sys.exit("Pillow is required: python3 -m pip install Pillow")

WIDTH, HEIGHT = 2048, 1024

# Trevu palette — styles/globals.css
OCEAN = (10, 17, 32)        # deeper than --deep-navy so land reads as raised
LAND = (30, 41, 59)         # --navy-800
BORDER = (51, 65, 85)       # slate border, one step above land
COASTLINE = (13, 148, 136)  # --trevu-teal, used at low alpha for the coast glow

ROOT = Path(__file__).resolve().parent.parent
TOPO_PATH = ROOT / "public" / "globe" / "countries-110m.json"
OUT_PATH = ROOT / "public" / "globe" / "earth-texture.png"


def decode_arcs(topology):
    """TopoJSON arcs are quantised and delta-encoded; return absolute lon/lat."""
    scale = topology["transform"]["scale"]
    translate = topology["transform"]["translate"]
    arcs = []
    for arc in topology["arcs"]:
        x = y = 0
        points = []
        for dx, dy in arc:
            x += dx
            y += dy
            points.append((x * scale[0] + translate[0], y * scale[1] + translate[1]))
        arcs.append(points)
    return arcs


def ring_coordinates(arc_indices, arcs):
    """Stitch a ring from its (possibly reversed) arc indices."""
    ring = []
    for index in arc_indices:
        if index < 0:
            points = arcs[~index][::-1]
        else:
            points = arcs[index]
        # Adjacent arcs share their endpoint — drop the duplicate.
        ring.extend(points[1:] if ring else points)
    return ring


def unwrap(ring):
    """Remove antimeridian jumps so a polygon stays continuous in x."""
    if not ring:
        return ring
    out = [ring[0]]
    offset = 0.0
    for (prev_lon, _), (lon, lat) in zip(ring, ring[1:]):
        delta = lon - prev_lon
        if delta > 180:
            offset -= 360
        elif delta < -180:
            offset += 360
        out.append((lon + offset, lat))
    return out


def project(ring):
    return [
        ((lon + 180.0) / 360.0 * WIDTH, (90.0 - lat) / 180.0 * HEIGHT)
        for lon, lat in ring
    ]


def polygons_of(geometry, arcs):
    """Yield (outer_ring, holes) pairs in projected pixel space."""
    kind = geometry.get("type")
    if kind == "Polygon":
        raw_polygons = [geometry["arcs"]]
    elif kind == "MultiPolygon":
        raw_polygons = geometry["arcs"]
    else:
        return

    for polygon in raw_polygons:
        rings = [project(unwrap(ring_coordinates(part, arcs))) for part in polygon]
        if rings:
            yield rings[0], rings[1:]


def main():
    if not TOPO_PATH.exists():
        sys.exit(f"Missing {TOPO_PATH}. Download world-atlas countries-110m.json first.")

    topology = json.loads(TOPO_PATH.read_text(encoding="utf-8"))
    arcs = decode_arcs(topology)
    geometries = topology["objects"]["countries"]["geometries"]

    image = Image.new("RGB", (WIDTH, HEIGHT), OCEAN)
    draw = ImageDraw.Draw(image)

    # Draw each polygon three times (-360°, 0°, +360°) so shapes crossing the
    # antimeridian appear on both edges instead of smearing across the map.
    offsets = (-WIDTH, 0, WIDTH)
    land_count = 0

    for geometry in geometries:
        for outer, holes in polygons_of(geometry, arcs):
            if len(outer) < 3:
                continue
            land_count += 1
            for offset in offsets:
                shifted = [(x + offset, y) for x, y in outer]
                if max(x for x, _ in shifted) < 0 or min(x for x, _ in shifted) > WIDTH:
                    continue
                draw.polygon(shifted, fill=LAND, outline=BORDER)
                for hole in holes:
                    if len(hole) >= 3:
                        draw.polygon([(x + offset, y) for x, y in hole], fill=OCEAN)

    # A one-pixel blur softens the 110m coastline at globe scale without
    # turning the continents into mush.
    image = image.filter(ImageFilter.GaussianBlur(0.6))

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUT_PATH, "PNG", optimize=True)
    size_kb = OUT_PATH.stat().st_size / 1024
    print(f"✓ {OUT_PATH.relative_to(ROOT)} — {WIDTH}x{HEIGHT}, {land_count} polygons, {size_kb:.0f} KB")


if __name__ == "__main__":
    main()
