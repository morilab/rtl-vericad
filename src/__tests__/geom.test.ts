import { describe, it, expect } from "vitest";
import { pointInRect, rectCenter, rectBoundsOfPoints } from "../cad-core/geom";

describe("幾何計算", () => {
  it("pointInRect: 内側", () => {
    expect(pointInRect({ x: 2, y: 3 }, { x: 0, y: 0, w: 5, h: 5 })).toBe(true);
  });

  it("pointInRect: 外側", () => {
    expect(pointInRect({ x: 6, y: 3 }, { x: 0, y: 0, w: 5, h: 5 })).toBe(false);
  });

  it("rectCenter", () => {
    const c = rectCenter({ x: 2, y: 4, w: 6, h: 8 });
    expect(c).toEqual({ x: 5, y: 8 });
  });

  it("rectBoundsOfPoints: 空配列", () => {
    const r = rectBoundsOfPoints([]);
    expect(r).toEqual({ x: 0, y: 0, w: 0, h: 0 });
  });

  it("rectBoundsOfPoints: 複数点", () => {
    const r = rectBoundsOfPoints([{ x: 1, y: 2 }, { x: 5, y: 8 }, { x: -1, y: 0 }]);
    expect(r).toEqual({ x: -1, y: 0, w: 6, h: 8 });
  });
});
