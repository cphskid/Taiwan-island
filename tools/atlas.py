# tools/atlas.mjs 叫的：從 stdin 讀 {章: [圖名...]}，每章打包成一張 webp 圖集＋atlas.json（每張小圖的位置和原圖 md5）
import hashlib, json, os, sys
from PIL import Image

SRC = 'public/img/island'
OUT = f'{SRC}/atlas'
MAX_W = 2048  # 一列最寬多少；iPad 貼圖上限 4096，高度超過就分第二張
MAX_H = 4096
QUALITY = int(os.environ.get('Q', 90))  # 90：跟原圖差不多大、看不出差別
PAD = 2       # 小圖之間留透明邊，放大縮小時才不會沾到隔壁

groups = json.load(sys.stdin)
path = lambda n: f'public/img/{n}.webp' if '/' in n else f'{SRC}/{n}.webp'  # 跟 data/world.ts 的 isl() 一樣
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    os.remove(f'{OUT}/{f}')

def pack(items):
    # 由高到矮排成一列一列（shelf）；超過 MAX_H 就開新的一張
    pages, page, x, y, row = [], [], 0, 0, 0
    for name, im in sorted(items, key=lambda t: (-t[1].height, t[0])):
        w, h = im.width + PAD * 2, im.height + PAD * 2
        if x + w > MAX_W:
            x, y, row = 0, y + row, 0
        if y + h > MAX_H:
            pages.append(page); page, x, y, row = [], 0, 0, 0
        page.append((name, im, x + PAD, y + PAD))
        x += w; row = max(row, h)
    if page: pages.append(page)
    return pages

out, total_in, total_out = {}, 0, 0
for gid, names in groups.items():
    items = []
    for n in names:
        p = path(n)
        if not os.path.exists(p):
            print(f'  {gid}: 找不到 {p}，跳過'); continue
        total_in += os.path.getsize(p)
        items.append((n, Image.open(p).convert('RGBA')))
    pages = []
    for i, page in enumerate(pack(items)):
        w = max(x + im.width for _, im, x, _y in page) + PAD
        h = max(y + im.height for _, im, _x, y in page) + PAD
        sheet = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        frames = {}
        for n, im, x, y in page:
            sheet.paste(im, (x, y))
            md5 = hashlib.md5(open(path(n), 'rb').read()).hexdigest()[:12]
            frames[n] = [x, y, im.width, im.height, md5]
        file = f'{gid}-{i}.webp' if i else f'{gid}.webp'
        sheet.save(f'{OUT}/{file}', 'WEBP', quality=QUALITY, method=6)
        total_out += os.path.getsize(f'{OUT}/{file}')
        pages.append({'file': file, 'frames': frames})
        print(f'  {gid}: {file} {w}x{h}，{len(frames)} 張，{os.path.getsize(f"{OUT}/{file}") // 1024}KB')
    out[gid] = pages
json.dump(out, open(f'{OUT}/atlas.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(f'原圖 {total_in // 1024}KB → 圖集 {total_out // 1024}KB')
