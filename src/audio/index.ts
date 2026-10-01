// 音效與音樂。檔名就是全站統一編號（樂園音效提示詞那份），放在 public/audio/，例如 SE-32.mp3、MU-10.mp3。
//
// 檔案還沒產出來也照樣能玩：找不到檔的音效改用幾個合成的小聲音頂著，音樂與環境音就安靜。
// 規則（照守護異世界的經驗）：音效小聲、學生自己可以關；音樂只放在大地圖與豐收結算，
// 關卡裡只放環境音（溪水、田野）。老師頁完全不放聲音。
// 瀏覽器要等使用者點過一次才肯出聲，第一次點畫面時才解鎖。

export type SeCode =
  | 'SE-01' | 'SE-02' | 'SE-03' | 'SE-04' | 'SE-05' | 'SE-07' | 'SE-08' | 'SE-09'
  | 'SE-13' | 'SE-31' | 'SE-32' | 'SE-33' | 'SE-34' | 'SE-35' | 'SE-36' | 'SE-37' | 'SE-38' | 'SE-39' | 'SE-40' | 'SE-41'
  | 'SE-50' | 'SE-51' | 'SE-52' | 'SE-53' | 'SE-54' | 'SE-56' | 'SE-57' | 'SE-58' | 'SE-60'
  | 'SE-63' | 'SE-64' | 'SE-65' | 'SE-66' | 'SE-67' | 'SE-68' | 'SE-69' | 'SE-70' | 'SE-71' | 'SE-72' | 'SE-73' | 'SE-74';
export type MuCode = 'MU-10' | 'MU-13' | 'MU-14' | 'MU-17';
export type AmbCode = 'SE-30' | 'SE-55' | 'SE-61' | 'SE-62' | 'SE-75' | 'SE-76';

const BASE = import.meta.env.BASE_URL;
const url = (code: string) => `${BASE}audio/${code}.mp3`;

// 音量：音效偏小（一整班一起玩）
const VOL = { se: 0.5, music: 0.32, amb: 0.28 };

// ── 開關（存在這台平板） ───────────────────────────────
export type Mode = 'all' | 'sfx' | 'off'; // 全開／只有音效／全關
const FLAG = 'island.audio.mode';
export function getMode(): Mode {
  try {
    const v = globalThis.localStorage?.getItem(FLAG);
    return v === 'sfx' || v === 'off' ? v : 'all';
  } catch { return 'all'; }
}
export function setMode(m: Mode) {
  try { globalThis.localStorage?.setItem(FLAG, m); } catch { /* 存不了就只管這次 */ }
  mode = m;
  if (m !== 'all') stopLoop('music');
  if (m === 'off') stopLoop('amb');
  else resumeWanted();
  listeners.forEach((f) => f(m));
}
const listeners = new Set<(m: Mode) => void>();
export const onMode = (f: (m: Mode) => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
let mode: Mode = getMode();

// ── WebAudio ──────────────────────────────────────
let ctx: AudioContext | null = null;
const buffers = new Map<string, AudioBuffer | null | Promise<AudioBuffer | null>>(); // null＝沒有這個檔

function audio(): AudioContext | null {
  if (ctx) return ctx;
  const C = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!C) return null;
  try { ctx = new C(); } catch { return null; }
  return ctx;
}

// 第一次點畫面時解鎖（iPad Safari 一定要在點擊裡 resume）
export function unlock() {
  const a = audio();
  if (a && a.state === 'suspended') void a.resume();
  resumeWanted();
}
if (typeof window !== 'undefined') {
  const once = () => { unlock(); window.removeEventListener('pointerdown', once, true); window.removeEventListener('keydown', once, true); };
  window.addEventListener('pointerdown', once, true);
  window.addEventListener('keydown', once, true);
}

function load(code: string): Promise<AudioBuffer | null> {
  const have = buffers.get(code);
  if (have !== undefined) return Promise.resolve(have);
  const a = audio();
  if (!a) return Promise.resolve(null);
  const p = fetch(url(code))
    .then((r) => (r.ok && (r.headers.get('content-type') ?? '').startsWith('audio') ? r.arrayBuffer() : null))
    .then((b) => (b ? a.decodeAudioData(b) : null))
    .catch(() => null)
    .then((buf) => { buffers.set(code, buf); return buf; });
  buffers.set(code, p);
  return p;
}

// 先把這幾個載起來，第一次播才不會慢半拍
export function preload(codes: readonly string[]) { codes.forEach((c) => void load(c)); }

function out(gain: number): GainNode | null {
  const a = audio();
  if (!a) return null;
  const g = a.createGain();
  g.gain.value = gain;
  g.connect(a.destination);
  return g;
}

// ── 音效 ─────────────────────────────────────────
// rate：星星一顆比一顆高（1、1.12、1.26）
export function sfx(code: SeCode, rate = 1) {
  if (mode === 'off') return;
  const a = audio();
  if (!a || a.state !== 'running') return;
  void load(code).then((buf) => {
    if (mode === 'off') return;
    const g = out(VOL.se);
    if (!g) return;
    if (buf) {
      const s = a.createBufferSource();
      s.buffer = buf;
      s.playbackRate.value = rate;
      s.connect(g);
      s.start();
    } else synth(a, g, code, rate);
  });
}

