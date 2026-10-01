// 遊戲盤：用 PixiJS 畫等角格子。只讀狀態、不做判斷（規則在 core）。
//
// 地面、水、小物目前是程式畫的佔位，Chuck 的 S-04 底圖與 T、O 系列到了再換成圖。
// 觸控：單指拖曳平移、雙指縮放、點一下選格子；拖竹蛇籠由介面層（BoardView）用 cellAt/setHover 處理。
// 地形眼鏡：開了才疊上分層設色與等高線；格子線只在拖放時出現。

import { Application, Assets, Container, Graphics, Matrix, PerspectiveMesh, Sprite, Texture } from 'pixi.js';
import { boardBounds, cellToScreen, drawOrder, screenToCell, inside, TILE_H, TILE_W, type Cell } from '../core/iso';
import { type Heights } from '../core/terrain';
import { reliefPixels } from '../core/relief';
import { clampView, fitView, panBy, zoomAt, type View } from '../core/camera';
import type { Dir, Piece } from '../core/pieces';
import type { FlowResult, Kind } from '../core/flow';

const SIDE = 14; // 方塊側面的厚度（px）
const TAP_SLOP = 8; // 手指移動超過這麼多 px 就不算點一下

// 色盤照美術提示詞文件（KV-01 近似值）
const TOP: Record<Kind, number> = {
  grass: 0x6cc94b, field: 0x9bd35a, bamboo: 0x5bb544, stone: 0xe8dcc4, village: 0x7fd05a, river: 0x8d7a55,
  rock: 0x8d7a55, canal: 0x6cc94b, gate: 0x6cc94b, tribe: 0x7fd05a, dry: 0xd9c27a,
};
// 分層設色：低處綠、中間黃、高處褐，跟課本的地形圖同一套順序
const BANDS = [0x7cc46a, 0xb4d46b, 0xe4d77d, 0xe9b866, 0xcf8b4f, 0xa8653c];
const RELIEF_RES = 32; // 地形眼鏡每格幾個像素
const CANAL_BED = 0x9a6a3c; // 挖好、還沒水的圳道
const CANAL_WATER = 0x6fb8d6;
const WATER_LO = 0x7fa7a3; // 濁水溪：帶泥沙的灰綠水色，在兩色之間起伏
const WATER_HI = 0xa9c9bf;
const EARTH_L = 0xa86f3d;
const EARTH_R = 0x8a5429;
const CONTOUR = 0x5a3a1c;
const GOLD = 0xffc23d;

export interface BoardOptions {
  cols: number;
  rows: number;
  terrain: (c: Cell) => Kind;
  heights: Heights;
  onTap?: (c: Cell | null) => void;
  // 手指按下時先問介面要不要接手（例如按在竹蛇籠上就改成拖它）；回傳 true 就不平移地圖
  onPress?: (c: Cell, e: PointerEvent) => boolean;
  flag?: (c: Cell) => number | null;
  flow?: Dir; // 河往哪個方向流（預設 row+1）
  start?: { cell: Cell; scale: number }; // 一開始鏡頭對準哪裡、放多大
  // 整張畫好的地圖底圖（S-04）：給圖片四個角在地圖座標的位置（左上、右上、右下、左下）。
  // 有底圖就不畫程式的地塊和小物，格子只用來點選、雲霧、地形眼鏡。
  backdrop?: { src: string; corners: readonly number[] };
  // 換成 Chuck 的圖：哪一種地上的東西用哪張圖、竹蛇籠用哪張圖
  art?: { props?: Partial<Record<Kind, string>>; cage?: string; tiles?: Partial<Record<Kind, string>> }; // 聚落插的旗子顏色（漳州莊藍、泉州莊橘）
}

// 提示用的記號：林先生指出該放竹蛇籠的格子（含方向）、該挖的圳道、要找的地方
export type Mark = { kind: 'cage'; cell: Cell; dir: Dir } | { kind: 'dig'; cell: Cell } | { kind: 'ring'; cell: Cell } | { kind: 'done'; cell: Cell };

