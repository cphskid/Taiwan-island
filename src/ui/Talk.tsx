import { useEffect, useState } from 'react';
import { PEOPLE, type Line } from '../data/babao-chapter';

const BASE = import.meta.env.BASE_URL;

// 對話框：一次一句，點一下說下一句；說完呼叫 onDone
export function Talk({ lines, onDone }: { lines: readonly Line[]; onDone: () => void }) {
  const [i, setI] = useState(0);
  const line = lines[i];
  if (!line) return null;
  const who = PEOPLE[line.who];
  const next = () => (i + 1 < lines.length ? setI(i + 1) : onDone());
  return (
    <div className="talk-cover" onClick={next}>
      <div className="talk">
        <Face who={line.who} mood={line.mood} />
        <div className="talk-body">
          <b style={{ color: who.color }}>{who.name}</b>
          <p>{line.text}</p>
          <span className="talk-next">{i + 1 < lines.length ? '點一下繼續 ▶' : '點一下開始 ▶'}</span>
        </div>
      </div>
    </div>
  );
}

export function Face({ who, mood, small }: { who: Line['who']; mood?: Line['mood']; small?: boolean }) {
  const p = PEOPLE[who];
  const src = who === 'tick' ? `img/tick/${mood ?? 'happy'}.webp` : p.img ? `img/${p.img}` : null;
  return (
    <div className={`face ${small ? 'small' : ''}`} style={{ borderColor: p.color }}>
      {src ? <img src={`${BASE}${src}`} alt="" /> : <span style={{ background: p.color }}>{p.badge}</span>}
    </div>
  );
}

// 林先生／滴答在角落說一句話：點一下縮成小頭像（不擋操作），再點一下展開；
// 新的一句話會自己展開，8 秒後自己縮起來
export function Say({ line }: { line: Line | null }) {
  const text = line?.text;
  const [small, setSmall] = useState(false);
  useEffect(() => {
    setSmall(false);
    if (!text) return;
    const t = setTimeout(() => setSmall(true), 8000);
    return () => clearTimeout(t);
  }, [text]);
  if (!line) return null;
  return (
    <button className={`say ${small ? 'mini' : ''}`} onClick={() => setSmall(!small)} aria-label={small ? '打開提示' : '收起提示'}>
      <Face who={line.who} mood={line.mood} small />
      {small ? <i className="say-dot">💬</i> : (
        <>
          <p><b style={{ color: PEOPLE[line.who].color }}>{PEOPLE[line.who].name}</b>{line.text}</p>
          <i className="say-x">✕</i>
        </>
      )}
    </button>
  );
}

// 圖鑑卡彈出來
export function CardPop({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  return (
    <div className="talk-cover" onClick={onClose}>
      <div className="card-pop">
        <small>拿到圖鑑卡</small>
        <h3>{title}</h3>
        <p>{text}</p>
        <span className="talk-next">點一下收進圖鑑 ▶</span>
      </div>
    </div>
  );
}
