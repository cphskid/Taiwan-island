import { useState } from 'react';
import { CARDS, CARD_ORDER, type Card } from '../data/babao-chapter';

const BASE = import.meta.env.BASE_URL;
const KINDS = ['人物', '地點', '物品', '知識'] as const;

// 時光圖鑑：拿到的卡亮起來，沒拿到的只看得到影子，提醒還有沒找到的
export function Album({ have, onClose }: { have: readonly string[]; onClose: () => void }) {
  const [open, setOpen] = useState<Card | null>(null);
  const got = new Set(have);
  const n = CARD_ORDER.filter((id) => got.has(id)).length;
  return (
    <div className="talk-cover album-cover" onClick={onClose}>
      <div className="album panel" onClick={(e) => e.stopPropagation()}>
        <button className="x" onClick={onClose} aria-label="關掉">✕</button>
        <h2>時光圖鑑 <small>第五章 八堡圳　{n} / {CARD_ORDER.length}</small></h2>
        {KINDS.map((kind) => (
          <section key={kind}>
            <h3>{kind}</h3>
            <div className="album-row">
              {CARD_ORDER.map((id) => CARDS[id]).filter((c) => c.kind === kind).map((c) => (
                got.has(c.id)
                  ? <button key={c.id} className="album-card" onClick={() => setOpen(c)}><Pic card={c} /><b>{c.title}</b></button>
                  : <div key={c.id} className="album-card shadow"><span className="pic">？</span><b>還沒找到</b></div>
              ))}
            </div>
          </section>
        ))}
        {open && (
          <div className="album-detail" onClick={() => setOpen(null)}>
            <div className="card-pop">
              <small>{open.kind}</small>
              <Pic card={open} big />
              <h3>{open.title}</h3>
              <p>{open.text}</p>
              <p className="source">資料來源：{open.source}</p>
              <span className="talk-next">點一下收起來 ▶</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Pic({ card, big }: { card: Card; big?: boolean }) {
  return card.img
    ? <img className={`pic ${big ? 'big' : ''}`} src={`${BASE}img/${card.img}`} alt="" />
    : <span className={`pic word ${big ? 'big' : ''}`}>{card.title.slice(0, 2)}</span>;
}
