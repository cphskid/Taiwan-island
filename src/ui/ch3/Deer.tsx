import { useEffect, useRef, useState } from 'react';
import { herdEasyGrow, herdEasyRun, herdRun } from '../../core/tayouan';
import { DEER_EASY_INTRO, DEER_EASY_SAY, DEER_INTRO, DEER_SAY, HERD, HERD_DEMO, HERD_EASY, HERD_EASY_DEMAND, art3 } from '../../data/ch3';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { ChallengeOffer, ChallengeTag } from '../Challenge';
import { NewCards3, type Step3Props } from '../Ch3';
import { Decide3 } from './Story3';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'herd' | 'offer' | 'cIntro' | 'challenge' | 'good' | 'choice' | 'cards';
const DEER_IMG = `${import.meta.env.BASE_URL}img/ch2/deer.webp`;

// 步驟 3 鹿皮的代價（接第二章的鹿群）：故事版是每年先長出發亮的小鹿，再點鹿收鹿皮，只收小鹿那麼多鹿群就不會少；
// 第一年烏瑪先收給你看。原本「四年各收幾群」的規劃，過關後可以選⭐⭐⭐再挑戰
export function Deer({ p, set, next, oops }: Step3Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const toGood = () => setPhase('good');
  return (
    <div className="scene ch3-plain">
      <img className="scene-bg" src={art3('s-14')} alt="" />
      {phase === 'intro' && <Talk lines={DEER_EASY_INTRO} onDone={() => setPhase('herd')} />}
      {phase === 'herd' && <HerdEasy oops={oops} onDone={() => setPhase('offer')} />}
      {phase === 'offer' && <ChallengeOffer text="四年要收到 18 群鹿皮，鹿群還不能變少：要先讓鹿長多，再收。你排得出來嗎？" onTry={() => setPhase('cIntro')} onSkip={toGood} />}
      {phase === 'cIntro' && <Talk lines={DEER_INTRO} onDone={() => setPhase('challenge')} />}
      {phase === 'challenge' && <HerdPlan oops={() => {}} onDone={toGood} />}
      {phase === 'challenge' && <ChallengeTag onQuit={toGood} />}
      {phase === 'good' && <Talk lines={[DEER_SAY.good]} onDone={() => setPhase('choice')} />}
      {phase === 'choice' && <Decide3 id="deer" set={set} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCards3 ids={['deerskin', 'siraya']} p={p} set={set} onDone={next} />}
    </div>
  );
}

