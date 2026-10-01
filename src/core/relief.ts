// 地形眼鏡的「彎彎曲曲」版本：把每格一個整數的高度，變成一張平滑的高度場，
// 再畫成分層設色加等高線。純函式，不碰畫面；畫面只把算好的像素貼到地圖上。
//
// 規則還是看每格的整數高度（格子中心的顏色就是那格的高度），
// 只是格子和格子之間用平滑的方式接起來，等高線才會像課本的地形圖一樣彎曲。

import type { Heights } from './terrain';

const smooth = (t: number) => t * t * (3 - 2 * t);

// 高度場：(u,v) 用格子座標，格子 (col,row) 的中心在 (col,row)
export function fieldAt(h: Heights, cols: number, rows: number, u: number, v: number): number {
  const cu = Math.max(0, Math.min(cols - 1, u));
  const cv = Math.max(0, Math.min(rows - 1, v));
  const c0 = Math.min(cols - 2, Math.floor(cu)), r0 = Math.min(rows - 2, Math.floor(cv));
  const c1 = Math.max(0, c0), r1 = Math.max(0, r0);
  const fu = cols > 1 ? smooth(cu - c1) : 0, fv = rows > 1 ? smooth(cv - r1) : 0;
  const at = (c: number, r: number) => h({ col: Math.min(cols - 1, c), row: Math.min(rows - 1, r) });
  const top = at(c1, r1) * (1 - fu) + at(c1 + 1, r1) * fu;
  const bot = at(c1, r1 + 1) * (1 - fu) + at(c1 + 1, r1 + 1) * fu;
  let f = top * (1 - fv) + bot * fv;
  // 一點點自然的起伏；越靠近格子中心越小，中心的高度不變
  const du = u - Math.round(u), dv = v - Math.round(v);
  const k = Math.min(1, (du * du + dv * dv) * 4);
  f += 0.28 * k * (Math.sin(u * 1.7 + v * 0.9) * 0.5 + Math.sin(v * 2.3 - u * 1.1 + 1.3) * 0.5);
  return f;
}

// 算出一張 RGBA 圖：每格 res×res 像素，分層設色＋等高線（線粗大約固定，坡越陡線越密）
export function reliefPixels(h: Heights, cols: number, rows: number, res: number, bands: readonly number[], line: number) {
  const W = cols * res, H = rows * res;
  const f = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) f[y * W + x] = fieldAt(h, cols, rows, (x + 0.5) / res - 0.5, (y + 0.5) / res - 0.5);
  const px = new Uint8ClampedArray(W * H * 4);
  const lr = (line >> 16) & 255, lg = (line >> 8) & 255, lb = line & 255;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const v = f[i];
      const band = bands[Math.max(0, Math.min(bands.length - 1, Math.round(v)))];
      // 離最近的等高線（k+0.5）多遠，除以坡度換成像素距離
      const gx = (f[y * W + Math.min(W - 1, x + 1)] - f[y * W + Math.max(0, x - 1)]) / 2;
      const gy = (f[Math.min(H - 1, y + 1) * W + x] - f[Math.max(0, y - 1) * W + x]) / 2;
      const g = Math.hypot(gx, gy) || 1e-6;
      const off = Math.abs(v + 0.5 - Math.round(v + 0.5));
      const a = Math.max(0, Math.min(1, 1.6 - off / g));
      const r = (band >> 16) & 255, gg = (band >> 8) & 255, b = band & 255;
      px[i * 4] = r + (lr - r) * a;
      px[i * 4 + 1] = gg + (lg - gg) * a;
      px[i * 4 + 2] = b + (lb - b) * a;
      px[i * 4 + 3] = 255;
    }
  return { width: W, height: H, data: px };
}
