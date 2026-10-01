// 放在地圖上的物件（竹蛇籠等）。純函式：每次回傳新陣列，不改舊的。
//
// dir 是擋水面朝的方向，0~3 依序順時針轉 90 度：0 朝 col+1、1 朝 row+1、2 朝 col-1、3 朝 row-1。

import type { Cell } from './iso';

export type PieceKind = 'cage';
export type Dir = 0 | 1 | 2 | 3;

export interface Piece {
  id: number;
  kind: PieceKind;
  cell: Cell;
  dir: Dir;
}

export const same = (a: Cell, b: Cell) => a.col === b.col && a.row === b.row;

export function pieceAt(list: readonly Piece[], c: Cell): Piece | undefined {
  return list.find((p) => same(p.cell, c));
}

// 放一個新的；那格已經有東西就不放（回傳原陣列）
export function place(list: readonly Piece[], kind: PieceKind, cell: Cell, dir: Dir = 0): Piece[] {
  if (pieceAt(list, cell)) return [...list];
  const id = list.reduce((m, p) => Math.max(m, p.id), 0) + 1;
  return [...list, { id, kind, cell, dir }];
}

// 搬到另一格；目標格有別的東西就不動
export function move(list: readonly Piece[], id: number, cell: Cell): Piece[] {
  const other = pieceAt(list, cell);
  if (other && other.id !== id) return [...list];
  return list.map((p) => (p.id === id ? { ...p, cell } : p));
}

export function rotate(list: readonly Piece[], id: number): Piece[] {
  return list.map((p) => (p.id === id ? { ...p, dir: ((p.dir + 1) % 4) as Dir } : p));
}

export function remove(list: readonly Piece[], id: number): Piece[] {
  return list.filter((p) => p.id !== id);
}

// 每種物件最多能放幾個（八堡圳：做好 5 個竹蛇籠）
export function left(list: readonly Piece[], kind: PieceKind, total: number): number {
  return total - list.filter((p) => p.kind === kind).length;
}
