# 全台大地圖（M-01）的程式資料：陸地遮罩、地區分界、高度場與地形眼鏡圖。
#
# 用法：python3 tools/make_world.py /mnt/project-files/art/island/M-01v2/M-01v2_map.png
# 產出 public/img/island/ 底下：
#   m01.webp          大地圖底圖（去背）
#   m01-relief.webp   地形眼鏡：分層設色＋等高線（只畫陸地頂面）
#   m01-regions.png   每個像素屬於哪一區（R 通道＝地區編號，0＝海或側面），1/8 解析度
# 地區種子與山脈的位置，用的是 M-01 第二版（北朝上，2680×3704）的像素座標，跟 src/data/world.ts 同一套。
import sys, json, numpy as np
from PIL import Image
from scipy import ndimage as nd

SRC = sys.argv[1]
OUT = 'public/img/island/'
im = np.array(Image.open(SRC).convert('RGBA')).astype(float)
H, W = im.shape[:2]
r, g, b, a = (im[..., i] for i in range(4))

# 陸地頂面：不透明、而且不是橘褐色的側面
land = a > 128
mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b)
side = land & (r - g > 45) & ((mx - mn) / (mx + 1e-6) > 0.35)
top = nd.binary_opening(land & ~side, iterations=3)
lab, n = nd.label(top)
top = nd.binary_fill_holes(lab == (np.argmax(nd.sum(top, lab, range(1, n + 1))) + 1))

# 地區：每個陸地像素歸最近的種子（種子編號＝地區編號）
REGIONS = json.load(open('src/data/world-seeds.json'))
seeds = [(s[0], s[1], i + 1) for i, reg in enumerate(REGIONS) for s in reg['seeds']]
S = 8
ys, xs = np.mgrid[0:H:S, 0:W:S]
best = np.full(xs.shape, 1e18); label = np.zeros(xs.shape, np.uint8)
for sx, sy, k in seeds:
    d = (xs - sx) ** 2 + (ys - sy) ** 2
    m = d < best; best[m] = d[m]; label[m] = k
small_top = top[::S, ::S]
label[~small_top] = 0
Image.fromarray(np.dstack([label, label, label]).astype(np.uint8), 'RGB').save(OUT + 'm01-regions.png', optimize=True)

# 高度場（公尺）：沿著山脈的稜線往兩邊降低，再乘上離海岸的距離，海邊是 0
RIDGES = json.load(open('src/data/world-ridges.json'))
R = 2
yy, xx = np.mgrid[0:H:R, 0:W:R].astype(float)
h = np.zeros(xx.shape)
for rd in RIDGES:
    pts = rd['line']
    for (x0, y0, e0), (x1, y1, e1) in zip(pts, pts[1:]):
        dx, dy = x1 - x0, y1 - y0
        t = np.clip(((xx - x0) * dx + (yy - y0) * dy) / (dx * dx + dy * dy), 0, 1)
        d = np.hypot(xx - (x0 + t * dx), yy - (y0 + t * dy))
        e = e0 + (e1 - e0) * t
        h = np.maximum(h, e * np.exp(-(d / rd['width']) ** 2))
rng = np.random.default_rng(5)
noise = nd.gaussian_filter(rng.standard_normal(h.shape), 20)
noise /= np.abs(noise).max()
h = h * (1 + 0.25 * noise) + 30 * (noise + 1)
t2 = top[::R, ::R]
coast = nd.distance_transform_edt(t2)
h *= np.clip(coast / 40, 0, 1)
h = nd.gaussian_filter(h, 5)
h[~t2] = 0

LEVELS = [100, 500, 1000, 2000, 3000]  # 等高線，跟 world.ts 的 LEGEND 一樣
COLORS = [(124, 196, 106), (180, 212, 107), (228, 215, 125), (233, 184, 102), (207, 139, 79), (168, 101, 60)]
band = np.digitize(h, LEVELS)
rgb = np.array(COLORS, float)[band]
gy, gx = np.gradient(h)
grad = np.hypot(gx, gy) + 1e-6
line = np.zeros(h.shape)
for L in LEVELS:
    line = np.maximum(line, np.clip(1.4 - np.abs(h - L) / grad, 0, 1))
ink = np.array([90, 58, 28], float)
rgb = rgb * (1 - line[..., None]) + ink * line[..., None]
alpha = np.where(t2, 225, 0)
Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8), 'RGBA').save(OUT + 'm01-relief.webp', quality=82)
Image.fromarray(im.astype(np.uint8), 'RGBA').save(OUT + 'm01.webp', quality=82)
print('regions', label.shape, 'relief', h.shape, 'max', int(h.max()))
