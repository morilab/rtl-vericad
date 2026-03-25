import type { ToolId } from "../cad-core/tool";

const toolLabel: Record<ToolId, string> = {
  select: "選択",
  pan: "パン",
  wire: "配線",
  module_create: "モジュール作成",
  module_place: "モジュール配置",
  text: "テキスト",
  delete: "削除"
};

export function StatusBar(props: { tool: ToolId; statusText: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 10px",
        height: 28,
        fontSize: 12,
        color: "#333"
      }}
    >
      <span>ツール: {toolLabel[props.tool]}</span>
      <span style={{ opacity: 0.6 }}>{props.statusText}</span>
    </div>
  );
}

