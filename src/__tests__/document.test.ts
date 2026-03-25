import { describe, it, expect } from "vitest";
import { createEmptyDocument, upsertEntity, removeEntities, getEntity } from "../cad-core/document";
import type { ModuleEntity, WireEntity } from "../cad-core/entities";

describe("CadDocument", () => {
  it("空ドキュメントを作成する", () => {
    const doc = createEmptyDocument();
    expect(doc.documentId).toBe("top");
    expect(doc.entities).toHaveLength(0);
  });

  it("エンティティを追加する", () => {
    const doc = createEmptyDocument();
    const m: ModuleEntity = {
      id: "m1",
      kind: "module",
      rect: { x: 0, y: 0, w: 8, h: 6 },
      moduleName: "alu",
      instanceName: "u1",
      ports: [],
    };
    const next = upsertEntity(doc, m);
    expect(next.entities).toHaveLength(1);
    expect(getEntity(next, "m1")?.kind).toBe("module");
  });

  it("同じIDのエンティティを更新する", () => {
    let doc = createEmptyDocument();
    const m: ModuleEntity = {
      id: "m1",
      kind: "module",
      rect: { x: 0, y: 0, w: 8, h: 6 },
      moduleName: "alu",
      instanceName: "u1",
      ports: [],
    };
    doc = upsertEntity(doc, m);
    doc = upsertEntity(doc, { ...m, instanceName: "u2" });
    expect(doc.entities).toHaveLength(1);
    expect((getEntity(doc, "m1") as ModuleEntity).instanceName).toBe("u2");
  });

  it("エンティティを削除する", () => {
    let doc = createEmptyDocument();
    const w: WireEntity = {
      id: "w1",
      kind: "wire",
      points: [{ x: 0, y: 0 }, { x: 5, y: 0 }],
      interfaceName: "if",
      wireName: "clk",
    };
    doc = upsertEntity(doc, w);
    doc = removeEntities(doc, new Set(["w1"]));
    expect(doc.entities).toHaveLength(0);
  });
});
