import { useState } from 'react';
import { CROPS, WATER, rotaCheck, rotaSolutions, rotaWater, type Crop, type Rota as RotaGrid } from '../../core/jianan';
import { CROP_IMG, CROP_NAME, HOME_ZONE, ROTA, ROTA_INTRO, ROTA_SAY, art7 } from '../../data/ch7';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { NewCards7, type Step7Props } from '../Ch7';
import { Decide7, EraJump7 } from './Story7';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'plan' | 'rice' | 'cards' | 'jump';
const empty = (): RotaGrid => ROTA.supply.map(() => ROTA.zones.map(() => null));

// 步驟 3 三年輪作（1930）：水庫的水不夠全部種稻，三區輪流種水稻、甘蔗、雜作；排好以後，阿雄想讓家裡多種一年稻（選擇）
export function Rota({ p, set, next, oops }: Step7Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  return (
    <div className="scene ch7-rota">
      <img className="scene-bg" src={art7('s-22')} alt="" />
      {phase === 'intro' && <Talk lines={ROTA_INTRO} onDone={() => setPhase('plan')} />}
      {phase === 'plan' && <Planner oops={oops} onDone={() => setPhase('rice')} />}
      {phase === 'rice' && <Decide7 id="rice" set={set} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCards7 ids={['rotation', 'kumiai']} p={p} set={set} onDone={() => setPhase('jump')} />}
      {phase === 'jump' && <EraJump7 from={2} to={3} onDone={next} />}
    </div>
  );
}

function Planner({ oops, onDone }: { oops: () => void; onDone: () => void }) {
  const [r, setR] = useState<RotaGrid>(empty);
  const [crop, setCrop] = useState<Crop>('rice');
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const [marks, setMarks] = useState<{ over: number[]; repeat: number[]; mix: number[] }>({ over: [], repeat: [], mix: [] });
  const [ok, setOk] = useState(false);
  const sol = rotaSolutions(ROTA)[0];
  const full = r.every((row) => row.every((c) => c !== null));

  const put = (y: number, z: number) => {
    if (ok) return;
    const nr = r.map((row) => [...row]);
    nr[y][z] = r[y][z] === crop ? null : crop;
    sfx(nr[y][z] ? 'SE-07' : 'SE-02');
    setR(nr);
    setMarks({ over: [], repeat: [], mix: [] });
  };
  const check = () => {
    const c = rotaCheck(ROTA, r);
    if (c.ok) {
      setOk(true);
      jingle('MU-13');
      setSay(ROTA_SAY.good);
      setTimeout(onDone, 2000);
      return;
    }
    sfx('SE-71'); oops();
    setMarks(c);
    const f = fails + 1;
    setFails(f);
    setSay(f >= 2 ? ROTA_SAY.hint : c.mix.length ? ROTA_SAY.mix : c.repeat.length ? ROTA_SAY.repeat : ROTA_SAY.over);
  };

  return (
    <div className="ch7-rota-wrap">
      <Goal floating text="排三年的種法：每年三區種三種不一樣的，每區三年都輪到水稻，每年的水不能超過水庫放的水" />
      <div className="ch7-rota-board panel">
        <div className="ch7-crops">
          {CROPS.map((c) => (
            <button key={c} className={`ch7-crop ${crop === c ? 'on' : ''}`} onClick={() => { sfx('SE-01'); setCrop(c); }}>
              <img src={CROP_IMG[c]} alt="" /><b>{CROP_NAME[c]}</b><small>每塊田 {WATER[c]} 份水</small>
            </button>
          ))}
        </div>
        <table className="ch7-rota-grid">
          <thead>
            <tr>
              <th />
              {ROTA.zones.map((z, k) => (
                <th key={z} className={marks.repeat.includes(k) ? 'bad' : ''}>
                  {z}{k === HOME_ZONE && <em>阿雄家</em>}
                  <span className="ch7-plots">{Array.from({ length: ROTA.areas[k] }, (_, i) => <i key={i} />)}</span>
                  <small>{ROTA.areas[k]} 塊田</small>
                </th>
              ))}
              <th>用水</th>
            </tr>
          </thead>
          <tbody>
            {r.map((row, y) => {
              const w = rotaWater(ROTA, row);
              const over = w > ROTA.supply[y];
              return (
                <tr key={y} className={marks.mix.includes(y) ? 'bad' : ''}>
                  <th>第 {y + 1} 年</th>
                  {row.map((c, z) => {
                    const hint = fails >= 3 && y === 0 && c !== sol[0][z] ? sol[0][z] : null;
                    return (
                      <td key={z}>
                        <button className={`ch7-rcell ${c ?? 'empty'} ${hint ? 'ch7-hint' : ''} ${marks.repeat.includes(z) ? 'bad' : ''}`} onClick={() => put(y, z)}>
                          {c ? <><img src={CROP_IMG[c]} alt="" /><small>{CROP_NAME[c]} {ROTA.areas[z] * WATER[c]}</small></> : hint ? <small>試試{CROP_NAME[hint]}</small> : <small>＋</small>}
                        </button>
                      </td>
                    );
                  })}
                  <td>
                    <div className={`ch7-water ${over || marks.over.includes(y) ? 'over' : w === ROTA.supply[y] ? 'just' : ''}`}>
                      <span className="ch7-water-bar"><i style={{ width: `${Math.min(100, (w / ROTA.supply[y]) * 100)}%` }} /></span>
                      <b>💧{w} / {ROTA.supply[y]}</b>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="ch7-rota-foot">
          <small>一區的用水＝田的塊數 × 作物要的水</small>
          <button className="btn orange" disabled={ok} onClick={() => { sfx('SE-02'); setR(empty()); setMarks({ over: [], repeat: [], mix: [] }); }}>清空</button>
          <button className="btn green" disabled={!full || ok} onClick={check}>這樣種三年</button>
        </div>
      </div>
      {fails >= 5 && !ok && <button className="btn demo corner-btn" onClick={() => setR(sol.map((row) => [...row]))}>看示範</button>}
      <Say line={say} />
    </div>
  );
}
