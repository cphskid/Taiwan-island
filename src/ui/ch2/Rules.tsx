import { useState } from 'react';
import { simulate, type RuleId, type SimResult } from '../../core/mountain';
import { DEER, ROT, RULES, RULES_DONE, RULES_INTRO, RULES_SAY, art2 } from '../../data/ch2';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { NewCards, type Step2Props } from '../Ch2';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'pick' | 'done' | 'cards';

// 步驟 5 部落規範：從六條裡選三條，照著過五年，看小米夠不夠、鹿還在不在
export function Rules({ p, set, next, oops }: Step2Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [on, setOn] = useState<RuleId[]>([]);
  const [sim, setSim] = useState<SimResult | null>(null);
  const [shown, setShown] = useState(0);
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const busy = sim !== null && shown < sim.years.length;

  const toggle = (id: RuleId) => {
    if (busy || sim?.ok) return;
    setSim(null); setSay(null);
    if (on.includes(id)) { sfx('SE-02'); setOn(on.filter((x) => x !== id)); return; }
    if (on.length >= 3) { sfx('SE-04'); return; }
    sfx('SE-07');
    setOn([...on, id]);
  };
  const go = () => {
    const r = simulate(on, ROT, DEER);
    setSim(r); setShown(0); setSay(null);
    sfx('SE-09');
    r.years.forEach((_, k) => setTimeout(() => setShown(k + 1), 600 * (k + 1)));
    setTimeout(() => {
      if (r.ok) { jingle('MU-13'); setSay(RULES_SAY.good); setTimeout(() => { setSay(null); setPhase('done'); }, 2400); return; }
      sfx('SE-71'); oops();
      const f = fails + 1;
      setFails(f);
      setSay(r.hungry ? RULES_SAY.hungry : RULES_SAY.fewDeer);
    }, 600 * (r.years.length + 1));
  };
  return (
    <div className="scene ch2-rules">
      <img className="scene-bg" src={art2('s-10')} alt="" />
      {phase === 'intro' && <Talk lines={RULES_INTRO} onDone={() => setPhase('pick')} />}
      {phase === 'pick' && (
        <div className="rules-wrap">
          <Goal floating text={`選 3 條規矩，看看照著過 5 年會怎樣`} />
          <div className="rules panel">
            <div className="rule-list">
              {RULES.map((r) => (
                <button key={r.id} className={`rule ${on.includes(r.id) ? 'on' : ''} ${fails >= 3 && r.good ? 'hint' : ''}`} onClick={() => toggle(r.id)}>
                  <i>{on.includes(r.id) ? '✔' : ''}</i>{r.text}
                </button>
              ))}
            </div>
            <div className="sim">
              {Array.from({ length: 5 }, (_, k) => {
                const y = sim && shown > k ? sim.years[k] : null;
                return (
                  <div key={k} className={`sim-year ${y ? 'shown' : ''}`}>
                    <b>第 {k + 1} 年</b>
                    <span className={y && y.harvest < ROT.need ? 'no' : ''}><img src={art2('g-04-millet')} alt="" />{y ? `${y.harvest}/${ROT.need}` : '…'}</span>
                    <span className={y && y.deer < DEER.start ? 'no' : ''}><img src={art2('deer')} alt="" />{y ? y.deer : '…'}</span>
                  </div>
                );
              })}
            </div>
            <button className="btn green" disabled={on.length !== 3 || busy || !!sim?.ok} onClick={go}>照這三條過五年</button>
          </div>
          <Say line={say} />
        </div>
      )}
      {phase === 'done' && <Talk lines={RULES_DONE} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCards ids={['share', 'norms', 'peoples']} p={p} set={set} onDone={next} />}
    </div>
  );
}
