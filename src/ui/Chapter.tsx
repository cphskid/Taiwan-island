import { useEffect, useState } from 'react';
import { goTo, load, save, STEPS, type Progress, type Step } from '../core/save';
import { Opening } from './steps/Opening';
import { Explore } from './steps/Explore';
import { Craft } from './steps/Craft';
import { Puzzle } from './steps/Puzzle';
import { ShareStep } from './steps/ShareStep';
import { Finale } from './steps/Finale';

export interface StepProps {
  p: Progress;
  set: (fn: (p: Progress) => Progress) => void;
  next: () => void;
}

// 第五章「八堡圳」：步驟 0～5 串起來，進度存在這台平板。
// 網址加 ?step=3 可以直接跳到某一步（測試用）。
export function Chapter() {
  const [p, setP] = useState<Progress>(() => {
    const saved = load();
    const jump = Number(new URLSearchParams(location.search).get('step'));
    return jump >= 0 && jump <= 5 && location.search.includes('step=') ? goTo(saved, jump as Step) : saved;
  });
  useEffect(() => save(p), [p]);

  const set = (fn: (p: Progress) => Progress) => setP((old) => fn(old));
  const next = () => setP((old) => goTo(old, Math.min(5, old.step + 1) as Step));
  const props: StepProps = { p, set, next };

  return (
    <div className="chapter">
      <nav className="steps">
        {STEPS.map((name, i) => (
          <button
            key={name}
            className={`step ${i === p.step ? 'on' : ''} ${i <= p.reached ? 'open' : ''}`}
            disabled={i > p.reached}
            onClick={() => setP((old) => goTo(old, i as Step))}
          >
            <i>{i}</i>{name}
          </button>
        ))}
      </nav>
      <div className="stage" key={p.step}>
        {p.step === 0 && <Opening {...props} />}
        {p.step === 1 && <Explore {...props} />}
        {p.step === 2 && <Craft {...props} />}
        {p.step === 3 && <Puzzle {...props} />}
        {p.step === 4 && <ShareStep {...props} />}
        {p.step === 5 && <Finale {...props} />}
      </div>
    </div>
  );
}
