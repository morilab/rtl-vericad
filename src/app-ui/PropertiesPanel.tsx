import type { CadCommand } from "../cad-core/command";
import type { CadDocument } from "../cad-core/document";
import { getEntity, upsertEntity } from "../cad-core/document";
import type { ModuleEntity, WireEntity } from "../cad-core/entities";

function Field(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8, alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "#555" }}>{props.label}</span>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        style={{ padding: "6px 8px", border: "1px solid #ccc", borderRadius: 8 }}
      />
    </label>
  );
}

export function PropertiesPanel(props: {
  document: CadDocument;
  selectedIds: string[];
  onExecute: (cmd: CadCommand) => void;
}) {
  const selected = props.selectedIds.length === 1 ? getEntity(props.document, props.selectedIds[0]) : undefined;

  if (!selected) {
    return (
      <div style={{ padding: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>プロパティ</div>
        <div style={{ color: "#666", fontSize: 12 }}>単一選択で編集できます。</div>
      </div>
    );
  }

  if (selected.kind === "module") {
    const m = selected as ModuleEntity;
    return (
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontWeight: 700 }}>モジュール</div>
        <Field
          label="モジュール名"
          value={m.moduleName}
          onChange={(v) =>
            props.onExecute({
              name: "update_module_name",
              apply: (doc) => upsertEntity(doc, { ...m, moduleName: v })
            })
          }
        />
        <Field
          label="インスタンス名"
          value={m.instanceName}
          onChange={(v) =>
            props.onExecute({
              name: "update_instance_name",
              apply: (doc) => upsertEntity(doc, { ...m, instanceName: v })
            })
          }
        />
      </div>
    );
  }

  if (selected.kind === "wire") {
    const w = selected as WireEntity;
    return (
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontWeight: 700 }}>配線</div>
        <Field
          label="インターフェース名"
          value={w.interfaceName}
          onChange={(v) =>
            props.onExecute({
              name: "update_ifname",
              apply: (doc) => upsertEntity(doc, { ...w, interfaceName: v })
            })
          }
        />
        <Field
          label="ワイヤ名"
          value={w.wireName}
          onChange={(v) =>
            props.onExecute({
              name: "update_wire_name",
              apply: (doc) => upsertEntity(doc, { ...w, wireName: v })
            })
          }
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>プロパティ</div>
      <div style={{ color: "#666", fontSize: 12 }}>このエンティティの編集は未対応です。</div>
    </div>
  );
}

