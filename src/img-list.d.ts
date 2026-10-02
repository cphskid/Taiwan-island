// vite.config.ts 的 img-list 外掛：public/img 底下所有圖的路徑（'img/story/K-01.webp'…）
declare module 'virtual:img-list' {
  const list: string[];
  export default list;
}
