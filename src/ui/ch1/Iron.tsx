import { useState } from 'react';
import { cut, cutCost, endSeason, forestOf, forestOver, grown, isFar, plant, slideCols, smelt, type Forest } from '../../core/stone-age';
import { CARDS1, FOREST, goodbye, IRON_DONE, IRON_INTRO, IRON_RULES, IRON_SAY, IRON_TASK, art } from '../../data/ch1';
import type { Line } from '../../data/babao-chapter';
import { addCard1 } from '../../core/save1';
import { CardPop, Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import type { Step1Props } from '../Ch1';
import { jingle, sfx } from '../../audio';
import { Decide, EraJump } from './Story';

type Phase = 'jump' | 'intro' | 'pick' | 'task' | 'forest' | 'done' | 'bye' | 'cards';
const DEER_AT = 14; // 長大的樹還有這麼多，鹿群才待得住

// 步驟 4 煉鐵（十三行文化）：砍樹燒木炭煉 3 爐鐵；陡坡砍光，下大雨就土石流
export function Iron({ p, set, next, oops }: Step1Props) {
  const [phase, setPhase] = useState<Phase>('jump');
  const [card, setCard] = useState<string[]>([]);
  return (
    <div className="scene ch1-iron">
      <img className="scene-bg" src={art('s-08')} alt="" />
      {phase === 'jump' && <EraJump to={3} onDone={() => setPhase('intro')} />}
      {phase === 'intro' && <Talk lines={IRON_INTRO} onDone={() => setPhase('pick')} />}
      {phase === 'pick' && <Decide id="smith" set={set} onDone={() => setPhase('task')} />}
      {phase === 'task' && <Talk lines={IRON_TASK} onDone={() => setPhase('forest')} />}
      {phase === 'forest' && <ForestBoard oops={oops} onDone={(deer) => { jingle('MU-13'); set((o) => ({ ...o, deer })); setPhase('done'); }} />}
      {phase === 'done' && <Talk lines={IRON_DONE} onDone={() => setPhase('bye')} />}
      {phase === 'bye' && <Talk lines={goodbye(p.picks, p.deer)} onDone={() => {
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

function ForestBoard({ onDone, oops }: { onDone: (deer: boolean) => void; oops: () => void }) {
  const [f, setF] = useState<Forest>(() => forestOf(FOREST));
  const [say, setSay] = useState<Line | null>(null);
  const [fails, setFails] = useState(0);
  const [warned, setWarned] = useState<{ steep: boolean; deer: boolean }>({ steep: false, deer: false });
  const [rain, setRain] = useState<number[] | null>(null); // 正在下雨；裡面是土石流的直排
  const [smelting, setSmelting] = useState(false);
  const [start, setStart] = useState<Forest>(f); // 這一季開始時的樣子：土石流只退回這一季
  const [ask, setAsk] = useState(false); // 下雨前山坡有危險：先問一次
  const deer = grown(f) >= DEER_AT;
  const risky = slideCols(FOREST, f);
  const rainy = FOREST.rainAfter.includes(f.season);
  // 陡坡同一直排已經砍了一棵：另一棵要留著（或補種樹苗）
  const guard = new Set<number>();
  for (let c = 0; c < FOREST.cols; c++) {
    const col = Array.from({ length: FOREST.steepRows }, (_, r) => (FOREST.farRows + r) * FOREST.cols + c);
    const trees = col.filter((i) => f.trees[i] === 'tree');
    if (trees.length === 1 && col.some((i) => f.trees[i] === 'stump')) guard.add(trees[0]);
  }
  const needWood = Math.max(0, (FOREST.iron - f.iron) * FOREST.woodPerIron - f.wood);

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
      if (g.iron >= FOREST.iron) setTimeout(() => onDone(grown(g) >= DEER_AT), 900);
    }, 1200);
  };
  const endIt = (sure = false) => {
    if (rainy && risky.length && !sure) { sfx('SE-04'); setAsk(true); return; }
    setAsk(false);
    const raining = rainy;
    let cur = f;
    for (let k = smelt(FOREST, cur); k; k = smelt(FOREST, cur)) cur = k; // 木材夠就自動煉掉，不會因為忘了按而失敗
    if (cur.iron >= FOREST.iron) { setF(cur); setTimeout(() => onDone(grown(cur) >= DEER_AT), 600); return; }
    const g = endSeason(FOREST, cur);
    const slides = g.slides.slice(f.slides.length);
    if (!raining) { finishSeason(g); return; }
    sfx('SE-74');
    setSay(IRON_SAY.rain);
    setRain(slides);
    setTimeout(() => {
      setRain(null);
      if (slides.length) { sfx('SE-71'); fail(IRON_SAY.slide); setF(start); return; }
      setSay(IRON_SAY.safe);
      finishSeason(g);
    }, 2200);
  };
  const finishSeason = (g: Forest) => {
    sfx('SE-02');
    if (forestOver(FOREST, g) && g.iron < FOREST.iron) { const s0 = forestOf(FOREST); fail(IRON_SAY.noWood); setF(s0); setStart(s0); return; }
    setF(g);
    setStart(g);
  };

  return (
    <div className="iron-wrap hill-wrap">
      <Goal floating text={`煉鐵 ${f.iron}/${FOREST.iron}：還要砍 ${needWood} 份木材，陡坡同一直排要留一棵樹。${IRON_RULES}`} />
      <div className="iron-hud">
        <div className="seasons">
          {Array.from({ length: FOREST.seasons }, (_, k) => (
            <span key={k} className={k + 1 === f.season ? 'on' : k + 1 < f.season ? 'past' : ''}>第 {k + 1} 季{FOREST.rainAfter.includes(k + 1) ? ' 🌧️' : ''}</span>
          ))}
        </div>
        <p className="steps-left" title="這一季還有幾顆體力">
          <small>體力</small>{Array.from({ length: FOREST.actions }, (_, k) => <i key={k} className={`bean ${k < f.left ? 'on' : ''}`} />)}
        </p>
        <p className="wood-n"><img src={art('o-05-woodpile')} alt="木材" />× <b>{f.wood}</b></p>
        <p className="iron-n">{Array.from({ length: FOREST.iron }, (_, k) => <img key={k} className={k < f.iron ? 'on' : ''} src={art('g-03-knife')} alt="" />)}</p>
        <button className={`btn orange ${f.wood >= FOREST.woodPerIron && f.iron < FOREST.iron ? 'ready' : ''}`} disabled={f.wood < FOREST.woodPerIron || smelting || f.iron >= FOREST.iron} onClick={doSmelt}>🔥 煉一爐（3 份木材）</button>
        <button className="btn green" disabled={!!rain || smelting || f.iron >= FOREST.iron} onClick={() => endIt()}>結束這一季{rainy ? ' 🌧️' : ''}</button>
      </div>
      <div className={`hill ${rain ? 'raining' : ''}`}>
        <img className="hill-bg" src={art('w-04')} alt="村子上面的山坡" />
        {deer && <img className="hill-deer" src={`${import.meta.env.BASE_URL}img/ch2/deer-eat.webp`} alt="鹿" />}
        {risky.map((c) => <div key={`r${c}`} className="slope-risk" style={{ left: `${colX(3, c) * 100}%` }}><b>⚠</b></div>)}
        {rain?.map((c) => <div key={`m${c}`} className="mudslide" style={{ left: `${colX(3, c) * 100}%` }} />)}
        {f.trees.map((t, i) => {
          const col = i % FOREST.cols, row = Math.floor(i / FOREST.cols);
          const far = isFar(FOREST, i);
          const cost = t === 'tree' ? cutCost(FOREST, i) : t === 'stump' ? 1 : 0;
          return (
            <button key={i} className={`hill-tree ${far ? 'far' : 'steep'} ${t} ${rain?.includes(col) && !far ? 'slide' : ''}`}
              style={{ left: `${colX(row, col) * 100}%`, top: `${ROW_Y[row] * 100}%`, ['--s' as string]: ROW_S[row] }}
              onClick={() => tap(i)} aria-label={t === 'tree' ? '砍樹' : t === 'stump' ? '種樹苗' : '樹苗'}>
              <img src={art(`o-05-${t}`)} alt="" />
              {guard.has(i) ? <span className="keep-badge">🛡️ 留著我</span>
                : cost > 0 && <span className={`steps-badge ${t}`}>{t === 'stump' && '🌱'}{Array.from({ length: cost }, (_, k) => <i key={k} className="bean" />)}</span>}
            </button>
          );
        })}
        {smelting && <img className="hill-furnace" src={art('o-05-furnace-hot')} alt="" />}
        {rain && <div className="rainfall" />}
      </div>
      {ask && (
        <div className="talk-cover" onClick={() => setAsk(false)}>
          <div className="panel mission rain-ask" onClick={(e) => e.stopPropagation()}>
            <h3>⚠ 這一季結束會下大雨！</h3>
            <p>閃紅色的那一排陡坡，上下兩棵樹都砍光了，雨一來土石就會沖到村子。<br />點那裡的樹樁 🌱 種樹苗，根就抓得住土。</p>
            <div className="row">
              <button className="btn green" onClick={() => setAsk(false)}>回去種樹苗</button>
              <button className="btn orange" onClick={() => endIt(true)}>照樣結束</button>
            </div>
          </div>
        </div>
      )}
      <Say line={say} />
    </div>
  );
}

// 樹在 W-04 山坡圖上的位置（比例）：上面兩排是遠的緩坡（小一點），下面兩排是村子正上方的陡坡
const ROW_Y = [0.27, 0.37, 0.51, 0.67];
const ROW_S = [0.68, 0.78, 0.95, 1.05];
const ROW_X: [number, number][] = [[0.47, 0.95], [0.36, 0.93], [0.26, 0.9], [0.2, 0.92]];
const colX = (row: number, col: number) => ROW_X[row][0] + (ROW_X[row][1] - ROW_X[row][0]) * (col / (FOREST.cols - 1));
