import { useEffect, useMemo, useState } from 'react';
import {
  DISTRICTS, IDLE_PEOPLE, NORMS, NORM_ORDER, PLACES, TH, TOWN_LINES, TW, timg,
  type Case, type Clue, type District, type Norm, type Spot,
} from '../data/town';
import { districtStars, loadTown, saveTown, solve, solvedCount, type TownSave } from '../core/town';
import { pushCloud } from '../net/cloud';
import { sfx } from '../audio';
import { SoundToggle } from './Sound';
import { ReportButton } from './Report';

// 現在篇「規則小鎮」：小偵探接案。街景一張圖，三個地方（大街、兒少保護站、網路分局）各有幾個案子。
// 一案：聽委託 → 在街上點人問話、點東西（網路分局是看手機訊息找破綻）收線索
// → 判斷誰在管（風俗、宗教、道德、法律）→ 法律的話再選哪一條 → 選怎麼處理 → 上小鎮報紙。
// 選錯可以重選，但這案就不算「一次判對」（三顆星要每案都一次判對）。
const TICK = `${import.meta.env.BASE_URL}img/tick/`;
const pct = (x: number, y: number) => ({ left: `${(x / TW) * 100}%`, top: `${(y / TH) * 100}%` });
const at = (s: { at: keyof typeof PLACES; dx?: number; dy?: number }) => ({ x: PLACES[s.at].x + (s.dx ?? 0), y: PLACES[s.at].y + (s.dy ?? 0) });

type Phase = 'ask' | 'visit' | 'norm' | 'law' | 'handle' | 'news';
interface Run { c: Case; phase: Phase; got: string[]; miss: number; tick: string | null; wrong: string[]; then: string | null }

export function cluesOf(c: Case): Clue[] {
  if (c.spots) return c.spots.flatMap((s) => (s.clue ? [s.clue] : []));
  return (c.phone?.msgs ?? []).flatMap((m) => m.parts.flatMap((p) => (typeof p === 'string' ? [] : [p.clue])));
}

