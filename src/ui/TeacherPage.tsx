import { useEffect, useMemo, useState } from 'react';
import { db, PARK_URL, whoAmI, type Who } from '../net/park';
import { classDetail, classPostcards, classProgress, myClasses, type ClassInfo, type PostRow, type ProgressRow } from '../net/teacher';
import { SPOTS } from '../data/postcard';
import { classReport, toCsv, type DetailRow } from '../core/report';
import { NOW_REPORTS, PAST_REPORTS, type ChapterReport } from '../data/report';
import { BOOK1, BOOK2, BOOK3, BOOK4, BOOK5, BOOK6, BOOK7, BOOK_END, type Book } from './Album';
import { FACTS } from '../data/prologue';
import { TRUTH1 } from '../data/ch1';
import { TRUTH2 } from '../data/ch2';
import { TRUTH3 } from '../data/ch3';
import { TRUTH4 } from '../data/ch4';
import { TRUTH } from '../data/babao-chapter';
import { TRUTH6 } from '../data/ch6';
import { TRUTH7 } from '../data/ch7';
import { TRUTH_END } from '../data/chEnd';

const BASE = import.meta.env.BASE_URL;

// 沒接資料庫（本機 npm run dev）或網址加 ?demo 時，用假的一班給人看畫面
const DEMO_KIDS = [{ id: '1', nickname: '小明' }, { id: '2', nickname: '小華' }, { id: '3', nickname: '阿寶' }, { id: '4', nickname: '大雄' }];
const at = '2026-10-20T03:20:00Z';
const done = (student_id: string, slot: string, stars: number, answers: number[], mistakes: number): ProgressRow =>
  ({ student_id, slot, step: 6, stars, done: true, clears: 1, n: 12, answers, mistakes, updated_at: at });
const DEMO_PROGRESS: ProgressRow[] = [
  { student_id: '1', slot: 'world', step: 0, stars: 0, done: false, clears: 0, n: 1, answers: [], mistakes: null, updated_at: at },
  done('1', 'ch1', 3, [0, 1, 2], 1), done('1', 'ch2', 2, [1, 2, 1], 2), done('1', 'ch5', 3, [0, 1, 2], 0),
  { student_id: '1', slot: 'ch3', step: 3, stars: 0, done: false, clears: 0, n: 5, answers: [], mistakes: 4, updated_at: at },
  { student_id: '1', slot: 'town', step: 0, stars: 0, done: false, clears: 0, n: 6, answers: [], mistakes: null, updated_at: at },
  { student_id: '2', slot: 'world', step: 0, stars: 0, done: false, clears: 0, n: 1, answers: [], mistakes: null, updated_at: at },
  done('2', 'ch1', 1, [1, 1, 0], 7), done('2', 'ch5', 2, [0, 0, 2], 2),
  { student_id: '3', slot: 'world', step: 0, stars: 0, done: false, clears: 0, n: 1, answers: [], mistakes: null, updated_at: at },
  { student_id: '3', slot: 'ch1', step: 2, stars: 0, done: false, clears: 0, n: 3, answers: [], mistakes: 2, updated_at: at },
];
const DEMO_POST: PostRow[] = [
  { student_id: '1', nickname: '小明', sent: [{ spot: 'taroko', plan: SPOTS[0].plans[0].text, msg: '來太魯閣記得戴安全帽！', at: '2026-10-01T03:40:00Z' }] },
];

type State =
  | { at: 'loading' }
  | { at: 'denied'; why: string }
  | { at: 'ready'; classes: ClassInfo[]; demo: boolean };

interface Kid { id: string; nickname: string }
type Slots = Map<string, ProgressRow>; // 一個學生：存檔格 → 那一格

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const starText = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);
const ABC = 'ABCD';

// 答對率紅黃綠：80% 以上綠、60~79% 黃、不到 60% 紅（先看紅的）
const tone = (pct: number | null) => (pct === null ? 'none' : pct >= 80 ? 'good' : pct >= 60 ? 'mid' : 'bad');

// 一章的狀態，給家長看的一句話
function chapterLine(ch: ChapterReport, r: ProgressRow | undefined): string {
  if (!r) return '還沒玩';
  if (r.done) return `過關 ${starText(r.stars)}`;
  return `玩到第 ${Math.min(r.step, 6)}／6 步「${ch.steps[Math.min(r.step, ch.steps.length - 1)]}」`;
}

