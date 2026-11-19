"use client";
import { useMemo, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import type { Area, Topic } from "@/lib/types";

const COLORS: Record<Area, string> = { dsa: "#4fd1c5", hld: "#7aa7ff", lld: "#ffb454", craft: "#ff8fb3", ai: "#b794f4" };
const CENTERS: Record<Area, [number, number, number]> = { dsa: [-5.2, 0.4, 0], hld: [4.6, 1.6, -1], lld: [4.2, -2.6, 1.5], craft: [-0.4, -3.6, 2], ai: [10, -0.6, 0.4] };
const AREA_IDS = Object.keys(CENTERS) as Area[];

export interface StarInfo { topic: Topic; mastery: number; total: number; done: number }
type Link = "pre" | "next" | null; // relation to the hovered star: it builds on this one / this one unlocks next
type Pt = { s: StarInfo; p: THREE.Vector3 };
type Edge = { from: string; to: string; a: THREE.Vector3; b: THREE.Vector3; area: Area };
/** DOM labels live outside the canvas; the scene projects their world position onto the screen every frame. */
type LabelMap = Map<string, { el: HTMLDivElement; pos: THREE.Vector3; lift: number }>;

const starSize = (t: Topic) => (t.tier === 1 ? 0.2 : t.tier === 2 ? 0.16 : 0.12);

function layout(stars: StarInfo[]): Pt[] {
  const byArea = new Map<Area, StarInfo[]>();
  stars.forEach((s) => byArea.set(s.topic.area, [...(byArea.get(s.topic.area) ?? []), s]));
  const out: Pt[] = [];
  byArea.forEach((list, area) => {
    const [cx, cy, cz] = CENTERS[area];
    const spread = area === "dsa" ? 1 : area === "ai" ? 0.6 : 0.72;
    list.forEach((s, i) => {
      // golden-angle spiral gives an even, organic constellation
      const r = (0.75 + 0.62 * Math.sqrt(i)) * spread, a = i * 2.39996;
      out.push({ s, p: new THREE.Vector3(cx + r * Math.cos(a), cy + r * Math.sin(a) * 0.82, cz + Math.sin(i * 1.7) * 1.1) });
    });
  });
  return out;
}

function Star({ s, p, onHover, hovered, link, dim }: { s: StarInfo; p: THREE.Vector3; onHover: (id: string | null) => void; hovered: boolean; link: Link; dim: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const router = useRouter();
  const color = COLORS[s.topic.area];
  const size = starSize(s.topic) * (hovered ? 1.5 : link ? 1.25 : 1);
  const fade = dim ? 0.25 : 1;
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.6 + p.x * 3) * 0.07);
  });
  return (
    <group position={p}>
      <mesh ref={ref} onPointerOver={(e) => { e.stopPropagation(); onHover(s.topic.id); document.body.style.cursor = "pointer"; }} onPointerOut={() => { onHover(null); document.body.style.cursor = ""; }} onClick={() => { document.body.style.cursor = ""; router.push(`/learn/${s.topic.id}`); }}>
        <sphereGeometry args={[size, 24, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered || link ? 2.6 : (0.25 + s.mastery * 2.2) * fade} roughness={0.35} transparent opacity={hovered || link ? 1 : (0.45 + s.mastery * 0.55) * fade} />
      </mesh>
      {s.mastery >= 1 && <mesh rotation={[Math.PI / 2.4, 0, 0]}><torusGeometry args={[size * 1.75, 0.012, 8, 48]} /><meshBasicMaterial color={color} /></mesh>}
    </group>
  );
}

function Scene({ pts, edges, rel, hover, setHover, labels }: { pts: Pt[]; edges: Edge[]; rel: Map<string, Link>; hover: string | null; setHover: (id: string | null) => void; labels: RefObject<LabelMap> }) {
  const group = useRef<THREE.Group>(null);
  const v = useMemo(() => new THREE.Vector3(), []);
  const size = useThree((s) => s.size);
  useFrame(({ camera }, dt) => {
    const g = group.current;
    if (!g) return;
    if (!hover) g.rotation.y += dt * 0.035;
    g.updateMatrixWorld();
    labels.current.forEach(({ el, pos, lift }) => {
      v.copy(pos).applyMatrix4(g.matrixWorld).project(camera);
      const sx = (v.x * 0.5 + 0.5) * size.width, sy = (-v.y * 0.5 + 0.5) * size.height;
      // keep the label inside the map: clamp sideways, and flip below the star when there is no room above
      const w = el.offsetWidth, h = el.offsetHeight;
      const x = lift ? Math.min(Math.max(sx, w / 2 + 6), size.width - w / 2 - 6) : sx;
      const below = lift > 0 && sy - lift - h < 6;
      el.style.transform = `translate(${x.toFixed(1)}px, ${(below ? sy + lift : sy - lift).toFixed(1)}px) translate(-50%, ${below ? "0" : "-100%"})`;
      el.style.visibility = v.z < 1 ? "visible" : "hidden";
    });
  });
  const paths = useMemo(() => AREA_IDS.map((a) => ({ a, pts: pts.filter((x) => x.s.topic.area === a).map((x) => x.p) })).filter((x) => x.pts.length > 1), [pts]);
  return (
    <group ref={group}>
      {paths.map(({ a, pts: line }) => <Line key={a} points={line} color={COLORS[a]} lineWidth={1} transparent opacity={hover ? 0.07 : 0.22} />)}
      {edges.map((e) => {
        const on = hover === e.from || hover === e.to;
        if (hover && !on) return null;
        // incoming (what the hovered star builds on) in dashed white, outgoing (what it unlocks) in the area colour
        return <Line key={e.from + ">" + e.to} points={[e.a, e.b]} color={on && e.to === hover ? "#ffffff" : COLORS[e.area]} lineWidth={on ? 2.4 : 0.6} dashed={on && e.to === hover} dashSize={0.16} gapSize={0.09} transparent opacity={on ? 0.95 : 0.1} />;
      })}
      {pts.map(({ s, p }) => <Star key={s.topic.id} s={s} p={p} onHover={setHover} hovered={hover === s.topic.id} link={rel.get(s.topic.id) ?? null} dim={!!hover && hover !== s.topic.id && !rel.has(s.topic.id)} />)}
    </group>
  );
}

