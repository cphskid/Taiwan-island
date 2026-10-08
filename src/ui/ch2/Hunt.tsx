import { useEffect, useRef, useState } from 'react';
import { deerRun, ruleRun, ruleHunts, SEASONS } from '../../core/mountain';
import { DEER, HUNT_DEMO_OPEN, HUNT_EASY_INTRO, HUNT_EASY_SAY, HUNT_INTRO, HUNT_SAY, art2 } from '../../data/ch2';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { ChallengeOffer, ChallengeTag } from '../Challenge';
import { NewCards, type Step2Props } from '../Ch2';
import { jingle, sfx } from '../../audio';
import { Decide2, Passage } from './Story2';

type Phase = 'pass' | 'intro' | 'rule' | 'offer' | 'cIntro' | 'challenge' | 'fawn' | 'cards';
const DEMO = [[0, 0, 3, 2], [0, 0, 3, 2]];
const empty = () => Array.from({ length: DEER.years }, () => [0, 0, 0, 0]);

// 步驟 3 狩獵：故事版是「訂獵季的規矩」（阿妮先照想打就打走一年給你看，再由你決定哪幾季可以上山）；
// 原本「每季打幾隻」的兩年規劃，過關後可以選⭐⭐⭐再挑戰
export function Hunt({ p, set, next, oops }: Step2Props) {
  const [phase, setPhase] = useState<Phase>('pass');
  const toFawn = () => setPhase('fawn');
  return (
    <div className="scene ch2-hunt">
      <img className="scene-bg" src={art2('s-12')} alt="" />
      {phase === 'pass' && <Passage id="hunt" onDone={() => setPhase('intro')} />}
      {phase === 'intro' && <Talk lines={HUNT_EASY_INTRO} onDone={() => setPhase('rule')} />}
      {phase === 'rule' && <HuntRule oops={oops} onDone={() => setPhase('offer')} />}
      {phase === 'offer' && <ChallengeOffer text="用你訂的規矩，自己決定每一季打幾隻鹿，兩年都要有肉吃、鹿不能變少。" onTry={() => setPhase('cIntro')} onSkip={toFawn} />}
      {phase === 'cIntro' && <Talk lines={HUNT_INTRO} onDone={() => setPhase('challenge')} />}
      {phase === 'challenge' && <><HuntPlan oops={() => {}} onDone={toFawn} /><ChallengeTag onQuit={toFawn} /></>}
      {phase === 'fawn' && <Decide2 id="fawn" set={set} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCards ids={['deer']} p={p} set={set} onDone={next} />}
    </div>
  );
}