// 一章的「想一想」：這個孩子答錯哪幾題
function wrongOf(ch: ChapterReport, r: ProgressRow | undefined) {
  if (!r) return [];
  return ch.questions.flatMap((q, i) => {
    const a = r.answers[i];
    return a !== undefined && a !== null && a >= 0 && a !== q.answer ? [{ q, i, picked: a }] : [];
  });
}

// 島嶼開拓者自己的老師細節頁（也給家長看）：樂園教師入口「全班總覽」的「細節頁」點進來。
// 上面是全班（進度表、每章反思題哪一題最多人錯），點孩子的名字看他一個人的白話報告。
// 要畫哪些章、哪些地方，照 src/data/report.ts 的清單，新章節加在那裡就好。
export function TeacherPage() {
  const [state, setState] = useState<State>({ at: 'loading' });
  const [code, setCode] = useState<string>(() => new URLSearchParams(location.search).get('class')?.toUpperCase() ?? '');
  const [kids, setKids] = useState<Kid[] | null>(null);
  const [progress, setProgress] = useState<ProgressRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [kid, setKid] = useState<string>(() => new URLSearchParams(location.search).get('kid') ?? '');

  useEffect(() => {
    (async () => {
      if (!db || location.search.includes('demo')) { setState({ at: 'ready', classes: [{ code: 'DEMO01', name: '示範班（假資料）', members: DEMO_KIDS.length, facilities: [] }], demo: true }); setCode('DEMO01'); return; }
      const who: Who = await whoAmI();
      if (who.kind !== 'staff') { setState({ at: 'denied', why: who.kind === 'student' ? '這一頁是給老師和家長看的。' : '請先在樂園的教師入口登入。' }); return; }
      try {
        const classes = await myClasses();
        setState({ at: 'ready', classes, demo: false });
        if (!code && classes[0]) setCode(classes[0].code);
      } catch (e) { setState({ at: 'denied', why: (e as Error).message }); }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.at !== 'ready' || !code) return;
    setKids(null); setProgress(null); setErr(null); setPosts([]);
    if (state.demo) { setKids(DEMO_KIDS); setProgress(DEMO_PROGRESS); setPosts(DEMO_POST); return; }
    // 名單用第五章那份（班上每個人都有一列，沒玩過的也在）
    classDetail(code).then((rows: DetailRow[]) => setKids(rows.map((r) => ({ id: r.student_id, nickname: r.nickname }))), (e: Error) => setErr(e.message));
    classProgress(code).then((p) => (p ? setProgress(p) : setErr('資料庫還沒裝新版的細節頁函式（island_class_progress），請管理員套用 supabase/island_pioneer.sql。')));
    classPostcards(code).then(setPosts);
  }, [code, state.at]); // eslint-disable-line react-hooks/exhaustive-deps

  // 學生 → 存檔格
  const byKid = useMemo(() => {
    const m = new Map<string, Slots>();
    for (const r of progress ?? []) {
      if (!m.has(r.student_id)) m.set(r.student_id, new Map());
      m.get(r.student_id)!.set(r.slot, r);
    }
    return m;
  }, [progress]);

  const parkTeacher = PARK_URL ? `${PARK_URL}teacher.html` : null;
  if (state.at === 'loading') return <div className="tp"><p className="tp-note">讀取中…</p></div>;
  if (state.at === 'denied') return (
    <div className="tp"><Head parkTeacher={parkTeacher} />
      <div className="panel tp-denied"><p>{state.why}</p>{parkTeacher && <a className="btn green" href={parkTeacher}>到樂園教師入口</a>}</div>
    </div>
  );

  const cls = state.classes.find((c) => c.code === code);
  const ready = kids && progress;
  const picked = kids?.find((k) => k.id === kid) ?? null;
  const pick = (id: string) => {
    setKid(id);
    const u = new URL(location.href);
    if (id) u.searchParams.set('kid', id); else u.searchParams.delete('kid');
    history.replaceState(null, '', u);
    window.scrollTo(0, 0);
  };

  const exportCsv = () => {
    if (!kids) return;
    const head = ['暱稱', '序章', ...PAST_REPORTS.map((c) => c.title), ...PAST_REPORTS.map((c) => `${c.title} 想一想答錯`), ...PAST_REPORTS.map((c) => `${c.title} 失誤`), ...NOW_REPORTS.map((p) => p.title), '最後遊玩'];
    const body = kids.map((k) => {
      const s = byKid.get(k.id) ?? new Map();
      const last = [...s.values()].map((r) => r.updated_at).sort().pop() ?? null;
      return [k.nickname, s.get('world')?.n ? '玩完' : '',
        ...PAST_REPORTS.map((c) => (s.get(c.slot) ? chapterLine(c, s.get(c.slot)) : '')),
        ...PAST_REPORTS.map((c) => wrongOf(c, s.get(c.slot)).map((w) => `第${w.i + 1}題選${ABC[w.picked]}`).join('、')),
        ...PAST_REPORTS.map((c) => s.get(c.slot)?.mistakes ?? ''),
        ...NOW_REPORTS.map((p) => { const r = s.get(p.slot); return r ? (p.total ? p.unit(r.n) : r.done ? '完成' : '玩過') : ''; }),
        when(last)];
    });
    const url = URL.createObjectURL(new Blob([toCsv(head, body)], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `島嶼開拓者_${cls?.name ?? code}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tp">
      <Head parkTeacher={parkTeacher} />
      {/* 2026-10-24 跟守護異世界細節頁合成一套：班級改成一顆一顆的按鈕，第二列是看誰、列印、匯出 CSV */}
      <div className="panel tp-bar">
        <div className="tp-chips">
          {state.classes.map((c) => (
            <button key={c.code} className={c.code === code ? 'on' : ''}
              onClick={() => {
                setCode(c.code); pick('');
                const u = new URL(location.href); u.searchParams.set('class', c.code); u.searchParams.delete('kid'); history.replaceState(null, '', u);
              }}>{c.name || c.code}</button>
          ))}
        </div>
        <div className="tp-tools">
          {kids && kids.length > 0 && (
            <label>看
              <select value={picked?.id ?? ''} onChange={(e) => pick(e.target.value)}>
                <option value="">全班（{kids.length} 人）</option>
                {kids.map((k) => <option key={k.id} value={k.id}>{k.nickname} 的報告</option>)}
              </select>
            </label>
          )}
          {cls && !state.demo && !cls.facilities.includes('island_pioneer') && <span className="tp-warn">這個班還沒開放島嶼開拓者，請到樂園教師入口勾選。</span>}
          {state.demo && <span className="tp-warn">這是示範用的假資料。</span>}
          <span className="tp-spacer" />
          <button className="btn plain small" onClick={() => window.print()} disabled={!ready}>列印</button>
          <button className="btn green small" onClick={exportCsv} disabled={!ready}>匯出 CSV</button>
        </div>
      </div>
      {!state.classes.length && <p className="tp-note">你還沒有開班。請先到樂園教師入口開班。</p>}
      {err && <p className="tp-error">{err}</p>}
      {ready && !picked && <ClassView kids={kids} byKid={byKid} onPick={pick} posts={posts} />}
      {ready && picked && <KidReport kid={picked} slots={byKid.get(picked.id) ?? new Map()} posts={posts.find((p) => p.student_id === picked.id)} onBack={() => pick('')} />}
      {ready && <Sources />}
    </div>
  );
}

// ---------- 全班 ----------
function ClassView({ kids, byKid, onPick, posts }: { kids: Kid[]; byKid: Map<string, Slots>; onPick: (id: string) => void; posts: PostRow[] }) {
  const week = Date.now() - 7 * 86400e3;
  const lastOf = (k: Kid) => Math.max(0, ...[...(byKid.get(k.id)?.values() ?? [])].map((r) => new Date(r.updated_at).getTime()));
  const cleared = (k: Kid) => PAST_REPORTS.filter((c) => byKid.get(k.id)?.get(c.slot)?.done).length;
  const played = kids.filter((k) => byKid.has(k.id));
  const avg = played.length ? played.reduce((s, k) => s + cleared(k), 0) / played.length : 0;
  // 有在玩的排前面
  const order = [...kids].sort((a, b) => lastOf(b) - lastOf(a) || a.nickname.localeCompare(b.nickname, 'zh-TW'));
  const [openAll, setOpenAll] = useState(false);

  return (
    <>
      <section className="tp-cards">
        <div className="tp-stat"><b>{played.length}</b><span>/ {kids.length} 人玩過</span></div>
        <div className="tp-stat"><b>{kids.filter((k) => lastOf(k) > week).length}</b><span>人最近 7 天有玩</span></div>
        <div className="tp-stat"><b>{avg.toFixed(1)}</b><span>章：玩過的人平均過了幾章（共 {PAST_REPORTS.length} 章）</span></div>
      </section>

      <KeyLine kids={kids} byKid={byKid} />

      <section className="panel tp-sec">
        <h2>全班進度</h2>
        <p className="tp-note">★ 是過關拿到的星星；「3/6」是還在玩、走到第幾步。點名字看那個孩子的白話報告（可以給家長看）。</p>
        <div className="tp-table-wrap">
          <table className="tp-table tp-grid">
            <thead><tr><th>暱稱</th><th>序章</th>{PAST_REPORTS.map((c) => <th key={c.slot} title={c.title}>{c.title.split(' ')[0]}</th>)}
              {NOW_REPORTS.map((p) => <th key={p.slot} className="now">{p.title}</th>)}<th>最後遊玩</th></tr></thead>
            <tbody>
              {order.map((k) => {
                const s = byKid.get(k.id);
                const last = lastOf(k);
                return (
                  <tr key={k.id} className={s ? '' : 'idle'}>
                    <td><button className="tp-link" onClick={() => onPick(k.id)}>{k.nickname}</button></td>
                    <td>{s?.get('world')?.n ? '✓' : ''}</td>
                    {PAST_REPORTS.map((c) => {
                      const r = s?.get(c.slot);
                      const wrong = wrongOf(c, r).length;
                      return <td key={c.slot} className={r?.done ? 'tp-st' : r ? 'mid' : ''} title={r ? `${chapterLine(c, r)}${wrong ? `，想一想錯 ${wrong} 題` : ''}` : ''}>
                        {r ? (r.done ? starText(r.stars) : `${Math.min(r.step, 6)}/6`) : ''}{wrong ? <sup className="no">✕{wrong}</sup> : null}</td>;
                    })}
                    {NOW_REPORTS.map((p) => {
                      const r = s?.get(p.slot);
                      return <td key={p.slot} className="now">{r ? (p.total ? `${r.n}/${p.total}` : r.done ? '✓' : '玩過') : ''}</td>;
                    })}
                    <td>{last ? when(new Date(last).toISOString()) : '還沒玩'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="tp-note">「✕2」＝那一章章末的「想一想」答錯 2 題，點名字看錯在哪。</p>
      </section>

      <section className="panel tp-sec">
        <h2>每一章：上課可以討論的地方</h2>
        <p className="tp-note">每章最後有三題「想一想」。點一章打開，看全班答對多少、答錯的人最常選哪個，和正確答案的理由。</p>
        <p className="tp-legend">
          <span className="tp-pct good">80% 以上</span><span className="tp-pct mid">60～79%</span><span className="tp-pct bad">不到 60%</span>
          <span>＝全班「想一想」答對率，紅色的先看。</span>
          <button className="tp-link" onClick={() => setOpenAll((o) => !o)}>{openAll ? '全部收起' : '全部展開'}</button>
        </p>
        {PAST_REPORTS.map((c) => <ChapterClass key={`${c.slot}-${openAll}`} ch={c} kids={kids} byKid={byKid} open={openAll} />)}
      </section>

      <section className="panel tp-sec">
        <h2>現在篇</h2>
        <div className="tp-table-wrap">
          <table className="tp-table">
            <thead><tr><th>地方</th><th>在學什麼</th><th>玩過</th></tr></thead>
            <tbody>{NOW_REPORTS.map((p) => <tr key={p.slot}><td><b>{p.title}</b></td><td style={{ whiteSpace: 'normal' }}>{p.what}</td>
              <td>{kids.filter((k) => byKid.get(k.id)?.has(p.slot)).length} 人</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      {posts.length > 0 && (
        <section className="panel tp-sec">
          <h2>現在篇：學生寄出的明信片</h2>
          <p className="tp-note">學生挑一個景點，收集特色、歷史、政府怎麼維護、遇到的問題，再選一個對策、寫一句話給遊客。可以挑幾張上課分享。</p>
          <Postcards rows={posts} />
        </section>
      )}
    </>
  );
}

// 一句話重點（兩邊細節頁都有）：全班「想一想」答對率，和答對率最低的一章（至少 5 題作答才算）
function quizOf(ch: ChapterReport, kids: Kid[], byKid: Map<string, Slots>) {
  let n = 0, ok = 0;
  for (const k of kids) {
    const r = byKid.get(k.id)?.get(ch.slot);
    ch.questions.forEach((q, i) => { const a = r?.answers[i]; if (a !== undefined && a !== null && a >= 0) { n++; if (a === q.answer) ok++; } });
  }
  return { ch, n, ok };
}
function KeyLine({ kids, byKid }: { kids: Kid[]; byKid: Map<string, Slots> }) {
  const all = PAST_REPORTS.map((c) => quizOf(c, kids, byKid));
  const n = all.reduce((s, x) => s + x.n, 0), ok = all.reduce((s, x) => s + x.ok, 0);
  if (!n) return null;
  const pct = (x: { n: number; ok: number }) => Math.round((100 * x.ok) / x.n);
  const worst = all.filter((x) => x.n >= 5).sort((a, b) => a.ok / a.n - b.ok / b.n)[0];
  return (
    <p className="panel tp-sec tp-key">
      全班「想一想」答對率 <span className={`tp-pct ${tone(pct({ n, ok }))}`}>{pct({ n, ok })}%</span>
      {worst && pct(worst) < 80
        ? <>；最需要討論的是<b>{worst.ch.title}</b>（答對 {pct(worst)}%），下面「每一章」點開看大家最常選錯哪個。</>
        : '，每一章都答得不錯。'}
    </p>
  );
}

function ChapterClass({ ch, kids, byKid, open }: { ch: ChapterReport; kids: Kid[]; byKid: Map<string, Slots>; open: boolean }) {
  // 換成 classReport 吃的格式（每個人一列，沒玩過 step=null）
  const rows: DetailRow[] = kids.map((k) => {
    const r = byKid.get(k.id)?.get(ch.slot);
    return { student_id: k.id, nickname: k.nickname, step: r ? r.step : null, stars: r?.stars ?? null, done: r?.done ?? null,
      done_at: null, updated_at: r?.updated_at ?? null, broken: r?.mistakes ?? 0, answers: r?.answers ?? [], cards: r?.n ?? 0 };
  });
  const rep = classReport(rows, ch.questions.map((q) => q.answer), ch.questions.map((q) => q.options.length));
  const withMiss = rows.filter((r) => r.step !== null);
  const avgMiss = withMiss.length ? withMiss.reduce((s, r) => s + r.broken, 0) / withMiss.length : 0;
  // 收起來也看得到：三題合起來的答對率、平均失誤
  const answered = rep.questions.reduce((s, q) => s + q.answered, 0);
  const right = rep.questions.reduce((s, q) => s + q.right, 0);
  const all = answered ? Math.round((100 * right) / answered) : null;
  return (
    <details className={`tp-ch ${tone(all)}`} open={open}>
      <summary>
        <b>{ch.title}</b>
        <span className={`tp-pct ${tone(all)}`}>{all === null ? '還沒有人作答' : `答對 ${all}%`}</span>
        <span>{rep.played ? `${rep.done} 人過關、${rep.played - rep.done} 人還在玩` : '還沒有人玩'}</span>
        {rep.played > 0 && <span>平均失誤 {avgMiss.toFixed(1)} 次</span>}
      </summary>
      {ch.goals ? <ul className="tp-goals">{ch.goals.map((g) => <li key={g}>{g}</li>)}</ul>
        : <p className="tp-note">這章在學：{ch.steps.slice(1, -1).join('、')}。</p>}
      {rep.played > 0 && <p className="tp-note">途中平均失誤 {avgMiss.toFixed(1)} 次（{ch.mistakes}加起來；3 次以內多一顆星）。</p>}
      {ch.questions.map((q, i) => {
        const s = rep.questions[i];
        const pct = s.answered ? Math.round((100 * s.right) / s.answered) : null;
        return (
          <div key={q.q} className="tp-q">
            <p><b>想一想 {i + 1}：{q.q}</b></p>
            <div className={`tp-meter ${tone(pct)}`}><i style={{ width: `${pct ?? 0}%` }} /></div>
            <p className="tp-q-line">
              {s.answered ? `${s.answered} 人作答，答對 ${pct}%` : '還沒有人作答'}
              {s.commonWrong !== null && <>；答錯的人最常選「{q.options[s.commonWrong]}」（{s.picks[s.commonWrong]} 人）</>}
            </p>
            <p className="tp-why">正確答案：{q.options[q.answer]}。{q.why}</p>
          </div>
        );
      })}
    </details>
  );
}

// ---------- 一個孩子（家長看得懂） ----------
function KidReport({ kid, slots, posts, onBack }: { kid: Kid; slots: Slots; posts?: PostRow; onBack: () => void }) {
  const cleared = PAST_REPORTS.filter((c) => slots.get(c.slot)?.done);
  const playing = PAST_REPORTS.filter((c) => slots.has(c.slot) && !slots.get(c.slot)!.done);
  const places = NOW_REPORTS.filter((p) => slots.has(p.slot));
  const last = [...slots.values()].filter((r) => r.slot !== 'world').sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  const lastName = last ? (PAST_REPORTS.find((c) => c.slot === last.slot)?.title ?? NOW_REPORTS.find((p) => p.slot === last.slot)?.title) : null;
  const wrongs = PAST_REPORTS.flatMap((c) => wrongOf(c, slots.get(c.slot)).map((w) => ({ ...w, ch: c })));
  const answered = PAST_REPORTS.reduce((s, c) => s + (slots.get(c.slot)?.answers.filter((a) => a >= 0).length ?? 0), 0);
  const slips = PAST_REPORTS.filter((c) => (slots.get(c.slot)?.mistakes ?? 0) > 3);

  return (
    <>
      <section className="panel tp-sec tp-kid">
        <button className="tp-link" onClick={onBack}>‹ 回全班</button>
        <h2>{kid.nickname} 的學習報告</h2>
        {slots.size === 0 ? <p>還沒開始玩島嶼開拓者。</p> : (
          <p className="tp-sum">
            過去篇過了 <b>{cleared.length}／{PAST_REPORTS.length}</b> 章{playing.length > 0 && <>，正在玩 {playing.map((c) => c.title).join('、')}</>}。
            {places.length > 0 && <>現在篇去過 {places.map((p) => p.title).join('、')}。</>}
            {lastName && <>最後玩的是「{lastName}」（{when(last.updated_at)}）。</>}
            {answered > 0 && <>章末「想一想」答了 {answered} 題，答對 {answered - wrongs.length} 題。</>}
          </p>
        )}
      </section>

      {(wrongs.length > 0 || slips.length > 0) && (
        <section className="panel tp-sec">
          <h2>可以陪他再想想的地方</h2>
          {wrongs.map((w) => (
            <div key={`${w.ch.slot}-${w.i}`} className="tp-q">
              <p className="tp-ch-tag">{w.ch.title}・想一想 {w.i + 1}</p>
              <p><b>{w.q.q}</b></p>
              <p className="no">他選了：{w.q.options[w.picked]}</p>
              <p className="ok">正確是：{w.q.options[w.q.answer]}</p>
              <p className="tp-why">為什麼：{w.q.why}</p>
            </div>
          ))}
          {slips.map((c) => (
            <div key={c.slot} className="tp-q">
              <p className="tp-ch-tag">{c.title}・途中的挑戰</p>
              <p>失誤了 <b>{slots.get(c.slot)!.mistakes}</b> 次（{c.mistakes}加起來）。3 次以內可以多拿一顆星，可以請他說說哪裡卡住，或陪他從頭再玩一次。</p>
            </div>
          ))}
        </section>
      )}

      {slots.size > 0 && (
        <section className="panel tp-sec">
          <h2>每一章</h2>
          <div className="tp-table-wrap">
            <table className="tp-table">
              <thead><tr><th>章節</th><th>進度</th><th>想一想</th><th>途中失誤</th><th>圖鑑</th><th>最後玩</th></tr></thead>
              <tbody>
                <tr className={slots.get('world')?.n ? '' : 'idle'}><td>序章 認識臺灣</td><td>{slots.get('world')?.n ? '玩完' : '還沒玩完'}</td><td /><td /><td /><td /></tr>
                {PAST_REPORTS.map((c) => {
                  const r = slots.get(c.slot);
                  const got = r?.answers.filter((a) => a >= 0).length ?? 0;
                  const wrong = wrongOf(c, r).length;
                  return (
                    <tr key={c.slot} className={r ? '' : 'idle'}>
                      <td>{c.title}</td>
                      <td className={r?.done ? 'tp-st' : ''}>{chapterLine(c, r)}</td>
                      <td className={got ? (wrong ? 'no' : 'ok') : ''}>{got ? (wrong ? `錯 ${wrong} 題` : `${got} 題全對`) : ''}</td>
                      <td>{r?.mistakes ?? ''}</td>
                      <td>{r ? `${r.n}/${c.cards}` : ''}</td>
                      <td>{r ? when(r.updated_at) : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="tp-note">星星：過關一顆、途中失誤 3 次以內一顆、「想一想」全對一顆。</p>
        </section>
      )}

      {places.length > 0 && (
        <section className="panel tp-sec">
          <h2>現在篇</h2>
          <ul className="tp-goals">
            {places.map((p) => { const r = slots.get(p.slot)!; return <li key={p.slot}><b>{p.title}</b>：{p.total ? p.unit(r.n) : r.done ? '完成' : '玩過'}。{p.what}。</li>; })}
          </ul>
          {posts && posts.sent.length > 0 && <Postcards rows={[posts]} />}
        </section>
      )}
    </>
  );
}

function Postcards({ rows }: { rows: PostRow[] }) {
  return (
    <div className="tp-table-wrap">
      <table className="tp-table">
        <thead><tr><th>暱稱</th><th>景點</th><th>寫給遊客的話</th><th>選的辦法</th><th>寄出</th></tr></thead>
        <tbody>
          {rows.flatMap((r) => r.sent.map((x) => (
            <tr key={`${r.student_id}-${x.spot}`}>
              <td>{r.nickname}</td>
              <td>{SPOTS.find((s) => s.id === x.spot)?.name ?? x.spot}</td>
              <td style={{ textAlign: 'left' }}>{x.msg}</td>
              <td style={{ textAlign: 'left' }}>{x.plan}</td>
              <td>{when(x.at)}</td>
            </tr>
          )))}
        </tbody>
      </table>
    </div>
  );
}

// 內容出處：學生畫面拿掉的「資料來源」都在這裡，一章一格，點開才展開
const CHAPTERS: { book: Book; truth: { source: string } }[] = [
  { book: BOOK1, truth: TRUTH1 }, { book: BOOK2, truth: TRUTH2 }, { book: BOOK3, truth: TRUTH3 }, { book: BOOK4, truth: TRUTH4 },
  { book: BOOK5, truth: TRUTH }, { book: BOOK6, truth: TRUTH6 }, { book: BOOK7, truth: TRUTH7 }, { book: BOOK_END, truth: TRUTH_END },
];
function Sources() {
  return (
    <section className="panel tp-sec">
      <h2>內容出處</h2>
      <p className="tp-note">圖鑑卡與章末「真的是這樣嗎？」的出處；學生畫面不顯示出處，免得像在讀課本。如有和課本不一致的地方，請回報給管理員。</p>
      <details className="tp-src">
        <summary>序章 認識臺灣（知識小卡）</summary>
        <ul>{Object.values(FACTS).map((f) => <li key={f.title}><b>{f.title}</b>：{f.source}</li>)}</ul>
      </details>
      {CHAPTERS.map(({ book, truth }) => (
        <details key={book.title} className="tp-src">
          <summary>{book.title}</summary>
          <ul>
            <li><b>真的是這樣嗎？</b>：{truth.source}</li>
            {book.order.map((id) => book.cards[id]).map((c) => <li key={c.id}><b>{c.title}</b>：{c.source}</li>)}
          </ul>
        </details>
      ))}
    </section>
  );
}

function Head({ parkTeacher }: { parkTeacher: string | null }) {
  return (
    <header className="top">
      {/* 跟守護異世界細節頁一樣：左上角只有這一顆，就是回去（登出、管理員都在樂園教師入口） */}
      {parkTeacher && <a className="park-btn tp-back" href={parkTeacher}><span>←</span><img src={`${BASE}img/park.webp`} alt="" /><span>樂園教師入口</span></a>}
      <h1>老師・家長細節頁<small>島嶼開拓者</small></h1>
    </header>
  );
}
