import { useState } from 'react';
import { CARDS, CARD_ORDER, type Card } from '../data/babao-chapter';
import { CARDS1, CARD_ORDER1 } from '../data/ch1';
import { CARDS2, CARD_ORDER2 } from '../data/ch2';
import { CARDS4, CARD_ORDER4 } from '../data/ch4';
import { CARDS6, CARD_ORDER6 } from '../data/ch6';
import { CARDS7, CARD_ORDER7 } from '../data/ch7';
import { CARDS3, CARD_ORDER3 } from '../data/ch3';

const BASE = import.meta.env.BASE_URL;
const KINDS = ['人物', '地點', '物品', '知識'] as const;

export interface Book { title: string; cards: Record<string, Card>; order: string[] }
export const BOOK1: Book = { title: '第一章 島嶼的第一道火光', cards: CARDS1, order: CARD_ORDER1 };
export const BOOK2: Book = { title: '第二章 山林與部落', cards: CARDS2, order: CARD_ORDER2 };
export const BOOK4: Book = { title: '第四章 東寧屯田', cards: CARDS4, order: CARD_ORDER4 };
export const BOOK3: Book = { title: '第三章 大航海時代', cards: CARDS3, order: CARD_ORDER3 };
export const BOOK5: Book = { title: '第五章 八堡圳', cards: CARDS, order: CARD_ORDER };
export const BOOK6: Book = { title: '第六章 開港與鐵路', cards: CARDS6, order: CARD_ORDER6 };
export const BOOK7: Book = { title: '第七章 縱貫與大圳', cards: CARDS7, order: CARD_ORDER7 };

// 時光圖鑑：拿到的卡亮起來，沒拿到的只看得到影子，提醒還有沒找到的。一章一本，上面切換
export function Album({ have, onClose, books = [BOOK5] }: { have: readonly string[]; onClose: () => void; books?: Book[] }) {
  const [open, setOpen] = useState<Card | null>(null);
  const [bi, setBi] = useState(0);
  const { cards, order, title } = books[bi] ?? books[0];
  const got = new Set(have);
  const n = order.filter((id) => got.has(id)).length;
  return (
    <div className="talk-cover album-cover" onClick={onClose}>
      <div className="album panel" onClick={(e) => e.stopPropagation()}>
        <button className="x" onClick={onClose} aria-label="關掉">✕</button>
        <h2>時光圖鑑 <small>{title}　{n} / {order.length}</small></h2>
        {books.length > 1 && (
          <div className="album-tabs">
            {books.map((b, i) => <button key={b.title} className={i === bi ? 'on' : ''} onClick={() => setBi(i)}>{b.title.split(' ')[0]}</button>)}
          </div>
        )}
        {KINDS.map((kind) => (
          <section key={kind}>
            <h3>{kind}</h3>
            <div className="album-row">
              {order.map((id) => cards[id]).filter((c) => c.kind === kind).map((c) => (
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
