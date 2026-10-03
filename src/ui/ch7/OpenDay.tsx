import { useState } from 'react';
import { WATER, gateCheck, rotaSolutions, type Crop } from '../../core/jianan';
import { CROP_IMG, CROP_NAME, GATE_INTRO, GATE_SAY, HOME_ZONE, OPEN_DAY, ROTA, art7 } from '../../data/ch7';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { NewCards7, type Step7Props } from '../Ch7';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'gates' | 'flow' | 'cards';
const YEAR1 = rotaSolutions(ROTA)[0][0] as Crop[];
const MAX = 9;

// 步驟 5 完工的那一天（1930）：照三年輪作的第一年，把每一區的水門開到剛剛好，水流進阿雄家的田
export function OpenDay({ p, set, next, oops }: Step7Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  return (
    <div className={`scene ch7-open ${phase === 'flow' || phase === 'cards' ? 'wet' : 'ch7-dry'}`}>
      <img className="scene-bg" src={art7('s-22')} alt="" />
      {phase === 'intro' && <Talk lines={GATE_INTRO} onDone={() => setPhase('gates')} />}
      {phase === 'gates' && <Gates oops={oops} onDone={() => setPhase('flow')} />}
      {phase === 'flow' && <><img className="ch7-kid cheer" src={art7('f-09a-cheer')} alt="阿雄" /><Talk lines={OPEN_DAY} onDone={() => setPhase('cards')} /></>}
      {phase === 'cards' && <NewCards7 ids={['canal']} p={p} set={set} onDone={next} />}
    </div>
  );
}

function Gates({ oops, onDone }: { oops: () => void; onDone: () => void }) {
  const [open, setOpen] = useState<number[]>(() => ROTA.zones.map(() => 0));
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const [res, setRes] = useState<{ dry: number[]; flood: number[] } | null>(null);
  const [won, setWon] = useState(false);
  const total = open.reduce((a, b) => a + b, 0);
  const need = YEAR1.map((c, z) => ROTA.areas[z] * WATER[c]);

  const turn = (z: number, d: number) => {
    if (won) return;
    const v = Math.max(0, Math.min(MAX, open[z] + d));
    if (v === open[z]) { sfx('SE-04'); return; }
    sfx('SE-01');
    setOpen(open.map((x, k) => (k === z ? v : x)));
    setRes(null);
  };
  const release = () => {
    const r = gateCheck(ROTA, YEAR1, open);
    sfx('SE-119');
    setRes(r);
    if (r.ok) {
      setWon(true);
      jingle('MU-14');
      setSay({ who: 'hsiung', mood: 'thumbs', text: '剛剛好！每一區的水都夠了！' });
      setTimeout(onDone, 2400);
      return;
    }
    setTimeout(() => sfx('SE-71'), 400);
    oops();
    const n = fails + 1;
    setFails(n);
    setSay(n >= 2 ? GATE_SAY.hint : r.dry.length ? GATE_SAY.dry : GATE_SAY.flood);
  };

  return (
    <div className="ch7-gate-wrap">
      <Goal floating text={`轉水門：每一區放的水要剛剛好（田的塊數×作物要的水），加起來 ${ROTA.supply[0]} 份`} />
      <div className="ch7-gate-board panel">
        <div className="ch7-supply">
          <img src={art7('g-08-gate')} alt="" />
          <b>烏山頭水庫今天放 💧{ROTA.supply[0]} 份</b>
          <span className={total > ROTA.supply[0] ? 'over' : total === ROTA.supply[0] ? 'just' : ''}>水門一共開了 {total} 份</span>
        </div>
        <div className="ch7-gates">
          {ROTA.zones.map((z, k) => {
            const c = YEAR1[k];
            const st = res?.dry.includes(k) ? 'dry' : res?.flood.includes(k) ? 'flood' : won ? 'good' : '';
            return (
              <div key={z} className={`ch7-gate ${st}`}>
                <b>{z}{k === HOME_ZONE && <em>阿雄家</em>}</b>
                <div className="ch7-gate-crop"><img src={CROP_IMG[c]} alt="" /><span>{CROP_NAME[c]}<small>每塊 {WATER[c]} 份</small></span></div>
                <span className="ch7-plots big">{Array.from({ length: ROTA.areas[k] }, (_, i) => <i key={i} className={st === 'good' || st === 'flood' ? 'wet' : ''} />)}</span>
                <small>{ROTA.areas[k]} 塊田</small>
                <div className="stepper">
                  <button onClick={() => turn(k, -1)} disabled={won}>−</button>
                  <span className="ch7-open-n">💧{open[k]}</span>
                  <button onClick={() => turn(k, 1)} disabled={won}>＋</button>
                </div>
                {fails >= 3 && !won && <small className="ch7-need">{ROTA.areas[k]} × {WATER[c]} = {need[k]}</small>}
                {st === 'dry' && <em className="ch7-tag">太少，田乾</em>}
                {st === 'flood' && <em className="ch7-tag">太多，淹水</em>}
              </div>
            );
          })}
        </div>
        <div className="ch7-gate-foot">
          <img className="ch7-gate-kid" src={art7('f-09a-gate')} alt="" />
          <button className="btn green" disabled={won} onClick={release}>開閘放水</button>
        </div>
      </div>
      {fails >= 5 && !won && <button className="btn demo corner-btn" onClick={() => { setOpen(need); setRes(null); }}>看示範</button>}
      <Say line={say} />
    </div>
  );
}
