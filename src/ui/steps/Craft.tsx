import { useEffect, useRef, useState } from 'react';
import { CARDS, CHAPTER, CRAFT_INTRO, img, key } from '../../data/babao-chapter';
import { CAGES_NEEDED, CAGE_COST, canCraft, craft } from '../../core/save';
import { useBoard } from '../useBoard';
import { CardPop, Say, Talk } from '../Talk';
import type { Line } from '../../data/babao-chapter';
import type { StepProps } from '../Chapter';
import { sfx } from '../../audio';

// 溪水一漲一退：退的時候才撿得到溪邊的石頭。阿穆聽得出溪水要漲了，會先提醒。
const LOW_MS = 6000;
const HIGH_MS = 4000;
const WARN_MS = 1500; // 漲水前多久阿穆會提醒
export function tideAt(ms: number): { high: boolean; warn: boolean } {
  const t = ms % (LOW_MS + HIGH_MS);
  return { high: t >= LOW_MS, warn: t >= LOW_MS - WARN_MS && t < LOW_MS };
}

// 步驟 2 做竹蛇籠：點竹林拿竹子、溪水退了點石堆撿石頭；編籠（來回滑三下）再把石頭拖進籠子
export function Craft({ p, set, next }: StepProps) {
  const host = useRef<HTMLDivElement>(null);
  const [intro, setIntro] = useState(p.cages === 0 && p.taken.length === 0);
  const [weaving, setWeaving] = useState(false);
  const [say, setSay] = useState<Line | null>(null);
  const [clock, setClock] = useState(0);
  const [splash, setSplash] = useState(0); // 漲水時硬去撿石頭：撲通！
  const tide = tideAt(clock);
  const [card, setCard] = useState(false);
  const [linCard, setLinCard] = useState(false);
  const metLin = () => {
    setIntro(false);
    if (!p.cards.includes('lin')) { set((o) => ({ ...o, cards: [...o.cards, 'lin'] })); setLinCard(true); }
  };
  const taken = new Set(p.taken);
  const live = useRef({ p, taken, high: tide.high });
  live.current = { p, taken, high: tide.high };

  const { board, ready, fps } = useBoard(host, {
    cols: CHAPTER.cols, rows: CHAPTER.rows, terrain: CHAPTER.kind, heights: CHAPTER.heights, backdrop: CHAPTER.backdrop,
    start: { cell: { col: 6, row: 3 }, scale: 0.6 },
    onTap: (c) => {
      if (!c || live.current.taken.has(key(c))) return;
      const k = CHAPTER.kind(c);
      if (k === 'bamboo') {
        sfx('SE-67');
        set((o) => ({ ...o, bamboo: o.bamboo + 1, taken: [...o.taken, key(c)] }));
        setSay(null);
      } else if (k === 'stone') {
        if (live.current.high) {
          sfx('SE-57');
          setSplash((n) => n + 1);
          setSay({ who: 'mu', mood: 'shout', text: '溪水在漲！先退回來，等水退了再去。' });
          return;
        }
        const n = CHAPTER.stones(c);
        sfx('SE-68');
        set((o) => ({ ...o, stone: o.stone + n, taken: [...o.taken, key(c)] }));
        setSay(null);
      }
    },
  }, []);
  useEffect(() => { board.current?.setMarks(p.taken.map((k) => { const [col, row] = k.split(',').map(Number); return { kind: 'done' as const, cell: { col, row } }; })); }, [p.taken, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // 溪水的時鐘：對話跟編籠的時候停住
  useEffect(() => {
    if (intro || weaving) return;
    const id = window.setInterval(() => setClock((t) => t + 250), 250);
    return () => clearInterval(id);
  }, [intro, weaving]);
  useEffect(() => { if (!splash) return; const t = setTimeout(() => setSplash(0), 1200); return () => clearTimeout(t); }, [splash]);

  // 材料不夠做完 6 個：林先生補給（不會卡死）
  const left = Array.from({ length: CHAPTER.rows }, (_, row) => Array.from({ length: CHAPTER.cols }, (_, col) => ({ col, row })))
    .flat().filter((c) => !taken.has(key(c)));
  const bambooLeft = left.filter((c) => CHAPTER.kind(c) === 'bamboo').length;
  const stoneLeft = left.reduce((n, c) => n + CHAPTER.stones(c), 0);
  const need = CAGES_NEEDED - p.cages;
  const short = need > 0 && (p.bamboo + bambooLeft < need * CAGE_COST.bamboo || p.stone + stoneLeft < need * CAGE_COST.stone);
  useEffect(() => {
    if (!short) return;
    set((o) => ({ ...o, bamboo: Math.max(o.bamboo, need * CAGE_COST.bamboo), stone: Math.max(o.stone, need * CAGE_COST.stone) }));
    setSay(null);
  }, [short]); // eslint-disable-line react-hooks/exhaustive-deps

  const finished = p.cages >= CAGES_NEEDED;
  useEffect(() => { if (finished && !p.cards.includes('cage')) { setCard(true); set((o) => ({ ...o, cards: [...o.cards, 'cage'] })); } }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  const line: Line | null = short ? { who: 'lin', text: '材料不太夠，我這裡還有一些，先拿去用吧！' }
    : say ?? (finished ? null
      : tide.warn ? { who: 'mu', mood: 'listen', text: '聽！溪水的聲音變了，要漲了。' }
      : tide.high && p.stone < CAGE_COST.stone ? { who: 'lian', mood: 'scared', text: '水好大……先去砍竹子吧？' }
      : null);

  return (
    <div className="board-wrap">
      <div className="board full" ref={host} />
      {!finished && (
        <div className={`tide ${tide.high ? 'high' : ''}`}>{tide.high ? '🌊 溪水：漲' : '🪨 溪水：退'}</div>
      )}
      {tide.high && !finished && <div className="tide-wash" />}
      {splash > 0 && <div className="splash">撲通！</div>}
      <div className="mats">
        <span><img src={img('g-bamboo')} alt="" />竹子 <b>{p.bamboo}</b></span>
        <span><img src={img('g-stone')} alt="" />石頭 <b>{p.stone}</b></span>
        <span><img src={img('g-cage-full')} alt="" />竹蛇籠 <b>{p.cages} / {CAGES_NEEDED}</b></span>
      </div>
      {!finished && (
        <div className="tray">
          <button className="btn green go" disabled={!canCraft(p)} onClick={() => { setSay(null); setWeaving(true); }}>
            編竹蛇籠（竹子 1、石頭 2）
          </button>
        </div>
      )}
      <Say line={line} />
      {finished && !card && (
        <div className="next-bar"><span>6 個竹蛇籠都做好了！</span><button className="btn green" onClick={next}>下一步：導水</button></div>
      )}
      {weaving && <Weave onDone={() => { sfx('SE-41'); setWeaving(false); set((o) => craft(o)); setSay(null); }} onCancel={() => setWeaving(false)} />}
      {intro && <Talk lines={CRAFT_INTRO} onDone={metLin} />}
      {linCard && <CardPop title={CARDS.lin.title} text={CARDS.lin.text} onClose={() => setLinCard(false)} />}
      {card && <CardPop title={CARDS.cage.title} text={CARDS.cage.text} onClose={() => setCard(false)} />}
      <div className="fps">每秒 {fps} 格</div>
    </div>
  );
}

// 編籠：先在籠子上來回滑三下，再把兩顆石頭拖進籠子
function Weave({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [swipes, setSwipes] = useState(0);
  const [inside, setInside] = useState<boolean[]>([false, false]);
  const [drag, setDrag] = useState<{ i: number; x: number; y: number } | null>(null);
  const track = useRef<{ x: number; dir: number; from: number } | null>(null);
  const zone = useRef<HTMLDivElement>(null);
  const woven = swipes >= 3;

  useEffect(() => { if (inside.every(Boolean)) { const t = setTimeout(onDone, 500); return () => clearTimeout(t); } }, [inside]); // eslint-disable-line react-hooks/exhaustive-deps

  const swipeMove = (e: React.PointerEvent) => {
    const t = track.current;
    if (!t || woven) return;
    const dx = e.clientX - t.x;
    const dir = Math.sign(dx);
    if (dir && dir !== t.dir) {
      if (Math.abs(t.x - t.from) > 60) { sfx('SE-69'); setSwipes((n) => n + 1); }
      track.current = { x: e.clientX, dir, from: t.x };
    } else track.current = { ...t, x: e.clientX };
  };

  const dropAt = (i: number, x: number, y: number) => {
    const r = zone.current?.getBoundingClientRect();
    if (r && x > r.left && x < r.right && y > r.top && y < r.bottom) { sfx('SE-70'); setInside((s) => s.map((v, k) => (k === i ? true : v))); }
  };

  return (
    <div className="talk-cover">
      <div className="weave panel">
        <h3>{woven ? '把 2 顆石頭拖進竹籠' : `在竹籠上用手指來回滑，編 3 下（${swipes} / 3）`}</h3>
        <div
          ref={zone}
          className={`weave-cage ${woven ? 'woven' : ''}`}
          style={{ ['--w' as string]: Math.min(3, swipes) / 3 }}
          onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); track.current = { x: e.clientX, dir: 0, from: e.clientX }; }}
          onPointerMove={swipeMove}
          onPointerUp={() => {
            const t = track.current;
            if (t && !woven && Math.abs(t.x - t.from) > 60) { sfx('SE-69'); setSwipes((n) => n + 1); }
            track.current = null;
          }}
        >
          {inside.map((v, i) => v && <img key={i} className="stone in" src={img('g-stone')} alt="" />)}
        </div>
        {woven && (
          <div className="stones">
            {inside.map((v, i) => !v && (
              <img
                key={i}
                src={img('g-stone')}
                alt=""
                draggable={false}
                className="stone"
                style={drag?.i === i ? { position: 'fixed', left: drag.x, top: drag.y, transform: 'translate(-50%,-50%)', zIndex: 9 } : undefined}
                onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); setDrag({ i, x: e.clientX, y: e.clientY }); }}
                onPointerMove={(e) => drag?.i === i && setDrag({ i, x: e.clientX, y: e.clientY })}
                onPointerUp={(e) => { if (drag?.i === i) dropAt(i, e.clientX, e.clientY); setDrag(null); }}
              />
            ))}
          </div>
        )}
        <button className="btn orange" onClick={onCancel}>先不做</button>
      </div>
    </div>
  );
}
