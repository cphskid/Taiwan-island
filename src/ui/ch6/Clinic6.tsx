import { useState } from 'react';
import { clinicCheck, clinicFit, clinicSolve } from '../../core/railway';
import { CLINIC, CLINIC_DONE, CLINIC_INTRO, CLINIC_SAY, NEED_NAME, art6 } from '../../data/ch6';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { NewCards6, type Step6Props } from '../Ch6';
import { Decide6 } from './Story6';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'match' | 'done' | 'learn' | 'cards';

// 步驟 4 馬偕的醫館：六個病人，每個要找「會治這種病」又「聽得懂他說話」的人，一個人最多看兩個
export function Clinic6({ p, set, next, oops }: Step6Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  return (
    <div className="scene ch6-clinic">
      <img className="scene-bg" src={art6('s-21')} alt="" />
      {phase === 'intro' && <Talk lines={CLINIC_INTRO} onDone={() => setPhase('match')} />}
      {phase === 'match' && <Match oops={oops} onDone={() => setPhase('done')} />}
      {phase === 'done' && <Talk lines={CLINIC_DONE} onDone={() => setPhase('learn')} />}
      {phase === 'learn' && <Decide6 id="learn" set={set} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCards6 ids={['c6-mackay']} p={p} set={set} onDone={next} />}
    </div>
  );
}

const NEED_ICON: Record<string, string> = { tooth: '🦷', fever: '🤒', wound: '🩹' };
const HEALER_IMG: Record<string, string> = { mackay: 'p-19-mackay', han: '', kav: '' };

function Match({ onDone, oops }: { onDone: () => void; oops: () => void }) {
  const [plan, setPlan] = useState<Record<string, string>>({});
  const [pick, setPick] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const [full, setFull] = useState<string[]>([]);
  const [fails, setFails] = useState(0);
  const [ok, setOk] = useState(false);
  const [say, setSay] = useState<Line | null>(null);
  const answer = clinicSolve(CLINIC)[0];
  const left = CLINIC.patients.filter((x) => !plan[x.id]);

  const put = (h: string) => {
    if (!pick || ok) return;
    sfx('SE-36');
    setPlan({ ...plan, [pick]: h });
    setWrong(wrong.filter((w) => w !== pick)); setFull([]);
    setPick(null);
  };
  const back = (id: string) => {
    if (ok) return;
    sfx('SE-02');
    const { [id]: _, ...rest } = plan;
    setPlan(rest);
    setWrong(wrong.filter((w) => w !== id)); setFull([]);
  };
  const check = () => {
    const r = clinicCheck(CLINIC, plan);
    if (r.done) { setOk(true); jingle('MU-13'); setSay(CLINIC_SAY.good); setTimeout(onDone, 2000); return; }
    sfx('SE-04'); oops();
    setWrong(r.wrong); setFull(r.full);
    const f = fails + 1;
    setFails(f);
    const first = r.wrong[0] ? clinicFit(CLINIC, r.wrong[0], plan[r.wrong[0]]) : null;
    setSay(f >= 2 ? CLINIC_SAY.hint : first === 'lang' ? CLINIC_SAY.lang : first === 'skill' ? CLINIC_SAY.skill : CLINIC_SAY.full);
  };
  return (
    <div className="ch6-clinic-wrap">
      <Goal floating text={left.length ? `幫 ${CLINIC.patients.length} 個病人找到對的人：還有 ${left.length} 個。病要會治、話要聽得懂，一個人最多看 ${CLINIC.cap} 個。` : '都分好了，按「這樣可以嗎？」'} />
      <div className="ch6-clinic-board panel">
        <div className="ch6-queue">
          <small>候診的病人（點一個，再點要看他的人）</small>
          <div className="ch6-queue-row">
            {left.map((x) => (
              <button key={x.id} className={`ch6-patient ${pick === x.id ? 'on' : ''}`} onClick={() => { sfx('SE-01'); setPick(pick === x.id ? null : x.id); }}>
                <b>{NEED_ICON[x.need]} {x.name}</b>
                <span>說{x.lang}</span>
                <small>「{x.says}」</small>
              </button>
            ))}
            {!left.length && <button className="btn green" disabled={ok} onClick={check}>這樣可以嗎？</button>}
          </div>
        </div>
        <div className="ch6-healers">
          {CLINIC.healers.map((h) => {
            const mine = CLINIC.patients.filter((x) => plan[x.id] === h.id);
            const glow = fails >= 3 && pick && answer[pick] === h.id;
            return (
              <div key={h.id} role="button" className={`ch6-healer ${pick ? 'ready' : ''} ${full.includes(h.id) ? 'full' : ''} ${glow ? 'hint' : ''}`} onClick={() => put(h.id)}>
                <div className="ch6-healer-head">
                  {HEALER_IMG[h.id] ? <img src={art6(HEALER_IMG[h.id])} alt="" /> : <span className="ch6-healer-ico">🧑‍🎓</span>}
                  <div>
                    <b>{h.name}</b>
                    <span>🗣 {h.langs.join('、')}</span>
                    <span>🩺 {h.can.map((c) => `${NEED_ICON[c]}${NEED_NAME[c].split('（')[0].replace('要吃藥', '').replace('要清洗包紮', '')}`).join('、')}</span>
                  </div>
                </div>
                <div className="ch6-seats">
                  {Array.from({ length: CLINIC.cap }, (_, i) => mine[i] ? (
                    <button key={mine[i].id} className={`ch6-seat on ${wrong.includes(mine[i].id) ? 'wrong' : ''}`} onClick={(e) => { e.stopPropagation(); if (pick) put(h.id); else back(mine[i].id); }}>
                      {NEED_ICON[mine[i].need]} {mine[i].name}
                    </button>
                  ) : <span key={i} className="ch6-seat">空位</span>)}
                  {mine.length > CLINIC.cap && mine.slice(CLINIC.cap).map((x) => (
                    <button key={x.id} className="ch6-seat on wrong" onClick={(e) => { e.stopPropagation(); back(x.id); }}>{NEED_ICON[x.need]} {x.name}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <small className="ch6-clinic-tip">🦷 拔牙　🤒 發冷發熱（瘧疾）要吃藥　🩹 傷口要清洗包紮　放錯了點一下可以拿回來</small>
      </div>
      {fails >= 5 && !ok && <button className="btn demo corner-btn" onClick={() => { setPlan(answer); setWrong([]); setFull([]); setPick(null); }}>看示範</button>}
      <Say line={say} />
    </div>
  );
}
