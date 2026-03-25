import { useEffect, useMemo, useRef, useState } from "react";
import type { CadCommand } from "../cad-core/command";
import type { CadDocument } from "../cad-core/document";
import { removeEntities, upsertEntity } from "../cad-core/document";
import type { Entity, ModuleEntity, WireEntity } from "../cad-core/entities";
import { createId } from "../cad-core/id";
import type { ToolId } from "../cad-core/tool";
import type { Point, Rect } from "../cad-core/types";
import { defaultGrid, rectCorners } from "../cad-core/grid";
import { pointInRect } from "../cad-core/geom";

type ViewState = {
  panPx: { x: number; y: number };
  zoom: number;
};

type WireDraft = {
  points: Point[]; // 確定済み点（最低1点）
  cursor: Point; // プレビュー用（最終点から直交に投影済み）
};

const colors = {
  bg: "#ffffff",
  grid: "#e6e6e6",
  moduleStroke: "#0066ff",
  moduleName: "#003a8c",
  instanceName: "#6a1bb8",
  portName: "#003a8c",
  wireStroke: "#0b6b3a",
  junction: "#0b6b3a"
};

function worldToScreen(p: Point, view: ViewState): { x: number; y: number } {
  // 原点は左下、画面は左上。Y反転。
  return {
    x: p.x * defaultGrid.pitch * view.zoom + view.panPx.x,
    y: -p.y * defaultGrid.pitch * view.zoom + view.panPx.y
  };
}

function screenToWorldGrid(px: { x: number; y: number }, view: ViewState): Point {
  const gx = (px.x - view.panPx.x) / (defaultGrid.pitch * view.zoom);
  const gy = -(px.y - view.panPx.y) / (defaultGrid.pitch * view.zoom);
  return { x: Math.round(gx), y: Math.round(gy) };
}

function rectForModuleAt(origin: Point, width: number, height: number): Rect {
  return { x: origin.x, y: origin.y, w: width, h: height };
}

function moduleHitTest(entity: ModuleEntity, p: Point): boolean {
  return pointInRect(p, entity.rect);
}

function entityHitTest(entity: Entity, p: Point): boolean {
  switch (entity.kind) {
    case "module":
      return moduleHitTest(entity, p);
    case "wire": {
      // MVP: 点に近い線分のみヒット
      const tol = 0.25;
      for (let i = 0; i < entity.points.length - 1; i++) {
        const a = entity.points[i];
        const b = entity.points[i + 1];
        if (a.x === b.x) {
          if (Math.abs(p.x - a.x) <= tol && p.y >= Math.min(a.y, b.y) - tol && p.y <= Math.max(a.y, b.y) + tol)
            return true;
        } else if (a.y === b.y) {
          if (Math.abs(p.y - a.y) <= tol && p.x >= Math.min(a.x, b.x) - tol && p.x <= Math.max(a.x, b.x) + tol)
            return true;
        }
      }
      return false;
    }
    case "text":
      return pointInRect(p, entity.rect);
    case "terminalIcon":
      return Math.abs(p.x - entity.at.x) <= 0.5 && Math.abs(p.y - entity.at.y) <= 0.5;
  }
}

function pickEntity(doc: CadDocument, p: Point): Entity | null {
  // 上側レイヤを優先（操作表示は別）。MVP: entities順を描画順として後勝ち
  for (let i = doc.entities.length - 1; i >= 0; i--) {
    const e = doc.entities[i]!;
    if (entityHitTest(e, p)) return e;
  }
  return null;
}

function drawGrid(ctx: CanvasRenderingContext2D, view: ViewState, size: { w: number; h: number }) {
  const pitch = defaultGrid.pitch * view.zoom;
  if (pitch < 6) return;

  const left = -view.panPx.x / pitch;
  const top = view.panPx.y / pitch;
  const right = left + size.w / pitch;
  const bottom = top - size.h / pitch;

  const minX = Math.floor(left) - 1;
  const maxX = Math.ceil(right) + 1;
  const minY = Math.floor(bottom) - 1;
  const maxY = Math.ceil(top) + 1;

  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = minX; x <= maxX; x++) {
    const sx = x * pitch + view.panPx.x;
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, size.h);
  }
  for (let y = minY; y <= maxY; y++) {
    const sy = -y * pitch + view.panPx.y;
    ctx.moveTo(0, sy);
    ctx.lineTo(size.w, sy);
  }
  ctx.stroke();
}

function getWireSegments(w: WireEntity): Array<{ a: Point; b: Point }> {
  const segs: Array<{ a: Point; b: Point }> = [];
  for (let i = 0; i < w.points.length - 1; i++) segs.push({ a: w.points[i]!, b: w.points[i + 1]! });
  return segs;
}

