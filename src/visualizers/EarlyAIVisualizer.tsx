import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { NeonGlowMaterial } from "./neonGlow";
import { clampCount } from "./params";
import { seededRandom } from "../shared/random";
import type { Scene3DParams } from "../presentation/types";
import { useAnimPlayhead, useShowBeat } from "../presentation/useShowBeat";
import { useCoarseReadout } from "./useCoarseReadout";
import { useNeonGlowMaterial } from "./useNeonGlowMaterial";

type EarlyAIVisualizerMode = "TURING_MACHINE" | "EXPERT_SYSTEM_LATTICE";

interface EarlyAIVisualizerProps {
  mode: EarlyAIVisualizerMode;
  params?: Scene3DParams;
  position?: [number, number, number];
}

function GlowLine({
  start,
  end,
  color,
  radius = 0.012,
  opacity = 0.55,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: string;
  radius?: number;
  opacity?: number;
}) {
  const material = useMemo(() => {
    const m = new NeonGlowMaterial(color);
    m.uniforms.uOpacity.value = opacity;
    m.uniforms.uIntensity.value = 0.8;
    return m;
  }, [color, opacity]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  const { mid, length, quaternion } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      len > 0.0001 ? dir.clone().normalize() : new THREE.Vector3(0, 1, 0)
    );
    return {
      mid: new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5),
      length: len,
      quaternion: q,
    };
  }, [start, end]);

  return (
    <mesh position={[mid.x, mid.y, mid.z]} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 6]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
