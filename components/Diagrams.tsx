"use client";
import { useEffect, useMemo, useState } from "react";
import { BaseEdge, Background, Controls, EdgeLabelRenderer, Handle, Position, ReactFlow, getBezierPath, useNodesState, type Edge, type EdgeProps, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Boxes, Cloud, Cog, Database, Globe, HardDrive, ListOrdered, MonitorSmartphone, Server, Skull, Zap } from "lucide-react";
import type { ArchNode, ClassBox, ClassRel, Design } from "@/lib/types";
import { Button, cn } from "./ui";

const KIND = {
  client: { icon: MonitorSmartphone, color: "#e9ebf4", name: "Client" },
  edge: { icon: Globe, color: "#7aa7ff", name: "Edge" },
  service: { icon: Server, color: "#c8f547", name: "Service" },
  db: { icon: Database, color: "#4fd1c5", name: "Database" },
  cache: { icon: Zap, color: "#ffb454", name: "Cache" },
  queue: { icon: ListOrdered, color: "#ff8fb3", name: "Queue / stream" },
  store: { icon: HardDrive, color: "#b794f4", name: "Storage" },
  worker: { icon: Cog, color: "#f6ad55", name: "Worker" },
  ext: { icon: Cloud, color: "#9096ad", name: "External" },
} as const;

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left];
const Handles = () => (
  <>
    {SIDES.map((p) => <Handle key={"s" + p} id={"s-" + p} type="source" position={p} className="!h-1 !w-1 !border-0 !bg-transparent" />)}
    {SIDES.map((p) => <Handle key={"t" + p} id={"t-" + p} type="target" position={p} className="!h-1 !w-1 !border-0 !bg-transparent" />)}
  </>
);
/** choose facing sides from the relative position of two boxes */
function sides(a: { x: number; y: number }, b: { x: number; y: number }, aspect = 2.2) {
  const dx = b.x - a.x, dy = b.y - a.y;
  if (Math.abs(dx) > Math.abs(dy) * aspect * 0.6) return dx > 0 ? [Position.Right, Position.Left] : [Position.Left, Position.Right];
  return dy > 0 ? [Position.Bottom, Position.Top] : [Position.Top, Position.Bottom];
}

