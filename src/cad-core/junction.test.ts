import { describe, expect, it } from "vitest";
import type { CadDocument } from "./document";
import { computeJunctions, isBlockedByConnectedJunction } from "./junction";

function docWithWires(wires: Array<{ id: string; name: string; points: Array<{ x: number; y: number }> }>): CadDocument {
  return {
    documentId: "top",
    entities: wires.map((w) => ({
      id: w.id,
      kind: "wire" as const,
      points: w.points,
      interfaceName: "if",
      wireName: w.name
    }))
  };
}

describe("computeJunctions", () => {
  it("同一ワイヤ名の水平/垂直交差は結線扱い", () => {
    const doc = docWithWires([
      { id: "w1", name: "sigA", points: [{ x: 0, y: 2 }, { x: 6, y: 2 }] },
      { id: "w2", name: "sigA", points: [{ x: 3, y: 0 }, { x: 3, y: 5 }] }
    ]);
    const junctions = computeJunctions(doc);
    expect(junctions.get("3,2")?.connected).toBe(true);
    expect(isBlockedByConnectedJunction(junctions, { x: 3, y: 2 })).toBe(true);
  });

  it("異なるワイヤ名の交差は非結線", () => {
    const doc = docWithWires([
      { id: "w1", name: "sigA", points: [{ x: 0, y: 2 }, { x: 6, y: 2 }] },
      { id: "w2", name: "sigB", points: [{ x: 3, y: 0 }, { x: 3, y: 5 }] }
    ]);
    const junctions = computeJunctions(doc);
    expect(junctions.get("3,2")?.connected).toBe(false);
    expect(isBlockedByConnectedJunction(junctions, { x: 3, y: 2 })).toBe(false);
  });

  it("同一点に同名と異名が混在した場合は非結線を優先", () => {
    const doc = docWithWires([
      { id: "h", name: "sigA", points: [{ x: 0, y: 2 }, { x: 6, y: 2 }] },
      { id: "v1", name: "sigA", points: [{ x: 3, y: 0 }, { x: 3, y: 5 }] },
      { id: "v2", name: "sigB", points: [{ x: 3, y: 1 }, { x: 3, y: 4 }] }
    ]);
    const junctions = computeJunctions(doc);
    expect(junctions.get("3,2")?.connected).toBe(false);
  });
});

