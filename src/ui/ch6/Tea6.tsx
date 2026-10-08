import { useEffect, useRef, useState } from 'react';
import { teaGood, teaRun, type TeaRun } from '../../core/railway';
import { TEA, TEA_DONE, TEA_EASY_INTRO, TEA_EASY_SAY, TEA_INTRO, TEA_RULE, TEA_SAY, TEA_STEPS, art6 } from '../../data/ch6';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { ChallengeOffer, ChallengeTag } from '../Challenge';
import { challengeDone } from '../Medal';
import { NewCards6, type Step6Props } from '../Ch6';
import { Decide6, Jump6 } from './Story6';
import { jingle, sfx } from '../../audio';

type Phase = 'jump' | 'intro' | 'journey' | 'boss' | 'offer' | 'cIntro' | 'plan' | 'done' | 'cards';

// 步驟 2 茶葉出口：故事版是排出「一片茶葉的旅程」（阿春先放第一站）；
// 原本四批茶排揀茶、烘焙順序的排程題，過關後可以選⭐⭐⭐再挑戰
export function Tea6({ p, set, next, oops }: Step6Props) {
  const [phase, setPhase] = useState<Phase>('jump');
  const toDone = () => setPhase('done');
  return (
    <div className="scene ch6-tea ch6-rain">
      <img className="scene-bg" src={art6('s-19')} alt="" />
      <div className="ch6-rainfall" />
      {phase === 'jump' && <Jump6 from={0} to={1} onDone={() => setPhase('intro')} />}
      {phase === 'intro' && <Talk lines={TEA_EASY_INTRO} onDone={() => setPhase('journey')} />}
      {phase === 'journey' && <Journey oops={oops} onDone={() => setPhase('boss')} />}
      {phase === 'boss' && <Decide6 id="boss" set={set} onDone={() => setPhase('offer')} />}
      {phase === 'offer' && <ChallengeOffer text="幫阿春排四批茶的順序：揀茶桌和焙籠一次只能做一批，揀好的茶等太久會發霉，天黑前要全部烘好。" onTry={() => setPhase('cIntro')} onSkip={toDone} />}
      {phase === 'cIntro' && <Talk lines={TEA_INTRO} onDone={() => setPhase('plan')} />}
      {phase === 'plan' && <><Schedule oops={() => {}} night={p.picks.boss === 1} onDone={() => { challengeDone('ch6:tea'); toDone(); }} /><ChallengeTag onQuit={toDone} /></>}
      {phase === 'done' && <Talk lines={TEA_DONE} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCards6 ids={['c6-tea', 'c6-camphor']} p={p} set={set} onDone={next} />}
    </div>
  );
}

// 卡片打散的順序（固定，免得每次重來都不一樣）
const SHUFFLE = ['roast', 'port', 'sort', 'ship', 'carry', 'box', 'pick'];

