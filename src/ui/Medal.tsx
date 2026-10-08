import { useState } from 'react';
import { addMedal, chapterMedalCodes, endingKey, loadMedals, saveMedals, type MedalCh, type Medals } from '../core/medals';
import { awardStamp, flushNow, pushCloud } from '../net/cloud';
import { sfx } from '../audio';

// 成就勳章（core/medals.ts）：做到了先記在本機和雲端，再請樂園蓋上去；這次才蓋上的跳一個小通知。

function note(field: 'endings' | 'chal' | 'eggs', id: string): Medals {
  const m = addMedal(loadMedals(), field, id);
  saveMedals(m);
  pushCloud('medals', m);
  return m;
}

// 畫面右上角滑出來的小通知（不擋遊戲，幾秒後自己消失）
function toast(title: string, sub: string) {
  if (typeof document === 'undefined') return;
  const el = document.createElement('div');
  el.className = 'medal-toast';
  el.setAttribute('role', 'status');
  el.innerHTML = '<i>🏅</i><span><b></b><small></small></span>';
  el.querySelector('b')!.textContent = title;
  el.querySelector('small')!.textContent = sub;
  document.body.appendChild(el);
  sfx('SE-34');
  setTimeout(() => el.classList.add('out'), 3800);
  setTimeout(() => el.remove(), 4400);
}

// 試著蓋這幾個勳章；新蓋上的（通關章除外，過關畫面已經很熱鬧了）跳通知
async function celebrate(codes: readonly string[], skip: readonly string[] = []) {
  await flushNow();
  for (const code of codes) {
    const r = await awardStamp(code);
    if (r?.ok && r.new && !skip.includes(code)) toast(`獲得勳章「${r.name ?? ''}」`, '回樂園打開護照看看，還能掛成代表勳章');
  }
}

// 一章過關：記下這次的結局，再試著蓋這章的勳章（通關、收集、精通、劇情、篇章）
export function chapterDone(ch: MedalCh, picks?: Readonly<Record<string, number | undefined>>) {
  const key = endingKey(ch, picks);
  if (key) note('endings', key);
  void celebrate(chapterMedalCodes(ch), [ch]);
}

// ⭐⭐⭐ 再挑戰過關（id 照 core/medals.ts 的 CHALLENGES，例如 'ch2:hunt'）
export function challengeDone(id: string) {
  note('chal', id);
  const ch = id.split(':')[0] as MedalCh;
  void celebrate([`${ch}-star`]);
}

// 每章藏著一塊時光碎片：在對的那一步、對的角落點它就是彩蛋勳章。找過的就不再出現。
export function Egg({ ch, x, y }: { ch: MedalCh; x: string; y: string }) {
  const [gone, setGone] = useState(() => loadMedals().eggs.includes(ch));
  const [pop, setPop] = useState(false);
  if (gone) return null;
  const find = () => {
    if (pop) return;
    sfx('SE-36');
    setPop(true);
    note('eggs', ch);
    setTimeout(() => setGone(true), 900);
    void celebrate([`${ch}-egg`], [`${ch}-egg`]);
    toast('找到時光碎片了！', '這是藏起來的彩蛋勳章');
  };
  return (
    <button className={`time-shard${pop ? ' pop' : ''}`} style={{ left: x, top: y }} onClick={find} aria-label="閃閃發亮的東西">
      <img src={`${import.meta.env.BASE_URL}img/island/time-shard.webp`} alt="" />
    </button>
  );
}
