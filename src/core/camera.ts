// 鏡頭：平移與縮放的數學。純函式，畫面只照著結果擺。
//
// view.x/y 是地圖原點在螢幕上的位置，view.scale 是縮放。地圖外框（world 座標）由 boardBounds 算。

export interface View { x: number; y: number; scale: number }
export interface Rect { left: number; top: number; width: number; height: number }
export interface Size { width: number; height: number }

const PAD = 40;

// 剛好放得下整張地圖、置中
export function fitView(b: Rect, s: Size): View {
  const scale = Math.min(s.width / (b.width + PAD * 2), s.height / (b.height + PAD * 2));
  return { scale, x: s.width / 2 - (b.left + b.width / 2) * scale, y: s.height / 2 - (b.top + b.height / 2) * scale };
}

// 縮放範圍：最小是「放得下」再小一點，最大放大到 3 倍
export function scaleLimits(b: Rect, s: Size) {
  const fit = fitView(b, s).scale;
  return { min: fit * 0.9, max: fit * 3 };
}

// 以螢幕上某一點為中心縮放（雙指中點、滑鼠位置），那一點底下的地圖不動
export function zoomAt(v: View, factor: number, fx: number, fy: number, b: Rect, s: Size): View {
  const { min, max } = scaleLimits(b, s);
  const scale = Math.max(min, Math.min(max, v.scale * factor));
  const k = scale / v.scale;
  return clampView({ scale, x: fx - (fx - v.x) * k, y: fy - (fy - v.y) * k }, b, s);
}

export function panBy(v: View, dx: number, dy: number, b: Rect, s: Size): View {
  return clampView({ ...v, x: v.x + dx, y: v.y + dy }, b, s);
}

// 不讓地圖整個拖出畫面：地圖比畫面小時置中，比畫面大時邊緣最多拖到離畫面邊 PAD 的地方
export function clampView(v: View, b: Rect, s: Size): View {
  const axis = (pos: number, start: number, len: number, screen: number) => {
    const size = len * v.scale;
    const lo = screen - PAD - (start + len) * v.scale; // 地圖右（下）緣貼到畫面右（下）緣
    const hi = PAD - start * v.scale; // 地圖左（上）緣貼到畫面左（上）緣
    if (size <= screen) return screen / 2 - (start + len / 2) * v.scale;
    return Math.max(lo, Math.min(hi, pos));
  };
  return { scale: v.scale, x: axis(v.x, b.left, b.width, s.width), y: axis(v.y, b.top, b.height, s.height) };
}
