import { useMemo, useReducer } from "react";
import { createEmptyDocument, type CadDocument } from "./cad-core/document";
import { executeCommand, redo, undo, type HistoryState } from "./cad-core/history";
import { BrowserHostAdapter } from "./host-adapter/browserHostAdapter";
import { Toolbar } from "./app-ui/Toolbar";
import { PropertiesPanel } from "./app-ui/PropertiesPanel";
import { StatusBar } from "./app-ui/StatusBar";
import { CadCanvas } from "./app-ui/CadCanvas";
import { applyCoordinateNormalization } from "./cad-core/normalize";
import type { ToolId } from "./cad-core/tool";

type AppState = {
  history: HistoryState<CadDocument>;
  tool: ToolId;
  selectedIds: string[];
  hoverId: string | null;
  statusText: string;
};

type Action =
  | { type: "set_tool"; tool: ToolId }
  | { type: "set_selection"; ids: string[] }
  | { type: "set_hover"; id: string | null }
  | { type: "status"; text: string }
  | { type: "exec"; cmd: import("./cad-core/command").CadCommand }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "set_document"; doc: CadDocument };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "set_tool":
      return { ...state, tool: action.tool, statusText: "" };
    case "set_selection":
      return { ...state, selectedIds: action.ids };
    case "set_hover":
      return { ...state, hoverId: action.id };
    case "status":
      return { ...state, statusText: action.text };
    case "exec":
      return { ...state, history: executeCommand(state.history, action.cmd) };
    case "undo":
      return { ...state, history: undo(state.history) };
    case "redo":
      return { ...state, history: redo(state.history) };
    case "set_document":
      return { ...state, history: { past: [], present: action.doc, future: [] }, selectedIds: [] };
  }
}

export function App() {
  const host = useMemo(() => new BrowserHostAdapter(), []);

  const [state, dispatch] = useReducer(reducer, {
    history: { past: [], present: createEmptyDocument(), future: [] },
    tool: "select",
    selectedIds: [],
    hoverId: null,
    statusText: ""
  } satisfies AppState);

  const doc = state.history.present;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 360px",
        gridTemplateRows: "48px 1fr 28px",
        height: "100vh",
        overflow: "hidden",
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'"
      }}
    >
      <div style={{ gridColumn: "1 / span 2", gridRow: 1, borderBottom: "1px solid #ddd" }}>
        <Toolbar
          tool={state.tool}
          canUndo={state.history.past.length > 0}
          canRedo={state.history.future.length > 0}
          onToolChange={(tool) => dispatch({ type: "set_tool", tool })}
          onUndo={() => dispatch({ type: "undo" })}
          onRedo={() => dispatch({ type: "redo" })}
          onFit={() => {
            const normalized = applyCoordinateNormalization(doc);
            dispatch({ type: "set_document", doc: normalized });
            dispatch({ type: "status", text: "フィット: 座標調整を適用しました" });
          }}
          onSave={async () => {
            const normalized = applyCoordinateNormalization(doc);
            const json = JSON.stringify(normalized, null, 2);
            await host.saveJson(json, `${normalized.documentId}.json`);
            dispatch({ type: "set_document", doc: normalized });
            dispatch({ type: "status", text: "保存しました（JSON）" });
          }}
          onLoad={async () => {
            const json = await host.openJson();
            if (!json) return;
            const parsed = JSON.parse(json) as CadDocument;
            dispatch({ type: "set_document", doc: parsed });
            dispatch({ type: "status", text: "読込しました（JSON）" });
          }}
        />
      </div>

      <div style={{ gridColumn: 1, gridRow: 2, position: "relative" }}>
        <CadCanvas
          document={doc}
          tool={state.tool}
          selectedIds={state.selectedIds}
          hoverId={state.hoverId}
          onHover={(id) => dispatch({ type: "set_hover", id })}
          onSelectionChange={(ids) => dispatch({ type: "set_selection", ids })}
          onExecute={(cmd) => dispatch({ type: "exec", cmd })}
          onStatus={(text) => dispatch({ type: "status", text })}
        />
      </div>

      <div style={{ gridColumn: 2, gridRow: 2, borderLeft: "1px solid #ddd", overflow: "auto" }}>
        <PropertiesPanel document={doc} selectedIds={state.selectedIds} onExecute={(cmd) => dispatch({ type: "exec", cmd })} />
      </div>

      <div style={{ gridColumn: "1 / span 2", gridRow: 3, borderTop: "1px solid #ddd" }}>
        <StatusBar tool={state.tool} statusText={state.statusText} />
      </div>
    </div>
  );
}

