// 全台大地圖：M-01 底圖、時光雲霧、時空裂縫、過關後「活著」的彰化平原、地形眼鏡。
// 只畫、不做判斷（規則在 core/world.ts，資料在 data/world.ts）。
//
// 座標用 M-01 原圖的像素。觸控跟關卡一樣：單指平移、雙指縮放、點一下。
// 效能：雲霧是幾百張同一張貼圖的 Sprite（一次批次畫完），會動的小人最多約 10 個，拉遠就藏起來。

import { Application, Assets, Container, Graphics, Rectangle, Sprite, Text, Texture, TilingSprite } from 'pixi.js';
import ATLAS from 'virtual:atlas';
import { clampView, fitView, panBy, zoomAt, type View } from '../core/camera';
import { lodLevel, nearest, paddyLook, pointAlong, seasonAt, walker, type Pt } from '../core/world';
import {
  ACTOR_ART, CHAPTERS, LIFE, MAP, SEASON_SECONDS, isl,
  type ActorDef, type ChapterId, type ChapterLife,
} from '../data/world';
import { lifeNames } from '../data/life-names';
import { NOW_LIFE, NOW_ON, NOW_PLACES, type Era } from '../data/now';
import { mark } from '../perf';

const MAX_ZOOM = 6; // 最多放大到「一倍」的幾倍
// 「一倍」＝放得下 2071×1492 這麼大一塊（第一版 M-01 的整張），看彰化平原的小人剛好；
// 新底圖整座島比這大很多，拉到最遠（放得下整張）大約是 0.4 倍
const UNIT = { left: 0, top: 0, width: 2071, height: 1492 };
const TAP_SLOP = 8;
const FOG_STEP = 90; // 雲一團一團的間距（原圖像素）
const SEA = 0x58b4d8;
const LABEL_PX = 14; // 地圖上章名的字在畫面上幾 px
// 拉遠時小人和房子跟著放大，手機沒縮放也看得到：小人在畫面上至少這麼高、房子至少這麼寬（最多放大幾倍）
const PERSON_PX = 20, PERSON_MAX = 9;
const THING_PX = 20, THING_MAX = 3.5;

export type RiftState = 'open' | 'locked' | 'hook' | 'done';

export type Hit =
  | { kind: 'actor'; actor: ActorDef }
  | { kind: 'rift'; id: ChapterId }
  | { kind: 'region'; id: ChapterId | null; fogged: boolean }
  | { kind: 'place'; id: string };

export interface WorldMapOptions {
  opened: readonly string[]; // 已經撥開雲霧的章
  onTap?: (hit: Hit | null) => void;
  start?: { at: Pt; zoom: number }; // 一開始鏡頭在哪（從關卡回來時先停在彰化，再拉遠）
  era?: Era; // 一開始是過去還是現在（只有 ?now=1 才會用到現在）
}

