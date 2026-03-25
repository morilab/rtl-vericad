import type { ToolId } from "../cad-core/tool";

function ToolButton(props: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={props.onClick}
      style={{
        padding: "6px 10px",
        borderRadius: 8,
        border: "1px solid #ccc",
        background: props.active ? "#0b5fff" : "#fff",
        color: props.active ? "#fff" : "#222",
        cursor: "pointer"
      }}
    >
      {props.label}
    </button>
  );
}

export function Toolbar(props: {
  tool: ToolId;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange: (tool: ToolId) => void;
  onUndo: () => void;
  onRedo: () => void;
  onFit: () => void;
  onSave: () => void;
  onLoad: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px" }}>
      <ToolButton active={props.tool === "select"} label="選択" onClick={() => props.onToolChange("select")} />
      <ToolButton active={props.tool === "pan"} label="パン" onClick={() => props.onToolChange("pan")} />
      <ToolButton active={props.tool === "wire"} label="配線" onClick={() => props.onToolChange("wire")} />
      <ToolButton
        active={props.tool === "module_create"}
        label="モジュール作成"
        onClick={() => props.onToolChange("module_create")}
      />
      <ToolButton
        active={props.tool === "module_place"}
        label="モジュール配置"
        onClick={() => props.onToolChange("module_place")}
      />
      <ToolButton active={props.tool === "text"} label="テキスト" onClick={() => props.onToolChange("text")} />
      <ToolButton active={props.tool === "delete"} label="削除" onClick={() => props.onToolChange("delete")} />

      <div style={{ width: 1, height: 20, background: "#ddd", margin: "0 6px" }} />

      <button onClick={props.onUndo} disabled={!props.canUndo}>
        Undo
      </button>
      <button onClick={props.onRedo} disabled={!props.canRedo}>
        Redo
      </button>

      <div style={{ flex: 1 }} />

      <button onClick={props.onFit}>フィット</button>
      <button onClick={props.onLoad}>読込</button>
      <button onClick={props.onSave}>保存</button>
    </div>
  );
}

