import { useEffect, useState } from 'react';
import { addCardEnd, goToEnd, LAST_END, loadEnd, saveEnd, type ProgressEnd, type StepEnd } from '../core/saveEnd';
import { CARD_ORDER_END, CARDS_END, STEPS_END } from '../data/chEnd';
import { Album, BOOK_END } from './Album';
import { awardStamp, pushCloud } from '../net/cloud';
import { whoAmI } from '../net/park';
import { ambience, music, sfx } from '../audio';
import { SoundToggle } from './Sound';
import { CardPop } from './Talk';
import { OpeningEnd } from './chEnd/OpeningEnd';
import { TenMajor } from './chEnd/TenMajor';
import { Rail } from './chEnd/Rail';
import { Meeting } from './chEnd/Meeting';
import { Museum } from './chEnd/Museum';
import { Traveler } from './chEnd/Traveler';
import { FinaleEnd } from './chEnd/FinaleEnd';

// 環境音：鐘塔廣場（田野風）、工地、田野、社區、博物館（山洞的回音）、鐘塔、結算
const AMB = ['SE-62', 'SE-61', 'SE-62', 'SE-62', 'SE-47', 'SE-61', null] as const;

export interface StepEndProps {
  p: ProgressEnd;
  set: (fn: (p: ProgressEnd) => ProgressEnd) => void;
  next: () => void;
  exit: () => void;
  oops: () => void; // 失誤一次（分錯類、放錯地方、路線不行、方案沒讓大家接受、時間軸排錯）
  name: string | null; // 樂園暱稱（學生登入才有），旅人揭曉時用
}

// 拿到圖鑑卡：收進存檔，新的卡一張一張跳出來，看完再做下一件事（已經有的卡不再跳）
export function NewCardsEnd({ ids, p, set, onDone }: { ids: readonly string[]; p: ProgressEnd; set: StepEndProps['set']; onDone: () => void }) {
  const [left, setLeft] = useState(() => ids.filter((c) => !p.cards.includes(c)));
  useEffect(() => { set((o) => addCardEnd(o, ...ids)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!left.length) onDone(); }, [left]); // eslint-disable-line react-hooks/exhaustive-deps
  const c = CARDS_END[left[0]];
  if (!c) return null;
  return <CardPop title={c.title} text={c.text} onClose={() => setLeft(left.slice(1))} />;
}

// 終章「今天的島嶼」：步驟 0～6，進度存在這台平板。網址加 ?chEnd=3 直接跳到某一步（測試用）。
export function ChEnd({ onExit, album }: { onExit: () => void; album: readonly string[] }) {
  const [book, setBook] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [p, setP] = useState<ProgressEnd>(() => {
    const saved = loadEnd();
    const q = new URLSearchParams(location.search).get('chEnd');
    const jump = Number(q);
    return q !== null && q !== '' && jump >= 0 && jump <= LAST_END ? goToEnd(saved, jump as StepEnd) : saved;
  });
  useEffect(() => { saveEnd(p); pushCloud('end', p); }, [p]);
  useEffect(() => { if (p.done) void awardStamp('end'); }, [p.done]);
  useEffect(() => { void whoAmI().then((w) => setName(w.kind === 'student' ? w.nickname : null)).catch(() => {}); }, []);
  useEffect(() => () => { music(null); ambience(null); }, []);
  useEffect(() => { ambience(AMB[p.step]); music(p.step === 0 ? 'MU-10' : null); }, [p.step]);

  const set = (fn: (p: ProgressEnd) => ProgressEnd) => setP((old) => fn(old));
  const next = () => setP((old) => goToEnd(old, Math.min(LAST_END, old.step + 1) as StepEnd));
  const oops = () => setP((old) => ({ ...old, mistakes: old.mistakes + 1 }));
  const have = new Set([...album, ...p.cards]);
  const props: StepEndProps = { p, set, next, exit: onExit, oops, name };

  return (
    <div className="chapter ch-end">
      <nav className="steps">
        <button className="back-map" onClick={() => { sfx('SE-02'); onExit(); }}><img src={`${import.meta.env.BASE_URL}img/island/h-map.webp`} alt="" />大地圖</button>
        {STEPS_END.map((label, i) => (
          <button
            key={label}
            className={`step ${i === p.step ? 'on' : ''} ${i <= p.reached ? 'open' : ''}`}
            disabled={i > p.reached}
            onClick={() => { sfx('SE-01'); setP((old) => goToEnd(old, i as StepEnd)); }}
          >
            <i>{i}</i>{label}
          </button>
        ))}
        <SoundToggle className="back-map" />
        <button className="back-map album-btn" onClick={() => { sfx('SE-03'); setBook(true); }}>📖 圖鑑 {CARD_ORDER_END.filter((id) => have.has(id)).length}/{CARD_ORDER_END.length}</button>
      </nav>
      <div className="stage" key={p.step}>
        {p.step === 0 && <OpeningEnd {...props} />}
        {p.step === 1 && <TenMajor {...props} />}
        {p.step === 2 && <Rail {...props} />}
        {p.step === 3 && <Meeting {...props} />}
        {p.step === 4 && <Museum {...props} />}
        {p.step === 5 && <Traveler {...props} />}
        {p.step === 6 && <FinaleEnd {...props} />}
      </div>
      {book && <Album have={[...have]} books={[BOOK_END]} onClose={() => setBook(false)} />}
    </div>
  );
}