export interface Board {
  fps: () => number;
  cellAt: (clientX: number, clientY: number) => Cell | null;
  clientOf: (c: Cell) => { x: number; y: number }; // 格子中心在螢幕上的位置（測試、教學手指用）
  setPieces: (list: readonly Piece[], selected: number | null) => void;
  setHover: (c: Cell | null, ok: boolean) => void;
  setGrid: (on: boolean) => void;
  setContours: (on: boolean) => void;
  setCanals: (dug: readonly Cell[]) => void; // 玩家挖的圳道（地圖上原本就有的會自己畫）
  setFlow: (r: FlowResult | null, t: number) => void; // 放水動畫：畫出第 t 步以前水到的地方
  setPreview: (r: FlowResult | null) => void; // 預計水路（白點）
  setMarks: (list: readonly Mark[]) => void;
  setFog: (fogged: ((c: Cell) => boolean) | null) => void; // 雲霧蓋住的格子
  redraw: () => void; // 地上的東西變了（竹林砍了、石頭撿了）就重畫
  focus: (c: Cell) => void; // 鏡頭移到這格
  destroy: () => void;
}

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
function prop(g: Graphics, t: Kind, x: number, y: number) {
  if (t === 'field') {
    for (let i = -2; i <= 2; i++) {
      const dx = i * 14, dy = i * 7;
      g.moveTo(x + dx - 22, y + dy + 11).lineTo(x + dx + 22, y + dy - 11);
    }
    g.stroke({ width: 3, color: 0x4f9a35, alpha: 0.7 });
  } else if (t === 'dry') {
    // 乾裂的田：田畦加上裂痕
    for (let i = -2; i <= 2; i++) {
      const dx = i * 14, dy = i * 7;
      g.moveTo(x + dx - 22, y + dy + 11).lineTo(x + dx + 22, y + dy - 11);
    }
    g.stroke({ width: 3, color: 0xa88a4a, alpha: 0.7 });
    g.moveTo(x - 20, y - 2).lineTo(x - 6, y + 4).lineTo(x + 4, y - 4).lineTo(x + 18, y + 2);
    g.moveTo(x - 4, y + 4).lineTo(x - 2, y + 14);
    g.stroke({ width: 2, color: 0x6b4a22, alpha: 0.8 });
  } else if (t === 'tribe') {
    // 平埔族社佔位：茅草屋頂的高腳屋，之後換 O-03
    for (const dx of [-20, 20]) g.rect(x + dx - 3, y - 14, 6, 18).fill(0x7a5230);
    g.rect(x - 24, y - 30, 48, 18).fill(0xb9894f);
    g.poly([x - 34, y - 28, x, y - 62, x + 34, y - 28]).fill(0xd8b25e).stroke({ width: 2, color: 0x8a6a2a });
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
  } else if (t === 'rock') {
    g.ellipse(x, y - 4, 34, 22).fill(0x8b8b84).stroke({ width: 3, color: 0x5e5e58 });
    g.ellipse(x - 8, y - 12, 12, 6).fill({ color: 0xffffff, alpha: 0.25 });
  } else if (t === 'gate') {
    // 分水閘佔位：兩根木柱夾一塊閘板，之後換 O-02
    for (const dx of [-26, 26]) g.roundRect(x + dx - 6, y - 46, 12, 50, 4).fill(0x8a5429);
    g.roundRect(x - 26, y - 40, 52, 12, 4).fill(0xb7834e).stroke({ width: 2, color: 0x6b3f1f });
  }
}

// 聚落的旗子（漳州莊藍旗、泉州莊橘旗）
function flagAt(g: Graphics, x: number, y: number, color: number) {
  g.rect(x + 30, y - 70, 4, 64).fill(0x5a3a1c);
  g.poly([x + 34, y - 70, x + 64, y - 60, x + 34, y - 50]).fill(color).stroke({ width: 2, color: 0x3a2412 });
}

// 圳道：格子中間挖下去的一條溝（格子比較小的菱形）
function channel(g: Graphics, x: number, y: number, color: number, alpha = 1) {
  diamond(g, x, y, 0.62);
  g.fill({ color, alpha });
}

// dir 對應的畫面方向（單位向量）：0 朝 col+1（右下）、1 朝 row+1（左下）、2 左上、3 右上
const DIRS: [number, number][] = [[0.894, 0.447], [-0.894, 0.447], [-0.894, -0.447], [0.894, -0.447]];

// 竹蛇籠佔位：躺在格子上的長籠子，金色箭頭是擋水面朝的方向
function cage(g: Graphics, p: Piece, selected: boolean, sprite: boolean) {
  const { x, y } = cellToScreen(p.cell);
  const [fx, fy] = DIRS[p.dir];
  const [ax, ay] = DIRS[(p.dir + 1) % 4]; // 籠身和擋水面垂直
  const L = 44;
  if (selected) {
    diamond(g, x, y, 0.92);
    g.stroke({ width: 5, color: GOLD });
  }
  if (sprite) { arrow(g, x, y - 10, fx, fy, GOLD); return; }
  g.ellipse(x, y + 6, 46, 16).fill({ color: 0x000000, alpha: 0.18 });
  g.moveTo(x - ax * L, y - ay * L - 10).lineTo(x + ax * L, y + ay * L - 10).stroke({ width: 26, color: 0xc9b25a, cap: 'round' });
  for (let i = -3; i <= 3; i++) {
    const cx = x + ax * i * 12, cy = y + ay * i * 12 - 10;
    g.circle(cx, cy, 7).fill(0x8f8f88);
  }
  g.moveTo(x - ax * L, y - ay * L - 10).lineTo(x + ax * L, y + ay * L - 10).stroke({ width: 26, color: 0x6f8f2f, alpha: 0.35, cap: 'round' });
  arrow(g, x, y - 10, fx, fy, GOLD);
}

