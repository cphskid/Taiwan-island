import { useEffect, useMemo, useRef, useState } from 'react';
import { canDo, doAct, easyCan, easyDay, freshEasy, freshPans, saltBest, saltDay, saltEasyBest, type EasyAct, type EasyPans, type Pans, type SaltAct } from '../../core/tuntian';
import { SALT, SALT_DONE, SALT_EASY, SALT_EASY_INTRO, SALT_EASY_SAY, SALT_INTRO, SALT_SAY, art4 } from '../../data/ch4';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { ChallengeOffer, ChallengeTag } from '../Challenge';
import { NewCards, type Step4Props } from '../Ch4';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'work' | 'done' | 'cards';
type Phase0 = 'intro' | 'easy' | 'offer' | 'cIntro' | 'challenge' | 'done' | 'cards';
const SKY_ICON = { sun: '☀️', cloud: '☁️', rain: '🌧️' } as const;
const SKY_NAME = { sun: '晴天', cloud: '陰天', rain: '下雨' } as const;
const same = (a: SaltAct, b: SaltAct) => a.kind === b.kind && ('pan' in a ? a.pan : -1) === ('pan' in b ? b.pan : -1);
const ACT_NAME = (a: SaltAct) =>
  a.kind === 'fill' ? `引海水進蒸發池${a.pan ? '乙' : '甲'}` : a.kind === 'move' ? `蒸發池${a.pan ? '乙' : '甲'}移到結晶池` : a.kind === 'harvest' ? '收鹽' : `草蓆蓋${a.pan === 2 ? '結晶池' : a.pan ? '蒸發池乙' : '蒸發池甲'}`;

// 步驟 3 曬鹽：故事版是三格鹽田、每天只做一件事，再決定蓋不蓋草蓆（第一天小蓮先示範）；
// 原本兩個人每天兩件事、蒸發池移結晶池的版本，過關後可以選⭐⭐⭐再挑戰
export function Salt({ p, set, next, oops }: Step4Props) {
  const [phase, setPhase] = useState<Phase0>('intro');
  const toDone = () => setPhase('done');
  return (
    <div className="scene ch4-salt">
      <img className="scene-bg" src={art4('s-17')} alt="" />
      {phase === 'intro' && <Talk lines={SALT_EASY_INTRO} onDone={() => setPhase('easy')} />}
      {phase === 'easy' && <SaltEasy oops={oops} onDone={() => setPhase('offer')} />}
      {phase === 'offer' && <ChallengeOffer text="兩個人每天做兩件事：海水先在蒸發池曬成鹵水，再移到結晶池結鹽，草蓆只有一張。12 天收 4 籃！" onTry={() => setPhase('cIntro')} onSkip={toDone} />}
      {phase === 'cIntro' && <Talk lines={SALT_INTRO} onDone={() => setPhase('challenge')} />}
      {phase === 'challenge' && <><SaltPlan onDone={toDone} /><ChallengeTag onQuit={toDone} /></>}
      {phase === 'done' && <Talk lines={SALT_DONE} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCards ids={['c4-chen', 'c4-salt']} p={p} set={set} onDone={next} />}
    </div>
  );
}

const STAGE = ['海水', '鹵水', '濃鹵水'];
const sameEasy = (a: EasyAct | null | undefined, b: EasyAct | null | undefined) => !!a && !!b && a.kind === b.kind && ('pan' in a ? a.pan : -1) === ('pan' in b ? b.pan : -1);