export interface WorldMap {
  fps: () => number;
  setRifts: (s: Partial<Record<ChapterId, RiftState>>) => void;
  setGlasses: (on: boolean) => void;
  setEra: (era: Era) => void; // 過去／現在：雲霧、裂縫、各時代的東西淡出，今天的臺灣淡入
  setNowOpened: (ids: readonly string[]) => void; // 過去打完的章，現在那一區多出新舊對照
  dispel: (id: string) => Promise<void>; // 撥雲動畫：那一區的雲散開、建設長出來
  flyTo: (at: Pt, zoom: number, ms?: number) => Promise<void>; // zoom：「一倍」（UNIT）的幾倍，0＝拉到看得到整張
  clientOf: (p: Pt) => { x: number; y: number };
  zoom: () => number;
  destroy: () => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// 柔柔的一團雲（白色、邊緣透明），所有雲共用這一張
function puffTexture(): Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(56, 54, 6, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.55, 'rgba(250,252,255,0.95)');
  grad.addColorStop(0.8, 'rgba(232,240,250,0.55)');
  grad.addColorStop(1, 'rgba(232,240,250,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return Texture.from(c);
}

// 打開地圖時現在做到哪、哪些圖還沒到、哪些圖讀失敗（地圖卡住時畫面上顯示，方便找原因）
export const mapStatus = { stage: '', pending: new Set<string>(), failed: [] as string[] };

// 地區分界圖：每個像素的 R＝地區編號
async function loadRegions(): Promise<{ w: number; h: number; at: (x: number, y: number) => number; data: Uint8Array }> {
  const im = new Image();
  // 不用 im.decode()：iPad Safari 有時會丟錯或一直不回來，整張地圖就卡住
  const ok = await new Promise<boolean>((done) => {
    im.onload = () => done(true);
    im.onerror = () => done(false);
    setTimeout(() => done(im.complete && im.naturalWidth > 0), 20000);
    im.src = MAP.regions;
  });
  if (!ok || !im.width) {
    mapStatus.failed.push('m01-regions');
    const data = new Uint8Array(1);
    return { w: 1, h: 1, at: () => 0, data };
  }
  const c = document.createElement('canvas');
  c.width = im.width;
  c.height = im.height;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(im, 0, 0);
  const px = g.getImageData(0, 0, im.width, im.height).data;
  const data = new Uint8Array(im.width * im.height);
  for (let i = 0; i < data.length; i++) data[i] = px[i * 4];
  const S = MAP.regionScale;
  const at = (x: number, y: number) => {
    const cx = Math.floor(x / S), cy = Math.floor(y / S);
    return cx < 0 || cy < 0 || cx >= im.width || cy >= im.height ? 0 : data[cy * im.width + cx];
  };
  return { w: im.width, h: im.height, at, data };
}

// 小小的亂數（固定種子），雲每次都長得一樣
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

// 大地圖的圖分兩批：一打開就要的（底圖、海、裂縫、徽章，十幾張），
// 和各章的人和房子（地圖打開後才在背景一章章讀，已撥開的章先讀，讀好就冒出來）。
// 進場進度條只等第一批（ui/Island.tsx firstScreenImages）。
// 各章的人和房子打包成一章一張圖集（tools/atlas.mjs），兩百多張小圖變八張；圖集裡沒有的才單獨讀。
function baseImageNames(): Set<string> {
  const names = new Set<string>(['m01', 'm01-relief', 'rift', 'badge-canal', 't2-water', 't2-dirt', 'smoke', 'm2-paddy-green', 'm2-paddy-gold']);
  for (const ch of CHAPTERS) names.add(`badge-${ch.badge}`);
  if (NOW_ON) {
    for (const L of Object.values(NOW_LIFE)) if (L) for (const n of lifeNames(L)) names.add(n);
    for (const p of NOW_PLACES) names.add(p.art);
    names.add('y3-6');
  }
  return names;
}
export const mapImageUrls = () => [...[...baseImageNames()].map(isl), MAP.regions];

export async function createWorldMap(host: HTMLElement, opt: WorldMapOptions): Promise<WorldMap> {
  const app = new Application();
  await app.init({
    resizeTo: host,
    background: SEA,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  host.appendChild(app.canvas);

  const tex: Record<string, Texture> = {};
  // 一張圖讀失敗或 20 秒還沒好，就先用空白貼圖，不讓整張地圖卡住
  const loadTex = (names: Iterable<string>) =>
    Promise.all([...names].filter((n) => !tex[n]).map(async (n) => {
      mapStatus.pending.add(n);
      const t = await Promise.race([
        Assets.load<Texture>(isl(n)).catch(() => null),
        new Promise<null>((ok) => setTimeout(() => ok(null), 20000)),
      ]);
      mapStatus.pending.delete(n);
      if (!t) mapStatus.failed.push(n);
      tex[n] = t ?? Texture.EMPTY;
    }));
  // 先讀那章的圖集，切成一張張小圖放進 tex，剩下圖集沒有的再單獨讀（每章只讀一次）
  const atlasLoads = new Map<string, Promise<unknown>>();
  const loadAtlas = (id: string) => {
    if (!atlasLoads.has(id)) atlasLoads.set(id, readAtlas(id));
    return atlasLoads.get(id)!;
  };
  const readAtlas = (id: string) =>
    Promise.all((ATLAS[id] ?? []).map(async (pg) => {
      const names = Object.keys(pg.frames).filter((n) => !tex[n]);
      if (!names.length) return;
      const url = isl(`island/atlas/${pg.file.replace(/\.webp$/, '')}`);
      mapStatus.pending.add(url);
      const t = await Promise.race([
        Assets.load<Texture>(url).catch(() => null),
        new Promise<null>((ok) => setTimeout(() => ok(null), 20000)),
      ]);
      mapStatus.pending.delete(url);
      if (!t) return; // 圖集讀不到：那幾張改成單獨讀
      for (const n of names) {
        const [x, y, w, h] = pg.frames[n];
        tex[n] ??= new Texture({ source: t.source, frame: new Rectangle(x, y, w, h) });
      }
    }));
  // iPad Safari 用 Web Worker 解圖有時一直不回來（地圖整片只剩海），改在主執行緒解
  Assets.setPreferences({ preferWorkers: false });
  mapStatus.stage = '讀地圖的圖';
  mapStatus.pending.clear();
  mapStatus.failed = [];
  const [regions] = await Promise.all([loadRegions(), loadTex(baseImageNames())]);
  mapStatus.stage = '把地圖畫出來';
  mark('大地圖的圖讀好');
  let destroyed = false;
  const puff = puffTexture();

  const world = new Container();
  app.stage.addChild(world);

  // 海：T-02 水面貼圖鋪滿，慢慢漂
  const sea = new TilingSprite({ texture: tex['t2-water'], width: MAP.width * 3, height: MAP.height * 3 });
  sea.position.set(-MAP.width, -MAP.height);
  sea.tileScale.set(0.9, 0.55);
  sea.alpha = 0.35;
  const island = new Sprite(tex.m01);
  const relief = new Sprite();
  relief.visible = false;
  const life = new Container();
  life.sortableChildren = true;
  const fog = new Container();
  const rifts = new Container();
  // 「現在」：今天的臺灣（一開始藏著，撥桿撥到現在才淡入）
  const nowLayer = new Container();
  nowLayer.sortableChildren = true;
  nowLayer.visible = false;
  nowLayer.alpha = 0;
  world.addChild(sea, island, relief, life, fog, rifts, nowLayer);

  // ── 時光雲霧 ──
  interface Puff { sp: Sprite; region: number; x: number; y: number; ph: number; k: number; gone: boolean }
  const puffs: Puff[] = [];
  {
    const rand = rng(7);
    // 海邊一點點也蓋到：找附近最近的陸地屬於哪一區
    const regionNear = (x: number, y: number) => {
      const here = regions.at(x, y);
      if (here) return here;
      for (let r = 1; r <= 2; r++)
        for (let a = 0; a < 8; a++) {
          const k = regions.at(x + Math.cos((a * Math.PI) / 4) * r * 8, y + Math.sin((a * Math.PI) / 4) * r * 8);
          if (k) return k;
        }
      return 0;
    };
    for (let y = 0; y < MAP.height; y += FOG_STEP * 0.8)
      for (let x = 0; x < MAP.width; x += FOG_STEP) {
        const px = x + (rand() - 0.5) * FOG_STEP * 0.8 + ((y / (FOG_STEP * 0.8)) % 2) * FOG_STEP * 0.5;
        const py = y + (rand() - 0.5) * FOG_STEP * 0.6;
        const region = regionNear(px, py);
        if (!region) continue;
        const sp = new Sprite(puff);
        sp.anchor.set(0.5);
        const k = (1.25 + rand() * 0.7) * (FOG_STEP / 64);
        sp.scale.set(k * 1.25, k);
        sp.tint = rand() < 0.3 ? 0xe4ecf6 : 0xffffff;
        sp.alpha = 0.82;
        sp.position.set(px, py);
        fog.addChild(sp);
        puffs.push({ sp, region, x: px, y: py, ph: rand() * Math.PI * 2, k, gone: false });
      }
  }
  const regionOf = (id: string) => CHAPTERS.find((c) => c.id === id)?.region ?? -1;
  // 撥開的地區旁邊，隔壁的雲縮小變淡，撥開的地方才看得清楚
  const thin = new Set<Puff>();
  const thinEdges = () => {
    const show = new Set([...openedSet].map(regionOf));
    for (const p of puffs) {
      if (p.gone || thin.has(p)) continue;
      const near = [0, 1, 2, 3, 4, 5, 6, 7].some((a) => show.has(regions.at(p.x + Math.cos((a * Math.PI) / 4) * 75, p.y + Math.sin((a * Math.PI) / 4) * 75)));
      if (near) thin.add(p);
    }
  };
  // 過關長出來的東西附近，就算在隔壁區的邊上，雲也一起撥開（不然房子會被別區的雲蓋住一半）
  const lifeSpots = (id: string): Pt[] => {
    const L = LIFE[id as ChapterId];
    if (!L) return [];
    return [
      ...L.buildings.map((b) => b.at), ...(L.scenery ?? []).map((d) => d.at), ...(L.cycles ?? []).map((c) => c.at),
      ...L.actors.flatMap((a) => a.path ?? [a.at!]),
    ];
  };
  const LIFE_CLEAR = 110;
  const fogOf = (id: string) => {
    const r = regionOf(id);
    const spots = lifeSpots(id);
    return puffs.filter((p) => !p.gone && (p.region === r || spots.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < LIFE_CLEAR)));
  };
  const clearFog = (id: string) => {
    for (const p of fogOf(id)) { p.gone = true; p.sp.visible = false; }
  };

  // ── 地形眼鏡：分層設色＋等高線，只露出撥開雲霧的地區（邊緣柔一點）──
  const openedSet = new Set<string>(opt.opened);
  const buildRelief = () => {
    const src = tex['m01-relief'].source.resource as CanvasImageSource & { width: number; height: number };
    if (!src?.width) return;   // 地形圖讀失敗：地形眼鏡先沒有，地圖照常
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const g = c.getContext('2d')!;
    g.drawImage(src, 0, 0);
    const m = document.createElement('canvas');
    m.width = regions.w;
    m.height = regions.h;
    const mg = m.getContext('2d')!;
    const img = mg.createImageData(regions.w, regions.h);
    const show = new Set([...openedSet].map(regionOf));
    for (let i = 0; i < regions.data.length; i++) img.data[i * 4 + 3] = show.has(regions.data[i]) ? 255 : 0;
    mg.putImageData(img, 0, 0);
    g.globalCompositeOperation = 'destination-in';
    g.imageSmoothingEnabled = true;
    g.drawImage(m, 0, 0, c.width, c.height);
    relief.texture = Texture.from(c);
    relief.width = MAP.width;
    relief.height = MAP.height;
  };

  // ── 過關的章，那一區活起來（資料在 data/world.ts 的 LIFE，一章一份）──
  // 圳道：土堤（T-02 泥土）裡面流著水（T-02 水面，慢慢往下游捲），線條照折線拉成平順的曲線
  const curve = (g: Graphics, line: readonly Pt[]) => {
    g.moveTo(line[0].x, line[0].y);
    for (let i = 1; i < line.length - 1; i++) {
      const m = { x: (line[i].x + line[i + 1].x) / 2, y: (line[i].y + line[i + 1].y) / 2 };
      g.quadraticCurveTo(line[i].x, line[i].y, m.x, m.y);
    }
    const end = line[line.length - 1];
    g.lineTo(end.x, end.y);
  };
  const strokeMask = (lines: readonly (readonly Pt[])[], width: number) => {
    const g = new Graphics();
    for (const line of lines) { curve(g, line); g.stroke({ width, color: 0xffffff, cap: 'round', join: 'round' }); }
    return g;
  };
  const tiled = (name: string, k: number, lines: readonly (readonly Pt[])[], width: number) => {
    const holder = new Container();
    const ts = new TilingSprite({ texture: tex[name], width: MAP.width, height: MAP.height });
    ts.tileScale.set(k);
    const m = strokeMask(lines, width);
    ts.mask = m;
    holder.addChild(ts, m);
    return { holder, ts };
  };
  const makeLife = (L: ChapterLife, parent: Container = life) => {
    const box = new Container();
    box.sortableChildren = true;
    box.visible = false;
    parent.addChild(box);
    const put = (name: string, at: Pt, width: number, anchorY = 0.7) => {
      const sp = new Sprite(tex[name]);
      sp.anchor.set(0.5, anchorY);
      sp.scale.set(width / sp.texture.width);
      sp.position.set(at.x, at.y);
      sp.zIndex = at.y;
      box.addChild(sp);
      return sp;
    };
    // k：原本的大小；flip：左右翻過來（x 用負的）
    const grow: { sp: Sprite; k: number; flip: boolean; delay: number }[] = [];
    const fire: { sp: Sprite; k: number; flip: boolean; ph: number }[] = [];
    if (L.roads) {
      const roads = tiled('t2-dirt', 0.03, L.roads, 3.2);
      roads.holder.alpha = 0.75;
      roads.holder.zIndex = -1100;
      box.addChild(roads.holder);
    }
    let water: ReturnType<typeof tiled> | null = null;
    const flow = new Graphics();
    if (L.canal) {
      const bank = tiled('t2-dirt', 0.035, L.canal, 8.5);
      bank.holder.zIndex = -1000;
      water = tiled('t2-water', 0.05, L.canal, 5);
      water.holder.zIndex = -999;
      const shine = new Graphics();
      for (const line of L.canal) { curve(shine, line); shine.stroke({ width: 1.2, color: 0xffffff, alpha: 0.28, cap: 'round', join: 'round' }); }
      shine.zIndex = -998;
      flow.zIndex = -997;
      box.addChild(bank.holder, water.holder, shine, flow);
    }
    const paddies = (L.paddies ?? []).map((at) => {
      const green = put('m2-paddy-green', at, 40, 0.6);
      const gold = put('m2-paddy-gold', at, 40, 0.6);
      green.zIndex = gold.zIndex = at.y - 30; // 田貼在地上，人站在上面
      grow.push({ sp: green, k: green.scale.y, flip: false, delay: 0.3 + Math.random() * 0.5 }, { sp: gold, k: gold.scale.y, flip: false, delay: 0.3 });
      return { green, gold };
    });
    for (const b of L.buildings) {
      const sp = put(b.name, b.at, b.width);
      if (b.flip) sp.scale.x *= -1;
      grow.push({ sp, k: sp.scale.y, flip: !!b.flip, delay: 0.1 + grow.length * 0.08 });
      if (b.flicker) fire.push({ sp, k: sp.scale.y, flip: !!b.flip, ph: grow.length });
    }
    for (const d of L.scenery ?? []) {
      const sp = put(d.name, d.at, d.width, 0.75);
      if (d.flip) sp.scale.x *= -1;
      grow.push({ sp, k: sp.scale.y, flip: !!d.flip, delay: 0.2 + Math.random() * 0.6 });
      if (d.flicker) fire.push({ sp, k: sp.scale.y, flip: !!d.flip, ph: grow.length });
    }
    // 會換圖的東西：照第一張的比例縮放，換圖時輕輕彈一下
    const cycles = (L.cycles ?? []).map((c) => {
      const sp = put(c.frames[0], c.at, c.width, 0.8);
      if (c.ground) sp.zIndex = c.at.y - 30;
      const k = c.width / tex[c.frames[0]].width;
      grow.push({ sp, k, flip: false, delay: 0.3 + Math.random() * 0.5 });
      return { c, sp, k, cur: 0, t0: -9 };
    });
    // 炊煙：每個煙囪三團煙，輪流往上飄、變大、變淡
    const smoke = (L.smoke ?? []).flatMap((at, i) => [0, 1, 2].map((j) => {
      const sp = new Sprite(tex.smoke);
      sp.anchor.set(0.5);
      sp.zIndex = 10000;
      box.addChild(sp);
      return { sp, at, ph: i * 0.37 + j / 3 };
    }));
    const actors = L.actors.map((def, i) => {
      const art = ACTOR_ART[def.kind];
      const sp = new Sprite(tex[art.idle]);
      sp.anchor.set(0.5, 0.95);
      const k = art.height / sp.texture.height;
      sp.scale.set(k);
      box.addChild(sp);
      return { def, sp, k, ph: i * 1.7, at: def.at ?? def.path![0], big: 1 };
    });
    // 圳道裡的水往下游流：水面上幾道反光，順著圳道往下游漂（不要太多，免得像虛線）
    const canalLens = (L.canal ?? []).map((line) => {
      let len = 0;
      for (let i = 1; i < line.length; i++) len += Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y);
      return len;
    });
    const drawFlow = (t: number) => {
      if (water && L.canal) {
        flow.clear();
        water.ts.tilePosition.set(-t * 6, t * 1.5);
        L.canal.forEach((line, li) => {
          const len = canalLens[li];
          for (let d = (t * 10) % 34; d < len; d += 34) {
            const p = pointAlong(line, d), q = pointAlong(line, Math.min(len, d + 4));
            flow.moveTo(p.x, p.y).lineTo(q.x, q.y);
          }
        });
        flow.stroke({ width: 0.9, color: 0xffffff, alpha: 0.6, cap: 'round' });
      }
      for (const s of smoke) {
        const u = (t * 0.25 + s.ph) % 1;
        s.sp.position.set(s.at.x + Math.sin((t + s.ph * 6) * 0.8) * 1.5 + u * 4, s.at.y - u * 16);
        s.sp.scale.set((3 + u * 7) / s.sp.texture.width * 1.6);
        s.sp.alpha = 0.55 * Math.sin(u * Math.PI);
      }
    };
    return { box, grow, fire, cycles, paddies, actors, drawFlow, growing: null as { t0: number } | null };
  };
  const lives = new Map<string, ReturnType<typeof makeLife>>();
  const setLife = (id: string, on: boolean) => { const l = lives.get(id); if (l) l.box.visible = on; };
  // 還沒撥開的章：圖讀好才做出來（先藏著，過關撥雲時才出現）
  const pending = new Map<string, Promise<ReturnType<typeof makeLife> | undefined>>();
  const ensureLife = (id: string) => {
    if (lives.has(id)) return Promise.resolve(lives.get(id));
    const L = LIFE[id as keyof typeof LIFE];
    if (!L) return Promise.resolve(undefined);
    if (!pending.has(id)) pending.set(id, loadAtlas(id).then(() => loadTex(lifeNames(L))).then(() => {
      if (destroyed) return undefined;
      if (!lives.has(id)) { const l = makeLife(L); l.box.visible = openedSet.has(id); lives.set(id, l); }
      return lives.get(id);
    }));
    return pending.get(id)!;
  };

  // ── 現在：今天的臺灣（base 一直在，過去打完的章多出新舊對照）、現在篇的地點 ──
  const nowLives = new Map<string, ReturnType<typeof makeLife>>();
  if (NOW_ON) for (const [id, L] of Object.entries(NOW_LIFE)) if (L) nowLives.set(id, makeLife(L, nowLayer));
  const setNowOpened = (ids: readonly string[]) => {
    for (const [id, l] of nowLives) l.box.visible = id === 'base' || ids.includes(id);
  };
  interface Place { id: string; box: Container; sp: Sprite; cones: Sprite | null; label: Text; at: Pt }
  const placeList: Place[] = NOW_ON ? NOW_PLACES.map((p) => {
    const box = new Container();
    box.position.set(p.at.x, p.at.y);
    box.zIndex = 30000;
    const glow = new Sprite(puff);
    glow.anchor.set(0.5);
    glow.tint = 0xffe58a;
    glow.alpha = 0.55;
    glow.scale.set(0.8, 0.45);
    const sp = new Sprite(tex[p.art]);
    sp.anchor.set(0.5, 0.8);
    sp.scale.set(p.width / sp.texture.width);
    let cones: Sprite | null = null;
    if (!p.ready) {
      cones = new Sprite(tex['y3-6']);
      cones.anchor.set(0.5, 0.5);
      cones.scale.set((p.width * 0.45) / cones.texture.width);
      cones.position.set(p.width * 0.38, 2);
    }
    const label = new Text({
      text: p.name,
      style: { fontFamily: '"Noto Sans TC", system-ui, sans-serif', fontSize: LABEL_PX * 2, fontWeight: '900', fill: 0xfff2b0, align: 'center', stroke: { color: 0x1d4f6b, width: 7 } },
      resolution: 2,
    });
    label.anchor.set(0.5, 0);
    box.addChild(glow, sp, ...(cones ? [cones] : []), label);
    nowLayer.addChild(box);
    return { id: p.id, box, sp, cones, label, at: p.at };
  }) : [];
  let era: Era = opt.era ?? 'past';
  let eraK = era === 'now' ? 1 : 0; // 0＝過去、1＝現在，切換時慢慢變

  // ── 時空裂縫 ──
  interface Rift { id: ChapterId; box: Container; glow: Sprite; rift: Sprite; badge: Sprite; label: Text; state: RiftState }
  const riftList: Rift[] = CHAPTERS.map((ch) => {
    const box = new Container();
    box.position.set(ch.rift.x, ch.rift.y);
    const glow = new Sprite(puff);
    glow.anchor.set(0.5);
    glow.tint = 0x5fe3ff;
    glow.scale.set(0.9, 1.25);
    glow.position.set(0, -34);
    const rift = new Sprite(tex.rift);
    rift.anchor.set(0.5, 1);
    rift.scale.set(72 / rift.texture.height);
    const badge = new Sprite(tex[`badge-${ch.badge}`]);
    badge.anchor.set(0.5, 1);
    badge.scale.set(44 / badge.texture.height);
    badge.visible = false;
    const label = new Text({
      text: `${ch.no}・${ch.title}`,
      style: { fontFamily: '"Noto Sans TC", system-ui, sans-serif', fontSize: LABEL_PX * 2, fontWeight: '900', fill: 0xffffff, align: 'center', stroke: { color: 0x6b3f1f, width: 7 } },
      resolution: 2,
    });
    label.anchor.set(0.5, 0);
    label.position.set(0, 6);
    box.addChild(glow, rift, badge, label);
    rifts.addChild(box);
    return { id: ch.id, box, glow, rift, badge, label, state: 'locked' as RiftState };
  });

  // ── 鏡頭 ──
  const b = { left: 0, top: 0, width: MAP.width, height: MAP.height };
  const size = () => ({ width: app.screen.width, height: app.screen.height });
  const fit = () => fitView(b, size()).scale;
  const unit = () => fitView(UNIT, size()).scale;
  const maxK = () => (unit() * MAX_ZOOM) / fit();
  const centerOn = (at: Pt, zoom: number): View => {
    const k = clamp(unit() * zoom, fit(), unit() * MAX_ZOOM);
    return clampView({ scale: k, x: size().width / 2 - at.x * k, y: size().height / 2 - at.y * k }, b, size());
  };
  let view: View = opt.start ? centerOn(opt.start.at, opt.start.zoom) : fitView(b, size());
  let flying = false;
  const apply = () => {
    world.scale.set(view.scale);
    world.position.set(view.x, view.y);
    // 裂縫在畫面上大約固定大小（拉遠不會小到看不見，也不會蓋住台灣輪廓）；字一律同樣大小。
    // 還沒開放的章拉近才出現名字，免得一整片字蓋住地圖
    const vs = view.scale;
    const z = vs / unit();
    for (const r of riftList) {
      const lit = r.state === 'open' || r.state === 'hook';
      const screen = clamp(72 * vs, lit ? 64 : 38, lit ? 104 : 64);
      const k = screen / (72 * vs);
      r.box.scale.set(k);
      r.label.scale.set(0.5 / (vs * k));
      const up = CHAPTERS.find((c) => c.id === r.id)!.labelUp;
      r.label.anchor.set(up ? 1 : 0.5, up ? 0.5 : 0);
      r.label.position.set(up ? -20 : 0, up ? -36 : 4 / (vs * k));
      // 拉到看得到整座島時字會疊在一起，只留發光的章
      r.label.visible = r.state === 'done' ? z > 0.7 && z < 2 : lit || z > 1.8;
      // 過關的徽章拉到最遠時先收起來，讓長出來的村子和小人露出來（下面時間軸有打勾）
      r.badge.visible = r.state === 'done' && z > 0.7;
    }
    for (const p of placeList) {
      const k = clamp(48 * vs, 44, 84) / (48 * vs);
      p.box.scale.set(k);
      p.label.scale.set(0.5 / (vs * k));
      p.label.position.set(0, 4 / (vs * k));
    }
  };
  apply();
  app.renderer.on('resize', () => { view = clampView(view, b, size()); apply(); });

  const tween = (to: View, ms: number) => new Promise<void>((done) => {
    const from = { ...view };
    const t0 = performance.now();
    flying = true;
    const step = () => {
      const k = ease(Math.min(1, (performance.now() - t0) / ms));
      // 用對數內插縮放，拉近拉遠看起來速度一致
      const s = Math.exp(Math.log(from.scale) + (Math.log(to.scale) - Math.log(from.scale)) * k);
      // 讓畫面中心在兩個目標之間平滑移動
      const cx0 = (size().width / 2 - from.x) / from.scale, cy0 = (size().height / 2 - from.y) / from.scale;
      const cx1 = (size().width / 2 - to.x) / to.scale, cy1 = (size().height / 2 - to.y) / to.scale;
      const cx = cx0 + (cx1 - cx0) * k, cy = cy0 + (cy1 - cy0) * k;
      view = { scale: s, x: size().width / 2 - cx * s, y: size().height / 2 - cy * s };
      apply();
      if (k < 1) requestAnimationFrame(step);
      else { flying = false; view = to; apply(); done(); }
    };
    requestAnimationFrame(step);
  });

  // ── 觸控 ──
  const el = app.canvas;
  el.style.touchAction = 'none';
  const local = (cx: number, cy: number) => {
    const r = el.getBoundingClientRect();
    return { x: cx - r.left, y: cy - r.top };
  };
  const toWorld = (p: { x: number; y: number }): Pt => ({ x: (p.x - view.x) / view.scale, y: (p.y - view.y) / view.scale });
  const fingers = new Map<number, { x: number; y: number }>();
  let tap: { id: number; x: number; y: number } | null = null;
  let pinch: { d: number; mx: number; my: number } | null = null;
  const two = () => {
    const [p, q] = [...fingers.values()];
    return { d: Math.hypot(p.x - q.x, p.y - q.y) || 1, mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2 };
  };
  // 點到哪個小人：量到身體中間，範圍跟著小人在畫面上的大小（拉遠時小人放大了，也不會把旁邊的裂縫搶走）
  const actorAt = (ls: ReturnType<typeof makeLife>[], w: Pt): ActorDef | null => {
    let best: ActorDef | null = null, bd = Infinity;
    for (const L of ls) {
      if (!L.box.visible) continue;
      for (const a of L.actors) {
        if (!a.sp.visible) continue;
        const h = ACTOR_ART[a.def.kind].height * a.big;
        const d = Math.hypot(w.x - a.at.x, w.y - (a.at.y - h / 2));
        if (d < Math.max(h * 0.7, 10 / view.scale) && d < bd) { bd = d; best = a.def; }
      }
    }
    return best;
  };
  const hitAt = (w: Pt): Hit | null => {
    if (era === 'now') {
      const got = actorAt([...nowLives.values()], w);
      if (got) return { kind: 'actor', actor: got };
      const ph = nearest(placeList.map((p) => ({ at: { x: p.at.x, y: p.at.y - 12 * p.box.scale.x }, p })), w, Math.max(30, 50 / view.scale) * (placeList[0]?.box.scale.x ?? 1));
      return ph ? { kind: 'place', id: ph.p.id } : null;
    }
    if (!relief.visible) {
      const got = actorAt([...lives.values()], w);
      if (got) return { kind: 'actor', actor: got };
    }
    const rr = riftList.map((x) => ({ at: { x: x.box.x, y: x.box.y - 30 * x.box.scale.x }, x }));
    const rh = nearest(rr, w, Math.max(30, 50 / view.scale) * riftList[0].box.scale.x);
    if (rh) return { kind: 'rift', id: rh.x.id };
    const reg = regions.at(w.x, w.y);
    if (!reg) return null;
    const ch = CHAPTERS.find((c) => c.region === reg) ?? null;
    return { kind: 'region', id: ch?.id ?? null, fogged: !ch || !openedSet.has(ch.id) };
  };
  const down = (e: PointerEvent) => {
    if (flying) return;
    try { el.setPointerCapture(e.pointerId); } catch { /* 合成事件 */ }
    const p = local(e.clientX, e.clientY);
    fingers.set(e.pointerId, p);
    if (fingers.size === 1) tap = { id: e.pointerId, ...p };
    else { tap = null; pinch = fingers.size === 2 ? two() : null; }
  };
  const move = (e: PointerEvent) => {
    const prev = fingers.get(e.pointerId);
    if (!prev || flying) return;
    const p = local(e.clientX, e.clientY);
    fingers.set(e.pointerId, p);
    if (fingers.size === 1) {
      if (tap && Math.hypot(p.x - tap.x, p.y - tap.y) > TAP_SLOP) tap = null;
      if (!tap) view = panBy(view, p.x - prev.x, p.y - prev.y, b, size());
    } else if (fingers.size === 2 && pinch) {
      const now = two();
      view = zoomAt(view, now.d / pinch.d, now.mx, now.my, b, size(), maxK());
      view = panBy(view, now.mx - pinch.mx, now.my - pinch.my, b, size());
      pinch = now;
    }
    apply();
  };
  const up = (e: PointerEvent) => {
    if (!fingers.delete(e.pointerId)) return;
    if (tap && tap.id === e.pointerId && e.type === 'pointerup' && !flying) opt.onTap?.(hitAt(toWorld(local(e.clientX, e.clientY))));
    tap = null;
    pinch = fingers.size === 2 ? two() : null;
  };
  const wheel = (e: WheelEvent) => {
    e.preventDefault();
    if (flying) return;
    const p = local(e.clientX, e.clientY);
    view = zoomAt(view, Math.exp(-e.deltaY * 0.0015), p.x, p.y, b, size(), maxK());
    apply();
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', wheel, { passive: false });

  // 一開始：撥開的地區沒有雲、第五章過了就活起來
  for (const id of opt.opened) clearFog(id);
  thinEdges();
  for (const id of lives.keys()) setLife(id, openedSet.has(id));
  // 地圖出來以後，一章一章在背景讀各章的人和房子：已撥開的章先（讀好就出現），再讀還沒撥開的
  const order = [...Object.keys(LIFE)].sort((a, b2) => Number(!openedSet.has(a)) - Number(!openedSet.has(b2)));
  // 圖集一次全部開始抓（一共才八張），人和房子還是照順序一章章做出來
  for (const id of order) void loadAtlas(id);
  void (async () => { for (const id of order) { if (destroyed) return; await ensureLife(id).catch(() => {}); } mark('各章人物房子到齊'); })();
  setNowOpened(opt.opened);
  buildRelief();
  const showEra = () => {
    life.alpha = fog.alpha = rifts.alpha = 1 - eraK;
    life.visible = fog.visible = rifts.visible = eraK < 1 && !relief.visible;
    nowLayer.alpha = eraK;
    nowLayer.visible = eraK > 0 && !relief.visible;
  };
  showEra();

  // ── 每一格的動畫 ──
  let t = 0;
  const dispelling: { list: Puff[]; t0: number; cx: number; cy: number }[] = [];
  app.ticker.add((tk) => {
    t += tk.deltaMS / 1000;
    const want = era === 'now' ? 1 : 0;
    if (eraK !== want) {
      eraK = want > eraK ? Math.min(1, eraK + tk.deltaMS / 900) : Math.max(0, eraK - tk.deltaMS / 900);
      showEra();
    }
    for (const p of placeList) {
      p.sp.y = -Math.abs(Math.sin(t * 2 + p.at.x)) * 2;
      if (p.cones) p.cones.alpha = 0.8 + 0.2 * Math.sin(t * 3);
    }
    sea.tilePosition.set(t * 6, t * 3);
    for (const p of puffs) {
      if (p.gone) continue;
      p.sp.x = p.x + Math.sin(t * 0.35 + p.ph) * 6;
      p.sp.y = p.y + Math.cos(t * 0.27 + p.ph) * 3;
      if (thin.has(p) && p.sp.alpha > 0.5) {
        p.sp.alpha = Math.max(0.5, p.sp.alpha - 0.01);
        p.sp.scale.set(Math.max(p.k * 0.75, p.sp.scale.y - 0.004) * 1.25, Math.max(p.k * 0.75, p.sp.scale.y - 0.004));
      }
    }
    for (const d of dispelling) {
      const u = t - d.t0;
      for (const p of d.list) {
        const dist = Math.hypot(p.x - d.cx, p.y - d.cy);
        const k = clamp((u - dist / 700) / 1.6, 0, 1); // 從裂縫往外一圈一圈散開
        const dx = (p.x - d.cx) / (dist || 1), dy = (p.y - d.cy) / (dist || 1);
        p.sp.x = p.x + dx * k * 140;
        p.sp.y = p.y + dy * k * 90 - k * 30;
        p.sp.alpha = 0.82 * (1 - k);
        p.sp.scale.set(p.k * 1.25 * (1 + k * 0.8), p.k * (1 + k * 0.8));
        if (k >= 1) { p.gone = true; p.sp.visible = false; }
      }
    }
    // 裂縫一閃一閃
    for (const r of riftList) {
      const lit = r.state === 'open' || r.state === 'hook';
      const pulse = (Math.sin(t * (lit ? 3 : 1.2) + r.box.x) + 1) / 2;
      r.glow.alpha = r.state === 'done' ? 0 : lit ? 0.3 + 0.35 * pulse : 0;
      r.glow.scale.set((0.9 + 0.15 * pulse) * (lit ? 1 : 0), (1.25 + 0.2 * pulse) * (lit ? 1 : 0));
      r.rift.y = lit ? -Math.sin(t * 2) * 3 : 0;
    }
    const lod = lodLevel(view.scale / unit());
    const phase = t / SEASON_SECONDS;
    const look = paddyLook(phase);
    const season = seasonAt(phase);
    const vs = view.scale;
    const bigT = clamp(THING_PX / (28 * vs), 1, THING_MAX);
    for (const L of [...(life.visible ? lives.values() : []), ...(nowLayer.visible ? nowLives.values() : [])]) {
      if (!L.box.visible) continue;
      // 建設長出來：從 0 彈到原本大小
      if (L.growing) {
        const u = t - L.growing.t0;
        for (const g of L.grow) {
          const k = clamp((u - g.delay) / 0.5, 0, 1);
          const s = k < 1 ? k * (1 + 0.25 * Math.sin(k * Math.PI)) : 1;
          g.sp.scale.set(g.k * s * bigT * (g.flip ? -1 : 1), g.k * s * bigT);
        }
        if (u > 3) L.growing = null;
      }
      if (!L.growing) {
        for (const g of L.grow) g.sp.scale.set(g.k * bigT * (g.flip ? -1 : 1), g.k * bigT);
        for (const p of L.paddies) { p.green.alpha = look.green; p.gold.alpha = look.gold; }
        for (const f of L.fire) {
          const w = 1 + 0.06 * Math.sin(t * 9 + f.ph) + 0.04 * Math.sin(t * 23 + f.ph * 2);
          f.sp.scale.set(f.k * bigT * w * (f.flip ? -1 : 1), f.k * bigT * (2 - w));
          f.sp.alpha = 0.85 + 0.15 * Math.sin(t * 13 + f.ph);
        }
        for (const c of L.cycles) {
          const n = c.c.frames.length;
          const i = Math.floor((((t / c.c.seconds + (c.c.ph ?? 0)) % 1) * n));
          if (i !== c.cur) { c.cur = i; c.t0 = t; c.sp.texture = tex[c.c.frames[i]]; }
          const u = clamp((t - c.t0) / 0.4, 0, 1);
          const pop = u < 1 ? 0.7 + 0.3 * u + 0.15 * Math.sin(u * Math.PI) : 1;
          c.sp.scale.set(c.k * bigT * pop);
        }
      }
      L.drawFlow(t);
      for (const a of L.actors) {
        const art = ACTOR_ART[a.def.kind];
        a.sp.visible = a.def.lod <= lod;
        if (!a.sp.visible) continue;
        let name = art.idle, left = false;
        let bob = 0;
        if (a.def.path) {
          const w = walker(a.def.path, a.def.speed ?? 8, t + a.ph);
          a.at = w.at;
          left = w.left;
          if (!w.resting) {
            name = art.walk[Math.floor((t + a.ph) * 6) % art.walk.length];
            bob = art.walk.length === 1 ? Math.abs(Math.sin((t + a.ph) * 8)) * 0.8 : 0;
          }
        } else if (art.loop) {
          name = art.loop[Math.floor((t + a.ph) * 1.6) % art.loop.length];
        } else if (art.work) {
          if (season === 'seedling') name = art.work.plant;
          else if (season === 'harvest' || (season === 'golden' && phase % 1 > 0.75)) name = art.work.harvest;
          else name = Math.floor((t + a.ph) / 3) % 3 === 0 ? art.walk[Math.floor(t * 4) % art.walk.length] : art.idle;
        }
        if (a.sp.texture !== tex[name]) a.sp.texture = tex[name];
        a.big = clamp(PERSON_PX / (art.height * vs), 1, PERSON_MAX);
        const k = (art.height / a.sp.texture.height) * a.big;
        a.sp.scale.set(left ? -k : k, k);
        if (art.fly) bob = 3 + Math.sin((t + a.ph) * 3) * 1.5;
        a.sp.position.set(a.at.x, a.at.y - bob * a.big);
        a.sp.zIndex = art.fly ? 20000 : a.at.y;
      }
    }
  });

  return {
    fps: () => app.ticker.FPS,
    setRifts(s) {
      for (const r of riftList) {
        r.state = s[r.id] ?? 'locked';
        const done = r.state === 'done';
        r.rift.visible = !done;
        r.badge.visible = done;
        r.rift.alpha = r.state === 'locked' ? 0.55 : 1;
        r.rift.tint = r.state === 'locked' ? 0xb8c4cc : 0xffffff;
        const ch = CHAPTERS.find((c) => c.id === r.id)!;
        r.label.text = `${ch.no}・${ch.title}`;
        r.label.style.fill = r.state === 'locked' ? 0xdfe6ea : r.state === 'done' ? 0xfff2b0 : 0xffffff;
      }
      apply();
    },
    setGlasses(on) {
      relief.visible = on;
      showEra();
    },
    setEra(e) {
      era = e;
    },
    setNowOpened,
    async dispel(id) {
      const ch = CHAPTERS.find((c) => c.id === id);
      if (!ch) return;
      const list = fogOf(id);
      dispelling.push({ list, t0: t, cx: ch.rift.x, cy: ch.rift.y });
      openedSet.add(id);
      buildRelief();
      setTimeout(thinEdges, 1500);
      const L = await ensureLife(id);
      if (L) {
        for (const g of L.grow) g.sp.scale.set(0);
        setLife(id, true);
        L.growing = { t0: t + 0.9 };
      }
      await new Promise((r) => setTimeout(r, 3200));
    },
    flyTo(at, zoom, ms = 900) {
      return tween(centerOn(at, zoom), ms);
    },
    clientOf(p) {
      const r = el.getBoundingClientRect();
      return { x: r.left + view.x + p.x * view.scale, y: r.top + view.y + p.y * view.scale };
    },
    zoom: () => view.scale / unit(),
    destroy() {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
      destroyed = true;
      app.destroy(true, { children: true });
    },
  };
}
