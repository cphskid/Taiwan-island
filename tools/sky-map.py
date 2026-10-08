# 天空港的東亞地圖：用 world-atlas（Natural Earth 1:50m，公有領域）的國界畫成遊戲風格的底圖，
# 順便輸出「哪裡是陸地」的格子（船不能開上陸地），寫進 src/data/skyLand.ts。
# 用法：npm pack world-atlas@2.0.2 && tar xzf world-atlas-2.0.2.tgz（拿到 package/countries-50m.json）
#      python3 tools/sky-map.py package/countries-50m.json
import sys, json, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

LON0, LON1, LAT0, LAT1 = 88, 158, -4, 44   # 範圍（要跟 src/data/sky.ts 一樣）
W = 2000
my = lambda lat: math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
Y0, Y1 = my(LAT1), my(LAT0)
H = round(W * (Y0 - Y1) / math.radians(LON1 - LON0))
def proj(lon, lat):
    return ((lon - LON0) / (LON1 - LON0) * W, (Y0 - my(max(-85, min(85, lat)))) / (Y0 - Y1) * H)

t = json.load(open(sys.argv[1]))
sc, tr = t['transform']['scale'], t['transform']['translate']
arcs = []
for a in t['arcs']:
    x = y = 0; pts = []
    for dx, dy in a:
        x += dx; y += dy; pts.append((x * sc[0] + tr[0], y * sc[1] + tr[1]))
    arcs.append(pts)
def ring(ids):
    out = []
    for i in ids:
        pts = arcs[i] if i >= 0 else arcs[~i][::-1]
        out.extend(pts[1:] if out else pts)
    return out
def polys(g):
    if g['type'] == 'Polygon': return [g['arcs']]
    if g['type'] == 'MultiPolygon': return g['arcs']
    return []

S = 2  # 先畫兩倍大再縮，邊比較圓滑
land = Image.new('L', (W * S, H * S), 0); dl = ImageDraw.Draw(land)
tw = Image.new('L', (W * S, H * S), 0); dt = ImageDraw.Draw(tw)
border = Image.new('L', (W * S, H * S), 0); db = ImageDraw.Draw(border)
for g in t['objects']['countries']['geometries']:
    is_tw = g['properties'].get('name') == 'Taiwan'
    for poly in polys(g):
        for k, r in enumerate(poly):
            pts = ring(r)
            if not any(LON0 - 5 < x < LON1 + 5 and LAT0 - 5 < y < LAT1 + 5 for x, y in pts): continue
            # 跨換日線的島切掉（這個範圍用不到）
            if max(x for x, _ in pts) - min(x for x, _ in pts) > 180: continue
            xy = [(px * S, py * S) for px, py in (proj(x, y) for x, y in pts)]
            dl.polygon(xy, fill=0 if k else 255)
            if is_tw: dt.polygon(xy, fill=0 if k else 255)
            db.line(xy + [xy[0]], fill=255, width=2 * S)
land = land.resize((W, H), Image.LANCZOS); tw = tw.resize((W, H), Image.LANCZOS); border = border.resize((W, H), Image.LANCZOS)
L = np.asarray(land, float) / 255; T = np.asarray(tw, float) / 255; B = np.asarray(border, float) / 255

# 海：外海深藍、靠岸淺藍
yy = np.linspace(0, 1, H)[:, None]
sea = np.dstack([np.full((H, W), 70.0) + 20 * yy, np.full((H, W), 160.0) + 25 * yy, np.full((H, W), 210.0) + 10 * yy])
halo = np.asarray(land.filter(ImageFilter.GaussianBlur(28)), float) / 255
sea = sea * (1 - halo[..., None] * 0.9) + np.array([140, 215, 230]) * (halo[..., None] * 0.9)
# 陸地：草綠，北邊偏黃、海岸亮一點；臺灣是暖黃
inner = np.asarray(land.filter(ImageFilter.GaussianBlur(10)), float) / 255
landc = np.dstack([170 + 40 * (1 - yy) + 0 * L, 210 + 0 * L - 10 * (1 - yy), 120 + 0 * L])
landc = landc * (0.85 + 0.15 * inner[..., None])
landc = landc * (1 - T[..., None]) + np.array([255, 205, 90]) * T[..., None]
img = sea * (1 - L[..., None]) + landc * L[..., None]
# 海岸線深一點、國界白線
edge = np.clip(L - np.asarray(land.filter(ImageFilter.MinFilter(5)), float) / 255, 0, 1)
img = img * (1 - edge[..., None] * 0.45) + np.array([60, 110, 70]) * (edge[..., None] * 0.45)
img = img * (1 - (B * L * 0.5)[..., None]) + 255 * (B * L * 0.5)[..., None]
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save('public/img/sky/map.webp', quality=85)

# 陸地格子：一格 10 地圖單位，「確定是陸地」才算（海岸邊留一點寬容）
CELL = 10
m = np.asarray(land.filter(ImageFilter.MinFilter(9)).resize((W // CELL, H // CELL), Image.BOX)) > 128
rows = []
for y in range(m.shape[0]):
    runs = []; x = 0
    while x < m.shape[1]:
        if m[y, x]:
            a = x
            while x < m.shape[1] and m[y, x]: x += 1
            runs.append(f'{a}-{x - 1}')
        else: x += 1
    if runs: rows.append(f'{y}:' + ','.join(runs))
open('src/data/skyLand.ts', 'w').write(f"""// 天空港地圖上哪裡是陸地（船不能開上去）。tools/sky-map.py 產生的，不要手改。
// 一格 {CELL} 地圖單位；格式「列:起-訖,起-訖;…」。
export const SKY_W = {W};
export const SKY_H = {H};
const CELL = {CELL};
const RAW = '{';'.join(rows)}';
const ROWS = new Map<number, [number, number][]>();
for (const row of RAW.split(';')) {{
  const [y, runs] = row.split(':');
  ROWS.set(+y, runs.split(',').map((r) => r.split('-').map(Number) as [number, number]));
}}
export function isLand(p: {{ x: number; y: number }}): boolean {{
  const runs = ROWS.get(Math.floor(p.y / CELL));
  const x = Math.floor(p.x / CELL);
  return !!runs?.some(([a, b]) => x >= a && x <= b);
}}
""")
print(W, H, len(rows))