// 還沒有檔案時頂著用的合成聲（木琴、鐘琴那種圓圓的聲音），沒列到的就不出聲
type Note = [freq: number, at: number, len: number];
const SYNTH: Partial<Record<SeCode, { wave: OscillatorType; notes: Note[] } | 'noise'>> = {
  'SE-01': { wave: 'sine', notes: [[880, 0, 0.06]] },
  'SE-02': { wave: 'sine', notes: [[660, 0, 0.06], [494, 0.06, 0.08]] },
  'SE-03': { wave: 'triangle', notes: [[523, 0, 0.08], [784, 0.07, 0.12]] },
  'SE-04': { wave: 'triangle', notes: [[330, 0, 0.12], [247, 0.12, 0.18]] },
  'SE-05': { wave: 'sine', notes: [[784, 0, 0.1], [1175, 0.09, 0.22]] },
  'SE-09': { wave: 'sine', notes: [[1047, 0, 0.04]] },
  'SE-34': { wave: 'triangle', notes: [[196, 0, 0.12], [262, 0.14, 0.1], [1047, 0.32, 0.9]] },
  'SE-35': { wave: 'sine', notes: [[1319, 0, 0.1], [1760, 0.08, 0.25]] },
  'SE-36': { wave: 'sine', notes: [[988, 0, 0.08], [1319, 0.08, 0.08], [1976, 0.16, 0.3]] },
  'SE-38': { wave: 'sine', notes: [[1568, 0, 0.05], [784, 0.05, 0.05], [1175, 0.12, 0.3]] },
  'SE-41': { wave: 'triangle', notes: [[392, 0, 0.06], [494, 0.08, 0.06], [784, 0.18, 0.3]] },
  'SE-60': { wave: 'sine', notes: [[523, 0, 0.12], [659, 0.1, 0.12], [784, 0.2, 0.3]] },
  'SE-71': { wave: 'triangle', notes: [[220, 0, 0.12], [165, 0.12, 0.25]] },
  'SE-57': { wave: 'triangle', notes: [[294, 0, 0.12], [220, 0.12, 0.2]] },
  'SE-32': 'noise',
  'SE-31': 'noise',
  'SE-54': 'noise',
};

function synth(a: AudioContext, g: GainNode, code: SeCode, rate: number) {
  const spec = SYNTH[code];
  if (!spec) return;
  const t0 = a.currentTime;
  if (spec === 'noise') {
    // 一陣風：白噪音過帶通濾波，慢慢掃高再淡出
    const len = 1.4;
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * len), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = a.createBufferSource();
    s.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.8;
    f.frequency.setValueAtTime(300, t0);
    f.frequency.exponentialRampToValueAtTime(2400, t0 + len * 0.7);
    const e = a.createGain();
    e.gain.setValueAtTime(0, t0);
    e.gain.linearRampToValueAtTime(0.5, t0 + 0.3);
    e.gain.linearRampToValueAtTime(0, t0 + len);
    s.connect(f).connect(e).connect(g);
    s.start(t0);
    return;
  }
  for (const [freq, at, len] of spec.notes) {
    const o = a.createOscillator();
    o.type = spec.wave;
    o.frequency.value = freq * rate;
    const e = a.createGain();
    const s = t0 + at;
    e.gain.setValueAtTime(0, s);
    e.gain.linearRampToValueAtTime(0.35, s + 0.008);
    e.gain.exponentialRampToValueAtTime(0.001, s + len + 0.12);
    o.connect(e).connect(g);
    o.start(s);
    o.stop(s + len + 0.15);
  }
}

// ── 音樂與環境音（循環） ─────────────────────────────
// 'music' 只放大地圖（MU-10）；'amb' 是關卡裡的溪水、田野聲。換畫面時呼叫一次就好，同一首不會重來
type Lane = 'music' | 'amb';
const wanted: Record<Lane, string | null> = { music: null, amb: null };
const playing: Record<Lane, { code: string; src: AudioBufferSourceNode; gain: GainNode } | null> = { music: null, amb: null };

export const music = (code: MuCode | null) => want('music', code);
export const ambience = (code: AmbCode | null) => want('amb', code);

function want(lane: Lane, code: string | null) {
  wanted[lane] = code;
  if (playing[lane]?.code === code) return;
  stopLoop(lane);
  if (code) void startLoop(lane, code);
}

function allowed(lane: Lane) { return lane === 'music' ? mode === 'all' : mode !== 'off'; }

async function startLoop(lane: Lane, code: string) {
  const a = audio();
  if (!a || a.state !== 'running' || !allowed(lane)) return;
  const buf = await load(code);
  if (!buf || wanted[lane] !== code || playing[lane] || !allowed(lane)) return;
  const g = out(0);
  if (!g) return;
  const src = a.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.connect(g);
  src.start();
  g.gain.linearRampToValueAtTime(lane === 'music' ? VOL.music : VOL.amb, a.currentTime + 1.2);
  playing[lane] = { code, src, gain: g };
}

function stopLoop(lane: Lane) {
  const p = playing[lane];
  if (!p || !ctx) { playing[lane] = null; return; }
  const t = ctx.currentTime;
  p.gain.gain.cancelScheduledValues(t);
  p.gain.gain.setValueAtTime(p.gain.gain.value, t);
  p.gain.gain.linearRampToValueAtTime(0, t + 0.6);
  p.src.stop(t + 0.65);
  playing[lane] = null;
}

function resumeWanted() {
  for (const lane of ['music', 'amb'] as Lane[]) if (wanted[lane] && !playing[lane]) void startLoop(lane, wanted[lane]!);
}

// 結算短曲（MU-13 過關、MU-14 再試一次、MU-17 豐收）：放一次，期間大地圖音樂先停
export function jingle(code: MuCode) {
  if (mode !== 'all') return;
  const a = audio();
  if (!a || a.state !== 'running') return;
  void load(code).then((buf) => {
    if (!buf || mode !== 'all') return;
    const g = out(VOL.music * 1.3);
    if (!g) return;
    const s = a.createBufferSource();
    s.buffer = buf;
    s.connect(g);
    s.start();
  });
}