// 故事版：先看阿妮照「四季都打」過一年，再點季節決定哪幾季可以打，看兩年鹿群怎麼變
function HuntRule({ onDone, oops }: { onDone: () => void; oops: () => void }) {
  const [stage, setStage] = useState<'demo' | 'rule'>('demo');
  const [open, setOpen] = useState([false, false, false, false]);
  const [shown, setShown] = useState(0); // 演到第幾年
  const [playing, setPlaying] = useState(false);
  const [fails, setFails] = useState(0);
  const [won, setWon] = useState(false);
  const [say, setSay] = useState<Line | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const cur = stage === 'demo' ? HUNT_DEMO_OPEN : open;
  const years = stage === 'demo' ? 1 : DEER.years;
  const hunts = ruleHunts(DEER, cur);
  const run = ruleRun(DEER, cur);

  const play = (onEnd: () => void) => {
    sfx('SE-09');
    setPlaying(true);
    let k = 0;
    const tick = () => {
      if (!alive.current) return;
      k += 1;
      setShown(k);
      if (k < years) { setTimeout(tick, 1200); return; }
      setTimeout(() => { if (alive.current) { setPlaying(false); onEnd(); } }, 900);
    };
    setTimeout(tick, 300);
  };
  // 一進來阿妮就先走一年給你看
  useEffect(() => { play(() => { sfx('SE-71'); setSay(HUNT_EASY_SAY.demo); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toRule = () => { sfx('SE-36'); setStage('rule'); setShown(0); setSay(HUNT_EASY_SAY.rule); };
  const toggle = (s: number) => {
    if (playing || won) return;
    sfx(open[s] ? 'SE-02' : 'SE-07');
    setShown(0);
    setSay(null);
    setOpen(open.map((o, k) => (k === s ? !o : o)));
  };
  const go = () => {
    if (!open.some(Boolean)) { sfx('SE-04'); setSay(HUNT_EASY_SAY.none); return; }
    setSay(null);
    play(() => {
      if (run.ok) { jingle('MU-13'); setWon(true); setSay(HUNT_EASY_SAY.good); setTimeout(() => alive.current && onDone(), 2200); return; }
      sfx('SE-71'); oops();
      const f = fails + 1;
      setFails(f);
      setSay(f >= 2 ? HUNT_EASY_SAY.hint : HUNT_EASY_SAY.spring);
    });
  };
  const deerAt = (y: number) => (y === 0 ? DEER.start : run.years[y - 1].deerAfter);
  const done = !playing && shown >= years;
  return (
    <div className="hunt-wrap">
      <Goal floating text={stage === 'demo' ? '先看阿妮照「想打就打」過一年。' : '訂獵季：點季節決定哪幾季可以上山。兩年都有肉吃，鹿群也不能變少。'} />
      <div className="hunt-board panel">
        {stage === 'rule' && (
          <div className="hunt-rule">
            {SEASONS.map((n, s) => (
              <button key={n} className={`hunt-toggle ${open[s] ? 'on' : ''} ${fails >= 2 && s === 0 ? 'hint' : ''}`} disabled={playing || won} onClick={() => toggle(s)}>
                <span>{n}{s === 0 && <small> 生小鹿</small>}</span>
                <em>{open[s] ? '🏹 可以打獵' : '🌿 不上山'}</em>
              </button>
            ))}
          </div>
        )}
        {Array.from({ length: years }, (_, y) => (
          <div key={y} className={`hunt-year ${shown > y ? 'shown' : ''}`}>
            <div className="hunt-head">
              <b>{stage === 'demo' ? '想打就打的一年' : `第 ${y + 1} 年`}</b>
              <span className="deer-n"><img src={art2('deer')} alt="" />年初 {shown > y || y === 0 ? deerAt(y) : '?'} 隻</span>
              {shown > y && <span className="meat ok"><img src={art2('g-04-meat')} alt="" />{run.years[y].meat} 隻鹿肉</span>}
            </div>
            <div className="hunt-seasons">
              {hunts.map((h, s) => (
                <div key={s} className={`hunt-season s${s} ${h ? '' : 'closed'}`}>
                  <b>{SEASONS[s]}{s === 0 && <small>生小鹿</small>}</b>
                  <span className="hunt-icons">{shown > y ? (h ? Array.from({ length: h }, (_, k) => <img key={k} src={art2('deer-run')} alt="" />) : '不打') : h ? '🏹' : '🌿'}</span>
                  {shown > y && s === 0 && <em className="births">＋{run.years[y].births} 隻小鹿</em>}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="hunt-foot">
          {done && <span className={`deer-end ${run.years[years - 1].deerAfter < DEER.start ? 'no' : 'yes'}`}><img src={art2('deer')} alt="" />{stage === 'demo' ? '一年後' : `${DEER.years} 年後`}：{run.years[years - 1].deerAfter} 隻</span>}
          {stage === 'demo'
            ? <button className="btn green" disabled={!done} onClick={toRule}>換我來訂規矩 ▶</button>
            : <button className="btn green" disabled={playing || won} onClick={go}>照這個規矩過 {DEER.years} 年</button>}
        </div>
      </div>
      <Say line={say} />
    </div>
  );
}

// ⭐⭐⭐ 再挑戰：兩年、每年四季，決定每一季打幾隻鹿；每年要有 5 隻，兩年後鹿群不能變少
function HuntPlan({ onDone, oops }: { onDone: () => void; oops: () => void }) {
  const [plan, setPlan] = useState<number[][]>(empty);
  const [shown, setShown] = useState(0); // 已經演到第幾年（0 = 還沒出發）
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const run = deerRun(DEER, plan);
  const going = shown > 0 && shown <= DEER.years;

  const bump = (y: number, s: number, d: number) => {
    if (going) return;
    const v = Math.max(0, Math.min(DEER.maxHunt, plan[y][s] + d));
    if (v === plan[y][s]) return;
    sfx(d > 0 ? 'SE-07' : 'SE-02');
    setShown(0);
    setPlan(plan.map((row, k) => k === y ? row.map((x, j) => j === s ? v : x) : row));
  };
  const go = () => {
    sfx('SE-09');
    let k = 0;
    const tick = () => {
      k += 1;
      setShown(k);
      if (k < DEER.years) { setTimeout(tick, 1200); return; }
      setTimeout(() => {
        if (run.ok) { jingle('MU-13'); setSay(HUNT_SAY.good); setTimeout(onDone, 1800); return; }
        sfx('SE-71'); oops();
        const f = fails + 1;
        setFails(f);
        const spring = plan.some((r) => r[0] > 0);
        setSay(f >= 3 ? HUNT_SAY.hint : run.hungry ? HUNT_SAY.hungry : spring ? HUNT_SAY.spring : HUNT_SAY.fewer);
        setShown(DEER.years + 1);
      }, 900);
    };
    tick();
  };
  const deerAt = (y: number) => y === 0 ? DEER.start : run.years[y - 1].deerAfter;
  return (
    <div className="hunt-wrap">
      <Goal floating text={`每年打到 ${DEER.need} 隻，${DEER.years} 年後鹿群至少還有 ${DEER.start} 隻`} />
      <div className="hunt-board panel">
        {plan.map((row, y) => (
          <div key={y} className={`hunt-year ${shown > y ? 'shown' : ''}`}>
            <div className="hunt-head">
              <b>第 {y + 1} 年</b>
              <span className="deer-n"><img src={art2('deer')} alt="" />年初 {shown > y || y === 0 ? deerAt(y) : '?'} 隻</span>
              <span className={`meat ${run.years[y].meat >= DEER.need ? 'ok' : ''}`}><img src={art2('g-04-meat')} alt="" />{run.years[y].meat} / {DEER.need}</span>
            </div>
            <div className="hunt-seasons">
              {row.map((h, s) => (
                <div key={s} className={`hunt-season s${s} ${fails >= 3 && s === 0 ? 'hint' : ''}`}>
                  <b>{SEASONS[s]}{s === 0 && <small>生小鹿</small>}</b>
                  <div className="stepper">
                    <button onClick={() => bump(y, s, -1)} disabled={!h}>－</button>
                    <span>{Array.from({ length: h }, (_, k) => <img key={k} src={art2('deer-run')} alt="" />)}{!h && '不打'}</span>
                    <button onClick={() => bump(y, s, 1)} disabled={h >= DEER.maxHunt}>＋</button>
                  </div>
                  {shown > y && s === 0 && <em className="births">＋{run.years[y].births} 隻小鹿</em>}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="hunt-foot">
          {shown > DEER.years - 1 && <span className={`deer-end ${run.fewer ? 'no' : 'yes'}`}><img src={art2('deer')} alt="" />{DEER.years} 年後：{run.years[DEER.years - 1].deerAfter} 隻</span>}
          <button className="btn green" disabled={going} onClick={go}>照這樣過 {DEER.years} 年</button>
        </div>
      </div>
      {fails >= 5 && !run.ok && <button className="btn demo corner-btn" onClick={() => { setShown(0); setPlan(DEMO.map((r) => [...r])); }}>看示範</button>}
      <Say line={say} />
    </div>
  );
}