// 故事版：每天點一件事（引海水、收鹽），再決定蓋不蓋草蓆，按「過完這一天」看天氣
function SaltEasy({ oops, onDone }: { oops: () => void; onDone: () => void }) {
  const lv = SALT_EASY;
  const [day, setDay] = useState(0);
  const [pans, setPans] = useState<EasyPans>(() => freshEasy(lv));
  const [act, setAct] = useState<EasyAct | null>(null);
  const [cover, setCover] = useState(false);
  const [washed, setWashed] = useState<number[]>([]);
  const [demo, setDemo] = useState(true);
  const [fails, setFails] = useState(0);
  const [won, setWon] = useState(false);
  const [say, setSay] = useState<Line | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const over = day >= lv.days.length;
  const sky = lv.days[Math.min(day, lv.days.length - 1)];
  const ripe = pans.v.filter((x) => x >= lv.ready).length;
  const showHint = fails >= 2 && !over;
  const tip = useMemo(() => (showHint ? saltEasyBest(lv, day, pans).plan[0] : undefined), [showHint, day, pans, lv]);

  const endDay = (a: EasyAct = act ?? { kind: 'wait' }, c = cover) => {
    const r = easyDay(lv, pans, a, c, day);
    if (!r.ok) return;
    setWashed(r.washed);
    if (r.washed.length) { sfx('SE-71'); setSay(SALT_EASY_SAY.washed); }
    else if (c && sky === 'sun' && pans.v.some((x) => x >= 0 && x < lv.ready)) { sfx('SE-02'); setSay(SALT_EASY_SAY.shade); }
    else { sfx(a.kind === 'harvest' ? 'SE-108' : sky === 'sun' ? 'SE-01' : 'SE-02'); setSay(null); }
    setPans(r.pans); setAct(null); setCover(false);
    const d = day + 1;
    setDay(d);
    if (d < lv.days.length) return;
    // 最後一天過完，田裡結好的鹽隔天早上收
    const total = r.pans.salt + r.pans.v.filter((x) => x >= lv.ready).length;
    if (total >= lv.need) { jingle('MU-13'); setWon(true); setSay(SALT_EASY_SAY.good); setTimeout(() => alive.current && onDone(), 2200); return; }
    oops();
    const f = fails + 1;
    setFails(f);
    setSay(f >= 2 ? SALT_EASY_SAY.spot : f === 1 ? SALT_EASY_SAY.short(total) : SALT_EASY_SAY.hint);
  };

  // 第一天：小蓮先引海水進第一格給你看
  useEffect(() => {
    const t1 = setTimeout(() => { if (!alive.current) return; sfx('SE-53'); setAct({ kind: 'fill', pan: 0 }); setSay(SALT_EASY_SAY.demo); }, 900);
    const t2 = setTimeout(() => { if (!alive.current) return; endDay({ kind: 'fill', pan: 0 }, false); setSay(SALT_EASY_SAY.demo); setDemo(false); }, 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (a: EasyAct) => {
    if (demo || over || !easyCan(lv, pans, a)) return;
    if (sameEasy(act, a)) { sfx('SE-02'); setAct(null); return; }
    sfx(a.kind === 'harvest' ? 'SE-108' : 'SE-53');
    setAct(a);
  };
  const again = () => {
    sfx('SE-02');
    // 從第 2 天再來（第 1 天照小蓮示範的）
    const d0 = easyDay(lv, freshEasy(lv), { kind: 'fill', pan: 0 }, false, 0);
    setPans(d0.pans); setDay(1); setAct(null); setCover(false); setWashed([]); setSay(null);
  };
  const actBtn = (a: EasyAct, label: string) => (
    <button
      className={`ch4-act ${sameEasy(act, a) ? 'on' : ''} ${sameEasy(tip?.act, a) ? 'hint' : ''}`}
      disabled={demo || over || won || !easyCan(lv, pans, a)}
      onClick={() => pick(a)}
    >{label}</button>
  );
  const panView = (i: number) => {
    const raw = pans.v[i];
    const v = act && 'pan' in act && act.pan === i ? (act.kind === 'fill' ? 0 : -1) : raw;
    const ready = v >= lv.ready;
    return (
      <div key={i} className={`ch4-pan ${v < 0 ? 'empty' : ready ? 'ready' : 'wet'} ${washed.includes(i) ? 'washed' : ''}`}>
        <b>鹽田{'甲乙丙'[i]}</b>
        <div className="ch4-pan-img">
          <img src={art4('o-08-saltpan')} alt="" />
          {cover && <span className="ch4-mat">草蓆</span>}
        </div>
        <span className="ch4-dots">{v < 0 ? '空的' : Array.from({ length: lv.ready }, (_, k) => <i key={k} className={k < v ? 'on' : ''} />)}</span>
        <small>{v < 0 ? '等海水' : ready ? '結出鹽了，可以收！' : `${STAGE[v]}，還要曬 ${lv.ready - v} 個晴天`}</small>
        <div className="ch4-pan-acts">
          {raw < 0 ? actBtn({ kind: 'fill', pan: i }, '引海水') : raw >= lv.ready ? actBtn({ kind: 'harvest', pan: i }, '收鹽') : null}
        </div>
      </div>
    );
  };
  const total = pans.salt + (over ? ripe : 0);
  return (
    <div className="ch4-salt-wrap">
      <Goal floating text={demo ? '先看小蓮做第一天。' : `一天做一件事，下雨天蓋草蓆。${lv.days.length} 天收 ${lv.need} 籃鹽。`} />
      <div className="ch4-salt-board panel salt-easy">
        <div className="ch4-days">
          {lv.days.map((s, d) => <span key={d} className={`${d < day ? 'past' : d === day ? 'on' : ''} sky-${s}`}><small>第{d + 1}天</small>{SKY_ICON[s]}</span>)}
        </div>
        <div className="ch4-salt-head">
          <b>{over ? `${lv.days.length} 天過完了` : `第 ${day + 1} 天：今天會${SKY_NAME[sky]}${demo ? '（小蓮示範）' : ''}`}</b>
          <span className="ch4-baskets">{Array.from({ length: Math.max(lv.need, total) }, (_, i) => <img key={i} className={i < total ? 'on' : ''} src={art4('g-06-basket')} alt="" />)}<em>{total} / {lv.need} 籃</em></span>
        </div>
        <div className="ch4-pans salt-easy-pans">{pans.v.map((_, i) => panView(i))}</div>
        <div className="row ch4-salt-foot">
          <button className={`salt-mat ${cover ? 'on' : ''} ${tip && tip.cover !== cover ? 'hint' : ''}`} disabled={demo || over || won} onClick={() => { sfx('SE-109'); setCover(!cover); }}>
            {cover ? '🟫 草蓆蓋著' : '☀️ 草蓆拿開'}
          </button>
          <span className="ch4-hands">今天：{act ? (act.kind === 'fill' ? `引海水進鹽田${'甲乙丙'[act.pan]}` : act.kind === 'harvest' ? `收鹽田${'甲乙丙'[act.pan]}的鹽` : '等太陽') : '等太陽（不做事也可以）'}</span>
          {over && !won
            ? <button className="btn orange" onClick={again}>從第 2 天再來</button>
            : <button className="btn green" disabled={demo || over} onClick={() => endDay()}>過完這一天 ▶</button>}
        </div>
      </div>
      <Say line={say} />
    </div>
  );
}

// ⭐⭐⭐ 再挑戰：看 12 天的天氣，每天安排 2 件事（引海水、移池、收鹽、蓋草蓆），下雨前要先收、先蓋，收到 4 籃鹽
function SaltPlan({ onDone }: { onDone: () => void }) {
  const oops = () => {};
  const [phase] = useState<Phase>('work');
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
    sfx(a.kind === 'harvest' ? 'SE-108' : a.kind === 'cover' ? 'SE-109' : 'SE-53');
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
    if (r.pans.salt >= SALT.need) { jingle('MU-13'); setSay(SALT_SAY.good); setTimeout(() => { setSay(null); onDone(); }, 2000); return; }
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
    <>
      {phase === 'work' && <Goal floating text={`看天氣排工作，${SALT.days.length} 天收 ${SALT.need} 籃鹽`} />}
      {(
        <div className="ch4-salt-wrap">
          <div className="ch4-salt-board panel">
            <div className="ch4-days">
              {SALT.days.map((s, d) => <span key={d} className={`${d < day ? 'past' : d === day ? 'on' : ''} sky-${s}`}><small>第{d + 1}天</small>{SKY_ICON[s]}</span>)}
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
      <Say line={phase === 'work' ? say : null} />
    </>
  );
}