function TuringMachineScene({ params }: { params: Scene3DParams }) {
  const glowColor = typeof params.glowColor === "string" ? params.glowColor : "#d4af6a";
  const tapeLength = clampCount(params.tapeLength, 40, 10, 60);
  const tapeSymbolSpeed = typeof params.tapeSymbolSpeed === "number" ? params.tapeSymbolSpeed : 0.6;
  const showEnigmaSilhouette = params.showEnigmaSilhouette !== false;

  const cellSpacing = 0.32;
  const cellPositions = useMemo(() => {
    const offset = ((tapeLength - 1) * cellSpacing) / 2;
    return Array.from({ length: tapeLength }, (_, i) => i * cellSpacing - offset);
  }, [tapeLength]);

  const symbols = useMemo(
    () => cellPositions.map((_, i) => (seededRandom(i * 7.3 + 1) > 0.5 ? "1" : "0")),
    [cellPositions]
  );

  const headMaterial = useNeonGlowMaterial(glowColor);
  const headRef = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);
  const silhouetteRef = useRef<THREE.Group>(null!);
  const quoteRef = useRef<THREE.Group>(null!);
  const stillRef = useRef<THREE.Group>(null!);
  const play = useAnimPlayhead({ morph: 1 });
  const quotePlay = useAnimPlayhead({ morph: 2, hold: 40 });
  const stillPlay = useAnimPlayhead({ morph: 3, hold: 24 });
  const beat = useShowBeat();

  useFrame(() => {
    const morphs = beat.current.morphs;
    const t = play.current.armed ? play.current.t : 0;
    const reveal = play.current.armed ? THREE.MathUtils.smoothstep(t, 0, 1.15) : 0;
    headMaterial.uniforms.uTime.value = t;
    const span = cellPositions[cellPositions.length - 1] - cellPositions[0];
    const cycle = play.current.armed ? (t * tapeSymbolSpeed) % (span * 2) : 0;
    const x = cellPositions[0] + (cycle <= span ? cycle : span * 2 - cycle);
    if (headRef.current) {
      headRef.current.position.x = x;
      headRef.current.visible = play.current.armed;
    }
    if (ringRef.current) ringRef.current.rotation.z = t * 0.15;
    if (silhouetteRef.current) {
      silhouetteRef.current.visible = reveal > 0.04;
      silhouetteRef.current.scale.setScalar(0.85 + reveal * 0.15);
    }
    if (quoteRef.current) quoteRef.current.visible = quotePlay.current.armed || morphs >= 2;
    if (stillRef.current) stillRef.current.visible = stillPlay.current.armed || morphs >= 3;
  });

  return (
    <group>
      
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 1.9, 0.3, side * -0.15]} rotation={[0, side * -0.35, 0]}>
          <planeGeometry args={[0.9, 1.3]} />
          <meshStandardMaterial
            color={glowColor}
            emissive={glowColor}
            emissiveIntensity={0.45}
            opacity={0.28}
            transparent
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      <Text position={[-1.9, 1.15, 0]} fontSize={0.16} color="#e8dcc0" anchorX="center" outlineWidth={0.006} outlineColor="#05070f">
        HUMAN
      </Text>
      <Text position={[1.9, 1.15, 0]} fontSize={0.16} color={glowColor} anchorX="center" outlineWidth={0.006} outlineColor="#05070f">
        MACHINE
      </Text>

      <group ref={silhouetteRef} position={[0, 0.55, 0.35]} visible={false}>
        <mesh position={[0, 0.55, 0]}>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial color="#1a140c" emissive={glowColor} emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <capsuleGeometry args={[0.16, 0.55, 4, 8]} />
          <meshStandardMaterial color="#120e08" emissive={glowColor} emissiveIntensity={0.22} />
        </mesh>
      </group>
      <group ref={quoteRef} visible={false}>
        <Text position={[0, 2.28, 0]} fontSize={0.16} color="#ffe08a" anchorX="center" outlineWidth={0.006} outlineColor="#05070f" maxWidth={5.4}>
          if you cannot tell which door - what are we still arguing about?
        </Text>
      </group>
      <group ref={stillRef} visible={false}>
        <Text position={[0, -1.15, 0]} fontSize={0.16} color="#e8dcc0" anchorX="center" outlineWidth={0.006} outlineColor="#05070f" maxWidth={5.4}>
          seventy-five years later · we are still playing this game
        </Text>
      </group>
      <Text position={[0, -0.72, 0]} fontSize={0.13} color="#8a7040" anchorX="center" outlineWidth={0.006} outlineColor="#05070f">
        the tape: every question and answer, as bits
      </Text>

      
      <group position={[0, -0.3, 0]}>
        {cellPositions.map((x, i) => (
          <group key={i} position={[x, 0, 0]}>
            <mesh>
              <boxGeometry args={[cellSpacing * 0.7, 0.24, 0.05]} />
              <meshStandardMaterial
                color={glowColor}
                emissive={glowColor}
                emissiveIntensity={symbols[i] === "1" ? 0.9 : 0.25}
                opacity={0.85}
                transparent
              />
            </mesh>
          </group>
        ))}
        
        <mesh ref={headRef} position={[0, 0.28, 0.02]} visible={false}>
          <coneGeometry args={[0.09, 0.18, 4]} />
          <primitive object={headMaterial} attach="material" />
        </mesh>
      </group>

      
      {showEnigmaSilhouette && (
        <mesh ref={ringRef} position={[0, 1.6, -3.5]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.9, 0.04, 8, 48]} />
          <meshStandardMaterial color="#3a2f1a" emissive={glowColor} emissiveIntensity={0.15} />
        </mesh>
      )}
    </group>
  );
}
function ExpertSystemScene({ params }: { params: Scene3DParams }) {
  const ruleNodeCount = clampCount(params.ruleNodeCount, 2000, 200, 4000);
  const messyDataIntrusion = params.messyDataIntrusion !== false;
  const cloudPositions = useMemo(() => {
    const arr = new Float32Array(ruleNodeCount * 3);
    const side = Math.ceil(Math.cbrt(ruleNodeCount));
    for (let i = 0; i < ruleNodeCount; i++) {
      const xi = i % side;
      const yi = Math.floor(i / side) % side;
      const zi = Math.floor(i / (side * side));
      const jitter = 0.03;
      arr[i * 3] = (xi - side / 2) * 0.16 + (seededRandom(i * 3.1) - 0.5) * jitter;
      arr[i * 3 + 1] = (yi - side / 2) * 0.16 + (seededRandom(i * 5.2) - 0.5) * jitter;
      arr[i * 3 + 2] = (zi - side / 2) * 0.16 + (seededRandom(i * 7.4) - 0.5) * jitter;
    }
    return arr;
  }, [ruleNodeCount]);

  const cloudGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(cloudPositions, 3));
    return g;
  }, [cloudPositions]);
  useEffect(() => () => cloudGeometry.dispose(), [cloudGeometry]);

  const cloudMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: "#c9a227",
        size: 0.02,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    []
  );
  useEffect(() => () => cloudMaterial.dispose(), [cloudMaterial]);
  const tree = useMemo(() => {
    const layers = [1, 3, 5];
    const nodes: THREE.Vector3[][] = layers.map((count, li) =>
      Array.from(
        { length: count },
        (_, i) => new THREE.Vector3((i - (count - 1) / 2) * 0.5, 0.9 - li * 0.6, 0.4)
      )
    );
    const edges: [THREE.Vector3, THREE.Vector3][] = [];
    for (let li = 0; li < nodes.length - 1; li++) {
      nodes[li].forEach((from) => {
        nodes[li + 1].forEach((to, ti) => {
          if (seededRandom(from.x * 13 + to.x * 7 + ti) > 0.35) edges.push([from, to]);
        });
      });
    }
    return { nodes: nodes.flat(), edges };
  }, []);
  const intruderRef = useRef<THREE.Mesh>(null!);
  const nearestFlashRef = useRef<{ index: number; amount: number }>({ index: -1, amount: 0 });
  const nodeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const intruderMaterial = useNeonGlowMaterial("#ff5c5c");
  const play = useAnimPlayhead({ morph: 1 });
  const beat = useShowBeat();
  const counterRef = useRef(0);
  const counter = useCoarseReadout(0, () => Math.round(counterRef.current));
  const mycinRef = useRef<THREE.Group>(null!);
  const xconRef = useRef<THREE.Group>(null!);
  const crackRef = useRef<THREE.Group>(null!);
  useFrame((state) => {
    const t = play.current.armed ? play.current.t : 0;
    const morphs = beat.current.morphs;
    const para = beat.current.paragraph;
    const showMycin = morphs >= 1;
    const showXcon = para >= 2;
    const showCrack = para >= 4;
    intruderMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    const showCounter = morphs >= 2;
    const target = showCounter ? 40 : 0;
    counterRef.current += (target - counterRef.current) * 0.06;
    if (mycinRef.current) mycinRef.current.visible = showMycin;
    if (xconRef.current) xconRef.current.visible = showXcon;
    if (crackRef.current) crackRef.current.visible = showCrack;

    const live = messyDataIntrusion && showCrack;
    if (!live) {
      if (intruderRef.current) intruderRef.current.visible = false;
      nodeRefs.current.forEach((mesh) => {
        if (!mesh) return;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissive.set("#c9a227");
        mat.emissiveIntensity = showMycin ? 0.4 : 0.14;
      });
      return;
    }
    if (intruderRef.current) intruderRef.current.visible = true;

    const pos = new THREE.Vector3(Math.sin(t * 0.4) * 1.6, Math.sin(t * 0.27) * 0.8 + 0.3, Math.cos(t * 0.33) * 1.2);
    if (intruderRef.current) intruderRef.current.position.copy(pos);

    let nearestIndex = -1;
    let nearestDist = Infinity;
    tree.nodes.forEach((n, i) => {
      const d = n.distanceTo ? n.distanceTo(pos) : Math.hypot(n.x - pos.x, n.y - pos.y, n.z - pos.z);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIndex = i;
      }
    });
    nearestFlashRef.current.index = nearestIndex;
    nearestFlashRef.current.amount = nearestDist < 0.5 ? 1 - nearestDist / 0.5 : 0;

    nodeRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const isNearest = i === nearestFlashRef.current.index;
      const flash = isNearest ? nearestFlashRef.current.amount : 0;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.set(flash > 0.05 ? "#ff5c5c" : "#c9a227");
      mat.emissiveIntensity = 0.4 + flash * 1.6;
    });
  });

  return (
    <group>
      <Text
        position={[0, 1.3, 0]}
        fontSize={0.18}
        color="#c9a227"
        anchorX="center"
        outlineWidth={0.006}
        outlineColor="#05070f"
      >
        thousands of handwritten IF → THEN rules
      </Text>
      <group ref={mycinRef} visible={false}>
        <Text position={[-1.15, 0.58, 0.5]} fontSize={0.16} color="#ffd479" anchorX="center" outlineWidth={0.006} outlineColor="#05070f">
          MYCIN
        </Text>
      </group>
      <group ref={xconRef} visible={false}>
        <Text position={[1.15, 0.58, 0.5]} fontSize={0.16} color="#ffd479" anchorX="center" outlineWidth={0.006} outlineColor="#05070f">
          XCON / R1
        </Text>
        <Text position={[1.15, 0.36, 0.5]} fontSize={0.14} color="#ffe08a" anchorX="center" outlineWidth={0.006} outlineColor="#05070f">
          {counter > 0.5 ? `$${counter}M/yr` : " "}
        </Text>
      </group>
      <group ref={crackRef} visible={false}>
        <Text
          position={[0, -1.28, 0]}
          fontSize={0.14}
          color="#ff5c5c"
          anchorX="center"
          outlineWidth={0.006}
          outlineColor="#05070f"
        >
          one unanticipated case · the lattice cracks
        </Text>
      </group>

      <points geometry={cloudGeometry} material={cloudMaterial} />

      {tree.edges.map(([a, b], i) => (
        <GlowLine key={i} start={a} end={b} color="#c9a227" radius={0.008} opacity={0.4} />
      ))}
      {tree.nodes.map((p, i) => (
        <mesh
          key={i}
          ref={(el: THREE.Mesh | null) => {
            nodeRefs.current[i] = el;
          }}
          position={[p.x, p.y, p.z]}
        >
          <boxGeometry args={[0.16, 0.16, 0.16]} />
          <meshStandardMaterial color="#c9a227" emissive="#c9a227" emissiveIntensity={0.4} />
        </mesh>
      ))}

      {messyDataIntrusion && (
        <mesh ref={intruderRef}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <primitive object={intruderMaterial} attach="material" />
        </mesh>
      )}

      <ConnectionistEmber position={[2.85, 0.2, 1.55]} />
    </group>
  );
}
function ConnectionistEmber({ position }: { position: [number, number, number] }) {
  const coreRef = useRef<THREE.Mesh>(null!);
  const haloRef = useRef<THREE.Mesh>(null!);
  const coreMat = useNeonGlowMaterial("#4fd8ff");
  const haloMat = useNeonGlowMaterial("#7ef0ff");
  const play = useAnimPlayhead({ morph: 3 });

  useFrame(() => {
    const t = play.current.armed ? play.current.t : 0;
    const wake = play.current.armed ? THREE.MathUtils.smoothstep(t, 0, 3.5) : 0;
    const heartbeat = 0.55 + 0.45 * Math.sin(t * 2.4);
    const tick = Math.floor(t * 9);
    const stutter = seededRandom(tick * 3.17 + 9) > 0.25 ? 1 : 0.55;
    const amp = wake * heartbeat * stutter;
    coreMat.uniforms.uIntensity.value = 1.4 + amp * 2.6;
    coreMat.uniforms.uOpacity.value = 0.35 + wake * 0.65;
    coreMat.uniforms.uTime.value = t;
    haloMat.uniforms.uIntensity.value = 0.6 + amp * 1.8;
    haloMat.uniforms.uOpacity.value = 0.2 + wake * amp * 0.55;
    haloMat.uniforms.uTime.value = t;
    if (coreRef.current) {
      coreRef.current.visible = wake > 0.04;
      const s = 0.85 + amp * 0.45;
      coreRef.current.scale.setScalar(s);
    }
    if (haloRef.current) {
      haloRef.current.visible = wake > 0.04;
      const s = 1.1 + amp * 0.7;
      haloRef.current.scale.setScalar(s);
      haloRef.current.rotation.z = t * 0.35;
      haloRef.current.rotation.x = Math.PI / 2;
    }
  });

  return (
    <group position={position}>
      <mesh ref={coreRef} visible={false}>
        <sphereGeometry args={[0.2, 20, 20]} />
        <primitive object={coreMat} attach="material" />
      </mesh>
      <mesh ref={haloRef} visible={false}>
        <torusGeometry args={[0.38, 0.035, 8, 32]} />
        <primitive object={haloMat} attach="material" />
      </mesh>
    </group>
  );
}
export default function EarlyAIVisualizer({
  mode,
  params = {},
  position = [0, 0, 0],
}: EarlyAIVisualizerProps) {
  return (
    <group position={position}>
      {mode === "TURING_MACHINE" && <TuringMachineScene params={params} />}
      {mode === "EXPERT_SYSTEM_LATTICE" && <ExpertSystemScene params={params} />}
    </group>
  );
}
