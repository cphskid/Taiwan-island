// 遊戲盤：用 PixiJS 畫等角格子。只讀狀態、不做判斷（規則在 core）。
//
// P6-0 先用程式畫的黏土方塊佔位，量學校平板跑不跑得動；Chuck 的 T-01、O-01~04 到了再換成圖。
// 河道的水一直在動（顏色沿著水流方向起伏），順便當效能測試的負載。

import { Application, Container, Graphics } from 'pixi.js';
import { boardBounds, cellToScreen, drawOrder, screenToCell, inside, TILE_H, TILE_W, type Cell } from '../core/iso';
import type { Terrain } from '../data/babao-preview';

const SIDE = 14; // 方塊側面的厚度（px）

// 色盤照美術提示詞文件（KV-01 近似值）
const TOP: Record<Terrain, number> = {
  grass: 0x6cc94b, field: 0x9bd35a, bamboo: 0x5bb544, stone: 0xe8dcc4, village: 0x7fd05a, river: 0x8d7a55,
};
const WATER_LO = 0x7fa7a3; // 濁水溪：帶泥沙的灰綠水色，在兩色之間起伏
const WATER_HI = 0xa9c9bf;
const EARTH_L = 0xa86f3d;
const EARTH_R = 0x8a5429;

export interface BoardOptions {
  cols: number;
  rows: number;
  terrain: (c: Cell) => Terrain;
  onTap?: (c: Cell) => void;
}

export interface Board {
  app: Application;
  fps: () => number;
  destroy: () => void;
}

function diamond(g: Graphics, x: number, y: number) {
  g.poly([x, y - TILE_H / 2, x + TILE_W / 2, y, x, y + TILE_H / 2, x - TILE_W / 2, y]);
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
  const props = new Graphics();
  const cursor = new Graphics();
  world.addChild(ground, water, props, cursor);

  const order = drawOrder(opt.cols, opt.rows);
  const rivers: Cell[] = [];
  for (const c of order) {
    const { x, y } = cellToScreen(c);
    const t = opt.terrain(c);
    block(ground, x, y, TOP[t]);
    if (t === 'river') rivers.push(c);
  }
  for (const c of order) {
    const { x, y } = cellToScreen(c);
    prop(props, opt.terrain(c), x, y);
  }

  // 置中、縮放到剛好放得下
  const b = boardBounds(opt.cols, opt.rows);
  let scale = 1;
  const fit = () => {
    const w = app.screen.width, h = app.screen.height;
    scale = Math.min(w / (b.width + 80), h / (b.height + SIDE + 80));
    world.scale.set(scale);
    world.position.set(w / 2 - (b.left + b.width / 2) * scale, h / 2 - (b.top + b.height / 2) * scale);
  };
  fit();
  app.renderer.on('resize', fit);

  // 點一格：顯示選取框（P6-1 會換成完整的平移、縮放、拖放）
  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;
  app.stage.on('pointertap', (e) => {
    const p = world.toLocal(e.global);
    const c = screenToCell(p);
    cursor.clear();
    if (!inside(c, opt.cols, opt.rows)) return;
    const { x, y } = cellToScreen(c);
    diamond(cursor, x, y);
    cursor.stroke({ width: 4, color: 0xffc23d });
    opt.onTap?.(c);
  });

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
    app,
    fps: () => app.ticker.FPS,
    destroy: () => app.destroy(true, { children: true }),
  };
}

function mix(a: number, b: number, k: number): number {
  const ch = (s: number) => [(a >> s) & 255, (b >> s) & 255];
  const [r1, r2] = ch(16), [g1, g2] = ch(8), [b1, b2] = ch(0);
  return (Math.round(r1 + (r2 - r1) * k) << 16) | (Math.round(g1 + (g2 - g1) * k) << 8) | Math.round(b1 + (b2 - b1) * k);
}
