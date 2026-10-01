import { useEffect, useRef, useState } from 'react';
import { CARDS, CHAPTER, CRAFT_INTRO, img, key } from '../../data/babao-chapter';
import { CAGES_NEEDED, CAGE_COST, canCraft, craft } from '../../core/save';
import { useBoard } from '../useBoard';
import { CardPop, Say, Talk } from '../Talk';
import type { StepProps } from '../Chapter';

// 步驟 2 做竹蛇籠：點竹林拿竹子、點石堆拿石頭；編籠（來回滑三下）再把石頭拖進籠子
export function Craft({ p, set, next }: StepProps) {
  const host = useRef<HTMLDivElement>(null);
  const [intro, setIntro] = useState(p.cages === 0 && p.taken.length === 0);
  const [weaving, setWeaving] = useState(false);
  const [say, setSay] = useState<string | null>(null);
  const [card, setCard] = useState(false);
  const [linCard, setLinCard] = useState(false);
  const metLin = () => {
    setIntro(false);
    if (!p.cards.includes('lin')) { set((o) => ({ ...o, cards: [...o.cards, 'lin'] })); setLinCard(true); }
  };
  const taken = new Set(p.taken);
  const live = useRef({ p, taken });
  live.current = { p, taken };

  const { board, ready, fps } = useBoard(host, {
    cols: CHAPTER.cols, rows: CHAPTER.rows, terrain: CHAPTER.kind, heights: CHAPTER.heights, backdrop: CHAPTER.backdrop,
    start: { cell: { col: 6, row: 3 }, scale: 0.6 },
    onTap: (c) => {
      if (!c || live.current.taken.has(key(c))) return;
      const k = CHAPTER.kind(c);
      if (k === 'bamboo') {
        set((o) => ({ ...o, bamboo: o.bamboo + 1, taken: [...o.taken, key(c)] }));
        setSay('砍到一根竹子！');
      } else if (k === 'stone') {
        const n = CHAPTER.stones(c);
        set((o) => ({ ...o, stone: o.stone + n, taken: [...o.taken, key(c)] }));
        setSay(`撿到 ${n} 顆石頭！`);
      }
    },
  }, []);
  useEffect(() => { board.current?.setMarks(p.taken.map((k) => { const [col, row] = k.split(',').map(Number); return { kind: 'done' as const, cell: { col, row } }; })); }, [p.taken, ready]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const lin = short ? '材料不太夠，我這裡還有一些，先拿去用吧！'
    : say ?? (finished ? null : canCraft(p) ? '材料夠了，按「編竹蛇籠」做一個！' : '點竹林砍竹子、點溪邊的石堆撿石頭。');

  return (
    <div className="board-wrap">
      <div className="board full" ref={host} />
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
      <Say line={lin ? { who: 'lin', text: lin } : null} />
      {finished && !card && (
        <div className="next-bar"><span>6 個竹蛇籠都做好了！</span><button className="btn green" onClick={next}>下一步：導水</button></div>
      )}
      {weaving && <Weave onDone={() => { setWeaving(false); set((o) => craft(o)); setSay('做好一個竹蛇籠！'); }} onCancel={() => setWeaving(false)} />}
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
      if (Math.abs(t.x - t.from) > 60) setSwipes((n) => n + 1);
      track.current = { x: e.clientX, dir, from: t.x };
    } else track.current = { ...t, x: e.clientX };
  };

  const dropAt = (i: number, x: number, y: number) => {
    const r = zone.current?.getBoundingClientRect();
    if (r && x > r.left && x < r.right && y > r.top && y < r.bottom) setInside((s) => s.map((v, k) => (k === i ? true : v)));
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
            if (t && !woven && Math.abs(t.x - t.from) > 60) setSwipes((n) => n + 1);
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
