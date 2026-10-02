// 全台大地圖：M-01 底圖、時光雲霧、時空裂縫、過關後「活著」的彰化平原、地形眼鏡。
// 只畫、不做判斷（規則在 core/world.ts，資料在 data/world.ts）。
//
// 座標用 M-01 原圖的像素。觸控跟關卡一樣：單指平移、雙指縮放、點一下。
// 效能：雲霧是幾百張同一張貼圖的 Sprite（一次批次畫完），會動的小人最多約 10 個，拉遠就藏起來。

import { Application, Assets, Container, Graphics, Sprite, Text, Texture, TilingSprite } from 'pixi.js';
import { clampView, fitView, panBy, zoomAt, type View } from '../core/camera';
import { lodLevel, nearest, paddyLook, pointAlong, seasonAt, walker, type Pt } from '../core/world';
import {
  ACTOR_ART, CHAPTERS, LIFE, MAP, SEASON_SECONDS, isl,
  type ActorDef, type ChapterId, type ChapterLife,
} from '../data/world';

const MAX_ZOOM = 6; // 最多放大到「一倍」的幾倍
// 「一倍」＝放得下 2071×1492 這麼大一塊（第一版 M-01 的整張），看彰化平原的小人剛好；
// 新底圖整座島比這大很多，拉到最遠（放得下整張）大約是 0.4 倍
const UNIT = { left: 0, top: 0, width: 2071, height: 1492 };
const TAP_SLOP = 8;
const FOG_STEP = 90; // 雲一團一團的間距（原圖像素）
const SEA = 0x58b4d8;
const LABEL_PX = 14; // 地圖上章名的字在畫面上幾 px

export type RiftState = 'open' | 'locked' | 'hook' | 'done';

export type Hit =
  | { kind: 'actor'; actor: ActorDef }
  | { kind: 'rift'; id: ChapterId }
  | { kind: 'region'; id: ChapterId | null; fogged: boolean };

export interface WorldMapOptions {
  opened: readonly string[]; // 已經撥開雲霧的章
  onTap?: (hit: Hit | null) => void;
  start?: { at: Pt; zoom: number }; // 一開始鏡頭在哪（從關卡回來時先停在彰化，再拉遠）
}

export interface WorldMap {
  fps: () => number;
  setRifts: (s: Partial<Record<ChapterId, RiftState>>) => void;
  setGlasses: (on: boolean) => void;
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

// 地區分界圖：每個像素的 R＝地區編號
async function loadRegions(): Promise<{ w: number; h: number; at: (x: number, y: number) => number; data: Uint8Array }> {
  const im = new Image();
  im.src = MAP.regions;
  await im.decode();
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

// 大地圖一打開就要用的圖（進場進度條也照這份先讀好，見 ui/Island.tsx firstScreenImages）
function mapImageNames(): Set<string> {
  const names = new Set<string>(['m01', 'm01-relief', 'rift', 'badge-canal', 't2-water', 't2-dirt', 'smoke', 'm2-paddy-green', 'm2-paddy-gold']);
  for (const L of Object.values(LIFE)) {
    for (const d of [...L!.buildings, ...(L!.scenery ?? [])]) names.add(d.name);
    for (const c of L!.cycles ?? []) for (const f of c.frames) names.add(f);
  }
  for (const a of Object.values(ACTOR_ART)) {
    for (const f of [...a.walk, a.idle, ...Object.values(a.work ?? {}), ...(a.loop ?? [])]) names.add(f);
  }
  return names;
}
export const mapImageUrls = () => [...[...mapImageNames()].map(isl), MAP.regions];

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

  const names = mapImageNames();
  const tex: Record<string, Texture> = {};
  const [regions] = await Promise.all([
    loadRegions(),
    ...[...names].map(async (n) => { tex[n] = await Assets.load<Texture>(isl(n)); }),
  ]);
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
  world.addChild(sea, island, relief, life, fog, rifts);

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
  const makeLife = (L: ChapterLife) => {
    const box = new Container();
    box.sortableChildren = true;
    box.visible = false;
    life.addChild(box);
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
      return { def, sp, k, ph: i * 1.7, at: def.at ?? def.path![0] };
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
  for (const [id, L] of Object.entries(LIFE)) if (L) lives.set(id, makeLife(L));
  const setLife = (id: string, on: boolean) => { const l = lives.get(id); if (l) l.box.visible = on; };

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
    const badge = new Sprite(tex['badge-canal']);
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
  const hitAt = (w: Pt): Hit | null => {
    const r = Math.max(8, 26 / view.scale);
    if (!relief.visible) {
      const vis = [...lives.values()].filter((L) => L.box.visible).flatMap((L) => L.actors).filter((a) => a.sp.visible).map((a) => ({ at: a.at, a }));
      const got = nearest(vis, { x: w.x, y: w.y - 6 }, r);
      if (got) return { kind: 'actor', actor: got.a.def };
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
  buildRelief();

  // ── 每一格的動畫 ──
  let t = 0;
  const dispelling: { list: Puff[]; t0: number; cx: number; cy: number }[] = [];
  app.ticker.add((tk) => {
    t += tk.deltaMS / 1000;
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
    for (const L of lives.values()) {
      if (!L.box.visible) continue;
      // 建設長出來：從 0 彈到原本大小
      if (L.growing) {
        const u = t - L.growing.t0;
        for (const g of L.grow) {
          const k = clamp((u - g.delay) / 0.5, 0, 1);
          const s = k < 1 ? k * (1 + 0.25 * Math.sin(k * Math.PI)) : 1;
          g.sp.scale.set(g.k * s * (g.flip ? -1 : 1), g.k * s);
        }
        if (u > 3) { L.growing = null; for (const g of L.grow) g.sp.scale.set(g.k * (g.flip ? -1 : 1), g.k); }
      }
      if (!L.growing) {
        for (const p of L.paddies) { p.green.alpha = look.green; p.gold.alpha = look.gold; }
        for (const f of L.fire) {
          const w = 1 + 0.06 * Math.sin(t * 9 + f.ph) + 0.04 * Math.sin(t * 23 + f.ph * 2);
          f.sp.scale.set(f.k * w * (f.flip ? -1 : 1), f.k * (2 - w));
          f.sp.alpha = 0.85 + 0.15 * Math.sin(t * 13 + f.ph);
        }
        for (const c of L.cycles) {
          const n = c.c.frames.length;
          const i = Math.floor((((t / c.c.seconds + (c.c.ph ?? 0)) % 1) * n));
          if (i !== c.cur) { c.cur = i; c.t0 = t; c.sp.texture = tex[c.c.frames[i]]; }
          const u = clamp((t - c.t0) / 0.4, 0, 1);
          const pop = u < 1 ? 0.7 + 0.3 * u + 0.15 * Math.sin(u * Math.PI) : 1;
          c.sp.scale.set(c.k * pop);
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
        const k = art.height / a.sp.texture.height;
        a.sp.scale.set(left ? -k : k, k);
        if (art.fly) bob = 3 + Math.sin((t + a.ph) * 3) * 1.5;
        a.sp.position.set(a.at.x, a.at.y - bob);
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
      life.visible = !on;
    },
    async dispel(id) {
      const ch = CHAPTERS.find((c) => c.id === id);
      if (!ch) return;
      const list = fogOf(id);
      dispelling.push({ list, t0: t, cx: ch.rift.x, cy: ch.rift.y });
      openedSet.add(id);
      buildRelief();
      setTimeout(thinEdges, 1500);
      const L = lives.get(id);
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
      app.destroy(true, { children: true });
    },
  };
}