function computeJunctions(doc: CadDocument): Map<string, { wireName: string; connected: boolean }> {
  // 交差点(水平×垂直)で wireName 同一なら結線（●）
  const wires = doc.entities.filter((e): e is WireEntity => e.kind === "wire");
  const byWire = wires.map((w) => ({ w, segs: getWireSegments(w) }));

  const result = new Map<string, { wireName: string; connected: boolean }>();
  for (let i = 0; i < byWire.length; i++) {
    for (let j = i; j < byWire.length; j++) {
      const wi = byWire[i]!;
      const wj = byWire[j]!;
      for (const si of wi.segs) {
        const iH = si.a.y === si.b.y;
        const iV = si.a.x === si.b.x;
        if (!iH && !iV) continue;
        for (const sj of wj.segs) {
          const jH = sj.a.y === sj.b.y;
          const jV = sj.a.x === sj.b.x;
          if (!jH && !jV) continue;
          if (iH && jV) {
            const y = si.a.y;
            const x = sj.a.x;
            const inI = x >= Math.min(si.a.x, si.b.x) && x <= Math.max(si.a.x, si.b.x);
            const inJ = y >= Math.min(sj.a.y, sj.b.y) && y <= Math.max(sj.a.y, sj.b.y);
            if (!inI || !inJ) continue;
            const key = `${x},${y}`;
            const same = wi.w.wireName === wj.w.wireName;
            result.set(key, { wireName: wi.w.wireName, connected: same });
          } else if (iV && jH) {
            const x = si.a.x;
            const y = sj.a.y;
            const inI = y >= Math.min(si.a.y, si.b.y) && y <= Math.max(si.a.y, si.b.y);
            const inJ = x >= Math.min(sj.a.x, sj.b.x) && x <= Math.max(sj.a.x, sj.b.x);
            if (!inI || !inJ) continue;
            const key = `${x},${y}`;
            const same = wi.w.wireName === wj.w.wireName;
            result.set(key, { wireName: wi.w.wireName, connected: same });
          }
        }
      }
    }
  }
  // 同一点に複数 wireName が来た場合は connected=false 優先（十字結線は操作的に作れない前提だが保険）
  for (const [k, v] of result) {
    if (!v.connected) result.set(k, v);
  }
  return result;
}

