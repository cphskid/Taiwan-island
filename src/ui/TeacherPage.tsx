import { useEffect, useState } from 'react';
import { db, PARK_URL, whoAmI, type Who } from '../net/park';
import { classDetail, myClasses, type ClassInfo } from '../net/teacher';
import { classReport, toCsv, type DetailRow } from '../core/report';
import { CARD_ORDER, QUESTIONS } from '../data/babao-chapter';
import { STEPS } from '../core/save';

const BASE = import.meta.env.BASE_URL;

// 沒接資料庫（本機 npm run dev）或網址加 ?demo 時，用假的一班給人看畫面
const DEMO: DetailRow[] = [
  { student_id: '1', nickname: '小明', step: 5, stars: 3, done: true, done_at: '2026-10-01T03:20:00Z', updated_at: '2026-10-01T03:21:00Z', broken: 0, answers: [0, 1, 2], cards: 12 },
  { student_id: '2', nickname: '小華', step: 5, stars: 2, done: true, done_at: '2026-10-01T03:25:00Z', updated_at: '2026-10-01T03:26:00Z', broken: 2, answers: [0, 1, 0], cards: 11 },
  { student_id: '3', nickname: '阿寶', step: 5, stars: 1, done: true, done_at: '2026-10-01T03:30:00Z', updated_at: '2026-10-01T03:30:00Z', broken: 3, answers: [1, 1, 0], cards: 10 },
  { student_id: '4', nickname: '小美', step: 3, stars: 0, done: false, done_at: null, updated_at: '2026-10-01T03:10:00Z', broken: 1, answers: [], cards: 7 },
  { student_id: '5', nickname: '大雄', step: null, stars: null, done: null, done_at: null, updated_at: null, broken: 0, answers: [], cards: 0 },
];

type State =
  | { at: 'loading' }
  | { at: 'denied'; why: string }
  | { at: 'ready'; classes: ClassInfo[]; demo: boolean };

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

