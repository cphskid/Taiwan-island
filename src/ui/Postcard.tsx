import { useEffect, useMemo, useState } from 'react';
import { CARD_KINDS, CARD_ORDER, POST_LINES, SPOTS, type CardKind, type Spot } from '../data/postcard';
import { loadPost, MSG_MAX, savePost, send, type PostSave, type Sent } from '../core/postcard';
import { pushCloud } from '../net/cloud';
import { sfx } from '../audio';
import { SoundToggle } from './Sound';
import { ReportButton } from './Report';

// 現在篇「景點明信片」：探究四步驟。① 挑景點 ② 到現場收四張資料卡（歷史卡要切到「過去」）
// ③ 把卡放進明信片背面的四格 ④ 選一個好辦法、寫一句話給遊客，寄出。
const TICK = `${import.meta.env.BASE_URL}img/tick/`;
const STEP_NAMES = ['發現問題', '蒐集資料', '整理分析', '行動省思'];
// 現場的四個「🔍」放哪裡（%）
const HOT: Record<CardKind, { left: string; top: string }> = {
  nature: { left: '22%', top: '38%' }, care: { left: '72%', top: '30%' }, issue: { left: '58%', top: '70%' }, history: { left: '36%', top: '62%' },
};

type Phase = { at: 'pick' } | { at: 'field'; spot: Spot; got: CardKind[]; past: boolean; open: CardKind | null }
  | { at: 'sort'; spot: Spot; placed: CardKind[]; hold: CardKind | null; miss: CardKind | null }
  | { at: 'plan'; spot: Spot; wrong: number[]; ok: number | null }
  | { at: 'write'; spot: Spot; plan: string; msg: string }
  | { at: 'sent'; card: Sent };

