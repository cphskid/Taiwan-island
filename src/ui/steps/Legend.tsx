// 地形眼鏡的圖例
export function Legend() {
  return (
    <div className="legend">
      <span>低</span>
      {[0, 1, 2, 3, 4, 5].map((l) => <i key={l} className={`band b${l}`} />)}
      <span>高</span>
      <em>同一條線一樣高；線越密，坡越陡</em>
    </div>
  );
}
