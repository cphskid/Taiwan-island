import { useEffect, useState } from 'react';
import { goTo1, LAST1, load1, save1, type Progress1, type Step1 } from '../core/save1';
import { CARD_ORDER1, STEPS1 } from '../data/ch1';
import { Album, BOOK1 } from './Album';
import { awardStamp, pushCloud } from '../net/cloud';
import { ambience, music, sfx } from '../audio';
import { SoundToggle } from './Sound';
import { ReportButton } from './Report';
import { Opening1 } from './ch1/Opening1';
import { Knap } from './ch1/Knap';
import { Pottery } from './ch1/Pottery';
import { Grind } from './ch1/Grind';
import { Iron } from './ch1/Iron';
import { Dig } from './ch1/Dig';
import { Finale1 } from './ch1/Finale1';

// 環境音：夜晚海邊山洞、山洞、野燒柴火，之後照原本的溪邊、森林、考古工地
const AMB = ['SE-47', 'SE-47', 'SE-44', 'SE-61', 'SE-62', 'SE-61', null] as const;

export interface Step1Props {
  p: Progress1;
  set: (fn: (p: Progress1) => Progress1) => void;
  next: () => void;
  exit: () => void;
  oops: () => void; // 失誤一次（敲壞、燒裂、磨過頭、土石流）
}

// 第一章「島嶼的第一道火光」：步驟 0～6，進度存在這台平板。網址加 ?ch1=3 直接跳到某一步（測試用）。
export function Ch1({ onExit, album }: { onExit: () => void; album: readonly string[] }) {
  const [book, setBook] = useState(false);
  const [p, setP] = useState<Progress1>(() => {
    const saved = load1();
    const q = new URLSearchParams(location.search).get('ch1');
    const jump = Number(q);
    return q !== null && q !== '' && jump >= 0 && jump <= LAST1 ? goTo1(saved, jump as Step1) : saved;
  });
  useEffect(() => { save1(p); pushCloud('ch1', p); }, [p]);
  useEffect(() => { if (p.done) void awardStamp('ch1'); }, [p.done]);
  useEffect(() => () => { music(null); ambience(null); }, []);
  // 開場放史前探索曲，進關卡就只留環境音
  useEffect(() => { ambience(AMB[p.step]); music(p.step === 0 ? 'MU-18' : null); }, [p.step]);

  const set = (fn: (p: Progress1) => Progress1) => setP((old) => fn(old));
  const next = () => setP((old) => goTo1(old, Math.min(LAST1, old.step + 1) as Step1));
  const oops = () => setP((old) => ({ ...old, mistakes: old.mistakes + 1 }));
  const have = new Set([...album, ...p.cards]);
  const props: Step1Props = { p, set, next, exit: onExit, oops };

  return (
    <div className="chapter ch1">
      <nav className="steps">
        <button className="back-map" onClick={() => { sfx('SE-02'); onExit(); }}><img src={`${import.meta.env.BASE_URL}img/island/h-map.webp`} alt="" />大地圖</button>
        {STEPS1.map((name, i) => (
          <button
            key={name}
            className={`step ${i === p.step ? 'on' : ''} ${i <= p.reached ? 'open' : ''}`}
            disabled={i > p.reached}
            onClick={() => { sfx('SE-01'); setP((old) => goTo1(old, i as Step1)); }}
          >
            <i>{i}</i>{name}
          </button>
        ))}
        <SoundToggle className="back-map" />
        <ReportButton screen={`ch1-${p.step}`} />
        <button className="back-map album-btn" onClick={() => { sfx('SE-03'); setBook(true); }}>📖 圖鑑 {CARD_ORDER1.filter((id) => have.has(id)).length}/{CARD_ORDER1.length}</button>
      </nav>
      <div className="stage" key={p.step}>
        {p.step === 0 && <Opening1 {...props} />}
        {p.step === 1 && <Knap {...props} />}
        {p.step === 2 && <Pottery {...props} />}
        {p.step === 3 && <Grind {...props} />}
        {p.step === 4 && <Iron {...props} />}
        {p.step === 5 && <Dig {...props} />}
        {p.step === 6 && <Finale1 {...props} />}
      </div>
      {book && <Album have={[...have]} books={[BOOK1]} onClose={() => setBook(false)} />}
    </div>
  );
}