export function Postcard({ onExit }: { onExit: () => void }) {
  const [s, setS] = useState<PostSave>(loadPost);
  useEffect(() => { savePost(s); pushCloud('post', s); }, [s]);
  const [intro, setIntro] = useState(s.intro ? -1 : 0);
  const [ph, setPh] = useState<Phase>({ at: 'pick' });
  const [book, setBook] = useState(false);
  const step = ph.at === 'pick' ? 0 : ph.at === 'field' ? 1 : ph.at === 'sort' ? 2 : 3;
  const sentOf = (id: string) => s.sent.find((x) => x.spot === id);

  return (
    <div className="town postcard">
      <header className="v-hud">
        <button className="v-chip v-back" onClick={() => { sfx('SE-02'); if (ph.at !== 'pick') setPh({ at: 'pick' }); else onExit(); }}>{ph.at !== 'pick' ? '← 換景點' : '← 大地圖'}</button>
        <span className="v-chip">✉️ 景點明信片</span>
        <button className="v-chip" onClick={() => { sfx('SE-03'); setBook(true); }}>📬 寄出的 {s.sent.length}/{SPOTS.length}</button>
        <SoundToggle className="v-chip v-sound" />
        <ReportButton className="v-chip v-sound" screen="postcard" />
      </header>

      <div className="pc-stage">
        {ph.at !== 'sent' && <ol className="pc-steps">{STEP_NAMES.map((n, i) => <li key={n} className={i === step ? 'on' : i < step ? 'done' : ''}>{i + 1} {n}</li>)}</ol>}

        {ph.at === 'pick' && <>
          <Tick text="遊客想來臺灣玩！挑一個景點，寫一張明信片給遊客。" />
          <div className="pc-spots">
            {SPOTS.map((sp) => (
              <button key={sp.id} className="pc-spot" style={{ background: sp.sky }} onClick={() => { sfx('SE-03'); setPh({ at: 'field', spot: sp, got: [], past: false, open: null }); }}>
                <i>{sp.icon}</i><b>{sp.name}</b><small>{sp.where}</small>{sentOf(sp.id) && <em>✉️ 寄過了</em>}
              </button>
            ))}
          </div>
        </>}

        {ph.at === 'field' && <Field ph={ph} set={setPh} />}
        {ph.at === 'sort' && <Sort ph={ph} set={setPh} />}

        {ph.at === 'plan' && (
          <div className="panel pc-panel">
            <h2>{ph.spot.icon} {ph.spot.name}遇到的問題，怎麼辦？</h2>
            <p className="pc-issue">⚠️ {ph.spot.cards.issue}</p>
            <div className="t-opts">
              {ph.spot.plans.map((p, i) => (
                <button key={p.text} className={`t-opt left ${ph.wrong.includes(i) ? 'no' : ''} ${ph.ok === i ? 'yes' : ''}`} disabled={ph.wrong.includes(i) || ph.ok !== null}
                  onClick={() => { if (p.ok) { sfx('SE-36'); setPh({ ...ph, ok: i }); } else { sfx('SE-04'); setPh({ ...ph, wrong: [...ph.wrong, i] }); } }}>{p.text}</button>
              ))}
            </div>
            {ph.ok !== null ? <>
              <Tick text={`好辦法！${ph.spot.plans[ph.ok].why}`} />
              <button className="btn green" onClick={() => { sfx('SE-03'); setPh({ at: 'write', spot: ph.spot, plan: ph.spot.plans[ph.ok!].text, msg: '' }); }}>寫明信片 ✏️</button>
            </> : ph.wrong.length > 0 && <Tick text={ph.spot.plans[ph.wrong[ph.wrong.length - 1]].why} worried />}
          </div>
        )}

        {ph.at === 'write' && (
          <div className="pc-write">
            <Card spot={ph.spot} msg={ph.msg || '（寫一句話給遊客）'} plan={ph.plan} />
            <div className="panel pc-panel small">
              <p>寫一句話給遊客：可以點一句，也可以自己改。</p>
              <div className="pc-msgs">{ph.spot.msgs.map((m) => <button key={m} className="t-opt left" onClick={() => { sfx('SE-09'); setPh({ ...ph, msg: m }); }}>{m}</button>)}</div>
              <input className="pc-input" value={ph.msg} maxLength={MSG_MAX} placeholder="自己寫一句……" onChange={(e) => setPh({ ...ph, msg: e.target.value })} />
              <button className="btn green" disabled={!ph.msg.trim()} onClick={() => {
                sfx('SE-36');
                const card: Sent = { spot: ph.spot.id, plan: ph.plan, msg: ph.msg.trim().slice(0, MSG_MAX), at: new Date().toISOString() };
                setS(send(s, card)); setPh({ at: 'sent', card });
              }}>寄出明信片 📮</button>
            </div>
          </div>
        )}

        {ph.at === 'sent' && (() => {
          const sp = SPOTS.find((x) => x.id === ph.card.spot)!;
          return <div className="pc-sent">
            <div className="pc-fly"><Card spot={sp} msg={ph.card.msg} plan={ph.card.plan} stamped /></div>
            <Tick text={`寄出去了！遊客收到${sp.name}的明信片，一定很想來。${s.sent.length < SPOTS.length ? '還有別的景點可以介紹喔。' : '六個景點都寄過了，你是最棒的時空導遊！'}`} />
            <div className="pc-row">
              <button className="btn orange" onClick={() => { sfx('SE-03'); setBook(true); }}>看寄出的明信片</button>
              <button className="btn green" onClick={() => { sfx('SE-03'); setPh({ at: 'pick' }); }}>再寫一張</button>
            </div>
          </div>;
        })()}
      </div>

      {book && (
        <div className="talk-cover t-cover" onClick={() => setBook(false)}>
          <div className="t-news panel pc-book" onClick={(e) => e.stopPropagation()}>
            <button className="x" onClick={() => { sfx('SE-02'); setBook(false); }} aria-label="關掉">✕</button>
            <small>寄出的明信片</small>
            {s.sent.length === 0 ? <p>還沒有寄出明信片。挑一個景點開始吧！</p>
              : <div className="pc-shelf">{s.sent.map((x) => { const sp = SPOTS.find((y) => y.id === x.spot); return sp && <Card key={x.spot} spot={sp} msg={x.msg} plan={x.plan} stamped />; })}</div>}
          </div>
        </div>
      )}

      {intro >= 0 && (
        <div className="talk-cover" onClick={() => {
          sfx('SE-09');
          if (intro + 1 < POST_LINES.length) setIntro(intro + 1);
          else { setIntro(-1); setS({ ...s, intro: true }); }
        }}>
          <div className="talk">
            <div className="face small tick"><img src={`${TICK}happy.webp`} alt="" /></div>
            <div className="talk-body">
              <b style={{ color: '#ffc23d' }}>滴答</b>
              <p>{POST_LINES[intro]}</p>
              <span className="talk-next">{intro + 1 < POST_LINES.length ? '點一下繼續 ▶' : '點一下開始 ▶'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tick({ text, worried = false }: { text: string; worried?: boolean }) {
  return <div className="t-tick"><div className="face small tick"><img src={`${TICK}${worried ? 'thinking' : 'happy'}.webp`} alt="" /></div><p>{text}</p></div>;
}

// ② 蒐集資料：在景點上找 🔍。現在看得到特色、維護、問題；切到「過去」才看得到歷史
function Field({ ph, set }: { ph: Extract<Phase, { at: 'field' }>; set: (p: Phase) => void }) {
  const { spot, got, past, open } = ph;
  const here = CARD_ORDER.filter((k) => (k === 'history') === past);
  const need = past ? '回到「現在」繼續找！' : got.includes('history') ? '' : '還少一張歷史卡……切到「過去」看看！';
  return <>
    <div className={`pc-scene ${past ? 'past' : ''}`} style={{ background: spot.sky }}>
      <span className="pc-big">{spot.icon}</span>
      <b className="pc-name">{spot.name}{past ? '・很久以前' : ''}</b>
      {here.map((k) => <button key={k} className={`pc-hot ${got.includes(k) ? 'got' : ''}`} style={HOT[k]} onClick={() => { sfx('SE-05'); set({ ...ph, open: k }); }}>{got.includes(k) ? CARD_KINDS[k].icon : '🔍'}</button>)}
      <button className="pc-time" onClick={() => { sfx('SE-09'); set({ ...ph, past: !past, open: null }); }}>{past ? '⏩ 回到現在' : '⏪ 切到過去'}</button>
    </div>
    <div className="pc-tray">
      {CARD_ORDER.map((k) => <span key={k} className={got.includes(k) ? 'on' : ''}>{got.includes(k) ? CARD_KINDS[k].icon : '❔'}</span>)}
      <small>{got.length === 4 ? '四張資料卡都收到了！' : here.every((k) => got.includes(k)) ? need : `點 🔍 收集資料卡（${got.length}/4）`}</small>
      {got.length === 4 && <button className="btn green" onClick={() => { sfx('SE-03'); set({ at: 'sort', spot, placed: [], hold: null, miss: null }); }}>整理資料 →</button>}
    </div>
    {open && (
      <div className="talk-cover t-cover" onClick={() => set({ ...ph, open: null })}>
        <div className="panel pc-panel pc-found" onClick={(e) => e.stopPropagation()}>
          <span className="pc-cardicon">{CARD_KINDS[open].icon}</span>
          <p>{spot.cards[open]}</p>
          <button className="btn green" onClick={() => { sfx('SE-36'); set({ ...ph, open: null, got: got.includes(open) ? got : [...got, open] }); }}>{got.includes(open) ? '好' : '收進資料夾'}</button>
        </div>
      </div>
    )}
  </>;
}

// ③ 整理分析：卡片不標種類，學生自己判斷要放進明信片背面的哪一格
function Sort({ ph, set }: { ph: Extract<Phase, { at: 'sort' }>; set: (p: Phase) => void }) {
  const { spot, placed, hold, miss } = ph;
  const deck = useMemo(() => [...CARD_ORDER].sort((a, b) => (spot.id.charCodeAt(1) * (a.length + 3)) % 7 - (spot.id.charCodeAt(1) * (b.length + 3)) % 7), [spot.id]);
  const drop = (slot: CardKind) => {
    if (!hold || placed.includes(slot)) return;
    if (hold === slot) { sfx('SE-36'); set({ ...ph, placed: [...placed, slot], hold: null, miss: null }); }
    else { sfx('SE-04'); set({ ...ph, miss: slot }); }
  };
  const done = placed.length === 4;
  return <div className="pc-sort">
    <div className="pc-back">
      {CARD_ORDER.map((k) => (
        <button key={k} className={`pc-slot ${placed.includes(k) ? 'full' : ''} ${miss === k ? 'miss' : ''} ${hold && !placed.includes(k) ? 'aim' : ''}`} onClick={() => drop(k)}>
          <b>{CARD_KINDS[k].icon} {CARD_KINDS[k].name}</b>
          {placed.includes(k) && <span>{spot.cards[k]}</span>}
        </button>
      ))}
    </div>
    <div className="pc-side">
      {done ? <>
        <Tick text={`整理好了！${spot.name}有它的特色和歷史，政府也在維護，可是還有問題要解決。`} />
        <button className="btn green" onClick={() => { sfx('SE-03'); set({ at: 'plan', spot, wrong: [], ok: null }); }}>想辦法 →</button>
      </> : <>
        <Tick text={miss && hold ? `這張是在說「${CARD_KINDS[hold].name}」嗎？再讀一次看看。` : '先點一張資料卡，再點明信片背面的格子，把它放進去。'} worried={!!miss} />
        <div className="pc-deck">{deck.filter((k) => !placed.includes(k)).map((k) => (
          <button key={k} className={`pc-card ${hold === k ? 'hold' : ''}`} onClick={() => { sfx('SE-09'); set({ ...ph, hold: k, miss: null }); }}>{spot.cards[k]}</button>
        ))}</div>
      </>}
    </div>
  </div>;
}

// 明信片：正面景點、背面四格摘要＋一句話
function Card({ spot, msg, plan, stamped = false }: { spot: Spot; msg: string; plan: string; stamped?: boolean }) {
  return <div className="pc-post">
    <div className="pc-front" style={{ background: spot.sky }}><span>{spot.icon}</span><b>{spot.name}</b><small>來自臺灣・{spot.where}</small></div>
    <div className="pc-note">
      <p className="pc-msg">{msg}</p>
      <p className="pc-plan">💡 {plan}</p>
      <div className={`pc-stamp ${stamped ? 'on' : ''}`}>{stamped ? '時空郵局' : '郵票'}</div>
    </div>
  </div>;
}
