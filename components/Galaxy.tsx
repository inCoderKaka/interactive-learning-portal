"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line, OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import type { Area, Topic } from "@/lib/types";

const COLORS: Record<Area, string> = { dsa: "#4fd1c5", hld: "#7aa7ff", lld: "#ffb454", craft: "#ff8fb3" };
const CENTERS: Record<Area, [number, number, number]> = { dsa: [-5.2, 0.4, 0], hld: [4.6, 1.6, -1], lld: [4.2, -2.6, 1.5], craft: [-0.4, -3.6, 2] };

export interface StarInfo { topic: Topic; mastery: number; total: number; done: number }

function layout(stars: StarInfo[]) {
  const byArea = new Map<Area, StarInfo[]>();
  stars.forEach((s) => byArea.set(s.topic.area, [...(byArea.get(s.topic.area) ?? []), s]));
  const out: { s: StarInfo; p: THREE.Vector3 }[] = [];
  byArea.forEach((list, area) => {
    const [cx, cy, cz] = CENTERS[area];
    const spread = area === "dsa" ? 1 : 0.72;
    list.forEach((s, i) => {
      // golden-angle spiral gives an even, organic constellation
      const r = (0.75 + 0.62 * Math.sqrt(i)) * spread, a = i * 2.39996;
      out.push({ s, p: new THREE.Vector3(cx + r * Math.cos(a), cy + r * Math.sin(a) * 0.82, cz + Math.sin(i * 1.7) * 1.1) });
    });
  });
  return out;
}

function Star({ s, p, onHover, hovered }: { s: StarInfo; p: THREE.Vector3; onHover: (id: string | null) => void; hovered: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const router = useRouter();
  const color = COLORS[s.topic.area];
  const size = (s.topic.tier === 1 ? 0.2 : s.topic.tier === 2 ? 0.16 : 0.12) * (hovered ? 1.5 : 1);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.6 + p.x * 3) * 0.07);
  });
  return (
    <group position={p}>
      <mesh ref={ref} onPointerOver={(e) => { e.stopPropagation(); onHover(s.topic.id); document.body.style.cursor = "pointer"; }} onPointerOut={() => { onHover(null); document.body.style.cursor = ""; }} onClick={() => router.push(`/learn/${s.topic.id}`)}>
        <sphereGeometry args={[size, 24, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25 + s.mastery * 2.2} roughness={0.35} transparent opacity={0.45 + s.mastery * 0.55} />
      </mesh>
      {s.mastery >= 1 && <mesh rotation={[Math.PI / 2.4, 0, 0]}><torusGeometry args={[size * 1.75, 0.012, 8, 48]} /><meshBasicMaterial color={color} /></mesh>}
      {hovered && (
        <Html center distanceFactor={11} position={[0, size + 0.42, 0]} style={{ pointerEvents: "none" }}>
          <div style={{ background: "#10121aee", border: `1px solid ${color}66`, borderRadius: 12, padding: "8px 12px", whiteSpace: "nowrap", color: "#e9ebf4", fontSize: 13, fontWeight: 600 }}>
            {s.topic.title}
            <div style={{ fontSize: 11, color: "#9096ad", fontWeight: 400, marginTop: 2 }}>{s.done}/{s.total} done · click to open</div>
          </div>
        </Html>
      )}
    </group>
  );
}

function Scene({ stars }: { stars: StarInfo[] }) {
  const pts = useMemo(() => layout(stars), [stars]);
  const [hover, setHover] = useState<string | null>(null);
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (group.current && !hover) group.current.rotation.y += dt * 0.035; });
  const paths = useMemo(() => (Object.keys(CENTERS) as Area[]).map((a) => ({ a, pts: pts.filter((x) => x.s.topic.area === a).map((x) => x.p) })).filter((x) => x.pts.length > 1), [pts]);
  return (
    <group ref={group}>
      {paths.map(({ a, pts: line }) => <Line key={a} points={line} color={COLORS[a]} lineWidth={1} transparent opacity={0.22} />)}
      {pts.map(({ s, p }) => <Star key={s.topic.id} s={s} p={p} onHover={setHover} hovered={hover === s.topic.id} />)}
      {(Object.keys(CENTERS) as Area[]).map((a) => (
        <Html key={a} center position={[CENTERS[a][0], CENTERS[a][1] + (a === "dsa" ? 4.1 : 2.7), CENTERS[a][2]]} style={{ pointerEvents: "none" }}>
          <div style={{ color: COLORS[a], fontSize: 11, letterSpacing: "0.18em", fontWeight: 700, textTransform: "uppercase", opacity: 0.85 }}>{a === "craft" ? "Craft" : a.toUpperCase()}</div>
        </Html>
      ))}
    </group>
  );
}

export default function Galaxy({ stars }: { stars: StarInfo[] }) {
  return (
    <Canvas camera={{ position: [0, 0, 13.5], fov: 50 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[8, 8, 10]} intensity={60} />
      <Stars radius={60} depth={30} count={1400} factor={2.6} saturation={0} fade speed={0.6} />
      <Scene stars={stars} />
      <OrbitControls enablePan={false} minDistance={7} maxDistance={20} enableDamping dampingFactor={0.08} rotateSpeed={0.5} />
    </Canvas>
  );
}
