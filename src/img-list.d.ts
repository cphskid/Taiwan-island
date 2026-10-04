// vite.config.ts 的 img-list 外掛：public/img 底下所有圖的路徑（'img/story/K-01.webp'…）
declare module 'virtual:img-list' {
  const list: string[];
  export default list;
}

// vite.config.ts 的 atlas 外掛：大地圖每章的圖集，每張小圖在圖集裡的 [x, y, 寬, 高, md5]（只留跟原圖一樣的）
declare module 'virtual:atlas' {
  const atlas: Record<string, { file: string; frames: Record<string, [number, number, number, number, string]> }[]>;
  export default atlas;
}
