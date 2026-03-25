export type GridCoord = number;

export type Point = {
  x: GridCoord;
  y: GridCoord;
};

export type Rect = {
  x: GridCoord;
  y: GridCoord;
  w: GridCoord;
  h: GridCoord;
};

export type Anchor9 =
  | "tl"
  | "tc"
  | "tr"
  | "cl"
  | "cc"
  | "cr"
  | "bl"
  | "bc"
  | "br";

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

