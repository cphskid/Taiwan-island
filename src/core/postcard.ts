// 「景點明信片」的進度：寄出了哪些明信片。純函式，畫面在 ui/Postcard.tsx。
import { keyFor } from './owner';
import { SPOTS } from '../data/postcard';

export interface Sent { spot: string; plan: string; msg: string; at: string }
export interface PostSave { v: 1; intro: boolean; sent: Sent[] }
export const freshPost = (): PostSave => ({ v: 1, intro: false, sent: [] });
export const MSG_MAX = 60;

// 同一個景點再寄一次，留最新的那張
export function send(s: PostSave, x: Sent): PostSave {
  const msg = x.msg.trim().slice(0, MSG_MAX);
  return { ...s, sent: [...s.sent.filter((y) => y.spot !== x.spot), { ...x, msg }] };
}
export const postDone = (s: PostSave) => s.sent.length > 0;

const KEY = 'island.post.v1';
export function loadPost(store: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): PostSave {
  try {
    const raw = store?.getItem(keyFor(KEY));
    if (!raw) return freshPost();
    const p = JSON.parse(raw) as Partial<PostSave>;
    return p.v === 1 ? { ...freshPost(), ...p, sent: [...(p.sent ?? [])] } : freshPost();
  } catch {
    return freshPost();
  }
}
export function pickPost(local: PostSave, cloud: Partial<PostSave> | null | undefined): PostSave {
  if (!cloud || cloud.v !== 1) return local;
  const ok = new Set(SPOTS.map((x) => x.id));
  let s = local;
  for (const x of cloud.sent ?? []) {
    if (!ok.has(x.spot)) continue;
    const mine = s.sent.find((y) => y.spot === x.spot);
    if (!mine || mine.at < x.at) s = send(s, x);
  }
  return { ...s, intro: local.intro || !!cloud.intro };
}
export function savePost(s: PostSave, store: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage) {
  try { store?.setItem(keyFor(KEY), JSON.stringify(s)); } catch { /* 存不了就算了 */ }
}
