# 穿越吧！島嶼開拓者

時空冒險樂園的社會科設施（國小五年級），第一章做清領時期的八堡圳。

- 測試站：https://cphskid.github.io/Taiwan-island/dev/（dev 分支，接測試庫）
- 正式站：https://cphskid.github.io/Taiwan-island/（main 分支，目前是即將開幕頁）
- 帳號、班級、老師後台都在樂園（cphskid/cphskid.github.io），這裡做學生端遊戲和一頁老師細節頁（teacher.html，樂園全班總覽點進來）。
- 資料庫：`supabase/island_pioneer.sql`（雲端存檔、全班摘要、老師細節頁），在 Supabase SQL Editor 貼上執行；`./tools/test/db.sh` 本機跑權限測試。

## 開發

```
npm install
npm run dev        # 本機模式：不接資料庫，直接玩
npm test           # 遊戲規則的單元測試
npm run build:dev  # 測試站版本（/Taiwan-island/dev/，測試庫）
```

## 資料夾

依賴只能單向：`ui → render → core`，`net` 由外面傳進來。

- `src/core/` 遊戲規則（純 TypeScript，不碰畫面和資料庫，全部有單元測試）
- `src/render/` PixiJS 畫遊戲盤，只讀狀態不做判斷
- `src/ui/` React：頂列、對話、選單、進場檢查
- `src/net/` 跟樂園與 Supabase 接線
- `src/audio/` 音效與音樂：檔名用全站統一編號放 `public/audio/`（例如 `SE-32.mp3`、`MU-10.mp3`），還沒有檔也照玩（幾個合成小聲音頂著）
- `src/data/` 章節資料（地圖、題目、知識卡），改難度和文字不用動程式
- `sw/sw.js` 把圖、聲音、程式存進裝置（Service Worker）：建置時產生 `sw-manifest.json`（每個檔案的指紋），圖換了下次打開就重新下載，不用手動維護；網址加 `?nosw=1` 可以拆掉它
- `src/perf.ts` 讀取計時：網址加 `?perf=1` 右下角顯示各階段秒數與圖從哪來（只有那一頁，不記在裝置上）
- `tools/atlas.mjs`（`npm run atlas`）把大地圖每章的人物、房子小圖打包成一章一張圖集（`public/img/island/atlas/`），進大地圖才快；**換了或新增各章大地圖上的小圖要重跑**（忘了也不會壞，建置會警告，那幾張改成單獨讀）
- `tools/make_world.py` 由 M-01 大地圖算出地區分界、高度場與地形眼鏡圖（改了 `src/data/world-*.json` 要重跑）

測試用網址：`?step=3` 直接進第五章某一步；`?world=fresh` 大地圖從頭；`?world=clear5` 假裝剛過完第五章，看撥雲動畫。
