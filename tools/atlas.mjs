// 把大地圖每一章的人物、房子、動物小圖打包成一張圖集（public/img/island/atlas/）。
// 兩百多張小圖變成一章一張，大地圖讀得快很多。
//
// 用法：npm run atlas（要有 python3 和 Pillow）
// 新增或換掉某章的圖以後要重跑一次。忘了跑也不會壞：建置時會檢查（vite.config.ts 的 atlas），
// 圖集裡跟原圖不一樣、或清單裡新加的圖，大地圖會照舊一張一張讀，只是慢一點。
import { createServer } from 'vite';
import { spawnSync } from 'node:child_process';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { LIFE } = await vite.ssrLoadModule('/src/data/world.ts');
const { lifeNames } = await vite.ssrLoadModule('/src/data/life-names.ts');
await vite.close();

const groups = Object.fromEntries(Object.entries(LIFE).filter(([, L]) => L).map(([id, L]) => [id, lifeNames(L)]));
const r = spawnSync('python3', ['tools/atlas.py'], { input: JSON.stringify(groups), stdio: ['pipe', 'inherit', 'inherit'] });
process.exit(r.status ?? 1);
