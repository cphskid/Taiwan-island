import { useState } from 'react';
import { cut, cutCost, endSeason, forestOf, forestOver, grown, isFar, plant, slideCols, smelt, type Forest } from '../../core/stone-age';
import { CARDS1, FOREST, GOODBYE, IRON_DONE, IRON_INTRO, IRON_RULES, IRON_SAY, art } from '../../data/ch1';
import type { Line } from '../../data/babao-chapter';
import { addCard1 } from '../../core/save1';
import { CardPop, Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import type { Step1Props } from '../Ch1';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'forest' | 'done' | 'bye' | 'cards';
const DEER_AT = 14; // 長大的樹還有這麼多，鹿群才待得住

// 步驟 4 煉鐵（十三行文化）：砍樹燒木炭煉 3 爐鐵；陡坡砍光，下大雨就土石流
export function Iron({ p, set, next, oops }: Step1Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [card, setCard] = useState<string[]>([]);
  return (
    <div className="scene ch1-iron">
      <img className="scene-bg" src={art('s-08')} alt="" />
      {phase === 'intro' && <Talk lines={IRON_INTRO} onDone={() => setPhase('forest')} />}
      {phase === 'forest' && <ForestBoard oops={oops} onDone={() => { jingle('MU-13'); setPhase('done'); }} />}
      {phase === 'done' && <Talk lines={IRON_DONE} onDone={() => setPhase('bye')} />}
      {phase === 'bye' && <Talk lines={GOODBYE} onDone={() => {
        const more = ['shisanhang', 'iron'].filter((c) => !p.cards.includes(c));
        set((o) => addCard1(o, 'shisanhang', 'iron'));
        if (more.length) { setCard(more); setPhase('cards'); } else next();
      }} />}
      {phase === 'cards' && card[0] && (
        <CardPop title={CARDS1[card[0]].title} text={CARDS1[card[0]].text} onClose={() => { const rest = card.slice(1); setCard(rest); if (!rest.length) next(); }} />
      )}
    </div>
  );
}

function ForestBoard({ onDone, oops }: { onDone: () => void; oops: () => void }) {
  const [f, setF] = useState<Forest>(() => forestOf(FOREST));
  const [say, setSay] = useState<Line | null>(null);
  const [fails, setFails] = useState(0);
  const [warned, setWarned] = useState<{ steep: boolean; deer: boolean }>({ steep: false, deer: false });
  const [rain, setRain] = useState<number[] | null>(null); // 正在下雨；裡面是土石流的直排
  const [smelting, setSmelting] = useState(false);
  const deer = grown(f) >= DEER_AT;
  const risky = slideCols(FOREST, f);

  const fail = (line: Line) => {
    oops();
    setFails(fails + 1);
    setSay(fails >= 1 ? IRON_SAY.hint : line);
  };
  const tap = (i: number) => {
    if (rain || smelting) return;
    const t = f.trees[i];
    const g = t === 'tree' ? cut(FOREST, f, i) : t === 'stump' ? plant(f, i) : null;
    if (!g) { sfx('SE-02'); return; }
    sfx(t === 'tree' ? 'SE-67' : 'SE-07');
    setF(g);
    if (t === 'tree' && !warned.steep && slideCols(FOREST, g).length) { setWarned({ ...warned, steep: true }); setSay(IRON_SAY.steep); }
    else if (t === 'tree' && !warned.deer && grown(g) < DEER_AT) { setWarned({ ...warned, deer: true }); setSay(IRON_SAY.deer); }
  };
  const doSmelt = () => {
    const g = smelt(FOREST, f);
    if (!g) return;
    sfx('SE-46');
    setSmelting(true);
    setTimeout(() => {
      setSmelting(false);
      setF(g);
      if (g.iron >= FOREST.iron) setTimeout(onDone, 900);
    }, 1200);
  };
  const endIt = () => {
    const raining = FOREST.rainAfter.includes(f.season);
    const g = endSeason(FOREST, f);
    const slides = g.slides.slice(f.slides.length);
    if (!raining) { finishSeason(g); return; }
    sfx('SE-74');
    setSay(IRON_SAY.rain);
    setRain(slides);
    setTimeout(() => {
      setRain(null);
      if (slides.length) { sfx('SE-71'); fail(IRON_SAY.slide); setF(forestOf(FOREST)); return; }
      setSay(IRON_SAY.safe);
      finishSeason(g);
    }, 2200);
  };
  const finishSeason = (g: Forest) => {
    sfx('SE-02');
    if (forestOver(FOREST, g) && g.iron < FOREST.iron) { fail(IRON_SAY.noWood); setF(forestOf(FOREST)); return; }
    setF(g);
  };

  return (
    <div className="iron-wrap">
      <Goal floating text={`煉 ${FOREST.iron} 爐鐵，村子不能被土石流沖到。${IRON_RULES}`} />
      <div className={`forest panel ${rain ? 'raining' : ''}`}>
        <div className="forest-grid" style={{ gridTemplateColumns: `repeat(${FOREST.cols}, 1fr)` }}>
          {f.trees.map((t, i) => {
            const col = i % FOREST.cols, row = Math.floor(i / FOREST.cols);
            const far = isFar(FOREST, i);
            return (
              <button key={i} className={`tree-cell ${far ? 'far' : 'steep'} ${t} ${rain?.includes(col) && !far ? 'slide' : ''} ${!far && risky.includes(col) ? 'risk' : ''}`}
                style={{ gridColumn: col + 1, gridRow: row + 1 }} onClick={() => tap(i)}>
                <img src={art(`o-05-${t}`)} alt={t} />
                {t === 'tree' && <small>{cutCost(FOREST, i)}</small>}
              </button>
            );
          })}
        </div>
        <div className="village-strip">⬇ 村子就在陡坡正下面</div>
        {deer && <span className="deer">🦌🦌</span>}
        {rain && <div className="rainfall" />}
      </div>
      <div className="iron-side panel">
        <div className="seasons">
          {Array.from({ length: FOREST.seasons }, (_, k) => (
            <span key={k} className={k + 1 === f.season ? 'on' : k + 1 < f.season ? 'past' : ''}>第 {k + 1} 季{FOREST.rainAfter.includes(k + 1) ? ' 🌧️' : ''}</span>
          ))}
        </div>
        <p className="forest-key"><i className="far" />遠的緩坡　<i className="steep" />村子上方的陡坡</p>
        <p>這一季還能做 <b>{f.left}</b> 件事</p>
        <p className="wood-n"><img src={art('o-05-woodpile')} alt="" /> 木材 <b>{f.wood}</b></p>
        <img className="furnace" src={art(smelting ? 'o-05-furnace-hot' : f.iron ? 'o-05-furnace-iron' : 'o-05-furnace')} alt="煉鐵爐" />
        <p className="iron-n">{Array.from({ length: FOREST.iron }, (_, k) => <img key={k} className={k < f.iron ? 'on' : ''} src={art('g-03-knife')} alt="" />)}</p>
        <button className="btn orange" disabled={f.wood < FOREST.woodPerIron || smelting || f.iron >= FOREST.iron} onClick={doSmelt}>煉一爐（3 份木材）</button>
        <button className="btn green" disabled={!!rain || smelting || f.iron >= FOREST.iron} onClick={endIt}>結束這一季</button>
      </div>
      <Say line={say} />
    </div>
  );
}