// 粗的金色箭頭：竹蛇籠會把水轉到箭頭指的方向
function arrow(g: Graphics, x: number, y: number, fx: number, fy: number, color: number, alpha = 1) {
  const nx = -fy, ny = fx; // 垂直方向
  const s0 = 8, s1 = 44, w = 7, hw = 18;
  g.poly([
    x + fx * s0 + nx * w, y + fy * s0 + ny * w,
    x + fx * s1 + nx * w, y + fy * s1 + ny * w,
    x + fx * s1 + nx * hw, y + fy * s1 + ny * hw,
    x + fx * (s1 + 26), y + fy * (s1 + 26),
    x + fx * s1 - nx * hw, y + fy * s1 - ny * hw,
    x + fx * s1 - nx * w, y + fy * s1 - ny * w,
    x + fx * s0 - nx * w, y + fy * s0 - ny * w,
  ]).fill({ color, alpha }).stroke({ width: 3, color: 0x6b3f1f, alpha });
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
  const relief = new Sprite(); // 地形眼鏡：分層設色＋彎曲的等高線
  const props = new Graphics();
  const grid = new Graphics();
  const hover = new Graphics();
  const cursor = new Graphics();
  const pieces = new Graphics();
  const canalG = new Graphics();
  const flowG = new Graphics();
  const preview = new Graphics();
  const marks = new Graphics();
  const hints = new Graphics();
  const fog = new Graphics();
  const propArt = new Container();
  const groundArt = new Container();
  const cageArt = new Container();
  world.addChild(ground, groundArt, relief, canalG, water, flowG, props, propArt, preview, grid, hints, hover, cursor, cageArt, pieces, marks, fog);

  // 預先載入要用的圖
  const tex: Record<string, Texture> = {};
  const urls = [...Object.values(opt.art?.props ?? {}), ...Object.values(opt.art?.tiles ?? {}), ...(opt.art?.cage ? [opt.art.cage] : [])].filter((u): u is string => !!u);
  await Promise.all(urls.map(async (u) => { tex[u] = await Assets.load<Texture>(u); }));
  const place = (url: string, x: number, y: number, width: number, flip = false) => {
    const sp = new Sprite(tex[url]);
    sp.anchor.set(0.5, 0.82);
    const k = width / sp.texture.width;
    sp.scale.set(flip ? -k : k, k);
    sp.position.set(x, y + TILE_H * 0.36);
    return sp;
  };

  const order = drawOrder(opt.cols, opt.rows);
  const rivers: Cell[] = opt.backdrop ? [] : order.filter((c) => opt.terrain(c) === 'river');
  if (opt.backdrop) {
    const tex = await Assets.load<Texture>(opt.backdrop.src);
    const mesh = new PerspectiveMesh({ texture: tex, verticesX: 20, verticesY: 20 });
    const k = opt.backdrop.corners;
    mesh.setCorners(k[0], k[1], k[2], k[3], k[4], k[5], k[6], k[7]);
    world.addChildAt(mesh, 0);
  }
  const drawStatic = () => {
    ground.clear();
    props.clear();
    if (opt.backdrop) return;
    for (const ch of groundArt.removeChildren()) ch.destroy();
    for (const c of order) {
      const { x, y } = cellToScreen(c);
      block(ground, x, y, TOP[opt.terrain(c)]);
      const url = opt.art?.tiles?.[opt.terrain(c)];
      if (!url) continue;
      // T-01 地面方塊：頂面約 607×448、中心在圖的 (0.5, 0.41)；壓扁成 2:1 的格子
      const sp = new Sprite(tex[url]);
      sp.anchor.set(0.5, 0.41);
      const sx = (TILE_W * 1.06) / (sp.texture.width * 0.965), sy = (TILE_H * 1.06) / (sp.texture.height * 0.80);
      sp.scale.set(sx, sy);
      sp.position.set(x, y);
      groundArt.addChild(sp);
    }
    for (const ch of propArt.removeChildren()) ch.destroy();
    for (const c of order) {
      const { x, y } = cellToScreen(c);
      const url = opt.art?.props?.[opt.terrain(c)];
      if (url) { propArt.addChild(place(url, x, y, TILE_W * 1.04)); continue; }
      prop(props, opt.terrain(c), x, y);
      const f = opt.flag?.(c);
      if (f != null) flagAt(props, x, y, f);
    }
  };
  drawStatic();
  for (const c of order) {
    const { x, y } = cellToScreen(c);
    diamond(grid, x, y);
    grid.stroke({ width: 2, color: 0xffffff, alpha: 0.6 });
  }
  grid.visible = false;

  // 地形眼鏡：把高度場算成一張圖（每格 RELIEF_RES 像素），再斜斜地貼成等角
  {
    const img = reliefPixels(opt.heights, opt.cols, opt.rows, RELIEF_RES, BANDS, CONTOUR);
    const cv = document.createElement('canvas');
    cv.width = img.width;
    cv.height = img.height;
    cv.getContext('2d')!.putImageData(new ImageData(img.data, img.width, img.height), 0, 0);
    relief.texture = Texture.from(cv);
    const k = 1 / RELIEF_RES;
    relief.setFromMatrix(new Matrix((TILE_W / 2) * k, (TILE_H / 2) * k, -(TILE_W / 2) * k, (TILE_H / 2) * k, 0, -TILE_H / 2));
    relief.alpha = 0.9;
    relief.visible = false;
  }

  // 鏡頭
  const bounds = boardBounds(opt.cols, opt.rows);
  let b = { ...bounds, height: bounds.height + SIDE };
  if (opt.backdrop) {
    const k = opt.backdrop.corners;
    const xs = [k[0], k[2], k[4], k[6], b.left, b.left + b.width], ys = [k[1], k[3], k[5], k[7], b.top, b.top + b.height];
    const left = Math.min(...xs), top = Math.min(...ys);
    b = { left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top, right: Math.max(...xs), bottom: Math.max(...ys) };
  }
  const size = () => ({ width: app.screen.width, height: app.screen.height });
  // 對準某一格：放大到 scale（不小於「放得下整張」），那格放在畫面中間
  const centerOn = (c: Cell, scale: number): View => {
    const fit = fitView(b, size());
    const k = Math.max(fit.scale, Math.min(fit.scale * 3, scale));
    const p = cellToScreen(c);
    return clampView({ scale: k, x: size().width / 2 - p.x * k, y: size().height / 2 - p.y * k }, b, size());
  };
  const initial = () => (opt.start ? centerOn(opt.start.cell, opt.start.scale) : fitView(b, size()));
  let view: View = initial();
  const apply = () => {
    world.scale.set(view.scale);
    world.position.set(view.x, view.y);
  };
  apply();
  app.renderer.on('resize', () => {
    view = initial();
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
    // 水流方向的小箭頭（︾），一直往下游漂，看得出河往哪邊流
    const [fx, fy] = DIRS[opt.flow ?? 1];
    const foam = new Graphics()
      .moveTo(-fx * 6 - fy * 14, -fy * 6 + fx * 14).lineTo(fx * 8, fy * 8).lineTo(-fx * 6 + fy * 14, -fy * 6 - fx * 14)
      .stroke({ width: 5, color: 0xffffff, cap: 'round', join: 'round' });
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
      w.foam.alpha = 0.75 * (1 - Math.abs(drift) * 2);
    }
  });

  return {
    fps: () => app.ticker.FPS,
    cellAt,
    clientOf(c) {
      const r = app.canvas.getBoundingClientRect();
      const p = cellToScreen(c);
      return { x: r.left + view.x + p.x * view.scale, y: r.top + view.y + p.y * view.scale };
    },
    setPieces(list, selected) {
      pieces.clear();
      const sorted = [...list].sort((p, q) => p.cell.col + p.cell.row - (q.cell.col + q.cell.row));
      for (const ch of cageArt.removeChildren()) ch.destroy();
      const art = opt.art?.cage;
      for (const p of sorted) {
        if (art) {
          const { x, y } = cellToScreen(p.cell);
          // 圖上的籠子是「／」方向躺著；箭頭朝左右下、右上（dir 1、3）時籠身是「＼」，左右翻過來
          cageArt.addChild(place(art, x, y - 6, TILE_W * 0.86, p.dir % 2 === 1));
        }
        cage(pieces, p, p.id === selected, !!art);
      }
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
      water.alpha = on ? 0.5 : 1;
    },
    setMarks(list) {
      hints.clear();
      for (const m of list) {
        const { x, y } = cellToScreen(m.cell);
        if (m.kind === 'cage') {
          diamond(hints, x, y, 0.92);
          hints.fill({ color: 0xffffff, alpha: 0.35 }).stroke({ width: 5, color: 0xffffff });
          arrow(hints, x, y - 10, DIRS[m.dir][0], DIRS[m.dir][1], 0xffffff, 0.9);
        } else if (m.kind === 'dig') {
          diamond(hints, x, y, 0.62);
          hints.fill({ color: 0xffffff, alpha: 0.45 }).stroke({ width: 3, color: 0xffffff });
        } else if (m.kind === 'done') {
          diamond(hints, x, y, 0.7);
          hints.fill({ color: 0x3a2412, alpha: 0.35 });
          hints.moveTo(x - 16, y - 2).lineTo(x - 4, y + 10).lineTo(x + 20, y - 14).stroke({ width: 7, color: 0xffffff, cap: 'round', join: 'round' });
        } else {
          diamond(hints, x, y, 1);
          hints.stroke({ width: 6, color: GOLD });
        }
      }
    },
    setFog(fogged) {
      fog.clear();
      if (!fogged) return;
      for (const c of order) {
        if (!fogged(c)) continue;
        const { x, y } = cellToScreen(c);
        // 一團一團的雲：比格子大一點，相鄰的雲會連在一起
        diamond(fog, x, y - 4, 1.1);
        fog.fill({ color: 0xf2f6fb, alpha: 0.97 });
        const k = (c.col * 7 + c.row * 13) % 5;
        fog.ellipse(x - 26 + k * 5, y - 18, 44, 24).fill({ color: 0xffffff, alpha: 0.95 });
        fog.ellipse(x + 24 - k * 3, y - 6, 38, 20).fill({ color: 0xe9eff7, alpha: 0.95 });
        fog.ellipse(x + 4, y - 30 + k, 30, 16).fill({ color: 0xffffff, alpha: 0.9 });
      }
    },
    redraw: drawStatic,
    focus(c) {
      view = centerOn(c, view.scale);
      apply();
    },
    setCanals(dug) {
      canalG.clear();
      const all = [...order.filter((c) => opt.terrain(c) === 'canal'), ...dug];
      for (const c of all) {
        const { x, y } = cellToScreen(c);
        channel(canalG, x, y, CANAL_BED);
        diamond(canalG, x, y, 0.62);
        canalG.stroke({ width: 3, color: 0x6b3f1f, alpha: 0.6 });
      }
    },
    setFlow(r, now) {
      flowG.clear();
      marks.clear();
      if (!r) return;
      for (const w of r.river) {
        if (w.t > now) continue;
        const { x, y } = cellToScreen(w.cell);
        diamond(flowG, x, y, 0.8);
        flowG.fill({ color: 0xdff4ff, alpha: 0.35 });
      }
      for (const w of r.canal) {
        if (w.t > now) continue;
        const { x, y } = cellToScreen(w.cell);
        channel(flowG, x, y, CANAL_WATER);
      }
      for (const w of r.flooded) {
        if (w.t > now) continue;
        const { x, y } = cellToScreen(w.cell);
        diamond(marks, x, y, 0.85);
        marks.fill({ color: 0x3f7fb0, alpha: 0.6 }).stroke({ width: 4, color: 0xe0533a });
      }
      for (const w of r.broken) {
        if (w.t > now) continue;
        const { x, y } = cellToScreen(w.cell);
        marks.moveTo(x - 18, y - 28).lineTo(x + 18, y + 4).moveTo(x + 18, y - 28).lineTo(x - 18, y + 4);
        marks.stroke({ width: 8, color: 0xe0533a, cap: 'round' });
      }
      for (const w of r.blocked) {
        if (w.t > now) continue;
        const { x, y } = cellToScreen(w.cell);
        marks.circle(x, y - 12, 14).fill(0xf07f1d).stroke({ width: 3, color: 0xffffff });
      }
      if (now >= r.steps)
        for (const c of r.gates) {
          const { x, y } = cellToScreen(c);
          diamond(marks, x, y, 1);
          marks.stroke({ width: 6, color: GOLD });
        }
    },
    setPreview(r) {
      preview.clear();
      if (!r) return;
      for (const w of [...r.river, ...r.canal]) {
        const { x, y } = cellToScreen(w.cell);
        preview.circle(x, y, 7);
      }
      preview.fill({ color: 0xffffff, alpha: 0.85 });
      for (const w of [...r.flooded, ...r.broken]) {
        const { x, y } = cellToScreen(w.cell);
        preview.circle(x, y, 9);
      }
      preview.fill({ color: 0xe0533a, alpha: 0.9 });
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

