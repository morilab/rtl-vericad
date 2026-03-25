import { describe, it, expect } from "vitest";
import { executeCommand, undo, redo, type HistoryState } from "../cad-core/history";
import { createEmptyDocument, upsertEntity, type CadDocument } from "../cad-core/document";
import type { ModuleEntity } from "../cad-core/entities";

function makeHistory(): HistoryState<CadDocument> {
  return { past: [], present: createEmptyDocument(), future: [] };
}

const testModule: ModuleEntity = {
  id: "m1",
  kind: "module",
  rect: { x: 0, y: 0, w: 8, h: 6 },
  moduleName: "top",
  instanceName: "u1",
  ports: [],
};

describe("History (Undo/Redo)", () => {
  it("コマンド実行で履歴に積む", () => {
    const h = makeHistory();
    const next = executeCommand(h, {
      name: "add",
      apply: (doc) => upsertEntity(doc, testModule),
    });
    expect(next.present.entities).toHaveLength(1);
    expect(next.past).toHaveLength(1);
    expect(next.future).toHaveLength(0);
  });

  it("Undo で1つ戻る", () => {
    let h = makeHistory();
    h = executeCommand(h, {
      name: "add",
      apply: (doc) => upsertEntity(doc, testModule),
    });
    h = undo(h);
    expect(h.present.entities).toHaveLength(0);
    expect(h.past).toHaveLength(0);
    expect(h.future).toHaveLength(1);
  });

  it("Redo でやり直す", () => {
    let h = makeHistory();
    h = executeCommand(h, {
      name: "add",
      apply: (doc) => upsertEntity(doc, testModule),
    });
    h = undo(h);
    h = redo(h);
    expect(h.present.entities).toHaveLength(1);
  });

  it("空の状態で Undo しても変わらない", () => {
    const h = makeHistory();
    const next = undo(h);
    expect(next).toBe(h);
  });
});
