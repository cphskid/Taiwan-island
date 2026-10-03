import { useState } from 'react';
import { colOf, damCheck, damSolve, damStart, isFixed, used, type Dam as DamGrid, type Mat } from '../../core/jianan';
import { DAM, DAM_DONE, DAM_HINT, DAM_INTRO, DAM_SAY, art7 } from '../../data/ch7';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { NewCards7, type Step7Props } from '../Ch7';
import { EraJump7 } from './Story7';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'build' | 'done' | 'cards' | 'jump';
const MATS: Mat[] = ['rock', 'sand', 'clay'];
const MAT_NAME: Record<Mat, string> = { rock: '石頭', sand: '砂', clay: '黏土' };
const MAT_IMG: Record<Mat, string> = { rock: art7('g-08-rock'), sand: art7('g-08-sand'), clay: art7('g-08-clay') };

// 步驟 2 烏山頭水庫（1920 開工）：八田與一請大家把大壩一層一層填起來，中間黏土心牆、兩旁包砂
export function Dam({ p, set, next, oops }: Step7Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  return (
    <div className="scene ch7-dam">
      <img className="scene-bg" src={art7('s-23')} alt="" />
      {phase === 'intro' && <Talk lines={DAM_INTRO} onDone={() => setPhase('build')} />}
      {phase === 'build' && <Builder oops={oops} onDone={() => setPhase('done')} />}
      {phase === 'done' && <Talk lines={DAM_DONE} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCards7 ids={['hatta', 'dam']} p={p} set={set} onDone={() => setPhase('jump')} />}
      {phase === 'jump' && <EraJump7 from={1} to={2} onDone={next} />}
    </div>
  );
}

function Builder({ oops, onDone }: { oops: () => void; onDone: () => void }) {
  const [d, setD] = useState<DamGrid>(() => damStart(DAM));
  const [mat, setMat] = useState<Mat>('clay');
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const [bad, setBad] = useState(-1); // 出問題的那一層
  const [water, setWater] = useState<'none' | 'leak' | 'full'>('none');
  const u = used(DAM, d);
  const sol = damSolve(DAM);
  const showAnswer = fails >= 3;

  const put = (row: number, i: number) => {
    if (isFixed(DAM, row, i) || water === 'full') return;
    const cur = d[row][i];
    const nd = d.map((r) => [...r]);
    if (cur === mat) { nd[row][i] = null; sfx('SE-02'); }
    else {
      if (u[mat] >= DAM.stock[mat]) { sfx('SE-04'); setSay({ who: 'hsiung', mood: 'worried', text: `${MAT_NAME[mat]}用完了！把放錯的地方點一下拿回來，或換別的材料。` }); return; }
      nd[row][i] = mat;
      sfx('SE-07');
    }
    setD(nd);
    setBad(-1);
    setWater('none');
  };
  const test = () => {
    const r = damCheck(DAM, d);
    sfx('SE-36');
    if (r.ok) {
      setWater('full');
      jingle('MU-13');
      setSay({ who: 'hatta', text: '水滿起來了，一滴也沒漏！' });
      setTimeout(onDone, 2200);
      return;
    }
    setWater('leak');
    setBad(r.row);
    setTimeout(() => sfx('SE-71'), 500);
    oops();
    const f = fails + 1;
    setFails(f);
    setSay(f >= 2 ? DAM_HINT : DAM_SAY[r.problem!]);
  };

  // 由上往下畫（最窄的在上面）
  const rows = d.map((r, row) => ({ r, row })).reverse();
  return (
    <div className="ch7-dam-wrap">
      <Goal floating text="把大壩填滿：每層中間放黏土，黏土兩旁放砂，材料剛好用完。填好按「放水試試看」" />
      <div className="ch7-dam-board panel">
        <div className="ch7-mats">
          {MATS.map((m) => (
            <button key={m} className={`ch7-mat ${mat === m ? 'on' : ''}`} onClick={() => { sfx('SE-01'); setMat(m); }}>
              <img src={MAT_IMG[m]} alt="" />
              <b>{MAT_NAME[m]}</b>
              <small>剩 {DAM.stock[m] - u[m]}</small>
            </button>
          ))}
        </div>
        <div className={`ch7-dam-body water-${water}`}>
          <div className="ch7-lake"><span>水庫這一邊</span></div>
          <div className="ch7-layers">
            {rows.map(({ r, row }) => (
              <div key={row} className={`ch7-layer ${bad === row ? 'bad' : ''}`}>
                {r.map((m, i) => {
                  const fixed = isFixed(DAM, row, i);
                  const ans = showAnswer && !fixed && m !== sol[row][i] ? sol[row][i] : null;
                  return (
                    <button key={i} className={`ch7-cell m-${m ?? 'empty'} ${fixed ? 'fixed' : ''} ${ans ? `ans ans-${ans}` : ''}`}
                      style={{ gridColumn: colOf(DAM, row, i) + 1 }} onClick={() => put(row, i)} aria-label={m ? MAT_NAME[m] : '空格'}>
                      {m && <img src={MAT_IMG[m]} alt="" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="ch7-field"><span>下游的田</span></div>
        </div>
        <div className="ch7-dam-foot">
          <small>點材料，再點格子；同樣的材料再點一次可以拿回來</small>
          <button className="btn orange" disabled={water === 'full'} onClick={() => { sfx('SE-02'); setD(damStart(DAM)); setBad(-1); setWater('none'); }}>清空</button>
          <button className="btn green" disabled={water === 'full'} onClick={test}>放水試試看</button>
        </div>
      </div>
      {fails >= 5 && water !== 'full' && <button className="btn demo corner-btn" onClick={() => { setD(sol.map((r) => [...r])); setBad(-1); setWater('none'); }}>看示範</button>}
      <Say line={say} />
    </div>
  );
}
