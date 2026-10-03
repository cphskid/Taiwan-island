import { useState } from 'react';
import { everyonePlans, USES, vote, type Plan, type VoteResult } from '../../core/today';
import { BLOCKS, FIRST_VOTE, GROUPS, MEET_DONE, MEET_INTRO, MEET_RULES, MEET_SAY, USE_INFO, artE } from '../../data/chEnd';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { NewCardsEnd, type StepEndProps } from '../ChEnd';
import { DecideEnd, EraJumpEnd } from './StoryEnd';
import { jingle, sfx } from '../../audio';

type Phase = 'jump' | 'intro' | 'speak' | 'rules' | 'plan' | 'park' | 'done' | 'cards';
const ANSWER = everyonePlans()[0];

// 步驟 3 一起做決定：先舉手表決（票很接近）→ 小安上台說小朋友的意見 → 把空地分成四塊，找出五組都接受的方案
export function Meeting({ p, set, next, oops }: StepEndProps) {
  const [phase, setPhase] = useState<Phase>('jump');
  const total = USES.reduce((s, u) => s + FIRST_VOTE[u], 0);
  return (
    <div className="scene end-meet">
      <img className="scene-bg" src={artE('s-26')} alt="" />
      {phase === 'jump' && <EraJumpEnd to={3} onDone={() => setPhase('intro')} />}
      {phase === 'intro' && (
        <>
          <div className="end-vote panel">
            <h3>第一次舉手表決（{total} 人）</h3>
            {USES.map((u) => (
              <div key={u} className="end-vote-row">
                <img src={USE_INFO[u].img} alt="" /><b>{USE_INFO[u].name}</b>
                <i style={{ width: `${(FIRST_VOTE[u] / total) * 100 * 2}%` }} /><span>{FIRST_VOTE[u]} 票</span>
              </div>
            ))}
          </div>
          <Talk lines={MEET_INTRO} onDone={() => setPhase('speak')} />
        </>
      )}
      {phase === 'speak' && (
        <>
          <img className="end-an-mic" src={artE('f-10a-mic')} alt="小安" />
          <DecideEnd id="speak" set={set} onDone={() => setPhase('rules')} />
        </>
      )}
      {phase === 'rules' && <Talk lines={MEET_RULES} onDone={() => setPhase('plan')} />}
      {phase === 'plan' && <Lot oops={oops} onDone={() => setPhase('park')} />}
      {phase === 'park' && <DecideEnd id="park" set={set} onDone={() => setPhase('done')} />}
      {phase === 'done' && <Talk lines={MEET_DONE} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCardsEnd ids={['vote', 'civic', 'minority']} p={p} set={set} onDone={next} />}
    </div>
  );
}

function Lot({ oops, onDone }: { oops: () => void; onDone: () => void }) {
  const [plan, setPlan] = useState<Plan>([null, null, null, null]);
  const [res, setRes] = useState<VoteResult | null>(null);
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const [passed, setPassed] = useState(false);
  const full = plan.every((u) => u !== null);

  // 點一塊地，就換下一種用途：空地 → 公園 → 停車場 → 市場 → 公園…
  const tap = (i: number) => {
    if (passed) return;
    sfx('SE-07');
    const u = plan[i];
    const nu = u === null ? USES[0] : USES[(USES.indexOf(u) + 1) % USES.length];
    setPlan(plan.map((x, k) => (k === i ? nu : x)));
    setRes(null);
  };
  const tryVote = () => {
    const r = vote(plan);
    setRes(r);
    if (r.everyone) { jingle('MU-13'); setPassed(true); setSay(MEET_SAY.good); setTimeout(onDone, 2600); return; }
    sfx('SE-71'); oops();
    const f = fails + 1;
    setFails(f);
    setSay(f >= 2 ? MEET_SAY.hint : r.passed ? MEET_SAY.almost : MEET_SAY.fewer);
  };
  const demo = () => { setPlan([...ANSWER]); setRes(null); };
  return (
    <div className="end-lot-wrap">
      <Goal floating text={full ? '排好了，按「試投票」看看五組贊不贊成' : '點空地的每一塊，換成公園、停車場或市場。最好的方案是五組都贊成。'} />
      <div className="end-lot">
        <span className="end-lot-side top">🛣 大馬路</span>
        <span className="end-lot-side left">🏫 學校</span>
        <span className="end-lot-side right">🏢 公寓</span>
        <span className="end-lot-side bottom">🏠 老房子</span>
        <div className="end-lot-grid">
          {plan.map((u, i) => (
            <button key={i} className={`end-lot-block ${u ?? 'empty'} ${fails >= 3 && u !== ANSWER[i] ? 'hint' : ''}`} onClick={() => tap(i)} aria-label={BLOCKS[i]}>
              {u ? <><img src={USE_INFO[u].img} alt="" /><b>{USE_INFO[u].name}</b></> : <b className="end-lot-empty">空地<br /><small>點一下</small></b>}
              {fails >= 3 && u !== ANSWER[i] && <em className="end-lot-ghost">試試{USE_INFO[ANSWER[i]].name}？</em>}
            </button>
          ))}
        </div>
      </div>
      <div className="end-lot-groups panel">
        {GROUPS.map((g) => {
          const yes = res?.yes.includes(g.id), no = res && !yes;
          return (
            <div key={g.id} className={`end-lot-group ${yes ? 'yes' : ''} ${no ? 'no' : ''}`}>
              <i>{g.icon}</i>
              <p><b>{g.name}</b>{g.need}</p>
              <em>{yes ? '贊成 ✋' : no ? '反對' : ''}</em>
            </div>
          );
        })}
        <div className="end-lot-foot">
          {res && <span className={res.everyone ? 'ok' : res.passed ? 'mid' : 'bad'}>贊成 {res.yes.length} / {GROUPS.length}{res.passed ? '（過半數）' : '（沒過半數）'}</span>}
          <button className="btn green" disabled={!full || passed} onClick={tryVote}>試投票</button>
        </div>
      </div>
      {fails >= 5 && !passed && <button className="btn demo corner-btn" onClick={demo}>看示範</button>}
      <Say line={say} />
    </div>
  );
}
