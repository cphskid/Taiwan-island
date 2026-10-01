// 遊戲盤：用 PixiJS 畫等角格子。只讀狀態、不做判斷（規則在 core）。
//
// 地面、水、小物目前是程式畫的佔位，Chuck 的 S-04 底圖與 T、O 系列到了再換成圖。
// 觸控：單指拖曳平移、雙指縮放、點一下選格子；拖竹蛇籠由介面層（BoardView）用 cellAt/setHover 處理。
// 地形眼鏡：開了才疊上分層設色與等高線；格子線只在拖放時出現。

import { Application, Container, Graphics } from 'pixi.js';
import { boardBounds, cellToScreen, drawOrder, screenToCell, inside, TILE_H, TILE_W, type Cell } from '../core/iso';
import { bandColor, contourEdges, type Heights } from '../core/terrain';
import { fitView, panBy, zoomAt, type View } from '../core/camera';
import type { Piece } from '../core/pieces';
import type { Terrain } from '../data/babao-preview';

const SIDE = 14; // 方塊側面的厚度（px）
const TAP_SLOP = 8; // 手指移動超過這麼多 px 就不算點一下

// 色盤照美術提示詞文件（KV-01 近似值）
const TOP: Record<Terrain, number> = {
  grass: 0x6cc94b, field: 0x9bd35a, bamboo: 0x5bb544, stone: 0xe8dcc4, village: 0x7fd05a, river: 0x8d7a55,
};
const WATER_LO = 0x7fa7a3; // 濁水溪：帶泥沙的灰綠水色，在兩色之間起伏
const WATER_HI = 0xa9c9bf;
const EARTH_L = 0xa86f3d;
const EARTH_R = 0x8a5429;
const CONTOUR = 0x5a3a1c;
const GOLD = 0xffc23d;

export interface BoardOptions {
  cols: number;
  rows: number;
  terrain: (c: Cell) => Terrain;
  heights: Heights;
  onTap?: (c: Cell | null) => void;
  // 手指按下時先問介面要不要接手（例如按在竹蛇籠上就改成拖它）；回傳 true 就不平移地圖
  onPress?: (c: Cell, e: PointerEvent) => boolean;
}

export interface Board {
  fps: () => number;
  cellAt: (clientX: number, clientY: number) => Cell | null;
  setPieces: (list: readonly Piece[], selected: number | null) => void;
  setHover: (c: Cell | null, ok: boolean) => void;
  setGrid: (on: boolean) => void;
  setContours: (on: boolean) => void;
  destroy: () => void;
}

const V = { top: [0, -TILE_H / 2], right: [TILE_W / 2, 0], bottom: [0, TILE_H / 2], left: [-TILE_W / 2, 0] } as const;

function diamond(g: Graphics, x: number, y: number, k = 1) {
  g.poly([x, y - (TILE_H / 2) * k, x + (TILE_W / 2) * k, y, x, y + (TILE_H / 2) * k, x - (TILE_W / 2) * k, y]);
}

function block(g: Graphics, x: number, y: number, top: number) {
  // 左側面、右側面、頂面
  g.poly([x - TILE_W / 2, y, x, y + TILE_H / 2, x, y + TILE_H / 2 + SIDE, x - TILE_W / 2, y + SIDE]).fill(EARTH_L);
  g.poly([x + TILE_W / 2, y, x, y + TILE_H / 2, x, y + TILE_H / 2 + SIDE, x + TILE_W / 2, y + SIDE]).fill(EARTH_R);
  diamond(g, x, y);
  g.fill(top).stroke({ width: 2, color: 0xffffff, alpha: 0.25 });
}

