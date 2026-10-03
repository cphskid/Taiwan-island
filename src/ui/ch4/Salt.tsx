import { useEffect, useMemo, useState } from 'react';
import { canDo, doAct, freshPans, saltBest, saltDay, type Pans, type SaltAct } from '../../core/tuntian';
import { SALT, SALT_DONE, SALT_INTRO, SALT_SAY, art4 } from '../../data/ch4';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { NewCards, type Step4Props } from '../Ch4';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'work' | 'done' | 'cards';
const SKY_ICON = { sun: '☀️', cloud: '☁️', rain: '🌧️' } as const;
const SKY_NAME = { sun: '晴天', cloud: '陰天', rain: '下雨' } as const;
const same = (a: SaltAct, b: SaltAct) => a.kind === b.kind && ('pan' in a ? a.pan : -1) === ('pan' in b ? b.pan : -1);
const ACT_NAME = (a: SaltAct) =>
  a.kind === 'fill' ? `引海水進蒸發池${a.pan ? '乙' : '甲'}` : a.kind === 'move' ? `蒸發池${a.pan ? '乙' : '甲'}移到結晶池` : a.kind === 'harvest' ? '收鹽' : `草蓆蓋${a.pan === 2 ? '結晶池' : a.pan ? '蒸發池乙' : '蒸發池甲'}`;

