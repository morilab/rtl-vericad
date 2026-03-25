import type { Point, Rect } from "./types";

export type GridSpec = {
  pitch: number; // px per grid
};

export const defaultGrid: GridSpec = {
  pitch: 24
};

export function snapToGrid(p: Point): Point {
  // 既にgrid座標系で扱う前提。MVPでは同値返し。
  return p;
}

export function rectCorners(r: Rect): Point[] {
  return [
    { x: r.x, y: r.y },
    { x: r.x + r.w, y: r.y },
    { x: r.x + r.w, y: r.y + r.h },
    { x: r.x, y: r.y + r.h }
  ];
}