// 故事版：草原上一隻鹿圖＝一群鹿。每年先長出小鹿（發亮），點鹿收鹿皮，再過一年
function HerdEasy({ oops, onDone }: { oops: () => void; onDone: () => void }) {
  const lv = HERD_EASY;
  const [takes, setTakes] = useState<number[]>([]); // 已經過完的年
  const [picked, setPicked] = useState<number[]>([]); // 今年點了哪幾隻
  const [demo, setDemo] = useState(true); // 第一年烏瑪示範
  const [fails, setFails] = useState(0);
  const [over, setOver] = useState(false); // 四年過完但沒過關
  const [won, setWon] = useState(false);
  const [say, setSay] = useState<Line | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const run = herdEasyRun(lv, takes);
  const year = takes.length;
  const n = year ? run.end : lv.start;
  const g = herdEasyGrow(lv, n);
  const busy = demo || won || over;

  // 第一年：烏瑪一隻一隻點發亮的小鹿，收完再過一年
  useEffect(() => {
    if (!demo) return;
    const fawns = Array.from({ length: g.fawns }, (_, k) => n + k);
    let k = 0;
    const tick = () => {
      if (!alive.current) return;
      if (k < fawns.length) { sfx('SE-07'); k += 1; setPicked(fawns.slice(0, k)); setTimeout(tick, 450); return; }
      setTimeout(() => {
        if (!alive.current) return;
        sfx('SE-103'); setTakes([fawns.length]); setPicked([]); setDemo(false); setSay(DEER_EASY_SAY.demo);
      }, 700);
    };
    const t = setTimeout(tick, 900);
    return () => clearTimeout(t);
  }, [demo]); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = (i: number) => {
    if (busy) return;
    const on = picked.includes(i);
    sfx(on ? 'SE-02' : 'SE-07');
    setSay(null);
    setPicked(on ? picked.filter((x) => x !== i) : [...picked, i]);
  };
  const endYear = () => {
    if (busy) return;
    const t = [...takes, picked.length];
    sfx('SE-103');
    setTakes(t);
    setPicked([]);
    setSay(picked.length > g.fawns ? DEER_EASY_SAY.over : null);
    if (t.length < lv.years) return;
    const r = herdEasyRun(lv, t);
    if (r.ok) { jingle('MU-13'); setWon(true); setSay(DEER_EASY_SAY.good); setTimeout(() => alive.current && onDone(), 2000); return; }
    sfx('SE-71'); oops();
    const f = fails + 1;
    setFails(f);
    setOver(true);
    setSay(f >= 2 ? DEER_EASY_SAY.hint : r.fewer ? DEER_EASY_SAY.fewer : DEER_EASY_SAY.short);
  };
  const again = () => { sfx('SE-02'); setTakes(takes.slice(0, 1)); setPicked([]); setOver(false); setSay(DEER_EASY_SAY.pick); };
  const shownN = over || won ? run.end : g.grown;
  return (
    <div className="ch3-herd-wrap">
      <Goal floating text={demo ? '先看烏瑪收第一年的鹿皮。' : `點鹿收鹿皮：四年收到 ${lv.need} 群，鹿群不能比 ${lv.start} 群少。發亮的是今年剛生的小鹿。`} />
      <div className="ch3-herd panel herd-easy">
        <div className="herd-easy-head">
          <b>{over || won ? '四年過完了' : `第 ${year + 1} 年${demo ? '（烏瑪示範）' : ''}`}</b>
          {!(over || won) && <span className="herd-n"><img src={DEER_IMG} alt="" />草原上 {g.grown} 群<em>（今年生了 {g.fawns} 群小鹿）</em></span>}
          {!(over || won) && <span className="herd-want">商館想要 {HERD_EASY_DEMAND} 群</span>}
        </div>
        <div className="herd-field">
          {Array.from({ length: shownN }, (_, i) => {
            const fawn = !(over || won) && i >= n;
            const on = picked.includes(i);
            return (
              <button key={`${year}-${i}`} className={`herd-deer ${fawn ? 'fawn' : ''} ${on ? 'on' : ''} ${fails >= 2 && fawn && !on ? 'hint' : ''}`} disabled={busy} onClick={() => tap(i)}>
                <img src={on ? art3('g-05-hides') : DEER_IMG} alt={on ? '鹿皮' : '鹿'} />
              </button>
            );
          })}
        </div>
        <div className="herd-history">
          {Array.from({ length: lv.years }, (_, y) => (
            <span key={y} className={y < takes.length ? (run.years[y].take > run.years[y].fawns ? 'no' : 'yes') : ''}>
              第 {y + 1} 年{y < takes.length ? `：收 ${run.years[y].take} 群 → 剩 ${run.years[y].after} 群` : y === year ? '：進行中' : ''}
            </span>
          ))}
        </div>
        <div className="ch3-herd-foot">
          <span className={`hides ${run.total + picked.length >= lv.need ? 'ok' : ''}`}><img src={art3('g-05-hides')} alt="" />鹿皮 {run.total + picked.length} / {lv.need} 群</span>
          {over
            ? <button className="btn orange" onClick={again}>從第 2 年再來</button>
            : !won && <button className="btn green" disabled={busy} onClick={endYear}>收 {picked.length} 群鹿皮，過一年 ▶</button>}
        </div>
      </div>
      <Say line={say} />
    </div>
  );
}