// 格子上的佔位小物（竹子、石頭、房子、田畦），之後換成 O 系列的圖
function prop(g: Graphics, t: Terrain, x: number, y: number) {
  if (t === 'field') {
    for (let i = -2; i <= 2; i++) {
      const dx = i * 14, dy = i * 7;
      g.moveTo(x + dx - 22, y + dy + 11).lineTo(x + dx + 22, y + dy - 11);
    }
    g.stroke({ width: 3, color: 0x4f9a35, alpha: 0.7 });
  } else if (t === 'bamboo') {
    for (const [dx, h] of [[-18, 52], [0, 64], [16, 46], [-6, 40]] as const) {
      g.roundRect(x + dx - 4, y - h, 8, h, 4).fill(0x3f9a3a);
      g.ellipse(x + dx, y - h, 12, 8).fill(0x58c24a);
    }
  } else if (t === 'stone') {
    for (const [dx, dy, r] of [[-14, 2, 12], [10, -4, 14], [2, 10, 10], [20, 8, 8]] as const)
      g.ellipse(x + dx, y + dy, r, r * 0.75).fill(0x9a9a94).stroke({ width: 2, color: 0x6e6e68 });
  } else if (t === 'village') {
    g.poly([x - 26, y - 6, x + 6, y - 22, x + 6, y + 2, x - 26, y + 18]).fill(0xd9805a);
    g.poly([x + 6, y - 22, x + 30, y - 10, x + 30, y + 14, x + 6, y + 2]).fill(0xb86040);
    g.poly([x - 30, y - 8, x + 4, y - 44, x + 34, y - 12, x + 6, y - 24]).fill(0x7a7f8c);
  }
}

// dir 對應的畫面方向（單位向量）：0 朝 col+1（右下）、1 朝 row+1（左下）、2 左上、3 右上
const DIRS: [number, number][] = [[0.894, 0.447], [-0.894, 0.447], [-0.894, -0.447], [0.894, -0.447]];

// 竹蛇籠佔位：躺在格子上的長籠子，金色箭頭是擋水面朝的方向
function cage(g: Graphics, p: Piece, selected: boolean) {
  const { x, y } = cellToScreen(p.cell);
  const [fx, fy] = DIRS[p.dir];
  const [ax, ay] = DIRS[(p.dir + 1) % 4]; // 籠身和擋水面垂直
  const L = 44;
  if (selected) {
    diamond(g, x, y, 0.92);
    g.stroke({ width: 5, color: GOLD });
  }
  g.ellipse(x, y + 6, 46, 16).fill({ color: 0x000000, alpha: 0.18 });
  g.moveTo(x - ax * L, y - ay * L - 10).lineTo(x + ax * L, y + ay * L - 10).stroke({ width: 26, color: 0xc9b25a, cap: 'round' });
  for (let i = -3; i <= 3; i++) {
    const cx = x + ax * i * 12, cy = y + ay * i * 12 - 10;
    g.circle(cx, cy, 7).fill(0x8f8f88);
  }
  g.moveTo(x - ax * L, y - ay * L - 10).lineTo(x + ax * L, y + ay * L - 10).stroke({ width: 26, color: 0x6f8f2f, alpha: 0.35, cap: 'round' });
  const tx = x + fx * 30, ty = y + fy * 30 - 10;
  g.poly([tx + fx * 16, ty + fy * 16, tx - fy * 12, ty + fx * 12, tx + fy * 12, ty - fx * 12]).fill(GOLD).stroke({ width: 2, color: 0x8a5429 });
}

