import { useEffect, useMemo, useRef, useState } from 'react';
import { fire, fireEasySolve, fireSolve, heat, heatEasy, SIDES, SLOT_CAP, SLOTS, used, HEAT_MAX, HEAT_MIN, type Pile, type Side, type Slot } from '../../core/stone-age';
import { CARDS1, CLAY_ASK, CORD_ASK, FIRE_EASY_INTRO, FIRE_EASY_SAY, FIRE_EASY_TIPS, FIRE_FAIL, FIRE_HINT, FIRE_INTRO, FIRES, POT_DONE, POT_INTRO, POT_LEAVE, SAND_RESULT, art } from '../../data/ch1';
import type { Line } from '../../data/babao-chapter';
import { addCard1 } from '../../core/save1';
import { CardPop, Say, Talk } from '../Talk';
import { Goal, Hand } from '../Guide';
import { ChallengeOffer, ChallengeTag } from '../Challenge';
import { challengeDone } from '../Medal';
import type { Step1Props } from '../Ch1';
import { jingle, sfx } from '../../audio';
import { Decide, EraJump } from './Story';

type Phase = 'jump' | 'intro' | 'clayAsk' | 'clay' | 'fireIntro' | 'fire' | 'offer' | 'cIntro' | 'challenge' | 'cordAsk' | 'cord' | 'done' | 'pick' | 'cards' | 'leave' | 'warp';