export default function Galaxy({ stars }: { stars: StarInfo[] }) {
  const pts = useMemo(() => layout(stars), [stars]);
  const [hover, setHover] = useState<string | null>(null);
  // prerequisite edges: from → to means "to builds on from"
  const edges = useMemo<Edge[]>(() => {
    const pos = new Map(pts.map((x) => [x.s.topic.id, x.p]));
    return pts.flatMap(({ s, p }) => (s.topic.prereq ?? []).filter((id) => pos.has(id)).map((id) => ({ from: id, to: s.topic.id, a: pos.get(id)!, b: p, area: s.topic.area })));
  }, [pts]);
  const rel = useMemo(() => {
    const m = new Map<string, Link>();
    if (hover) for (const e of edges) { if (e.to === hover) m.set(e.from, "pre"); else if (e.from === hover) m.set(e.to, "next"); }
    return m;
  }, [edges, hover]);
  const areaPos = useMemo(() => AREA_IDS.map((a) => ({ a, pos: new THREE.Vector3(CENTERS[a][0], CENTERS[a][1] + (a === "dsa" ? 4.1 : 2.7), CENTERS[a][2]) })), []);

  const labels = useRef<LabelMap>(new Map());
  const bind = (key: string, pos: THREE.Vector3, lift: number) => (el: HTMLDivElement | null) => {
    if (el) labels.current.set(key, { el, pos, lift });
    else labels.current.delete(key);
  };
  const base = { position: "absolute", left: 0, top: 0, visibility: "hidden", whiteSpace: "nowrap", willChange: "transform" } as const;
  const hovered = hover ? pts.find((x) => x.s.topic.id === hover) : undefined;
  const pre = [...rel.values()].filter((x) => x === "pre").length;

  return (
    <div className="relative h-full w-full">
      <Canvas camera={{ position: [0, 0, 13.5], fov: 50 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[8, 8, 10]} intensity={60} />
        <Stars radius={60} depth={30} count={1400} factor={2.6} saturation={0} fade speed={0.6} />
        <Scene pts={pts} edges={edges} rel={rel} hover={hover} setHover={setHover} labels={labels} />
        <OrbitControls enablePan={false} minDistance={7} maxDistance={20} enableDamping dampingFactor={0.08} rotateSpeed={0.5} />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {areaPos.map(({ a, pos }) => (
          <div key={a} ref={bind("area:" + a, pos, 0)} style={{ ...base, color: COLORS[a], fontSize: 11, letterSpacing: "0.18em", fontWeight: 700, textTransform: "uppercase", opacity: hover ? 0.4 : 0.85 }}>{a === "craft" ? "Craft" : a === "ai" ? "AI" : a.toUpperCase()}</div>
        ))}
        {pts.filter((x) => rel.has(x.s.topic.id)).map(({ s, p }) => {
          const link = rel.get(s.topic.id), color = COLORS[s.topic.area];
          return (
            <div key={s.topic.id} ref={bind("rel:" + s.topic.id, p, 14)} style={{ ...base, background: "#10121acc", border: `1px solid ${link === "pre" ? "#ffffff55" : color + "88"}`, borderRadius: 9, padding: "4px 9px", color: "#e9ebf4", fontSize: 11, fontWeight: 600 }}>
              <span style={{ color: link === "pre" ? "#9096ad" : color, fontWeight: 500 }}>{link === "pre" ? "builds on · " : "unlocks · "}</span>{s.topic.title}
            </div>
          );
        })}
        {hovered && (
          <div key={hovered.s.topic.id} ref={bind("hover", hovered.p, 22)} style={{ ...base, zIndex: 2, background: "#10121aee", border: `1px solid ${COLORS[hovered.s.topic.area]}66`, borderRadius: 12, padding: "8px 12px", color: "#e9ebf4", fontSize: 13, fontWeight: 600 }}>
            {hovered.s.topic.title}
            <div style={{ fontSize: 11, color: "#9096ad", fontWeight: 400, marginTop: 2 }}>{hovered.s.done}/{hovered.s.total} done · click to open</div>
            {rel.size > 0 && <div style={{ fontSize: 11, color: "#9096ad", fontWeight: 400, marginTop: 2 }}>builds on {pre} · unlocks {rel.size - pre}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
