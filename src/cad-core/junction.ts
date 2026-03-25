import type { CadDocument } from "./document";
import type { Point } from "./types";
import type { WireEntity } from "./entities";

type JunctionState = {
  connected: boolean;
};

function getWireSegments(w: WireEntity): Array<{ a: Point; b: Point }> {
  const segs: Array<{ a: Point; b: Point }> = [];
  for (let i = 0; i < w.points.length - 1; i++) segs.push({ a: w.points[i]!, b: w.points[i + 1]! });
  return segs;
}

type Aggregate = {
  sawSame: boolean;
  sawDifferent: boolean;
};

export function computeJunctions(doc: CadDocument): Map<string, JunctionState> {
  // 交差点(水平×垂直)で wireName 同一のみ接続点(●)
  const wires = doc.entities.filter((e): e is WireEntity => e.kind === "wire");
  const byWire = wires.map((w) => ({ w, segs: getWireSegments(w) }));

  const aggr = new Map<string, Aggregate>();

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

          let x: number | null = null;
          let y: number | null = null;
          if (iH && jV) {
            y = si.a.y;
            x = sj.a.x;
            const inI = x >= Math.min(si.a.x, si.b.x) && x <= Math.max(si.a.x, si.b.x);
            const inJ = y >= Math.min(sj.a.y, sj.b.y) && y <= Math.max(sj.a.y, sj.b.y);
            if (!inI || !inJ) continue;
          } else if (iV && jH) {
            x = si.a.x;
            y = sj.a.y;
            const inI = y >= Math.min(si.a.y, si.b.y) && y <= Math.max(si.a.y, si.b.y);
            const inJ = x >= Math.min(sj.a.x, sj.b.x) && x <= Math.max(sj.a.x, sj.b.x);
            if (!inI || !inJ) continue;
          } else {
            continue;
          }

          const key = `${x},${y}`;
          const same = wi.w.wireName === wj.w.wireName;
          const prev = aggr.get(key) ?? { sawSame: false, sawDifferent: false };
          if (same) prev.sawSame = true;
          else prev.sawDifferent = true;
          aggr.set(key, prev);
        }
      }
    }
  }

  const result = new Map<string, JunctionState>();
  for (const [k, v] of aggr) {
    // 異なる信号名が一つでも交差する点は非結線扱い
    result.set(k, { connected: v.sawSame && !v.sawDifferent });
  }
  return result;
}

export function isBlockedByConnectedJunction(junctions: Map<string, JunctionState>, p: Point): boolean {
  const j = junctions.get(`${p.x},${p.y}`);
  return j?.connected ?? false;
}

