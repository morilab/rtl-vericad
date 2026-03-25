import type { CadDocument } from "./document";
import type { Entity } from "./entities";
import { rectCorners } from "./grid";
import type { Point } from "./types";

function collectGridPoints(entity: Entity): Point[] {
  switch (entity.kind) {
    case "module":
      return rectCorners(entity.rect);
    case "wire":
      return entity.points;
    case "text":
      // MVP: テキストは9点アンカーのいずれかがオングリッド、最小実装では rect 左下のみ採用
      return [{ x: entity.rect.x, y: entity.rect.y }];
    case "terminalIcon":
      return [entity.at];
  }
}

export function applyCoordinateNormalization(doc: CadDocument): CadDocument {
  let minX = 0;
  let minY = 0;
  let first = true;

  for (const e of doc.entities) {
    for (const p of collectGridPoints(e)) {
      if (first) {
        minX = p.x;
        minY = p.y;
        first = false;
      } else {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
      }
    }
  }

  const dx = minX < 0 ? -minX : 0;
  const dy = minY < 0 ? -minY : 0;
  if (dx === 0 && dy === 0) return doc;

  return {
    ...doc,
    entities: doc.entities.map((e) => {
      switch (e.kind) {
        case "module":
          return { ...e, rect: { ...e.rect, x: e.rect.x + dx, y: e.rect.y + dy } };
        case "wire":
          return { ...e, points: e.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
        case "text":
          return { ...e, rect: { ...e.rect, x: e.rect.x + dx, y: e.rect.y + dy } };
        case "terminalIcon":
          return { ...e, at: { x: e.at.x + dx, y: e.at.y + dy } };
      }
    })
  };
}

