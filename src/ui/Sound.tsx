import { useEffect, useState } from 'react';
import { getMode, onMode, setMode, sfx, type Mode } from '../audio';

const NEXT: Record<Mode, Mode> = { all: 'sfx', sfx: 'off', off: 'all' };
const LOOK: Record<Mode, { icon: string; text: string }> = {
  all: { icon: '🔊', text: '聲音全開' },
  sfx: { icon: '🔉', text: '只有音效' },
  off: { icon: '🔇', text: '聲音關掉' },
};

// 喇叭按鈕：全開 → 只有音效（關音樂） → 全關，記在這台平板
export function SoundToggle({ className = 'tool' }: { className?: string }) {
  const [m, setM] = useState<Mode>(getMode);
  useEffect(() => onMode(setM), []);
  const look = LOOK[m];
  return (
    <button className={`${className} sound-btn`} onClick={() => { const n = NEXT[m]; setMode(n); if (n !== 'off') sfx('SE-01'); }} aria-label={look.text} title={look.text}>
      <span className="tool-icon">{look.icon}</span>{look.text}
    </button>
  );
}