function drawModule(ctx: CanvasRenderingContext2D, view: ViewState, m: ModuleEntity, selected: boolean) {
  const p0 = worldToScreen({ x: m.rect.x, y: m.rect.y }, view);
  const p1 = worldToScreen({ x: m.rect.x + m.rect.w, y: m.rect.y + m.rect.h }, view);
  const x = p0.x;
  const y = p1.y;
  const w = p1.x - p0.x;
  const h = p0.y - p1.y;

  ctx.save();
  ctx.lineWidth = selected ? 3 : 2;
  ctx.strokeStyle = colors.moduleStroke;
  ctx.fillStyle = selected ? "rgba(0,102,255,0.08)" : "transparent";
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.stroke();

  // モジュール名（中央）
  ctx.fillStyle = colors.moduleName;
  ctx.font = `${Math.round(14 * view.zoom)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const center = worldToScreen({ x: m.rect.x + m.rect.w / 2, y: m.rect.y + m.rect.h / 2 }, view);
  ctx.fillText(m.moduleName, center.x, center.y);

  // インスタンス名（上辺左）
  ctx.fillStyle = colors.instanceName;
  ctx.font = `${Math.round(12 * view.zoom)}px sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const topLeft = worldToScreen({ x: m.rect.x, y: m.rect.y + m.rect.h }, view);
  ctx.fillText(m.instanceName, topLeft.x, topLeft.y);

  // 端子表示（SVGの代替：小三角）＋端子名
  for (const port of m.ports) {
    const px = port.side === "left" ? m.rect.x : m.rect.x + m.rect.w;
    const py = m.rect.y + port.y;
    const sp = worldToScreen({ x: px, y: py }, view);
    ctx.fillStyle = "#111";
    ctx.beginPath();
    const s = 6 * view.zoom;
    if (port.side === "left") {
      ctx.moveTo(sp.x, sp.y);
      ctx.lineTo(sp.x - s, sp.y - s / 2);
      ctx.lineTo(sp.x - s, sp.y + s / 2);
    } else {
      ctx.moveTo(sp.x, sp.y);
      ctx.lineTo(sp.x + s, sp.y - s / 2);
      ctx.lineTo(sp.x + s, sp.y + s / 2);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = colors.portName;
    ctx.font = `${Math.round(12 * view.zoom)}px sans-serif`;
    ctx.textBaseline = "middle";
    if (port.side === "left") {
      ctx.textAlign = "left";
      ctx.fillText(port.name, sp.x, sp.y);
    } else {
      ctx.textAlign = "right";
      ctx.fillText(port.name, sp.x, sp.y);
    }
  }

  ctx.restore();
}

function drawWire(ctx: CanvasRenderingContext2D, view: ViewState, w: WireEntity, bold: boolean) {
  ctx.save();
  ctx.strokeStyle = colors.wireStroke;
  ctx.lineWidth = bold ? 4 : 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  const p0 = worldToScreen(w.points[0]!, view);
  ctx.moveTo(p0.x, p0.y);
  for (let i = 1; i < w.points.length; i++) {
    const p = worldToScreen(w.points[i]!, view);
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawJunctions(ctx: CanvasRenderingContext2D, view: ViewState, junctions: Map<string, { connected: boolean }>) {
  ctx.save();
  for (const [key, j] of junctions) {
    if (!j.connected) continue;
    const [xs, ys] = key.split(",");
    const p = worldToScreen({ x: Number(xs), y: Number(ys) }, view);
    ctx.fillStyle = colors.junction;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4 * view.zoom, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function CadCanvas(props: {
  document: CadDocument;
  tool: ToolId;
  selectedIds: string[];
  hoverId: string | null;
  onHover: (id: string | null) => void;
  onSelectionChange: (ids: string[]) => void;
  onExecute: (cmd: CadCommand) => void;
  onStatus: (text: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const [view, setView] = useState<ViewState>(() => ({ panPx: { x: 120, y: 520 }, zoom: 1 }));
  const [isPanning, setIsPanning] = useState(false);
  const [wireDraft, setWireDraft] = useState<WireDraft | null>(null);

  const junctions = useMemo(() => computeJunctions(props.document), [props.document]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(wrapper.clientWidth * dpr);
      canvas.height = Math.floor(wrapper.clientHeight * dpr);
      canvas.style.width = `${wrapper.clientWidth}px`;
      canvas.style.height = `${wrapper.clientHeight}px`;
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      render();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapper);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.document, props.selectedIds, props.tool, view, wireDraft, junctions]);

  function render() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);

    drawGrid(ctx, view, { w, h });

    // wires first
    const selectedWireNames = new Set(
      props.selectedIds
        .map((id) => props.document.entities.find((e) => e.id === id))
        .filter((e): e is WireEntity => !!e && e.kind === "wire")
        .map((w) => w.wireName)
    );
    for (const e of props.document.entities) {
      if (e.kind === "wire") drawWire(ctx, view, e, selectedWireNames.has(e.wireName));
    }

    drawJunctions(ctx, view, junctions);

    for (const e of props.document.entities) {
      if (e.kind === "module") drawModule(ctx, view, e, props.selectedIds.includes(e.id));
    }

    // draft wire overlay
    if (wireDraft) {
      drawWire(
        ctx,
        view,
        { id: "draft", kind: "wire", points: [...wireDraft.points, wireDraft.cursor], interfaceName: "", wireName: "" },
        true
      );
    }
  }

  function currentMouseGrid(ev: React.PointerEvent) {
    const rect = (ev.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    return screenToWorldGrid({ x: ev.clientX - rect.left, y: ev.clientY - rect.top }, view);
  }

  function isJunctionPoint(p: Point) {
    const key = `${p.x},${p.y}`;
    const j = junctions.get(key);
    return j?.connected ?? false;
  }

  function handlePointerDown(ev: React.PointerEvent) {
    (ev.currentTarget as HTMLCanvasElement).setPointerCapture(ev.pointerId);
    const p = currentMouseGrid(ev);

    if (props.tool === "pan") {
      setIsPanning(true);
      return;
    }

    if (props.tool === "delete") {
      if (props.selectedIds.length === 0) return;
      const ids = new Set(props.selectedIds);
      props.onExecute({ name: "delete_selection", apply: (doc) => removeEntities(doc, ids) });
      props.onSelectionChange([]);
      return;
    }

    if (props.tool === "select") {
      const hit = pickEntity(props.document, p);
      props.onSelectionChange(hit ? [hit.id] : []);
      return;
    }

    if (props.tool === "module_create") {
      const width = 8;
      const height = 6;
      const module: ModuleEntity = {
        id: createId("mod"),
        kind: "module",
        rect: rectForModuleAt(p, width, height),
        moduleName: "mod",
        instanceName: "u1",
        ports: [
          { id: createId("p"), side: "left", y: Math.floor(height / 2), name: "in", iconKey: "tri" },
          { id: createId("p"), side: "right", y: Math.floor(height / 2), name: "out", iconKey: "tri" }
        ]
      };
      props.onExecute({ name: "add_module", apply: (doc) => upsertEntity(doc, module) });
      props.onSelectionChange([module.id]);
      return;
    }

    if (props.tool === "module_place") {
      const selected = props.selectedIds.length === 1 ? props.document.entities.find((e) => e.id === props.selectedIds[0]) : undefined;
      if (!selected || selected.kind !== "module") {
        props.onStatus("モジュール配置: まず既存モジュールを単一選択してください");
        return;
      }
      const base = selected;
      const placed: ModuleEntity = {
        ...base,
        id: createId("mod"),
        rect: { ...base.rect, x: p.x, y: p.y },
        instanceName: nextInstanceName(props.document, base.moduleName)
      };
      props.onExecute({ name: "place_module", apply: (doc) => upsertEntity(doc, placed) });
      props.onSelectionChange([placed.id]);
      return;
    }

    if (props.tool === "wire") {
      if (isJunctionPoint(p)) {
        props.onStatus("結線マーク（●）のあるグリッドは開始/終了点にできません");
        return;
      }
      if (!wireDraft) {
        setWireDraft({ points: [p], cursor: p });
        props.onStatus("配線: 次の点をクリック（右クリックで終了）");
      } else {
        const last = wireDraft.points[wireDraft.points.length - 1]!;
        const next = forceOrthogonal(last, p);
        if (isJunctionPoint(next)) {
          props.onStatus("結線マーク（●）のあるグリッドは開始/終了点にできません");
          return;
        }
        const points = [...wireDraft.points, next];
        if (points.length >= 2) {
          const wire: WireEntity = {
            id: createId("w"),
            kind: "wire",
            points,
            interfaceName: "if",
            wireName: "sig"
          };
          props.onExecute({ name: "add_wire", apply: (doc) => upsertEntity(doc, wire) });
          props.onSelectionChange([wire.id]);
          setWireDraft(null);
          props.onStatus("配線: 追加しました");
        }
      }
      return;
    }
  }

  function handlePointerMove(ev: React.PointerEvent) {
    const p = currentMouseGrid(ev);
    if (isPanning) {
      setView((v) => ({ ...v, panPx: { x: v.panPx.x + ev.movementX, y: v.panPx.y + ev.movementY } }));
      return;
    }
    const hit = pickEntity(props.document, p);
    props.onHover(hit ? hit.id : null);
    if (wireDraft) {
      const last = wireDraft.points[wireDraft.points.length - 1]!;
      const cursor = forceOrthogonal(last, p);
      setWireDraft({ ...wireDraft, cursor });
    }
  }

  function handlePointerUp(ev: React.PointerEvent) {
    (ev.currentTarget as HTMLCanvasElement).releasePointerCapture(ev.pointerId);
    setIsPanning(false);
  }

  function handleWheel(ev: React.WheelEvent) {
    ev.preventDefault();
    const delta = Math.sign(ev.deltaY);
    setView((v) => {
      const nextZoom = clampZoom(v.zoom * (delta > 0 ? 0.9 : 1.1));
      return { ...v, zoom: nextZoom };
    });
  }

  function handleContextMenu(ev: React.MouseEvent) {
    if (props.tool === "wire" && wireDraft) {
      ev.preventDefault();
      // 右クリックでキャンセル
      setWireDraft(null);
      props.onStatus("配線: キャンセルしました");
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: "absolute", inset: 0 }}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        style={{ width: "100%", height: "100%", display: "block", cursor: props.tool === "pan" ? "grab" : "crosshair" }}
      />
    </div>
  );
}

function clampZoom(z: number) {
  return Math.min(4, Math.max(0.25, z));
}

function forceOrthogonal(last: Point, p: Point): Point {
  const dx = Math.abs(p.x - last.x);
  const dy = Math.abs(p.y - last.y);
  if (dx >= dy) return { x: p.x, y: last.y };
  return { x: last.x, y: p.y };
}

function nextInstanceName(doc: CadDocument, moduleName: string) {
  const used = new Set(
    doc.entities
      .filter((e): e is ModuleEntity => e.kind === "module" && e.moduleName === moduleName)
      .map((m) => m.instanceName)
  );
  for (let i = 1; i < 10000; i++) {
    const name = `u${i}`;
    if (!used.has(name)) return name;
  }
  return `u${Date.now()}`;
}

