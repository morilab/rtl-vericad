import type { Entity } from "./entities";

export type CadDocument = {
  documentId: string; // 文書識別子（モジュール名）
  entities: Entity[];
};

export function createEmptyDocument(): CadDocument {
  return {
    documentId: "top",
    entities: []
  };
}

export function getEntity(doc: CadDocument, id: string): Entity | undefined {
  return doc.entities.find((e) => e.id === id);
}

export function upsertEntity(doc: CadDocument, entity: Entity): CadDocument {
  const idx = doc.entities.findIndex((e) => e.id === entity.id);
  if (idx === -1) return { ...doc, entities: [...doc.entities, entity] };
  const next = doc.entities.slice();
  next[idx] = entity;
  return { ...doc, entities: next };
}

export function removeEntities(doc: CadDocument, ids: Set<string>): CadDocument {
  if (ids.size === 0) return doc;
  return { ...doc, entities: doc.entities.filter((e) => !ids.has(e.id)) };
}

