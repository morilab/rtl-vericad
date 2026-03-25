import type { CadDocument } from "./document";

export type CadCommand = {
  name: string;
  apply: (doc: CadDocument) => CadDocument;
};