// 步驟 2 陶器（大坌坑文化）：黏土拌砂試燒 → 野燒三窯（柴放在罐子四周，四面都燒成紅褐色）→ 拍繩紋
// 野燒過了可以選⭐⭐⭐再挑戰：原本算分數、柴要剛好用完的版本
export function Pottery({ p, set, next, oops }: Step1Props) {
  const [phase, setPhase] = useState<Phase>('jump');
  const [lv, setLv] = useState(0);
  const [card, setCard] = useState<string[]>([]);
  useEffect(() => {
    if (phase !== 'warp') return;
    sfx('SE-31');
    const t = setTimeout(next, 1300);
    return () => clearTimeout(t);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="scene ch1-pot">
      <img className="scene-bg" src={art('s-06')} alt="" />
      {phase === 'jump' && <EraJump to={1} onDone={() => setPhase('intro')} />}
      {phase === 'intro' && <Talk lines={POT_INTRO} onDone={() => setPhase('clayAsk')} />}
      {phase === 'clayAsk' && <Talk lines={CLAY_ASK} onDone={() => setPhase('clay')} />}
      {phase === 'clay' && <Clay oops={oops} onDone={() => setPhase('fireIntro')} />}
      {phase === 'fireIntro' && <Talk lines={FIRE_EASY_INTRO} onDone={() => setPhase('fire')} />}
      {phase === 'fire' && <FireEasy key={lv} n={lv} oops={oops} onDone={() => {
        jingle('MU-13');
        if (lv + 1 < FIRES.length) setLv(lv + 1); else { setLv(0); setPhase('offer'); }
      }} />}
      {phase === 'offer' && <ChallengeOffer text="進階版：柴的數量剛好、要全部用完，正面的柴熱 2 分、角落兩面各 1 分，四面都要 3～4 分。你排得出來嗎？" onTry={() => setPhase('cIntro')} onSkip={() => setPhase('cordAsk')} />}
      {phase === 'cIntro' && <Talk lines={FIRE_INTRO} onDone={() => setPhase('challenge')} />}
      {phase === 'challenge' && <>
        <FireBoard key={lv} n={lv} oops={() => {}} onDone={() => {
          jingle('MU-13');
          if (lv + 1 < FIRES.length) setLv(lv + 1); else { challengeDone('ch1:fire'); setPhase('cordAsk'); }
        }} />
        <ChallengeTag onQuit={() => setPhase('cordAsk')} />
      </>}
      {phase === 'cordAsk' && <Talk lines={CORD_ASK} onDone={() => setPhase('cord')} />}
      {phase === 'cord' && <Cord onDone={() => setPhase('done')} />}
      {phase === 'done' && <Talk lines={POT_DONE} onDone={() => setPhase('pick')} />}
      {phase === 'pick' && <Decide id="pot" set={set} onDone={() => {
        const more = ['dabenkeng', 'pot'].filter((c) => !p.cards.includes(c));
        set((o) => addCard1(o, 'dabenkeng', 'pot'));
        if (more.length) { setCard(more); setPhase('cards'); } else setPhase('leave');
      }} />}
      {phase === 'leave' && <Talk lines={POT_LEAVE} onDone={() => setPhase('warp')} />}
      {phase === 'cards' && card[0] && (
        <CardPop title={CARDS1[card[0]].title} text={CARDS1[card[0]].text} onClose={() => { const rest = card.slice(1); setCard(rest); if (!rest.length) setPhase('leave'); }} />
      )}
      {phase === 'warp' && <div className="warp" />}
    </div>
  );
}

// 黏土拌幾匙砂：做一個小罐子試燒，看會不會裂、會不會散
function Clay({ onDone, oops }: { onDone: () => void; oops: () => void }) {
  const [sand, setSand] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [tried, setTried] = useState(false);
  const test = () => {
    setTried(true);
    const r = SAND_RESULT[sand];
    setResult(r);
    sfx(r.ok ? 'SE-05' : 'SE-71');
    if (r.ok) setTimeout(onDone, 1500); else oops();
  };
  return (
    <>
      <Goal floating id="clay" text={result?.ok ? '成功了！不會裂也不會散。' : sand === 0 ? '按「多一匙」把砂拌進黏土。砂太少燒了會裂、太多會散掉，試燒看看就知道。' : '按「做小罐子試燒」看看。砂太少燒了會裂、太多會散掉，可以再加減。'} />
      <Hand at={result?.ok ? null : sand === 0 ? '.clay [data-more]' : '.clay [data-test]'} first={!tried} />
      <div className="clay panel">
        <h3>黏土裡拌幾匙砂？</h3>
        <div className="clay-mix">
          <img src={art('g-03-clay')} alt="黏土" />
          <span>＋</span>
          <div className="sand-spoons">{Array.from({ length: sand }, (_, i) => <img key={i} src={art('g-03-sand')} alt="" />)}{sand === 0 && <em>不加砂</em>}</div>
        </div>
        <div className="row">
          <button className="btn orange" disabled={sand === 0} onClick={() => { sfx('SE-01'); setSand(sand - 1); setResult(null); }}>少一匙</button>
          <b className="sand-n">{sand} 匙</b>
          <button className="btn orange" data-more disabled={sand === 4} onClick={() => { sfx('SE-01'); setSand(sand + 1); setResult(null); }}>多一匙</button>
        </div>
        <button className="btn green" data-test onClick={test}>做小罐子試燒</button>
        {result && <p className={result.ok ? 'yes' : 'no'}>{result.text}</p>}
      </div>
    </>
  );
}

// ⭐⭐⭐ 進階版野燒：罐子在中間，周圍 8 個位置放柴；點一下加一捆（最多 2 捆），再點會拿掉；柴要剛好用完、四面 3～4 分
const GRID: (Slot | 'pot')[] = ['NW', 'N', 'NE', 'W', 'pot', 'E', 'SW', 'S', 'SE'];
const SIDE_NAME = { N: '北', E: '東', S: '南', W: '西' } as const;
const WIND_NAME: Record<Slot, string> = { N: '北風', NE: '東北季風', E: '東風', SE: '東南風', S: '南風', SW: '西南風', W: '西風', NW: '西北風' };

// 故事版野燒：沒有分數、柴不限量（一格最多疊 2 捆）。罐子每一面直接寫「還沒熟／剛好／太燙」並變色，
// 四面都剛好就自己點火。太燙那一面算失誤一次，夥伴提醒拿掉；錯 2 次亮出放法、錯 3 次看示範。
const LOOK = { cold: '沒熟', ok: '剛好', hot: '太燙' } as const;
function FireEasy({ n, onDone, oops }: { n: number; onDone: () => void; oops: () => void }) {
  const { level } = FIRES[n];
  const [pile, setPile] = useState<Pile>({});
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const [lit, setLit] = useState(false);
  const plan = useMemo(() => fireEasySolve(level), [level]);
  const h = heatEasy(level, pile);
  const look = (s: Side) => (h[s] < HEAT_MIN ? 'cold' : h[s] > HEAT_MAX ? 'hot' : 'ok');
  const hot = SIDES.filter((s) => look(s) === 'hot');
  const good = SIDES.every((s) => look(s) === 'ok');
  const tapped = useRef(0);
  useEffect(() => {
    if (!good || lit) return;
    const t = setTimeout(() => { setLit(true); setSay(null); sfx('SE-60'); setTimeout(onDone, 1700); }, 600);
    return () => clearTimeout(t);
  }, [good]); // eslint-disable-line react-hooks/exhaustive-deps
  const tap = (s: Slot) => {
    if (lit) return;
    if (level.wet.includes(s)) { sfx('SE-04'); setSay(FIRE_EASY_SAY.wet); return; }
    tapped.current++;
    const cur = pile[s] ?? 0;
    const nextN = cur < SLOT_CAP ? cur + 1 : 0;
    sfx(nextN > cur ? 'SE-07' : 'SE-02');
    const np = { ...pile, [s]: nextN };
    setPile(np);
    const nh = heatEasy(level, np);
    const newHot = SIDES.some((x) => nh[x] > HEAT_MAX && h[x] <= HEAT_MAX);
    if (newHot) { sfx('SE-71'); oops(); setFails(fails + 1); setSay(FIRE_EASY_SAY.hot); }
    else if (level.wind && tapped.current >= 6 && look(level.wind[0] as Side) === 'cold' && !say) setSay(FIRE_EASY_SAY.wind);
  };
  const sol = fails >= 2 ? plan : null;
  const want = plan ? SLOTS.find((g) => (plan[g] ?? 0) > (pile[g] ?? 0)) : undefined;
  const fix = hot.length ? SLOTS.find((g) => (pile[g] ?? 0) > (plan?.[g] ?? 0) && [...g].some((x) => hot.includes(x as Side))) : undefined;
  const handAt = lit ? null : fix ? `.fire-slot[data-slot="${fix}"]` : want ? `.fire-slot[data-slot="${want}"]` : null;
  const goal = lit ? `燒好了！（第 ${n + 1} / ${FIRES.length} 窯）`
    : hot.length ? `有一面太燙了，點那邊的柴拿掉一捆。${FIRE_EASY_TIPS[n]}`
    : `點罐子旁的格子放柴，四面都要剛好。${FIRE_EASY_TIPS[n]}太冷燒不熟、太燙會裂，柴再點一下會多一捆，點到第三下拿掉。`;
  return (
    <div className="fire-wrap">
      <Goal floating id={`fire${n}`} text={goal} />
      <Hand at={handAt} first={n === 0 && used(pile) === 0} />
      <div className={`fire-board panel easy ${lit ? 'burn-ok' : ''}`}>
        {level.wind && <div className={`wind wind-${level.wind}`}>💨 {WIND_NAME[level.wind]}</div>}
        <div className="fire-grid">
          {GRID.map((g) => g === 'pot' ? (
            <div key="pot" className={`fire-pot ${hot.length ? 'cracking' : ''}`}>
              <img src={art('g-03-pot')} alt="陶罐" />
              {SIDES.map((s) => <span key={s} className={`side-heat side-${s} ${look(s)}`}>{LOOK[look(s)]}</span>)}
            </div>
          ) : (
            <button key={g} data-slot={g} className={`fire-slot ${level.wet.includes(g) ? 'wet' : ''} ${sol && (sol[g] ?? 0) > (pile[g] ?? 0) ? 'hint' : ''}`} onClick={() => tap(g)}>
              {level.wet.includes(g) ? <span className="puddle">💧</span>
                : Array.from({ length: pile[g] ?? 0 }, (_, i) => <img key={i} src={art('o-05-woodpile')} alt="柴" style={{ translate: `${i * 10}px ${-i * 14}px` }} />)}
              {lit && (pile[g] ?? 0) > 0 && <img className="flame" src={art('o-05-fire')} alt="" />}
            </button>
          ))}
        </div>
        <div className="fire-foot">
          <span className="fire-legend">四面都「剛好」就會自己點火</span>
        </div>
        {lit && <p className="yes big">燒好了！四面都是漂亮的紅褐色。</p>}
      </div>
      {fails >= 3 && !lit && <button className="btn demo corner-btn" onClick={() => setPile(plan ?? {})}>看示範</button>}
      <Say line={say} />
    </div>
  );
}

function FireBoard({ n, onDone, oops }: { n: number; onDone: () => void; oops: () => void }) {
  const { level, tip } = FIRES[n];
  const [pile, setPile] = useState<Pile>({});
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const [burn, setBurn] = useState<'ok' | 'cold' | 'crack' | null>(null);
  const h = heat(level, pile);
  const left = level.wood - used(pile);
  const plan = useMemo(() => fireSolve(level), [level]);
  const sol = fails >= 2 ? plan : null;
  // 手指（停住 8 秒才出現，進階版不主動帶）：指一個該放柴的格子；柴放完指「點火！」
  const want = left > 0 && plan ? SLOTS.find((g) => (plan[g] ?? 0) > (pile[g] ?? 0)) : undefined;
  const handAt = burn === 'ok' ? null : left > 0 ? (want ? `.fire-slot[data-slot="${want}"]` : null) : '.fire-foot .btn.green';

  const tap = (s: Slot) => {
    if (burn === 'ok' || level.wet.includes(s)) return;
    setBurn(null);
    const cur = pile[s] ?? 0;
    const nextN = cur < SLOT_CAP && left > 0 ? cur + 1 : 0;
    sfx(nextN > cur ? 'SE-07' : 'SE-02');
    setPile({ ...pile, [s]: nextN });
  };
  const light = () => {
    const r = fire(level, pile);
    if (r.result === 'more') return;
    setBurn(r.result);
    if (r.result === 'ok') { sfx('SE-60'); setSay(null); setTimeout(onDone, 1600); return; }
    sfx('SE-71'); oops();
    const f = fails + 1;
    setFails(f);
    setSay(f >= 2 && f % 2 === 0 ? FIRE_HINT : FIRE_FAIL[r.result]);
  };
  return (
    <div className="fire-wrap">
      <Goal floating id={`cfire${n}`} text={burn === 'ok' ? `燒好了！（第 ${n + 1} / ${FIRES.length} 窯）` : left > 0 ? `點陶罐旁的格子放柴（還有 ${left} 捆）。第 ${n + 1} / ${FIRES.length} 窯：${tip}` : `柴放好了，按「點火！」。第 ${n + 1} / ${FIRES.length} 窯：${tip}`} />
      <Hand at={handAt} />
      <div className={`fire-board panel ${burn ? `burn-${burn}` : ''}`}>
        {level.wind && <div className={`wind wind-${level.wind}`}>💨 {WIND_NAME[level.wind]}</div>}
        <div className="fire-grid">
          {GRID.map((g) => g === 'pot' ? (
            <div key="pot" className="fire-pot">
              <img src={art('g-03-pot')} alt="陶罐" />
              {SIDES.map((s) => (
                <span key={s} className={`side-heat side-${s} ${h[s] < HEAT_MIN ? 'cold' : h[s] > HEAT_MAX ? 'hot' : 'ok'}`}>{SIDE_NAME[s]} {h[s]}</span>
              ))}
            </div>
          ) : (
            <button key={g} data-slot={g} className={`fire-slot ${level.wet.includes(g) ? 'wet' : ''} ${sol && (sol[g] ?? 0) > 0 ? 'hint' : ''}`} onClick={() => tap(g)}>
              {level.wet.includes(g) ? <span className="puddle">💧</span>
                : Array.from({ length: pile[g] ?? 0 }, (_, i) => <img key={i} src={art('o-05-woodpile')} alt="柴" style={{ translate: `${i * 10}px ${-i * 14}px` }} />)}
              {burn && (pile[g] ?? 0) > 0 && <img className="flame" src={art('o-05-fire')} alt="" />}
            </button>
          ))}
        </div>
        <div className="fire-foot">
          <span>還有 <b>{left}</b> 捆柴</span>
          <span className="fire-legend">每一面要 {HEAT_MIN}～{HEAT_MAX} 分</span>
          <button className={`btn green ${left > 0 ? 'wait' : 'go-ready'}`} disabled={burn === 'ok'} onClick={() => left > 0 ? (sfx('SE-04'), setSay({ who: 'yan', mood: 'thinking', text: `還有 ${left} 捆柴沒放！點陶罐旁邊的格子把柴堆上去，放完才能點火。` })) : light()}>點火！</button>
        </div>
        {burn === 'ok' && <p className="yes big">燒好了！四面都是漂亮的紅褐色。</p>}
      </div>
      {fails >= 3 && burn !== 'ok' && <button className="btn demo corner-btn" onClick={() => setPile(fireSolve(level) ?? {})}>看示範</button>}
      <Say line={say} />
    </div>
  );
}

// 拍繩紋：在罐子上點三下
function Cord({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(0);
  const tap = () => {
    if (n >= 3) return;
    sfx('SE-09');
    const m = n + 1;
    setN(m);
    if (m === 3) { jingle('MU-13'); setTimeout(onDone, 1000); }
  };
  return (
    <>
      <Goal floating text={`點罐子，用繩子拍出花紋（${n} / 3）`} />
      <Hand at={n < 3 ? '.cord-pot' : null} first={n === 0} />
      <div className="cord panel">
        <h3>用繩子在罐子上拍一拍（{n} / 3）</h3>
        <button className={`cord-pot cord-${n}`} onClick={tap}><img src={art('g-03-pot')} alt="陶罐" /></button>
      </div>
    </>
  );
}
