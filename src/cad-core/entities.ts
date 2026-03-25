import type { Anchor9, Point, Rect } from "./types";

export type EntityBase = {
  id: string;
  kind: "module" | "wire" | "text" | "terminalIcon";
};

export type ModuleEntity = EntityBase & {
  kind: "module";
  rect: Rect; // 幅固定・高さ可変。x,y は左下
  moduleName: string;
  instanceName: string;
  ports: Port[];
};

export type PortSide = "left" | "right";

export type Port = {
  id: string;
  side: PortSide;
  y: number; // module local y offset (grid)
  name: string;
  iconKey: string; // SVG 表示の種類（表示のみ）
};

export type WireEntity = EntityBase & {
  kind: "wire";
  points: Point[]; // 直交ポリライン（重複点なし、全点オングリッド）
  interfaceName: string;
  wireName: string;
};

export type TextEntity = EntityBase & {
  kind: "text";
  rect: Rect; // テキストボックス（x,y は左下）
  text: string;
  allowNewline: boolean; // コメントのみ true
  anchor: Anchor9; // 9点アンカーのどれが基準か
};

export type TerminalIconEntity = EntityBase & {
  kind: "terminalIcon";
  at: Point; // SVG中心（表示のみ）
  portRef: { moduleId: string; portId: string };
};

export type Entity = ModuleEntity | WireEntity | TextEntity | TerminalIconEntity;

