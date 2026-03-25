import { describe, expect, it } from "vitest";
import { applyCoordinateNormalization } from "./normalize";
import type { CadDocument } from "./document";

describe("applyCoordinateNormalization", () => {
  it("負座標を含む場合は全エンティティを平行移動して非負へ正規化", () => {
    const doc: CadDocument = {
      documentId: "top",
      entities: [
        {
          id: "m1",
          kind: "module",
          rect: { x: -5, y: -2, w: 8, h: 4 },
          moduleName: "mod",
          instanceName: "u1",
          ports: []
        },
        {
          id: "w1",
          kind: "wire",
          points: [
            { x: -3, y: -1 },
            { x: 2, y: -1 }
          ],
          interfaceName: "if",
          wireName: "sig"
        }
      ]
    };

    const normalized = applyCoordinateNormalization(doc);
    const mod = normalized.entities.find((e) => e.id === "m1" && e.kind === "module");
    const wire = normalized.entities.find((e) => e.id === "w1" && e.kind === "wire");
    expect(mod && mod.kind === "module" ? mod.rect.x : null).toBe(0);
    expect(mod && mod.kind === "module" ? mod.rect.y : null).toBe(0);
    expect(wire && wire.kind === "wire" ? wire.points[0].x : null).toBe(2);
    expect(wire && wire.kind === "wire" ? wire.points[0].y : null).toBe(1);
  });

  it("すでに非負座標のみなら変更しない", () => {
    const doc: CadDocument = {
      documentId: "top",
      entities: [
        {
          id: "w1",
          kind: "wire",
          points: [
            { x: 0, y: 0 },
            { x: 2, y: 0 }
          ],
          interfaceName: "if",
          wireName: "sig"
        }
      ]
    };
    const normalized = applyCoordinateNormalization(doc);
    expect(normalized).toBe(doc);
  });
});