// 故事版：點卡片排出茶葉的旅程，點錯的話阿春說為什麼還太早
function Journey({ oops, onDone }: { oops: () => void; onDone: () => void }) {
  const [placed, setPlaced] = useState<string[]>([]);
  const [miss, setMiss] = useState(0); // 這一站點錯幾次
  const [bad, setBad] = useState<string | null>(null);
  const [demo, setDemo] = useState(true);
  const [say, setSay] = useState<Line | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  useEffect(() => {
    const t = setTimeout(() => { if (!alive.current) return; sfx('SE-115'); setPlaced([TEA_STEPS[0].id]); setSay(TEA_EASY_SAY.demo); setDemo(false); }, 1000);
    return () => clearTimeout(t);
  }, []);
  const want = TEA_STEPS[placed.length];
  const done = placed.length === TEA_STEPS.length;
  const tap = (id: string) => {
    if (demo || done || placed.includes(id)) return;
    if (id === want.id) {
      sfx('SE-115');
      const p = [...placed, id];
      setPlaced(p); setMiss(0); setBad(null);
      if (p.length === TEA_STEPS.length) { jingle('MU-13'); setSay(TEA_EASY_SAY.good); setTimeout(() => alive.current && onDone(), 2400); return; }
      setSay(null);
      return;
    }
    sfx('SE-04'); oops();
    setMiss(miss + 1); setBad(id);
    setSay(TEA_EASY_SAY.wrong(TEA_STEPS.find((t) => t.id === id)!, want));
  };
  const step = (id: string) => TEA_STEPS.find((t) => t.id === id)!;
  return (
    <div className="ch6-tea-wrap">
      <Goal floating text={demo ? '先看阿春放第一站。' : '點卡片，照順序排出一片茶葉從茶園到外國的旅程。'} />
      <div className="panel tea-journey">
        <div className="tea-road">
          {TEA_STEPS.map((t, i) => {
            const id = placed[i];
            return (
              <div key={t.id} className={`tea-slot ${id ? 'on' : ''} ${i === placed.length && !done ? 'next' : ''}`}>
                <em>{i + 1}</em>
                {id ? <><img src={art6(step(id).img)} alt="" /><b>{step(id).name}</b></> : <span>？</span>}
              </div>
            );
          })}
        </div>
        <div className="tea-cards">
          {SHUFFLE.filter((id) => !placed.includes(id)).map((id) => {
            const t = step(id);
            return (
              <button key={id} className={`tea-card ${bad === id ? 'bad' : ''} ${miss >= 2 && id === want?.id ? 'hint' : ''}`} disabled={demo || done} onClick={() => tap(id)}>
                <img src={art6(t.img)} alt="" />
                <b>{t.name}</b>
                <small>{t.text}</small>
              </button>
            );
          })}
        </div>
      </div>
      <Say line={say} />
    </div>
  );
}

const HOURS = Array.from({ length: TEA.limit + 2 }, (_, i) => i);
const TEA_IMG: Record<string, string> = { oolong: 'g-07-tea', pouchong: 'g-07-tea', fine: 'g-07-tea', coarse: 'g-07-tea' };
const TEA_TINT: Record<string, string> = { oolong: '#6b8e23', pouchong: '#3fa86b', fine: '#2e7d5b', coarse: '#a0864a' };

