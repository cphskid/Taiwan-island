import { sfx } from '../audio';

// ⭐⭐⭐ 再挑戰：過了故事版以後，問要不要玩原本要「算一算」的進階版。跳過不影響故事。
export function ChallengeOffer({ text, onTry, onSkip }: { text: string; onTry: () => void; onSkip: () => void }) {
  return (
    <div className="talk-cover">
      <div className="panel quiz choice challenge-offer">
        <small>⭐⭐⭐ 再挑戰</small>
        <h3>{text}</h3>
        <button className="opt" onClick={() => { sfx('SE-36'); onTry(); }}>挑戰看看</button>
        <button className="opt" onClick={() => { sfx('SE-02'); onSkip(); }}>先繼續故事</button>
        <p className="choice-tip">進階版要動動腦算一算，跳過也不影響故事。</p>
      </div>
    </div>
  );
}

// 玩進階版時左上角的牌子：隨時可以回到故事
export function ChallengeTag({ onQuit }: { onQuit: () => void }) {
  return (
    <div className="challenge-tag">
      <b>⭐⭐⭐ 再挑戰</b>
      <button className="btn orange" onClick={() => { sfx('SE-02'); onQuit(); }}>回到故事</button>
    </div>
  );
}
