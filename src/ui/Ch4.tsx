import { useEffect, useState } from 'react';
import { addCard4, goTo4, LAST4, load4, save4, type Progress4, type Step4 } from '../core/save4';
import { CARD_ORDER4, CARDS4, STEPS4 } from '../data/ch4';
import { Album, BOOK4 } from './Album';
import { awardStamp, pushCloud } from '../net/cloud';
import { ambience, music, sfx } from '../audio';
import { SoundToggle } from './Sound';
import { CardPop } from './Talk';
import { Opening4 } from './ch4/Opening4';
import { Camps } from './ch4/Camps';
import { Pond } from './ch4/Pond';
import { Salt } from './ch4/Salt';
import { School } from './ch4/School';
import { Future } from './ch4/Future';
import { Finale4 } from './ch4/Finale4';

// 環境音：乾熱的平原、平原、乾季的田、海邊、府城、田野
const AMB = ['SE-75', 'SE-61', 'SE-75', 'SE-106', 'SE-61', 'SE-61', null] as const;

export interface Step4Props {
  p: Progress4;
  set: (fn: (p: Progress4) => Progress4) => void;
  next: () => void;
  exit: () => void;
  oops: () => void; // 失誤一次（營盤放錯、埤乾掉、鹽不夠、建築放錯、糧倉空掉）
}

// 拿到圖鑑卡：收進存檔，新的卡一張一張跳出來，看完再做下一件事（已經有的卡不再跳）
export function NewCards({ ids, p, set, onDone }: { ids: readonly string[]; p: Progress4; set: Step4Props['set']; onDone: () => void }) {
  const [left, setLeft] = useState(() => ids.filter((c) => !p.cards.includes(c)));
  useEffect(() => { set((o) => addCard4(o, ...ids)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!left.length) onDone(); }, [left]); // eslint-disable-line react-hooks/exhaustive-deps
  const c = CARDS4[left[0]];
  if (!c) return null;
  return <CardPop title={c.title} text={c.text} onClose={() => setLeft(left.slice(1))} />;
}

// 第四章「東寧屯田」：步驟 0～6，進度存在這台平板。網址加 ?ch4=3 直接跳到某一步（測試用）。
export function Ch4({ onExit, album }: { onExit: () => void; album: readonly string[] }) {
  const [book, setBook] = useState(false);
  const [p, setP] = useState<Progress4>(() => {
    const saved = load4();
    const q = new URLSearchParams(location.search).get('ch4');
    const jump = Number(q);
    return q !== null && q !== '' && jump >= 0 && jump <= LAST4 ? goTo4(saved, jump as Step4) : saved;
  });
  useEffect(() => { save4(p); pushCloud('ch4', p); }, [p]);
  useEffect(() => { if (p.done) void awardStamp('ch4'); }, [p.done]);
  useEffect(() => () => { music(null); ambience(null); }, []);
  // 開場放這一章的主題曲，進關卡就只留環境音
  useEffect(() => { ambience(AMB[p.step]); music(p.step === 0 ? 'MU-34' : null); }, [p.step]);

  const set = (fn: (p: Progress4) => Progress4) => setP((old) => fn(old));
  const next = () => setP((old) => goTo4(old, Math.min(LAST4, old.step + 1) as Step4));
  const oops = () => setP((old) => ({ ...old, mistakes: old.mistakes + 1 }));
  const have = new Set([...album, ...p.cards]);
  const props: Step4Props = { p, set, next, exit: onExit, oops };

  return (
    <div className="chapter ch4">
      <nav className="steps">
        <button className="back-map" onClick={() => { sfx('SE-02'); onExit(); }}><img src={`${import.meta.env.BASE_URL}img/island/h-map.webp`} alt="" />大地圖</button>
        {STEPS4.map((name, i) => (
          <button
            key={name}
            className={`step ${i === p.step ? 'on' : ''} ${i <= p.reached ? 'open' : ''}`}
            disabled={i > p.reached}
            onClick={() => { sfx('SE-01'); setP((old) => goTo4(old, i as Step4)); }}
          >
            <i>{i}</i>{name}
          </button>
        ))}
        <SoundToggle className="back-map" />
        <button className="back-map album-btn" onClick={() => { sfx('SE-03'); setBook(true); }}>📖 圖鑑 {CARD_ORDER4.filter((id) => have.has(id)).length}/{CARD_ORDER4.length}</button>
      </nav>
      <div className="stage" key={p.step}>
        {p.step === 0 && <Opening4 {...props} />}
        {p.step === 1 && <Camps {...props} />}
        {p.step === 2 && <Pond {...props} />}
        {p.step === 3 && <Salt {...props} />}
        {p.step === 4 && <School {...props} />}
        {p.step === 5 && <Future {...props} />}
        {p.step === 6 && <Finale4 {...props} />}
      </div>
      {book && <Album have={[...have]} books={[BOOK4]} onClose={() => setBook(false)} />}
    </div>
  );
}
