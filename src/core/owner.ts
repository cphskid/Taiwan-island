// 這台平板現在是誰在玩。教室的平板常常輪流用，所以本機存檔要分人放：
// 鑰匙後面接學生編號（本機模式沒有登入，就用原本的鑰匙）。

let owner = '';

export function setSaveOwner(id: string | null) {
  owner = id ? `:${id}` : '';
}

export const keyFor = (base: string) => `${base}${owner}`;