// ⭐⭐⭐ 再挑戰：四年裡收夠鹿皮，四年後鹿群不能比現在少
function HerdPlan({ oops, onDone }: { oops: () => void; onDone: () => void }) {
  const [takes, setTakes] = useState<number[]>(() => Array(HERD.years).fill(0));
  const [shown, setShown] = useState(0); // 演到第幾年（0 = 還沒開始）
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const [won, setWon] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const run = herdRun(HERD, takes);
  const going = shown > 0 && shown <= HERD.years;

  const bump = (y: number, d: number) => {
    if (going || won) return;
    const v = Math.max(0, Math.min(HERD.maxTake, takes[y] + d));
    if (v === takes[y]) return;
    sfx(d > 0 ? 'SE-07' : 'SE-02');
    setShown(0);
    setTakes(takes.map((t, k) => (k === y ? v : t)));
  };
  const go = (plan = takes) => {
    sfx('SE-103');
    const r = herdRun(HERD, plan);
    let k = 0;
    const tick = () => {
      if (!alive.current) return;
      k += 1;
      setShown(k);
      if (k < HERD.years) { setTimeout(tick, 1000); return; }
      setTimeout(() => {
        if (!alive.current) return;
        if (r.ok) { jingle('MU-13'); setWon(true); setTimeout(() => alive.current && onDone(), 1500); return; }
        sfx('SE-71'); oops();
        const f = fails + 1;
        setFails(f);
        setSay(f >= 3 ? DEER_SAY.hint : !r.enough ? DEER_SAY.short : DEER_SAY.fewer);
        setShown(HERD.years + 1);
      }, 800);
    };
    tick();
  };
  const demo = () => { setTakes([...HERD_DEMO]); setShown(0); setTimeout(() => go(HERD_DEMO), 300); };
  const startOf = (y: number) => (y === 0 ? HERD.start : run.years[y - 1].after);
  const done = shown > HERD.years - 1;
  return (
    <div className="ch3-herd-wrap">
      <Goal floating text={`四年收到 ${HERD.need} 群的鹿皮，四年後鹿群不能比 ${HERD.start} 群少。收完剩下的鹿會生小鹿，草原最多養 ${HERD.cap} 群。`} />
      <div className="ch3-herd panel">
        <div className="ch3-years">
          {takes.map((t, y) => (
            <div key={y} className={`ch3-year ${shown > y ? 'shown' : ''} ${fails >= 3 && y === 0 ? 'ch3-hint' : ''}`}>
              <b>第 {y + 1} 年</b>
              <span className="herd-n"><img src={DEER_IMG} alt="" />年初 {shown > y || y === 0 ? startOf(y) : '?'} 群</span>
              <div className="stepper">
                <button onClick={() => bump(y, -1)} disabled={!t || going || won}>－</button>
                <span className="take"><img src={art3('g-05-hides')} alt="" />收 {t} 群</span>
                <button onClick={() => bump(y, 1)} disabled={t >= HERD.maxTake || going || won}>＋</button>
              </div>
              {shown > y && (
                <span className="herd-calc">剩 {run.years[y].left} 群 <em>＋{run.years[y].born} 小鹿</em> → {run.years[y].after} 群{run.years[y].left + run.years[y].born > HERD.cap ? '（草原滿了）' : ''}</span>
              )}
            </div>
          ))}
        </div>
        <p className="ch3-rule">收完以後，剩下的鹿每 {HERD.birthDiv} 群會生 1 群小鹿（零頭不算）；草原最多養 {HERD.cap} 群。</p>
        <div className="ch3-herd-foot">
          <span className={`hides ${run.total >= HERD.need ? 'ok' : ''}`}><img src={art3('g-05-hides')} alt="" />鹿皮 {run.total} / {HERD.need} 群</span>
          {done && <span className={`herd-end ${run.fewer ? 'no' : 'yes'}`}><img src={DEER_IMG} alt="" />四年後 {run.end} 群</span>}
          <button className="btn green" disabled={going || won} onClick={() => go()}>照這樣過四年</button>
        </div>
      </div>
      {fails >= 5 && !won && <button className="btn demo corner-btn" disabled={going} onClick={demo}>看示範</button>}
      <Say line={say} />
    </div>
  );
}