export function Town({ onExit }: { onExit: () => void }) {
  const [s, setS] = useState<TownSave>(loadTown);
  useEffect(() => { saveTown(s); pushCloud('town', s); }, [s]);
  const [intro, setIntro] = useState(s.intro ? -1 : 0);
  const [dist, setDist] = useState<District | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [say, setSay] = useState<{ art: string; name: string; text: string } | null>(null);
  const [paper, setPaper] = useState(false);

  const start = (c: Case) => { sfx('SE-03'); setDist(null); setRun({ c, phase: 'ask', got: [], miss: 0, tick: null, wrong: [], then: null }); };
  const upd = (p: Partial<Run>) => setRun((r) => (r ? { ...r, ...p } : r));
  const clues = run ? cluesOf(run.c) : [];
  const found = run ? clues.filter((k) => run.got.includes(k.id)) : [];
  const allFound = !!run && found.length === clues.length;

  const take = (clue?: Clue) => {
    if (!run || !clue || run.got.includes(clue.id)) return;
    sfx('SE-05');
    upd({ got: [...run.got, clue.id] });
  };
  const talk = (sp: Spot) => { sfx('SE-09'); setSay({ art: sp.art, name: sp.name, text: sp.say }); take(sp.clue); };

  const pickNorm = (n: Norm) => {
    if (!run) return;
    if (n === run.c.norm) { sfx('SE-36'); upd({ tick: run.c.normWhy, wrong: [] }); }
    else { sfx('SE-04'); upd({ miss: run.miss + 1, tick: run.c.hint, wrong: [...run.wrong, n] }); }
  };
  const pickLaw = (l: string) => {
    if (!run?.c.law) return;
    if (l === run.c.law.answer) { sfx('SE-36'); upd({ tick: run.c.law.why, wrong: [] }); }
    else { sfx('SE-04'); upd({ miss: run.miss + 1, tick: `不是《${l}》喔。再看看線索板：這件事是在保護什麼？`, wrong: [...run.wrong, l] }); }
  };
  const pickHandle = (i: number) => {
    if (!run) return;
    const h = run.c.handle[i];
    if (h.ok) { sfx('SE-36'); upd({ then: h.then, wrong: [] }); }
    else { sfx('SE-04'); upd({ miss: run.miss + 1, then: h.then, wrong: [...run.wrong, String(i)] }); }
  };
  const close = () => {
    if (!run) return;
    sfx('SE-36');
    setS(solve(s, run.c.id, run.miss === 0));
    const d = DISTRICTS.find((x) => x.cases.includes(run.c))!;
    setRun(null);
    setDist(d);
  };
  const handleOrder = useMemo(() => (run ? shuffle(run.c.handle.map((_, i) => i), run.c.id) : []), [run?.c.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const news = DISTRICTS.flatMap((d) => d.cases).filter((c) => s.solved[c.id]);
  const visiting = run?.phase === 'visit' && run.c.spots;

  return (
    <div className="town">
      <div className="t-stage">
        <div className="t-map">
          <img className="t-bg" src={timg('t1-bg')} alt="" draggable={false} />
          {!run && IDLE_PEOPLE.map((p, i) => {
            const q = at(p);
            return <img key={i} className="t-person idle" src={timg(p.art)} alt="" style={{ ...pct(q.x, q.y), height: `${(150 / TH) * 100}%`, zIndex: Math.round(q.y), animationDelay: `${i * 0.4}s` }} />;
          })}
          {!run && DISTRICTS.map((d) => {
            const q = PLACES[d.at], st = districtStars(s, d), n = d.cases.filter((c) => s.solved[c.id]).length;
            return (
              <button key={d.id} className="t-pin" style={{ ...pct(q.x, q.y - 230), zIndex: 2000 }} onClick={() => { sfx('SE-03'); setDist(d); }}>
                <i>{d.icon}</i><b>{d.name}</b><small>{st ? '⭐'.repeat(st) : `${n}/${d.cases.length}`}</small>
              </button>
            );
          })}
          {visiting && run.c.spots!.map((sp) => {
            const q = at(sp), h = sp.size ?? 150, done = sp.clue && run.got.includes(sp.clue.id);
            return (
              <button key={sp.name} className={`t-spot ${done ? 'done' : ''}`} onClick={() => talk(sp)}
                style={{ ...pct(q.x, q.y), height: `${(h / TH) * 100}%`, zIndex: Math.round(q.y) }} aria-label={sp.name}>
                <img src={timg(sp.art)} alt="" draggable={false} />
                <span>{done ? '✓ ' : '❓ '}{sp.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <header className="v-hud">
        <button className="v-chip v-back" onClick={() => { sfx('SE-02'); if (run) setRun(null); else onExit(); }}>{run ? '← 先不辦了' : '← 大地圖'}</button>
        <span className="v-chip">🕵️ 規則小鎮</span>
        {!run && <button className="v-chip" onClick={() => { sfx('SE-03'); setPaper(true); }}>📰 小鎮報 {solvedCount(s)}</button>}
        {run && <span className="v-chip">📁 {run.c.title}</span>}
        <SoundToggle className="v-chip v-sound" />
        <ReportButton className="v-chip v-sound" screen="town" />
      </header>

      {run && (run.phase === 'visit' || run.phase === 'norm' || run.phase === 'law') && (
        <aside className={`t-board panel ${run.phase !== 'visit' ? 'judging' : ''}`}>
          <h3>🔎 線索板 {found.length}/{clues.length}</h3>
          <ul>{clues.map((k) => <li key={k.id} className={run.got.includes(k.id) ? 'on' : ''}>{run.got.includes(k.id) ? <><i>{k.icon}</i>{k.text}</> : <i>？</i>}</li>)}</ul>
          {run.phase === 'visit' && (allFound
            ? <button className="btn green" onClick={() => { sfx('SE-03'); setSay(null); upd({ phase: 'norm', tick: null }); }}>開始推理</button>
            : <p className="v-hint">{run.c.spots ? '點街上的人和東西問問看' : '點訊息裡奇怪的地方'}</p>)}
        </aside>
      )}

      {say && visiting && (
        <div className="t-say" onClick={() => setSay(null)}>
          <img src={timg(say.art)} alt="" />
          <div><b>{say.name}</b><p>{say.text}</p></div>
        </div>
      )}

      {run?.phase === 'visit' && run.c.phone && (
        <div className="t-phone-wrap">
          <div className="t-phone">
            <div className="t-phone-top">{run.c.phone.who}</div>
            {run.c.phone.msgs.map((m, i) => (
              <div key={i} className={`t-msg ${m.from}`}>
                {m.parts.map((p, j) => typeof p === 'string' ? <span key={j}>{p}</span>
                  : <span key={j} role="button" tabIndex={0} className={`t-sus ${run.got.includes(p.clue.id) ? 'on' : ''}`} onClick={() => take(p.clue)}>{p.text}</span>)}
              </div>
            ))}
          </div>
        </div>
      )}

      {run?.phase === 'ask' && (
        <div className="talk-cover" onClick={() => { sfx('SE-09'); upd({ phase: 'visit' }); }}>
          <div className="talk">
            <div className="face small t-face"><img src={timg(run.c.client.art)} alt="" /></div>
            <div className="talk-body">
              <b>{run.c.client.name}</b>
              <p>{run.c.ask}</p>
              <span className="talk-next">接下這個案子 ▶</span>
            </div>
          </div>
        </div>
      )}

      {run?.phase === 'norm' && (
        <div className="talk-cover t-cover">
          <div className="t-judge panel">
            <h2>這件事是誰在管？</h2>
            <div className="t-norms">
              {NORM_ORDER.map((n) => (
                <button key={n} className={`t-norm ${run.wrong.includes(n) ? 'no' : ''} ${run.tick && !run.wrong.length && n === run.c.norm ? 'yes' : ''}`}
                  disabled={run.wrong.includes(n) || (!!run.tick && !run.wrong.length)} onClick={() => pickNorm(n)}>
                  <i>{NORMS[n].icon}</i><b>{NORMS[n].name}</b><small>{NORMS[n].what}</small><small className="can">{NORMS[n].can}</small>
                </button>
              ))}
            </div>
            {run.tick && <Tick text={run.tick} worried={run.wrong.length > 0} />}
            {run.tick && !run.wrong.length && (
              <button className="btn green" onClick={() => { sfx('SE-03'); upd({ phase: run.c.law ? 'law' : 'handle', tick: null }); }}>{run.c.law ? '是哪一條法律？' : '想想怎麼處理'}</button>
            )}
          </div>
        </div>
      )}

      {run?.phase === 'law' && run.c.law && (
        <div className="talk-cover t-cover">
          <div className="t-judge panel">
            <h2>⚖️ 是哪一條法律在管？</h2>
            <div className="t-opts">
              {run.c.law.pick.map((l) => (
                <button key={l} className={`t-opt ${run.wrong.includes(l) ? 'no' : ''} ${run.tick && !run.wrong.length && l === run.c.law!.answer ? 'yes' : ''}`}
                  disabled={run.wrong.includes(l) || (!!run.tick && !run.wrong.length)} onClick={() => pickLaw(l)}>《{l}》</button>
              ))}
            </div>
            {run.tick && <Tick text={run.tick} worried={run.wrong.length > 0} />}
            {run.tick && !run.wrong.length && <button className="btn green" onClick={() => { sfx('SE-03'); upd({ phase: 'handle', tick: null }); }}>想想怎麼處理</button>}
          </div>
        </div>
      )}

      {run?.phase === 'handle' && (
        <div className="talk-cover t-cover">
          <div className="t-judge panel">
            <h2>要怎麼處理？</h2>
            <p className="v-hint">{run.c.norm === 'law' ? '法律有強制力，必要時可以請政府、警察處理。' : `這是${NORMS[run.c.norm].name}，警察不能罰，只能好好說、互相體諒。`}</p>
            <div className="t-opts">
              {handleOrder.map((i) => {
                const h = run.c.handle[i], picked = run.then === h.then;
                return (
                  <button key={i} className={`t-opt left ${run.wrong.includes(String(i)) ? 'no' : ''} ${picked && h.ok ? 'yes' : ''}`}
                    disabled={run.wrong.includes(String(i)) || (!!run.then && run.c.handle.some((x) => x.ok && x.then === run.then))} onClick={() => pickHandle(i)}>{h.text}</button>
                );
              })}
            </div>
            {run.then && (() => {
              const ok = run.c.handle.some((x) => x.ok && x.then === run.then);
              return <>
                <p className={ok ? 't-then ok' : 't-then bad'}>{ok ? '✨ ' : '💥 案件越鬧越大！'}{run.then}{ok ? '' : '　再選一次吧。'}</p>
                {ok && <button className="btn green" onClick={() => { sfx('SE-03'); upd({ phase: 'news' }); }}>結案</button>}
              </>;
            })()}
          </div>
        </div>
      )}

      {run?.phase === 'news' && (
        <div className="talk-cover t-cover">
          <div className="t-news panel">
            <small>規則小鎮報・號外</small>
            <h2>{run.c.news}</h2>
            <p>本報訊：{run.c.client.name}的煩惱，在小偵探的幫忙下解決了。這件事歸「{NORMS[run.c.norm].name}」管{run.c.law ? `，依據是《${run.c.law.answer}》` : ''}。</p>
            <p className="t-perfect">{run.miss === 0 ? '🌟 一次就判對！' : `這次選錯了 ${run.miss} 次，下次再挑戰一次判對吧。`}</p>
            <button className="btn green" onClick={close}>收進小鎮報</button>
          </div>
        </div>
      )}

      {dist && !run && (
        <div className="talk-cover t-cover" onClick={() => setDist(null)}>
          <div className="t-dist panel" onClick={(e) => e.stopPropagation()}>
            <button className="x" onClick={() => { sfx('SE-02'); setDist(null); }} aria-label="關掉">✕</button>
            <h2>{dist.icon} {dist.name} <span>{'⭐'.repeat(districtStars(s, dist)) || '☆☆☆'}</span></h2>
            <p>{dist.blurb}</p>
            <div className="t-cases">
              {dist.cases.map((c) => (
                <button key={c.id} className={`t-case ${s.solved[c.id] ? 'done' : ''}`} onClick={() => start(c)}>
                  <img src={timg(c.client.art)} alt="" />
                  <b>{c.title}</b>
                  <small>{s.solved[c.id] === 2 ? '🌟 一次判對' : s.solved[c.id] ? '✓ 結案（可再挑戰）' : c.client.name}</small>
                </button>
              ))}
            </div>
            <p className="v-hint">解完 3 案這一區就過關；每案都一次判對，可以拿到三顆星。</p>
          </div>
        </div>
      )}

      {paper && (
        <div className="talk-cover t-cover" onClick={() => setPaper(false)}>
          <div className="t-news panel" onClick={(e) => e.stopPropagation()}>
            <button className="x" onClick={() => { sfx('SE-02'); setPaper(false); }} aria-label="關掉">✕</button>
            <small>規則小鎮報</small>
            <h2>小偵探破案紀錄</h2>
            {news.length ? <ul className="t-headlines">{news.map((c) => <li key={c.id}>{s.solved[c.id] === 2 ? '🌟' : '📰'} {c.news}</li>)}</ul>
              : <p>還沒有新聞。去接第一個案子吧！</p>}
          </div>
        </div>
      )}

      {intro >= 0 && (
        <div className="talk-cover" onClick={() => {
          sfx('SE-09');
          if (intro + 1 < TOWN_LINES.intro.length) setIntro(intro + 1);
          else { setIntro(-1); setS({ ...s, intro: true }); }
        }}>
          <div className="talk">
            <div className="face small tick"><img src={`${TICK}happy.webp`} alt="" /></div>
            <div className="talk-body">
              <b style={{ color: '#ffc23d' }}>滴答</b>
              <p>{TOWN_LINES.intro[intro]}</p>
              <span className="talk-next">{intro + 1 < TOWN_LINES.intro.length ? '點一下繼續 ▶' : '點一下開始 ▶'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tick({ text, worried }: { text: string; worried: boolean }) {
  return (
    <div className="t-tick">
      <div className="face small tick"><img src={`${TICK}${worried ? 'thinking' : 'happy'}.webp`} alt="" /></div>
      <p>{text}</p>
    </div>
  );
}

// 處理方法的順序每案固定打亂（不然正確的永遠在第一個）
function shuffle(xs: number[], seed: string): number[] {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) >>> 0; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
