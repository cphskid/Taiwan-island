import { useEffect, useRef, useState } from 'react';
import { CARDS, CHAPTER, EXPLORE_INTRO, HIGHEST_ASK, PLACES, img, key } from '../../data/babao-chapter';
import type { Cell } from '../../core/iso';
import { useBoard } from '../useBoard';
import { CardPop, Say, Talk } from '../Talk';
import { Legend } from './Legend';
import type { StepProps } from '../Chapter';

// 撥開以 c 為中心的 3×3 雲霧
function around(c: Cell, r = 1): string[] {
  const out: string[] = [];
  for (let dr = -r; dr <= r; dr++)
    for (let dc = -r; dc <= r; dc++) {
      const n = { col: c.col + dc, row: c.row + dr };
      if (n.col >= 0 && n.row >= 0 && n.col < CHAPTER.cols && n.row < CHAPTER.rows) out.push(key(n));
    }
  return out;
}

const MAX_H = Math.max(...Array.from({ length: CHAPTER.rows }, (_, row) =>
  Math.max(...Array.from({ length: CHAPTER.cols }, (_, col) => CHAPTER.heights({ col, row })))));


// 步驟 1 認識地形：點雲霧撥開，找到五個地點拿圖鑑卡；再用地形眼鏡找最高的地方
export function Explore({ p, set, next }: StepProps) {
  const host = useRef<HTMLDivElement>(null);
  const [intro, setIntro] = useState(p.found.length === 0);
  const [pop, setPop] = useState<string[]>([]); // 等著彈出的圖鑑卡
  const [contours, setContours] = useState(false);
  const [ask, setAsk] = useState(false); // 問「哪裡最高」的對話
  const [say, setSay] = useState<string | null>(null);
  const allFound = p.found.length === PLACES.length;
  const done = p.cards.includes('contour');

  const revealed = new Set(p.revealed.length ? p.revealed : around(CHAPTER.start, 2));
  const live = useRef({ p, revealed, allFound, done });
  live.current = { p, revealed, allFound, done };

  const reveal = (cells: string[]) => {
    const old = live.current.p;
    const r = new Set([...live.current.revealed, ...cells]);
    const found = PLACES.filter((pl) => !old.found.includes(pl.id) && pl.cells.some((c) => r.has(key(c))));
    const cards = found.map((f) => f.card).filter((c) => !old.cards.includes(c));
    if (cards.length) setPop((q) => [...q, ...cards]);
    set((o) => ({ ...o, revealed: [...r], found: [...o.found, ...found.map((f) => f.id)], cards: [...o.cards, ...cards] }));
  };

  const { board, ready, fps } = useBoard(host, {
    cols: CHAPTER.cols, rows: CHAPTER.rows, terrain: CHAPTER.kind, heights: CHAPTER.heights, backdrop: CHAPTER.backdrop,
    start: { cell: CHAPTER.start, scale: 0.75 },
    onTap: (c) => {
      if (!c) return;
      const L = live.current;
      if (!L.revealed.has(key(c))) { reveal(around(c)); return; }
      if (L.allFound && !L.done) {
        if (CHAPTER.heights(c) >= MAX_H) {
          setSay(null);
          set((old) => ({ ...old, cards: [...old.cards, 'contour'] }));
          setPop((q) => [...q, 'contour']);
        } else setSay('那裡還不夠高。溪水是從哪一邊流下來的？');
      }
    },
  }, []);

  // 第一次進來：把起點附近撥開（也會順便找到濁水溪）
  useEffect(() => { if (!p.revealed.length) reveal([]); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { board.current?.setFog((c) => !revealed.has(key(c))); }, [p.revealed, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { board.current?.setContours(contours); }, [contours, ready]);
  useEffect(() => {
    board.current?.setMarks(PLACES.filter((pl) => p.found.includes(pl.id) && pl.cells.length <= 4).map((pl) => ({ kind: 'ring' as const, cell: pl.cells[0] })));
  }, [p.found, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (allFound && !done && !pop.length) setAsk(true); }, [allFound, done, pop.length]);

  const card = pop[0] ? CARDS[pop[0]] : null;
  return (
    <div className="board-wrap">
      <div className="board full" ref={host} />
      <div className="checklist">
        <b>找到 {p.found.length} / {PLACES.length}</b>
        {PLACES.map((pl) => <span key={pl.id} className={p.found.includes(pl.id) ? 'got' : ''}>{CARDS[pl.card].title}</span>)}
        {allFound && <span className={done ? 'got' : ''}>最高的地方</span>}
      </div>
      <div className="tools">
        <button className={`tool ${contours ? 'on' : ''}`} onClick={() => setContours(!contours)}>
          <img className="tool-img" src={img('h-eye')} alt="" />地形眼鏡
        </button>
      </div>
      {contours && <Legend />}
      <Say line={say ? { who: 'mu', mood: 'frown', text: say } : allFound && !done && !ask ? { who: 'mu', mood: 'listen', text: '水都是從最高的地方來的。' } : null} />
      {done && !card && (
        <div className="next-bar"><span>地形都認識了！</span><button className="btn green" onClick={next}>下一步：做竹蛇籠</button></div>
      )}
      {intro && <Talk lines={EXPLORE_INTRO} onDone={() => setIntro(false)} />}
      {!intro && card && <CardPop title={card.title} text={card.text} onClose={() => setPop((q) => q.slice(1))} />}
      {!intro && !card && ask && <Talk lines={HIGHEST_ASK} onDone={() => setAsk(false)} />}
      <div className="fps">每秒 {fps} 格</div>
    </div>
  );
}
