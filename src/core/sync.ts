// 本機存檔和雲端存檔要用哪一份。純函式。
//
// 換平板、清掉瀏覽器資料時，雲端那份比較完整；同一台平板一直玩，本機那份比較新。
// 不比時間（平板時鐘常常不準），比「誰玩得比較遠」：一樣遠就用本機的。

import { migrate, type Progress } from './save';
import { freshWorld, type WorldSave } from './world';

const union = (a: readonly string[], b: readonly string[]) => [...a, ...b.filter((x) => !a.includes(x))];

export function pickProgress(local: Progress, cloud: Partial<Progress> | null | undefined): Progress {
  if (!cloud || cloud.v !== 1) return local;
  const c: Progress = migrate({ ...cloud, v: 1 });
  const score = (p: Progress) => (p.done ? 100 : 0) + p.reached * 10 + p.level;
  const best = score(c) > score(local) ? c : local;
  // 拿過的卡、最好的星星不會因為選了另一份而不見
  const other = best === c ? local : c;
  return {
    ...best,
    cards: union(best.cards, other.cards),
    friends: union(best.friends, other.friends),
    keepsakes: union(best.keepsakes, other.keepsakes),
    stars: Math.max(local.stars, c.stars),
  };
}

export function mergeWorld(local: WorldSave, cloud: Partial<WorldSave> | null | undefined): WorldSave {
  if (!cloud || cloud.v !== 1) return local;
  const c = { ...freshWorld(), ...cloud };
  return {
    v: 1,
    cleared: union(local.cleared, c.cleared ?? []),
    celebrated: union(local.celebrated, c.celebrated ?? []),
    greeted: local.greeted || !!c.greeted,
    cards: union(local.cards, c.cards ?? []),
  };
}