// 步驟 3 曬鹽：看 12 天的天氣，每天安排 2 件事（引海水、移池、收鹽、蓋草蓆），下雨前要先收、先蓋，收到 4 籃鹽
export function Salt({ p, set, next, oops }: Step4Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [day, setDay] = useState(0);
  const [start, setStart] = useState<Pans>(freshPans); // 今天早上的樣子
  const [acts, setActs] = useState<SaltAct[]>([]);
  const [washed, setWashed] = useState<number[]>([]);
  const [fails, setFails] = useState(0);
  const [auto, setAuto] = useState(false); // 看示範：每天幫你排好
  const [say, setSay] = useState<Line | null>(null);
  const now = acts.reduce((cur, a) => (a.kind === 'cover' ? cur : doAct(cur, a)), start);
  const cover = (acts.find((a) => a.kind === 'cover') as { pan: number } | undefined)?.pan ?? -1;
  const showHint = fails >= 3 || auto;
  const best = useMemo(() => (showHint && day < SALT.days.length ? saltBest(SALT, day, start).plan[0] ?? [] : []), [showHint, day, start]);
  const tip = best;
  const sky = SALT.days[day];

  useEffect(() => { if (auto && phase === 'work' && !acts.length && day < SALT.days.length) setActs(tip); }, [auto, day, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = (a: SaltAct) => {
    if (acts.some((x) => same(x, a))) {
      // 取消一件事：後面因此做不到的事也一起取消
      sfx('SE-02');
      let cur = start;
      const kept: SaltAct[] = [];
      for (const x of acts) {
        if (same(x, a)) continue;
        if (x.kind === 'cover') { kept.push(x); continue; }
        if (canDo(SALT, cur, x)) { kept.push(x); cur = doAct(cur, x); }
      }
      setActs(kept);
      return;
    }
    if (!canDo(SALT, now, a)) return;
    if (acts.length >= SALT.hands) { sfx('SE-04'); setSay({ who: 'xlian', mood: 'worried', text: `一天只能做 ${SALT.hands} 件事！點一下做過的事可以取消。` }); return; }
    if (a.kind === 'cover' && cover >= 0) { sfx('SE-04'); setSay({ who: 'xlian', mood: 'worried', text: '草蓆只有一張喔。' }); return; }
    sfx(a.kind === 'harvest' ? 'SE-05' : a.kind === 'cover' ? 'SE-36' : 'SE-53');
    setActs([...acts, a]);
  };
  const can = (a: SaltAct) => acts.some((x) => same(x, a)) || (acts.length < SALT.hands && (a.kind === 'cover' ? cover < 0 && canDo(SALT, now, a) : canDo(SALT, now, a)));
  const endDay = () => {
    // 草蓆最後才蓋；蓋的池子如果已經空了就不算
    const order = [...acts.filter((a) => a.kind !== 'cover'), ...acts.filter((a) => a.kind === 'cover' && canDo(SALT, now, a))];
    const r = saltDay(SALT, start, order, day);
    if (!r.ok) { setActs([]); return; }
    setWashed(r.washed);
    if (r.washed.length) { sfx('SE-71'); setSay(SALT_SAY.washed); } else { sfx(sky === 'sun' ? 'SE-01' : 'SE-02'); setSay(null); }
    setStart(r.pans); setActs([]);
    const d = day + 1;
    setDay(d);
    if (d < SALT.days.length) return;
    if (r.pans.salt >= SALT.need) { jingle('MU-13'); setSay(SALT_SAY.good); setTimeout(() => { setSay(null); setPhase('done'); }, 2000); return; }
    oops();
    const f = fails + 1;
    setFails(f);
    setSay(f >= 3 ? SALT_SAY.spot : f >= 2 ? SALT_SAY.hint : SALT_SAY.short(r.pans.salt));
  };
  const again = () => { sfx('SE-02'); setDay(0); setStart(freshPans()); setActs([]); setWashed([]); };
  const demo = () => { again(); setAuto(true); };
  const btn = (a: SaltAct, label: string) => (
    <button
      className={`ch4-act ${acts.some((x) => same(x, a)) ? 'on' : ''} ${tip.some((x) => same(x, a)) ? 'hint' : ''}`}
      disabled={phase !== 'work' || day >= SALT.days.length || !can(a)}
      onClick={() => add(a)}
    >{label}</button>
  );
  const pan = (i: number) => {
    const v = i < 2 ? now.e[i] : now.c;
    const need = i < 2 ? SALT.evapDays : SALT.crystDays;
    const ready = v >= need;
    return (
      <div key={i} className={`ch4-pan ${i === 2 ? 'cryst' : ''} ${v < 0 ? 'empty' : ready ? 'ready' : 'wet'} ${washed.includes(i) ? 'washed' : ''}`}>
        <b>{i === 2 ? '結晶池' : `蒸發池${i ? '乙' : '甲'}`}</b>
        <div className="ch4-pan-img">
          <img src={art4('o-08-saltpan')} alt="" />
          {cover === i && <span className="ch4-mat">草蓆</span>}
        </div>
        <span className="ch4-dots">{v < 0 ? '空的' : Array.from({ length: need }, (_, k) => <i key={k} className={k < v ? 'on' : ''} />)}</span>
        <small>{v < 0 ? (i === 2 ? '等鹵水' : '等海水') : ready ? (i === 2 ? '可以收鹽了！' : '鹵水好了，可以移') : `曬了 ${v} 天`}</small>
        <div className="ch4-pan-acts">
          {i < 2 ? <>{btn({ kind: 'fill', pan: i }, '引海水')}{btn({ kind: 'move', pan: i }, '移到結晶池')}</> : btn({ kind: 'harvest' }, '收鹽')}
          {btn({ kind: 'cover', pan: i }, '蓋草蓆')}
        </div>
      </div>
    );
  };
  const over = day >= SALT.days.length;

  return (
    <div className="scene ch4-salt">
      <img className="scene-bg" src={art4('s-17')} alt="" />
      {phase === 'intro' && <Talk lines={SALT_INTRO} onDone={() => setPhase('work')} />}
      {phase === 'work' && <Goal floating text={`看天氣排工作，${SALT.days.length} 天收 ${SALT.need} 籃鹽`} />}
      {phase !== 'intro' && (
        <div className="ch4-salt-wrap">
          <div className="ch4-salt-board panel">
            <div className="ch4-days">
              {SALT.days.map((s, d) => <span key={d} className={`${d < day ? 'past' : d === day ? 'on' : ''} ${s}`}><small>第{d + 1}天</small>{SKY_ICON[s]}</span>)}
            </div>
            <div className="ch4-salt-head">
              <b>{over ? `${SALT.days.length} 天過完了` : `第 ${day + 1} 天：今天會${SKY_NAME[sky]}`}</b>
              <span className="ch4-baskets">{Array.from({ length: Math.max(SALT.need, now.salt) }, (_, i) => <img key={i} className={i < now.salt ? 'on' : ''} src={art4('g-06-basket')} alt="" />)}<em>{now.salt} / {SALT.need} 籃</em></span>
            </div>
            <div className="ch4-pans">{[0, 1, 2].map(pan)}</div>
            <div className="row ch4-salt-foot">
              <span className="ch4-hands">今天的事（{acts.length}/{SALT.hands}）：{acts.length ? acts.map(ACT_NAME).join('、') : '還沒做'}</span>
              {over && now.salt < SALT.need
                ? <button className="btn orange" onClick={again}>從第 1 天再來</button>
                : <button className="btn green" disabled={phase !== 'work' || over} onClick={endDay}>過完這一天 ▶</button>}
            </div>
          </div>
        </div>
      )}
      {fails >= 5 && phase === 'work' && !auto && <button className="btn demo corner-btn" onClick={demo}>看示範</button>}
      {phase === 'done' && <Talk lines={SALT_DONE} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCards ids={['c4-chen', 'c4-salt']} p={p} set={set} onDone={next} />}
      <Say line={phase === 'work' ? say : null} />
    </div>
  );
}