export async function createBoard(host: HTMLElement, opt: BoardOptions): Promise<Board> {
  const app = new Application();
  await app.init({
    resizeTo: host,
    background: 0xbfe6f5,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  host.appendChild(app.canvas);

  const world = new Container();
  app.stage.addChild(world);

  const ground = new Graphics();
  const water = new Container();
  const relief = new Graphics(); // 地形眼鏡：分層設色＋等高線
  const props = new Graphics();
  const grid = new Graphics();
  const hover = new Graphics();
  const cursor = new Graphics();
  const pieces = new Graphics();
  world.addChild(ground, water, relief, props, grid, hover, cursor, pieces);

  const order = drawOrder(opt.cols, opt.rows);
  const rivers: Cell[] = [];
  for (const c of order) {
    const { x, y } = cellToScreen(c);
    const t = opt.terrain(c);
    block(ground, x, y, TOP[t]);
    if (t === 'river') rivers.push(c);
    diamond(grid, x, y);
    grid.stroke({ width: 2, color: 0xffffff, alpha: 0.6 });
  }
  for (const c of order) {
    const { x, y } = cellToScreen(c);
    prop(props, opt.terrain(c), x, y);
  }
  grid.visible = false;

  // 地形眼鏡：每格依高度上色，再在高度不同的邊上畫等高線（差幾層畫幾條）
  for (const c of order) {
    const { x, y } = cellToScreen(c);
    diamond(relief, x, y);
    relief.fill({ color: bandColor(opt.heights(c)), alpha: 0.72 });
  }
  for (const e of contourEdges(opt.cols, opt.rows, opt.heights)) {
    const { x, y } = cellToScreen(e.cell);
    const [a, b] = e.side === 'se' ? [V.right, V.bottom] : [V.bottom, V.left];
    const [dx, dy] = e.side === 'se' ? DIRS[0] : DIRS[1]; // 從這格指向鄰格
    const s = e.up ? -1 : 1; // 線往比較低的那一邊排開
    for (let k = 0; k < e.steps; k++) {
      const o = (k * 7 + 2) * s;
      relief.moveTo(x + a[0] + dx * o, y + a[1] + dy * o).lineTo(x + b[0] + dx * o, y + b[1] + dy * o);
    }
  }
  relief.stroke({ width: 3, color: CONTOUR, alpha: 0.85, cap: 'round' });
  relief.visible = false;

  // 鏡頭
  const bounds = boardBounds(opt.cols, opt.rows);
  const b = { ...bounds, height: bounds.height + SIDE };
  const size = () => ({ width: app.screen.width, height: app.screen.height });
  let view: View = fitView(b, size());
  const apply = () => {
    world.scale.set(view.scale);
    world.position.set(view.x, view.y);
  };
  apply();
  app.renderer.on('resize', () => {
    view = fitView(b, size());
    apply();
  });

  const local = (clientX: number, clientY: number) => {
    const r = app.canvas.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };
  const cellAt = (clientX: number, clientY: number): Cell | null => {
    const p = local(clientX, clientY);
    const r = app.canvas.getBoundingClientRect();
    if (p.x < 0 || p.y < 0 || p.x > r.width || p.y > r.height) return null;
    const c = screenToCell({ x: (p.x - view.x) / view.scale, y: (p.y - view.y) / view.scale });
    return inside(c, opt.cols, opt.rows) ? c : null;
  };

  const showCursor = (c: Cell | null) => {
    cursor.clear();
    if (!c) return;
    const { x, y } = cellToScreen(c);
    diamond(cursor, x, y);
    cursor.stroke({ width: 4, color: GOLD });
  };

  // 觸控：自己追蹤每根手指，一根平移、兩根縮放；沒移動就是點一下
  const el = app.canvas;
  el.style.touchAction = 'none';
  const fingers = new Map<number, { x: number; y: number }>();
  let tap: { id: number; x: number; y: number } | null = null;
  let pinch: { d: number; mx: number; my: number } | null = null;
  const two = () => {
    const [p, q] = [...fingers.values()];
    return { d: Math.hypot(p.x - q.x, p.y - q.y) || 1, mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2 };
  };

  const down = (e: PointerEvent) => {
    if (fingers.size === 0) {
      const c = cellAt(e.clientX, e.clientY);
      if (c && opt.onPress?.(c, e)) return;
    }
    try { el.setPointerCapture(e.pointerId); } catch { /* 合成事件沒有真的指標，略過 */ }
    const p = local(e.clientX, e.clientY);
    fingers.set(e.pointerId, p);
    if (fingers.size === 1) tap = { id: e.pointerId, ...p };
    else {
      tap = null;
      pinch = fingers.size === 2 ? two() : null;
    }
  };
  const moveP = (e: PointerEvent) => {
    const prev = fingers.get(e.pointerId);
    if (!prev) return;
    const p = local(e.clientX, e.clientY);
    fingers.set(e.pointerId, p);
    if (fingers.size === 1) {
      if (tap && Math.hypot(p.x - tap.x, p.y - tap.y) > TAP_SLOP) tap = null;
      if (!tap) view = panBy(view, p.x - prev.x, p.y - prev.y, b, size());
    } else if (fingers.size === 2 && pinch) {
      const now = two();
      view = zoomAt(view, now.d / pinch.d, now.mx, now.my, b, size());
      view = panBy(view, now.mx - pinch.mx, now.my - pinch.my, b, size());
      pinch = now;
    }
    apply();
  };
  const up = (e: PointerEvent) => {
    if (!fingers.delete(e.pointerId)) return;
    if (tap && tap.id === e.pointerId && e.type === 'pointerup') {
      const c = cellAt(e.clientX, e.clientY);
      showCursor(c);
      opt.onTap?.(c);
    }
    tap = null;
    pinch = fingers.size === 2 ? two() : null;
  };
  const wheel = (e: WheelEvent) => {
    e.preventDefault();
    const p = local(e.clientX, e.clientY);
    view = zoomAt(view, Math.exp(-e.deltaY * 0.0015), p.x, p.y, b, size());
    apply();
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', moveP);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', wheel, { passive: false });

  // 水流動畫：每格的水色沿著河往下游起伏、白色浪花往下游漂。
  // 圖形只建一次，每格只改顏色與位置，平板才跑得動。
  const waves = rivers.map((c) => {
    const { x, y } = cellToScreen(c);
    const sheet = new Graphics();
    diamond(sheet, 0, 0);
    sheet.fill(0xffffff);
    sheet.position.set(x, y - 4);
    const foam = new Graphics().ellipse(0, 0, 12, 4).fill(0xffffff);
    water.addChild(sheet, foam);
    return { c, x, y, sheet, foam };
  });
  let t = 0;
  app.ticker.add((tk) => {
    t += tk.deltaMS / 1000;
    for (const w of waves) {
      const k = (Math.sin(t * 3 - w.c.row * 0.9) + 1) / 2;
      w.sheet.tint = mix(WATER_LO, WATER_HI, k);
      const drift = ((t * 0.6 + w.c.col * 0.37 + w.c.row * 0.5) % 1) - 0.5; // 沿著 row 方向（往左下）流
      w.foam.position.set(w.x - drift * (TILE_W / 2), w.y - 4 + drift * (TILE_H / 2));
      w.foam.alpha = 0.5 * (1 - Math.abs(drift) * 2);
    }
  });

  return {
    fps: () => app.ticker.FPS,
    cellAt,
    setPieces(list, selected) {
      pieces.clear();
      const sorted = [...list].sort((p, q) => p.cell.col + p.cell.row - (q.cell.col + q.cell.row));
      for (const p of sorted) cage(pieces, p, p.id === selected);
    },
    setHover(c, ok) {
      hover.clear();
      if (!c) return;
      const { x, y } = cellToScreen(c);
      diamond(hover, x, y);
      hover.fill({ color: ok ? 0x7fd85a : 0xe0533a, alpha: 0.45 }).stroke({ width: 4, color: ok ? 0xffffff : 0xe0533a });
    },
    setGrid(on) {
      grid.visible = on;
    },
    setContours(on) {
      relief.visible = on;
      water.alpha = on ? 0.35 : 1;
    },
    destroy() {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', moveP);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
      app.destroy(true, { children: true });
    },
  };
}

function mix(a: number, b: number, k: number): number {
  const ch = (s: number) => [(a >> s) & 255, (b >> s) & 255];
  const [r1, r2] = ch(16), [g1, g2] = ch(8), [b1, b2] = ch(0);
  return (Math.round(r1 + (r2 - r1) * k) << 16) | (Math.round(g1 + (g2 - g1) * k) << 8) | Math.round(b1 + (b2 - b1) * k);
}