type ArchData = { n: ArchNode; selected: boolean; failed: boolean; impacted: boolean };
function ArchNodeView({ data }: NodeProps<Node<ArchData>>) {
  const k = KIND[data.n.kind];
  const Icon = data.failed ? Skull : k.icon;
  return (
    <div className={cn("flex w-[176px] items-center gap-2.5 rounded-2xl border bg-panel px-3 py-2.5 shadow-lg transition", data.failed ? "border-bad bg-bad/10" : data.selected ? "border-accent" : data.impacted ? "border-warn/60" : "border-line hover:border-[#3a4160]")}
      style={{ boxShadow: data.selected ? "0 0 0 4px rgb(200 245 71 / .12)" : undefined }}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${data.failed ? "#ff6b6b" : k.color} 14%, transparent)`, color: data.failed ? "#ff6b6b" : k.color }}><Icon size={17} /></span>
      <div className="min-w-0">
        <div className={cn("text-[12.5px] font-semibold leading-tight", data.failed && "line-through opacity-70")}>{data.n.label}</div>
        <div className="text-[10.5px] text-faint">{data.failed ? "failed" : data.impacted ? "degraded" : k.name}</div>
      </div>
      <Handles />
    </div>
  );
}

type FlowData = { label?: string; async?: boolean; dead?: boolean; i: number };
function FlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd }: EdgeProps<Edge<FlowData>>) {
  const [path, lx, ly] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const dead = data?.dead;
  const color = dead ? "#ff6b6b" : data?.async ? "#ff8fb3" : "#5b6385";
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={{ stroke: color, strokeWidth: 1.6, strokeDasharray: data?.async || dead ? "6 5" : undefined, opacity: dead ? 0.5 : 1 }} />
      {!dead && (
        <circle r={3.5} fill={data?.async ? "#ff8fb3" : "#c8f547"}>
          <animateMotion dur={`${data?.async ? 3.2 : 2.2}s`} repeatCount="indefinite" path={path} begin={`${((data?.i ?? 0) % 5) * 0.35}s`} />
        </circle>
      )}
      {data?.label && (
        <EdgeLabelRenderer>
          <div style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }} className="pointer-events-none absolute rounded-md border border-line bg-bg/95 px-1.5 py-0.5 font-mono text-[10px] text-mute">{data.label}</div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
const archNodeTypes = { arch: ArchNodeView };
const archEdgeTypes = { flow: FlowEdge };

export function ArchCanvas({ arch }: { arch: NonNullable<Design["arch"]> }) {
  const [sel, setSel] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const initial = useMemo<Node<ArchData>[]>(() => arch.nodes.map((n) => ({ id: n.id, type: "arch", position: { x: n.x, y: n.y }, data: { n, selected: false, failed: false, impacted: false } })), [arch]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial);
  useEffect(() => { setNodes(initial); setSel(null); setFailed(null); }, [initial, setNodes]);

  const impacted = useMemo(() => new Set(failed ? arch.edges.filter((e) => e.b === failed && !e.async).map((e) => e.a) : []), [failed, arch]);
  const viewNodes = useMemo(() => nodes.map((n) => ({ ...n, data: { ...n.data, selected: n.id === sel, failed: n.id === failed, impacted: impacted.has(n.id) } })), [nodes, sel, failed, impacted]);
  const edges = useMemo<Edge<FlowData>[]>(() => {
    const pos = new Map(nodes.map((n) => [n.id, n.position]));
    return arch.edges.map((e, i) => {
      const [sp, tp] = sides(pos.get(e.a)!, pos.get(e.b)!);
      return { id: `${e.a}-${e.b}-${i}`, source: e.a, target: e.b, sourceHandle: "s-" + sp, targetHandle: "t-" + tp, type: "flow", data: { label: e.label, async: e.async, dead: e.a === failed || e.b === failed, i } };
    });
  }, [arch, nodes, failed]);

  const cur = arch.nodes.find((n) => n.id === sel);
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
        <div><div className="eyebrow">Reference architecture</div><div className="text-[13px] text-mute">Drag components, click one to inspect it, then break it to see the blast radius.</div></div>
        <div className="flex items-center gap-3 text-[11px] text-mute"><span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-[#5b6385]" />sync call</span><span className="flex items-center gap-1.5"><span className="h-0.5 w-5 border-t-2 border-dashed border-craft" />async</span></div>
      </div>
      <div className="grid lg:grid-cols-[1fr_300px]">
        <div className="h-[460px] border-line lg:border-r">
          <ReactFlow nodes={viewNodes} edges={edges} onNodesChange={onNodesChange} nodeTypes={archNodeTypes} edgeTypes={archEdgeTypes} onNodeClick={(_, n) => setSel(n.id)} onPaneClick={() => setSel(null)}
            fitView fitViewOptions={{ padding: 0.15 }} minZoom={0.3} maxZoom={1.6} proOptions={{ hideAttribution: true }} colorMode="dark" nodesConnectable={false} style={{ background: "transparent" }}>
            <Background color="#262b3d" gap={22} size={1.2} />
            <Controls showInteractive={false} position="bottom-left" />
          </ReactFlow>
        </div>
        <div className="p-5">
          {cur ? (
            <div className="animate-rise">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest" style={{ color: KIND[cur.kind].color }}><Boxes size={13} />{KIND[cur.kind].name}</div>
              <div className="display mt-1 text-lg font-semibold">{cur.label}</div>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#cfd3e3]">{cur.note || "A standard component of this design."}</p>
              <div className="mt-3 space-y-1 text-[12.5px] text-mute">
                {arch.edges.filter((e) => e.a === cur.id).map((e, i) => <div key={"o" + i}>→ {arch.nodes.find((n) => n.id === e.b)?.label}{e.label ? `: ${e.label}` : ""}{e.async ? " (async)" : ""}</div>)}
                {arch.edges.filter((e) => e.b === cur.id).map((e, i) => <div key={"i" + i}>← {arch.nodes.find((n) => n.id === e.a)?.label}{e.label ? `: ${e.label}` : ""}</div>)}
              </div>
              <Button size="sm" variant={failed === cur.id ? "soft" : "danger"} className="mt-4" onClick={() => setFailed(failed === cur.id ? null : cur.id)}><Skull size={14} />{failed === cur.id ? "Restore component" : "Kill this component"}</Button>
              {failed === cur.id && (
                <p className="mt-3 rounded-xl border border-bad/30 bg-bad/5 p-3 text-[12.5px] leading-relaxed text-[#ffd0d0]">
                  {impacted.size ? `Callers that block on it are degraded: ${[...impacted].map((id) => arch.nodes.find((n) => n.id === id)?.label).join(", ")}. ` : "Nothing calls it synchronously, so user requests keep flowing while work queues up. "}
                  Before reading on, say out loud: how is this detected, what does the user see, and how does it recover?
                </p>
              )}
            </div>
          ) : (
            <div className="grid h-full place-items-center text-center text-[13px] text-faint"><div><Boxes className="mx-auto mb-2 opacity-60" />Select a component to see what it does<br />and what breaks when it dies.</div></div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- class diagram ----------------
type ClassData = { b: ClassBox };
const KIND_LABEL = { interface: "«interface»", abstract: "«abstract»", enum: "«enum»", class: "" };
function ClassNodeView({ data }: NodeProps<Node<ClassData>>) {
  const b = data.b, iface = b.kind === "interface", en = b.kind === "enum";
  return (
    <div className={cn("w-[230px] overflow-hidden rounded-xl border bg-panel shadow-lg", iface ? "border-hld/50" : en ? "border-craft/50" : b.kind === "abstract" ? "border-lld/50" : "border-line")}>
      <div className={cn("px-3 py-2 text-center", iface ? "bg-hld/10" : en ? "bg-craft/10" : b.kind === "abstract" ? "bg-lld/10" : "bg-panel2")}>
        {b.kind && b.kind !== "class" && <div className="font-mono text-[9.5px] text-mute">{KIND_LABEL[b.kind]}</div>}
        <div className={cn("font-mono text-[13px] font-bold", b.kind === "abstract" && "italic")}>{b.name}</div>
      </div>
      {!!b.fields?.length && <div className="border-t border-line px-3 py-1.5 font-mono text-[10.5px] leading-[1.55] text-[#b9c0d8]">{b.fields.map((f) => <div key={f} className="truncate">{en ? "" : "− "}{f}</div>)}</div>}
      {!!b.methods?.length && <div className="border-t border-line px-3 py-1.5 font-mono text-[10.5px] leading-[1.55] text-[#dfe7c4]">{b.methods.map((m) => <div key={m} className="truncate">+ {m}</div>)}</div>}
      <Handles />
    </div>
  );
}
const classNodeTypes = { cls: ClassNodeView };
const REL = {
  extends: { color: "#ffb454", dash: undefined, text: "extends" },
  implements: { color: "#7aa7ff", dash: "6 4", text: "implements" },
  has: { color: "#c8f547", dash: undefined, text: "has" },
  uses: { color: "#6b7394", dash: "3 4", text: "uses" },
};

export function ClassDiagram({ boxes, rels }: { boxes: ClassBox[]; rels: ClassRel[] }) {
  const initial = useMemo<Node<ClassData>[]>(() => {
    // layer by "depends on" depth so owners sit above what they own / implement targets sit above implementers
    const depth = new Map(boxes.map((b) => [b.name, 0]));
    for (let pass = 0; pass < boxes.length; pass++)
      for (const r of rels) {
        const [top, bottom] = r.type === "extends" || r.type === "implements" ? [r.b, r.a] : [r.a, r.b];
        if (depth.has(top) && depth.has(bottom) && depth.get(bottom)! <= depth.get(top)! && depth.get(top)! < 4) depth.set(bottom, depth.get(top)! + 1);
      }
    const rows = new Map<number, ClassBox[]>();
    boxes.forEach((b) => rows.set(depth.get(b.name)!, [...(rows.get(depth.get(b.name)!) ?? []), b]));
    const out: Node<ClassData>[] = [];
    let y = 0;
    [...rows.keys()].sort((a, b) => a - b).forEach((d) => {
      const row = rows.get(d)!;
      // wrap long rows
      for (let i = 0; i < row.length; i += 4) {
        const part = row.slice(i, i + 4);
        const h = Math.max(...part.map((b) => 46 + ((b.fields?.length ?? 0) + (b.methods?.length ?? 0)) * 17 + 14));
        part.forEach((b, j) => out.push({ id: b.name, type: "cls", position: { x: j * 280 + (4 - part.length) * 140, y }, data: { b } }));
        y += h + 70;
      }
    });
    return out;
  }, [boxes, rels]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial);
  useEffect(() => setNodes(initial), [initial, setNodes]);
  const edges = useMemo<Edge[]>(() => {
    const pos = new Map(nodes.map((n) => [n.id, n.position]));
    return rels.filter((r) => pos.has(r.a) && pos.has(r.b)).map((r, i) => {
      const [sp, tp] = sides(pos.get(r.a)!, pos.get(r.b)!, 1.2);
      const k = REL[r.type];
      return { id: `${r.a}-${r.b}-${i}`, source: r.a, target: r.b, sourceHandle: "s-" + sp, targetHandle: "t-" + tp, type: "smoothstep", label: r.label && r.label !== "undefined" ? r.label : undefined,
        labelStyle: { fill: "#9096ad", fontSize: 10, fontFamily: "var(--font-mono)" }, labelBgStyle: { fill: "#090a0f" }, labelBgPadding: [4, 2] as [number, number],
        style: { stroke: k.color, strokeWidth: 1.5, strokeDasharray: k.dash }, markerEnd: { type: r.type === "extends" || r.type === "implements" ? ("arrowclosed" as const) : ("arrow" as const), color: k.color, width: 18, height: 18 } };
    });
  }, [rels, nodes]);
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
        <div><div className="eyebrow">Reference class model</div><div className="text-[13px] text-mute">One reasonable decomposition. Drag classes to explore the relationships.</div></div>
        <div className="flex flex-wrap gap-3 text-[11px] text-mute">{(Object.keys(REL) as (keyof typeof REL)[]).map((k) => <span key={k} className="flex items-center gap-1.5"><span className="h-0.5 w-5" style={{ background: REL[k].color }} />{REL[k].text}</span>)}</div>
      </div>
      <div className="h-[520px]">
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} nodeTypes={classNodeTypes} fitView fitViewOptions={{ padding: 0.12 }} minZoom={0.25} maxZoom={1.5} proOptions={{ hideAttribution: true }} colorMode="dark" nodesConnectable={false} style={{ background: "transparent" }}>
          <Background color="#262b3d" gap={22} size={1.2} />
          <Controls showInteractive={false} position="bottom-left" />
        </ReactFlow>
      </div>
    </div>
  );
}