// ⭐⭐⭐ 再挑戰：四批茶排先後順序。揀茶桌、焙籠一次只能做一批；揀好的茶等太久會發霉、天黑前要烘完
function Schedule({ onDone, oops, night }: { onDone: () => void; oops: () => void; night: boolean }) {
  const [order, setOrder] = useState<string[]>([]);
  const [run, setRun] = useState<TeaRun | null>(null);
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(night ? { who: 'chun', mood: 'determined', text: '排得好，我就不用熬夜了。我們試試看！' } : null);
  const good = teaGood(TEA)[0];
  const left = TEA.batches.filter((b) => !order.includes(b.id));
  const add = (id: string) => { if (run?.ok) return; sfx('SE-115'); setRun(null); setOrder([...order, id]); };
  const drop = (id: string) => { if (run?.ok) return; sfx('SE-02'); setRun(null); setOrder(order.filter((x) => x !== id)); };
  const start = () => {
    const r = teaRun(TEA, order);
    setRun(r);
    sfx('SE-36');
    if (r.ok) { jingle('MU-13'); setSay(TEA_SAY.good); setTimeout(onDone, 2200); return; }
    setTimeout(() => sfx('SE-71'), 600);
    oops();
    const f = fails + 1;
    setFails(f);
    setSay(f >= 3 ? TEA_SAY.hint2 : f === 2 ? TEA_SAY.hint1 : r.moldy.length ? TEA_SAY.moldy : TEA_SAY.late);
  };
  const name = (id: string) => TEA.batches.find((b) => b.id === id)!.name;
  return (
    <div className="ch6-tea-wrap">
      <Goal floating text={`排好四批茶的順序，天黑前全部烘好。${TEA_RULE}`} />
      <div className="ch6-tea-board panel">
        <div className="ch6-tea-top">
          <div className="ch6-batches">
            {TEA.batches.map((b) => {
              const k = order.indexOf(b.id);
              return (
                <button key={b.id} className={`ch6-batch ${k >= 0 ? 'on' : ''} ${fails >= 3 && k < 0 && good[order.length] === b.id ? 'hint' : ''}`}
                  onClick={() => (k >= 0 ? drop(b.id) : add(b.id))} style={{ ['--tint' as string]: TEA_TINT[b.id] }}>
                  {k >= 0 && <em className="ch6-batch-n">{k + 1}</em>}
                  <img src={art6(TEA_IMG[b.id])} alt="" />
                  <b>{b.name}</b>
                  <span>🧺 揀茶 {b.sort} 小時</span>
                  <span>🔥 烘焙 {b.roast} 小時</span>
                </button>
              );
            })}
          </div>
          <div className="ch6-order">
            <small>做的順序</small>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={order[i] ? 'on' : ''}>{i + 1}. {order[i] ? name(order[i]).split('（')[0] : '—'}</span>
            ))}
          </div>
        </div>
        <div className="ch6-gantt" style={{ ['--h' as string]: HOURS.length }}>
          <div className="ch6-g-row ch6-g-hours"><b /><span>{HOURS.map((h) => <i key={h}>{h}</i>)}</span></div>
          {(['sort', 'roast'] as const).map((row) => (
            <div key={row} className="ch6-g-row">
              <b>{row === 'sort' ? '🧺 揀茶桌' : '🔥 焙籠'}</b>
              <span>
                {run?.rows.map((r, k) => {
                  const from = row === 'sort' ? r.sortAt : r.roastAt, to = row === 'sort' ? r.sortEnd : r.roastEnd;
                  const bad = row === 'roast' && run.moldy.includes(r.id);
                  const late = row === 'roast' && to > TEA.limit;
                  return (
                    <em key={r.id} className={`${bad ? 'moldy' : ''} ${late ? 'late' : ''}`} style={{ left: `${(from / HOURS.length) * 100}%`, width: `${((to - from) / HOURS.length) * 100}%`, background: TEA_TINT[r.id], animationDelay: `${k * 0.15}s` }}>
                      {k + 1}{bad && ' 霉'}
                    </em>
                  );
                })}
                {row === 'roast' && run?.rows.filter((r) => r.waited > 0).map((r) => (
                  <u key={r.id} className={run.moldy.includes(r.id) ? 'moldy' : ''} style={{ left: `${(r.sortEnd / HOURS.length) * 100}%`, width: `${(r.waited / HOURS.length) * 100}%` }}>等{r.waited}</u>
                ))}
              </span>
            </div>
          ))}
          <i className="ch6-night" style={{ left: `calc(var(--lab) + (100% - var(--lab)) * ${TEA.limit / HOURS.length})` }}>🌙 天黑</i>
        </div>
        <div className="ch6-tea-foot">
          <small>{run ? (run.ok ? `第 ${run.end} 小時全部烘好！` : run.moldy.length ? `有 ${run.moldy.length} 批茶等太久，發霉了` : `烘到第 ${run.end} 小時，天已經黑了`) : '點茶葉排順序，再點「開工！」看一天怎麼過'}</small>
          <button className="btn orange" disabled={!order.length || !!run?.ok} onClick={() => { sfx('SE-02'); setOrder([]); setRun(null); }}>重排</button>
          <button className="btn green" disabled={!!left.length || !!run} onClick={start}>開工！</button>
        </div>
      </div>
      {fails >= 5 && !run?.ok && <button className="btn demo corner-btn" onClick={() => { setOrder(good); setRun(null); }}>看示範</button>}
      <Say line={say} />
    </div>
  );
}
