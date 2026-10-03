import { useEffect, useState } from 'react';
import { cropUse, pondSolutions, runPond, type Crop, type PondRun } from '../../core/tuntian';
import { POND, POND_INTRO, POND_SAY, art4 } from '../../data/ch4';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { NewCards, type Step4Props } from '../Ch4';
import { Decide4 } from './Story4';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'plan' | 'run' | 'choice' | 'cards';
const NEXT: Record<Crop, Crop> = { none: 'rice', rice: 'potato', potato: 'none' };
const CROP_IMG: Record<Crop, string> = { none: 'o-08-dry', rice: 'o-08-paddy', potato: 'o-08-potato' };
const CROP_NAME: Record<Crop, string> = { none: '空著', rice: '稻子', potato: '番薯' };
const SEASON_ICON = ['🌱', '🌧️', '☀️', '🌀', '🍂', '❄️'];

// 步驟 2 開水埤：決定埤挖多大、田種什麼，放水跑一整年；雨季要存得住、旱季要撐得過，收成還要夠
export function Pond({ p, set, next, oops }: Step4Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [cells, setCells] = useState(1);
  const [crops, setCrops] = useState<Crop[]>(() => Array(POND.plots).fill('none'));
  const [run, setRun] = useState<PondRun | null>(null);
  const [shown, setShown] = useState(0); // 一季一季揭曉
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const labor = cells + crops.filter((c) => c !== 'none').length;
  const sol = fails >= 3 ? pondSolutions(POND)[0] : null;
  const cap = cells * POND.cellCap;
  const food = crops.reduce((a, c) => a + (c === 'none' ? 0 : POND.crops[c].food), 0);

  const changed = () => { setRun(null); setShown(0); };
  const setCell = (n: number) => {
    if (n < 1 || n > POND.maxCells) return;
    if (n > cells && labor >= POND.labor) { sfx('SE-04'); setSay({ who: 'xlian', mood: 'worried', text: `人手只有 ${POND.labor} 個，不夠再挖了。少開一塊田？` }); return; }
    sfx(n > cells ? 'SE-50' : 'SE-02');
    setCells(n); changed();
  };
  const tapPlot = (i: number) => {
    const to = NEXT[crops[i]];
    if (crops[i] === 'none' && labor >= POND.labor) { sfx('SE-04'); setSay({ who: 'xlian', mood: 'worried', text: `人手只有 ${POND.labor} 個，不夠再開田了。` }); return; }
    sfx(to === 'none' ? 'SE-02' : 'SE-36');
    setCrops(crops.map((c, k) => (k === i ? to : c))); changed();
  };
  const go = () => {
    const r = runPond(POND, cells, crops);
    setRun(r); setShown(0); setSay(null); setPhase('run');
  };
  // 一季一季揭曉，跑完再說結果
  useEffect(() => {
    if (phase !== 'run' || !run) return;
    const stop = run.dryAt >= 0 ? run.dryAt + 1 : POND.periods.length;
    if (shown < stop) { const t = setTimeout(() => { sfx(run.steps[shown].dry ? 'SE-71' : 'SE-53'); setShown(shown + 1); }, 650); return () => clearTimeout(t); }
    if (run.ok) { jingle('MU-13'); setSay(POND_SAY.good); const t = setTimeout(() => { setSay(null); setPhase('choice'); }, 2200); return () => clearTimeout(t); }
    oops();
    const f = fails + 1;
    setFails(f);
    setSay(f >= 3 ? POND_SAY.spot : f >= 2 ? POND_SAY.hint : run.dryAt >= 0 ? POND_SAY.dry(POND.periods[run.dryAt]) : POND_SAY.short);
    setPhase('plan');
  }, [phase, shown]); // eslint-disable-line react-hooks/exhaustive-deps
  const demo = () => {
    const s = pondSolutions(POND)[0];
    setCells(s.cells);
    setCrops([...Array(s.rice).fill('rice'), ...Array(s.potato).fill('potato'), ...Array(POND.plots - s.rice - s.potato).fill('none')]);
    changed();
  };
  const hintCrop = (i: number): Crop | null => (sol ? (i < sol.rice ? 'rice' : i < sol.rice + sol.potato ? 'potato' : 'none') : null);

  return (
    <div className="scene ch4-pond">
      <img className="scene-bg" src={art4('s-16')} alt="" />
      {phase === 'intro' && <Talk lines={POND_INTRO} onDone={() => setPhase('plan')} />}
      {phase === 'plan' && <Goal floating text={`挖埤、種田，讓一整年都有水，收到 ${POND.need} 份糧`} />}
      {phase !== 'intro' && (
        <div className="ch4-pond-wrap">
          <div className="ch4-pond-board panel">
            <div className="ch4-pond-top">
              <div className={`ch4-dig ${sol && sol.cells !== cells ? 'hint' : ''}`}>
                <b>水埤</b>
                <div className="stepper">
                  <button disabled={phase !== 'plan' || cells <= 1} onClick={() => setCell(cells - 1)} aria-label="少挖一格">－</button>
                  <span className="ch4-pond-cells">{Array.from({ length: cells }, (_, i) => <img key={i} src={art4('o-08-pond')} alt="" />)}</span>
                  <button disabled={phase !== 'plan' || cells >= POND.maxCells} onClick={() => setCell(cells + 1)} aria-label="多挖一格">＋</button>
                </div>
                <small>{cells} 格，最多裝 {cap} 份水{sol ? `（建議 ${sol.cells} 格）` : ''}</small>
              </div>
              <div className="ch4-labor">
                <b>人手 {labor} / {POND.labor}</b>
                <span>{Array.from({ length: POND.labor }, (_, i) => <i key={i} className={i < labor ? 'on' : ''} />)}</span>
                <small className={food >= POND.need ? 'ok' : ''}>收成 {food} / {POND.need} 份糧</small>
              </div>
            </div>
            <div className="ch4-fields">
              {crops.map((c, i) => (
                <button key={i} className={`ch4-field ${c} ${hintCrop(i) && hintCrop(i) !== 'none' ? 'hint' : ''}`} disabled={phase !== 'plan'} onClick={() => tapPlot(i)}>
                  <img src={art4(CROP_IMG[c])} alt="" />
                  <small>{CROP_NAME[c]}{sol && hintCrop(i) !== c ? ` → ${CROP_NAME[hintCrop(i)!]}` : ''}</small>
                </button>
              ))}
            </div>
            <div className="ch4-year">
              {POND.periods.map((name, t) => {
                const st = run && t < shown ? run.steps[t] : null;
                return (
                  <div key={name} className={`ch4-season ${st ? (st.dry ? 'dry' : 'shown') : ''}`}>
                    <b>{SEASON_ICON[t]} {name}</b>
                    <span className="rain">雨 {POND.rain[t] ? '💧'.repeat(Math.min(POND.rain[t], 4)) + (POND.rain[t] > 4 ? `×${POND.rain[t]}` : '') : '—'}</span>
                    <span className="use">用水 {cropUse(POND, crops, t)}</span>
                    <span className="ch4-level"><i style={{ height: `${st ? (cap ? (st.level / cap) * 100 : 0) : 0}%` }} /></span>
                    <small>{st ? (st.dry ? '沒水了！' : `剩 ${st.level}${st.spill ? `，流掉 ${st.spill}` : ''}`) : ' '}</small>
                  </div>
                );
              })}
            </div>
            <div className="row">
              <small className="ch4-tip">點田換作物：空著 → 稻子 → 番薯</small>
              <button className="btn green" disabled={phase !== 'plan' || food === 0} onClick={go}>放水，試一年</button>
            </div>
          </div>
        </div>
      )}
      {fails >= 5 && phase === 'plan' && <button className="btn demo corner-btn" onClick={demo}>看示範</button>}
      {phase === 'choice' && <Decide4 id="water" set={set} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCards ids={['c4-pond']} p={p} set={set} onDone={next} />}
      <Say line={phase === 'plan' || phase === 'run' ? say : null} />
    </div>
  );
}