// 島嶼開拓者自己的老師細節頁：樂園教師入口「全班總覽」點進來，看第五章每個人玩到哪、反思題答得怎樣
export function TeacherPage() {
  const [state, setState] = useState<State>({ at: 'loading' });
  const [code, setCode] = useState<string>(() => new URLSearchParams(location.search).get('class')?.toUpperCase() ?? '');
  const [rows, setRows] = useState<DetailRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!db || location.search.includes('demo')) { setState({ at: 'ready', classes: [{ code: 'DEMO01', name: '示範班（假資料）', members: DEMO.length, facilities: [] }], demo: true }); setCode('DEMO01'); return; }
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
    setRows(null);
    setErr(null);
    if (state.demo) { setRows(DEMO); return; }
    classDetail(code).then(setRows, (e: Error) => setErr(e.message));
  }, [code, state.at]); // eslint-disable-line react-hooks/exhaustive-deps

  const parkTeacher = PARK_URL ? `${PARK_URL}teacher.html` : null;
  if (state.at === 'loading') return <div className="tp"><p className="tp-note">讀取中…</p></div>;
  if (state.at === 'denied') return (
    <div className="tp"><Head parkTeacher={parkTeacher} />
      <div className="panel tp-denied"><p>{state.why}</p>{parkTeacher && <a className="btn green" href={parkTeacher}>到樂園教師入口</a>}</div>
    </div>
  );

  const cls = state.classes.find((c) => c.code === code);
  const rep = rows ? classReport(rows, QUESTIONS.map((q) => q.answer), QUESTIONS.map((q) => q.options.length)) : null;
  const exportCsv = () => {
    if (!rows) return;
    const head = ['暱稱', '玩到', '過關', '星星', '竹蛇籠被沖壞', ...QUESTIONS.map((_, i) => `想一想 ${i + 1}`), '圖鑑', '最後遊玩'];
    const body = rows.map((r) => [r.nickname, r.step === null ? '還沒開始' : STEPS[Math.min(6, r.step)], r.done ? '是' : '', r.stars ?? '', r.broken,
      ...QUESTIONS.map((q, i) => (r.answers[i] === undefined || r.answers[i] < 0 ? '' : r.answers[i] === q.answer ? '對' : `錯（選${'ABC'[r.answers[i]]}）`)),
      `${r.cards}/${CARD_ORDER.length}`, when(r.updated_at)]);
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
      <div className="tp-bar">
        <label>班級
          <select value={code} onChange={(e) => setCode(e.target.value)}>
            {state.classes.map((c) => <option key={c.code} value={c.code}>{c.name || c.code}（{c.members} 人）</option>)}
          </select>
        </label>
        {cls && !state.demo && !cls.facilities.includes('island_pioneer') && <span className="tp-warn">這個班還沒開放島嶼開拓者，請到樂園教師入口勾選。</span>}
        {state.demo && <span className="tp-warn">這是示範用的假資料。</span>}
        <button className="btn green small" onClick={exportCsv} disabled={!rows}>匯出 CSV</button>
      </div>
      {!state.classes.length && <p className="tp-note">你還沒有開班。請先到樂園教師入口開班。</p>}
      {err && <p className="tp-error">{err}</p>}
      {rep && rows && (
        <>
          <section className="tp-cards">
            <div className="tp-stat"><b>{rep.done}</b><span>/ {rep.total} 人過關</span></div>
            <div className="tp-stat"><b>{rep.played - rep.done}</b><span>人還在玩</span></div>
            <div className="tp-stat"><b>{rep.notStarted}</b><span>人還沒開始</span></div>
            <div className="tp-stat"><b>{rep.avgStars.toFixed(1)}</b><span>過關的平均星星</span></div>
          </section>

          <section className="panel tp-sec">
            <h2>反思題：上課可以討論的地方</h2>
            {QUESTIONS.map((q, i) => {
              const s = rep.questions[i];
              const pct = s.answered ? Math.round((100 * s.right) / s.answered) : null;
              return (
                <div key={q.q} className="tp-q">
                  <p><b>{i + 1}. {q.q}</b></p>
                  <div className="tp-meter"><i style={{ width: `${pct ?? 0}%` }} /></div>
                  <p className="tp-q-line">
                    {s.answered ? `${s.answered} 人作答，答對 ${pct}%` : '還沒有人作答'}
                    {s.commonWrong !== null && <>；答錯的人最常選「{q.options[s.commonWrong]}」（{s.picks[s.commonWrong]} 人）</>}
                  </p>
                  <p className="tp-why">正確答案：{q.options[q.answer]}。{q.why}</p>
                </div>
              );
            })}
          </section>

          <section className="panel tp-sec">
            <h2>每個人</h2>
            <div className="tp-table-wrap">
              <table className="tp-table">
                <thead><tr><th>暱稱</th><th>玩到</th><th>星星</th><th>竹蛇籠被沖壞</th>{QUESTIONS.map((_, i) => <th key={i}>想 {i + 1}</th>)}<th>圖鑑</th><th>最後遊玩</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.student_id} className={r.step === null ? 'idle' : ''}>
                      <td>{r.nickname}</td>
                      <td>{r.step === null ? '還沒開始' : r.done ? '過關' : STEPS[Math.min(6, r.step)]}</td>
                      <td className="tp-st">{r.done ? '★'.repeat(r.stars ?? 0) + '☆'.repeat(3 - (r.stars ?? 0)) : ''}</td>
                      <td>{r.step === null ? '' : r.broken}</td>
                      {QUESTIONS.map((q, i) => {
                        const a = r.answers[i];
                        return <td key={i} className={a === undefined || a < 0 ? '' : a === q.answer ? 'ok' : 'no'}>{a === undefined || a < 0 ? '' : a === q.answer ? '○' : `✕ ${'ABC'[a]}`}</td>;
                      })}
                      <td>{r.step === null ? '' : `${r.cards}/${CARD_ORDER.length}`}</td>
                      <td>{when(r.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="tp-note">「竹蛇籠被沖壞」越多，代表導水時常常正面硬擋，可以請他說說「導」和「擋」的差別。星星：過關、竹蛇籠沒被沖壞、想一想全對各一顆。</p>
          </section>

          <section className="panel tp-sec">
            <h2>這一章在教什麼</h2>
            <ul className="tp-goals">
              <li>清領時期移民開墾彰化平原，需要水利才能種稻（施世榜、林先生與八堡圳）。</li>
              <li>水往低處流：看等高線找出圳道路線，理解圳頭為什麼開在上游的二水。</li>
              <li>用竹蛇籠「導」水比正面「擋」水有效。</li>
              <li>分水協商：「平均」和「公平」不一樣；開圳前這片土地已經有巴布薩族人生活。</li>
            </ul>
            <p className="tp-note">圖鑑卡與反思題文字附有出處，建議上課前先看過；如有和課本不一致的地方，請回報給管理員。</p>
          </section>
        </>
      )}
    </div>
  );
}

function Head({ parkTeacher }: { parkTeacher: string | null }) {
  return (
    <header className="top">
      {parkTeacher && <a className="park-btn" href={parkTeacher}><img src={`${BASE}img/park.webp`} alt="" /><span>樂園教師入口</span></a>}
      <h1>穿越吧！島嶼開拓者｜老師細節頁</h1>
    </header>
  );
}
