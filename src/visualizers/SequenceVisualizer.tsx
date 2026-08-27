import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { clampCount } from "./params";
import { seededRandom } from "../shared/random";
import type { Scene3DParams } from "../presentation/types";
import { useAnimPlayhead, useShowBeat } from "../presentation/useShowBeat";
import { useCoarseReadout } from "./useCoarseReadout";
import { useNeonGlowMaterial } from "./useNeonGlowMaterial";

type SequenceVisualizerMode =
  | "BACKPROP_GRAPH"
  | "NGRAM_LATTICE"
  | "RNN_UNROLL"
  | "GRADIENT_DECAY_FIELD"
  | "SEQ2SEQ_BOTTLENECK";

interface SequenceVisualizerProps {
  mode: SequenceVisualizerMode;
  params?: Scene3DParams;
  position?: [number, number, number];
}
function Caption({
  children,
  position,
  color = "#c7d0d8",
  size = 0.17,
  anchorX = "center",
  maxWidth,
}: {
  children: string;
  position: [number, number, number];
  color?: string;
  size?: number;
  anchorX?: "center" | "left" | "right";
  maxWidth?: number;
}) {
  return (
    <Text
      position={position}
      fontSize={size}
      color={color}
      anchorX={anchorX}
      anchorY="middle"
      outlineWidth={0.006}
      outlineColor="#05070f"
      maxWidth={maxWidth}
      textAlign={anchorX === "left" ? "left" : anchorX === "right" ? "right" : "center"}
    >
      {children}
    </Text>
  );
}


function StaticLine({
  start,
  end,
  color,
  radius = 0.01,
  opacity = 0.4,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  color: string;
  radius?: number;
  opacity?: number;
}) {
  const { mid, length, quaternion } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      len > 0.0001 ? dir.clone().normalize() : new THREE.Vector3(0, 1, 0)
    );
    return { mid: new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5), length: len, quaternion: q };
  }, [start, end]);

  return (
    <mesh position={[mid.x, mid.y, mid.z]} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 5]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}
const BACKPROP_CYCLE = 6.4;
const BACKPROP_FORWARD_END = 2.2;
const BACKPROP_BACK_END = 4.4;
const BACKPROP_LAYER_SPACING = 2.3;
const BACKPROP_NODE_SPACING = 1.3;
const BACKPROP_OFFSET_X = -2.3;

const BACKPROP_PHASES = [
  "forward pass: inputs to prediction",
  "backward pass: error, layer by layer (the chain rule)",
  "XOR solved · the 1969 wall is gone",
];

function BackpropGraphScene({ params }: { params: Scene3DParams }) {
  const sizes = useMemo(() => {
    const layerSizes = Array.isArray(params.layerSizes)
      ? (params.layerSizes.filter((n): n is number => typeof n === "number").slice(0, 4) as number[])
      : [2, 2, 1];
    return layerSizes.length >= 2 ? layerSizes : [2, 2, 1];
  }, [params.layerSizes]);
  const showXORSolved = params.showXORSolved !== false;

  const layers = useMemo(
    () =>
      sizes.map((count, li) => {
        const top = ((count - 1) * BACKPROP_NODE_SPACING) / 2;
        const x =
          BACKPROP_OFFSET_X +
          li * BACKPROP_LAYER_SPACING -
          ((sizes.length - 1) * BACKPROP_LAYER_SPACING) / 2;
        return Array.from({ length: count }, (_, i) => new THREE.Vector3(x, top - i * BACKPROP_NODE_SPACING, 0));
      }),
    [sizes]
  );

  const edges = useMemo(() => {
    const list: [THREE.Vector3, THREE.Vector3][] = [];
    for (let li = 0; li < layers.length - 1; li++) {
      layers[li].forEach((a) => layers[li + 1].forEach((b) => list.push([a, b])));
    }
    return list;
  }, [layers]);

  const edgeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const flatNodes = useMemo(() => layers.flat(), [layers]);
  const outputMaterial = useRef<THREE.MeshStandardMaterial | null>(null);
  const xorBoundaryRef = useRef<THREE.Mesh>(null!);

  const phaseRef = useRef(0);
  const phase = useCoarseReadout(0, () => phaseRef.current);
  const play = useAnimPlayhead({ morph: 1, loop: BACKPROP_CYCLE });
  const xorPlay = useAnimPlayhead({ morph: 2, hold: 24 });
  const beat = useShowBeat();
  const xorGroupRef = useRef<THREE.Group>(null!);

  useFrame(() => {
    const t = play.current.armed ? play.current.t : 0;
    phaseRef.current = t < BACKPROP_FORWARD_END ? 0 : t < BACKPROP_BACK_END ? 1 : 2;

    edgeRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      let glow = 0.15;
      if (t < BACKPROP_FORWARD_END) {
        const progress = t / BACKPROP_FORWARD_END;
        const edgeShare = i / edges.length;
        glow = Math.max(0.15, 1 - Math.abs(edgeShare - progress) * 5);
        mat.color.set("#39d6c8");
      } else if (t < BACKPROP_BACK_END) {
        const progress = (t - BACKPROP_FORWARD_END) / (BACKPROP_BACK_END - BACKPROP_FORWARD_END);
        const edgeShare = 1 - i / edges.length;
        glow = Math.max(0.15, 1 - Math.abs(edgeShare - progress) * 5);
        mat.color.set("#ff9d4d");
      }
      mat.emissiveIntensity = glow;
      mat.emissive.copy(mat.color);
    });

    const xorOn = xorPlay.current.armed || beat.current.morphs >= 2;
    const solvedAmount =
      xorOn && t > BACKPROP_BACK_END
        ? Math.sin(((t - BACKPROP_BACK_END) / (BACKPROP_CYCLE - BACKPROP_BACK_END)) * Math.PI)
        : xorOn
          ? 0.55
          : 0;

    if (showXORSolved && outputMaterial.current) {
      outputMaterial.current.emissive.set(xorOn ? "#7dffb0" : "#39d6c8");
      outputMaterial.current.emissiveIntensity = xorOn ? 0.5 + solvedAmount * 1.8 : 0.4;
    }
    if (xorBoundaryRef.current) {
      const mat = xorBoundaryRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = xorOn ? 0.12 + solvedAmount * 0.78 : 0.12;
    }
    if (xorGroupRef.current) xorGroupRef.current.visible = xorOn;
  });

  return (
    <group>
      {edges.map(([a, b], i) => (
        <mesh
          key={i}
          ref={(el: THREE.Mesh | null) => {
            edgeRefs.current[i] = el;
          }}
          position={[(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2]}
          quaternion={new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3().subVectors(b, a).normalize()
          )}
        >
          <cylinderGeometry args={[0.022, 0.022, new THREE.Vector3().subVectors(b, a).length(), 6]} />
          <meshStandardMaterial color="#39d6c8" emissive="#39d6c8" emissiveIntensity={0.15} />
        </mesh>
      ))}

      {flatNodes.map((p, i) => {
        const isOutput = i === flatNodes.length - 1 && sizes[sizes.length - 1] === 1;
        return (
          <mesh
            key={i}
            ref={(el: THREE.Mesh | null) => {
              if (isOutput && el) outputMaterial.current = el.material as THREE.MeshStandardMaterial;
            }}
            position={[p.x, p.y, p.z]}
          >
            <sphereGeometry args={[0.26, 16, 16]} />
            <meshStandardMaterial color="#39d6c8" emissive="#39d6c8" emissiveIntensity={0.4} />
          </mesh>
        );
      })}

      
      {layers.map((layer, li) => (
        <Caption
          key={li}
          position={[layer[0].x, -1.55, 0]}
          size={0.16}
          color={li === 1 ? "#7dffb0" : "#8fa2d6"}
        >
          {li === 0 ? "inputs" : li === layers.length - 1 ? "output" : "hidden layer\n(learned features)"}
        </Caption>
      ))}

      
      <Caption position={[BACKPROP_OFFSET_X, 2.5, 0]} size={0.19} color={phase === 1 ? "#ff9d4d" : "#39d6c8"}>
        {BACKPROP_PHASES[phase]}
      </Caption>

      
      {showXORSolved && (
        <group ref={xorGroupRef} position={[4.3, 0, 0]} visible={false}>
          <mesh ref={xorBoundaryRef} rotation={[0, 0, Math.PI / 4]}>
            <torusGeometry args={[0.95, 0.045, 8, 40, Math.PI * 1.35]} />
            <meshBasicMaterial color="#7dffb0" transparent opacity={0.15} depthWrite={false} />
          </mesh>
          {[
            { x: -0.8, y: 0.8, positive: true },
            { x: 0.8, y: -0.8, positive: true },
            { x: -0.8, y: -0.8, positive: false },
            { x: 0.8, y: 0.8, positive: false },
          ].map((p, i) => (
            <mesh key={i} position={[p.x, p.y, 0.05]}>
              <sphereGeometry args={[0.15, 12, 12]} />
              <meshStandardMaterial
                color={p.positive ? "#4fd8ff" : "#ff5c6a"}
                emissive={p.positive ? "#4fd8ff" : "#ff5c6a"}
                emissiveIntensity={1.1}
              />
            </mesh>
          ))}
          <Caption position={[0, -1.55, 0]} size={0.16} color="#7dffb0">
            XOR: now separable
          </Caption>
        </group>
      )}
    </group>
  );
}
const OBSERVED_TRIGRAMS: { words: string; pos: [number, number, number] }[] = [
  { words: "the cat sat", pos: [-0.55, 0.35, 0.4] },
  { words: "in the end", pos: [0.7, -0.15, -0.25] },
  { words: "a lot of", pos: [-0.15, -0.55, 0.55] },
  { words: "one of the", pos: [0.45, 0.6, 0.15] },
  { words: "as well as", pos: [-0.75, 0.05, -0.45] },
  { words: "there is a", pos: [0.2, -0.35, -0.65] },
  { words: "it was the", pos: [0.85, 0.25, 0.5] },
  { words: "out of the", pos: [-0.4, 0.7, -0.2] },
];

function NgramLatticeScene({ params }: { params: Scene3DParams }) {
  const sparsityRatio = typeof params.sparsityRatio === "number" ? params.sparsityRatio : 0.998;
  const observedPct = ((1 - sparsityRatio) * 100).toFixed(2);
  const emptySlots = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        pos: [
          (seededRandom(i * 2.11 + 1) - 0.5) * 2.7,
          (seededRandom(i * 3.73 + 2) - 0.5) * 2.7,
          (seededRandom(i * 5.31 + 3) - 0.5) * 2.7,
        ] as [number, number, number],
      })),
    []
  );

  const edgeGeometry = useMemo(() => {
    const s = 1.55;
    const corners = [
      [-s, -s, -s],
      [s, -s, -s],
      [s, s, -s],
      [-s, s, -s],
      [-s, -s, s],
      [s, -s, s],
      [s, s, s],
      [-s, s, s],
    ] as const;
    const pairs = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ];
    const positions = new Float32Array(pairs.length * 6);
    let i = 0;
    for (const [a, b] of pairs) {
      positions[i++] = corners[a][0];
      positions[i++] = corners[a][1];
      positions[i++] = corners[a][2];
      positions[i++] = corners[b][0];
      positions[i++] = corners[b][1];
      positions[i++] = corners[b][2];
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);
  useEffect(() => () => edgeGeometry.dispose(), [edgeGeometry]);

  const edgeMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: "#4a5560",
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    []
  );
  useEffect(() => () => edgeMaterial.dispose(), [edgeMaterial]);

  const groupRef = useRef<THREE.Group>(null!);
  const scaleRef = useRef(0.5);
  const captionRef = useRef<THREE.Group>(null!);
  const emptyRefs = useRef<(THREE.Mesh | null)[]>([]);
  const play = useAnimPlayhead({ morph: 1 });
  const beat = useShowBeat();
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const armed = play.current.armed;
    if (armed) groupRef.current.rotation.y += delta * 0.08;
    const t = armed ? play.current.t : 0;
    groupRef.current.rotation.x = 0.18 + Math.sin(t * 0.15) * 0.06;
    const inflate = armed ? THREE.MathUtils.smoothstep(t, 0, 5.5) : 0;
    const target = 0.5 + inflate * 0.82;
    scaleRef.current = THREE.MathUtils.lerp(scaleRef.current, target, 0.06);
    groupRef.current.scale.setScalar(scaleRef.current);
    if (captionRef.current) captionRef.current.visible = inflate > 0.12;
    const smoothing = beat.current.morphs >= 3;
    emptyRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      mesh.visible = inflate > 0.04;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const patch = smoothing && seededRandom(i * 1.71 + 4) > 0.58;
      mat.color.set(patch ? "#ff9d4d" : "#3a4550");
      mat.opacity = inflate * (patch ? 0.42 + 0.28 * Math.sin(t * 3.1 + i) : 0.22);
    });
  });

  return (
    <group>
      <group ref={groupRef} scale={0.5}>
        <lineSegments geometry={edgeGeometry} material={edgeMaterial} />
        {emptySlots.map((slot, i) => (
          <mesh
            key={`empty-${i}`}
            ref={(el: THREE.Mesh | null) => {
              emptyRefs.current[i] = el;
            }}
            position={slot.pos}
            visible={false}
          >
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshBasicMaterial color="#3a4550" transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
        {OBSERVED_TRIGRAMS.map((tri) => (
          <group key={tri.words} position={tri.pos}>
            <mesh>
              <sphereGeometry args={[0.07, 14, 14]} />
              <meshStandardMaterial
                color="#8fa6b8"
                emissive="#8fa6b8"
                emissiveIntensity={1.4}
                toneMapped={false}
              />
            </mesh>
            <Caption position={[0, 0.18, 0]} size={0.1} color="#d5e0ea">
              {tri.words}
            </Caption>
          </group>
        ))}
      </group>
      <group ref={captionRef} visible={false}>
        <Caption position={[0, 2.25, 0]} size={0.16} color="#c7d0d8" maxWidth={3.4}>
          possible trigrams: 50,000³ ≈ 10¹⁴
        </Caption>
        <Caption position={[0, -2.05, 0]} size={0.14} color="#8fa6b8" maxWidth={3.4}>
          {`what a corpus actually contains: ${OBSERVED_TRIGRAMS.length} of them · ~${observedPct}%`}
        </Caption>
      </group>
    </group>
  );
}
const RNN_PHASES = [
  "one recurrent cell: its own output fed back in as input",
  "unrolled: the same cell, once per word in the sequence",
  "in practice the earliest steps fade almost immediately (Hochreiter, 1991)",
  "LSTM: a memory cell running the length of the sequence, and gates to guard it",
];

function RnnUnrollScene({ params }: { params: Scene3DParams }) {
  const timeSteps = clampCount(params.timeSteps, 12, 4, 14);
  const gates = Array.isArray(params.gates)
    ? (params.gates.filter((g): g is string => typeof g === "string") as string[])
    : ["input", "forget", "output"];

  const spacing = 0.92;
  const unrolledX = useMemo(() => {
    const offset = ((timeSteps - 1) * spacing) / 2;
    return Array.from({ length: timeSteps }, (_, i) => i * spacing - offset);
  }, [timeSteps]);

  const cellRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ribbonRef = useRef<THREE.Mesh>(null!);
  const loopRef = useRef<THREE.Mesh>(null!);
  const gateRefs = useRef<(THREE.Mesh | null)[]>([]);
  const chainRef = useRef<THREE.Group>(null!);
  const lstmCaptionRef = useRef<THREE.Group>(null!);
  const gatesGroupRef = useRef<THREE.Group>(null!);
  const unrollLabelsRef = useRef<THREE.Group>(null!);
  const gateLabelY = 0.62;

  const phaseRef = useRef(0);
  const phase = useCoarseReadout(0, () => phaseRef.current);
  const activeGateRef = useRef(0);
  const activeGate = useCoarseReadout(0, () => activeGateRef.current);
  const beat = useShowBeat();
  const play = useAnimPlayhead({ morph: 1 });
  const spreadAnim = useRef(0);
  const decayAnim = useRef(0);
  const lstmAnim = useRef(0);

  useFrame(() => {
    const morphs = beat.current.morphs;
    const t = play.current.armed ? play.current.t : 0;

    const wantSpread = morphs >= 2 ? 1 : 0;
    spreadAnim.current = THREE.MathUtils.lerp(spreadAnim.current, wantSpread, 0.035);
    const spread = spreadAnim.current;
    const unrollReady = spread > 0.9;
    const wantDecay = morphs >= 3 && unrollReady ? 1 : 0;
    decayAnim.current = THREE.MathUtils.lerp(decayAnim.current, wantDecay, 0.045);
    const decay = decayAnim.current;
    const wantLstm = morphs >= 4 ? 1 : 0;
    lstmAnim.current = THREE.MathUtils.lerp(lstmAnim.current, wantLstm, 0.05);
    const lstm = lstmAnim.current;

    if (lstm > 0.25) phaseRef.current = 3;
    else if (decay > 0.12) phaseRef.current = 2;
    else if (spread > 0.08) phaseRef.current = 1;
    else phaseRef.current = morphs >= 1 ? 0 : 0;

    cellRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      mesh.position.x = unrolledX[i] * spread;
      mesh.visible = spread > 0.02 || i === timeSteps - 1;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const stepsBack = timeSteps - 1 - i;
      const retained = Math.pow(0.72, stepsBack * decay);
      const withMemory = THREE.MathUtils.lerp(retained, Math.max(retained, 0.75), lstm);
      mat.emissiveIntensity = 0.2 + withMemory * 1.5;
      mat.color.set(withMemory > 0.35 ? "#4fd8ff" : "#2b3a44");
      mat.emissive.copy(mat.color);
    });

    if (loopRef.current) {
      loopRef.current.visible = spread < 0.5;
      const mat = loopRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - spread * 2) * 0.85;
      loopRef.current.rotation.z = morphs >= 1 ? t * 1.1 : 0;
    }

    if (ribbonRef.current) {
      ribbonRef.current.visible = lstm > 0.02;
      ribbonRef.current.scale.x = spread;
      const mat = ribbonRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.3 + lstm * 1.9;
    }
    if (chainRef.current) chainRef.current.visible = spread > 0.25;
    if (unrollLabelsRef.current) unrollLabelsRef.current.visible = spread > 0.25;
    if (lstmCaptionRef.current) lstmCaptionRef.current.visible = lstm > 0.02;
    if (gatesGroupRef.current) gatesGroupRef.current.visible = lstm > 0.02;
    const active = lstm > 0.5 ? Math.floor(t * 0.85) % gates.length : -1;
    activeGateRef.current = active;
    gateRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      mesh.visible = lstm > 0.02;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = i === active ? 1.9 : 0.25;
    });
  });

  const lastX = unrolledX[unrolledX.length - 1];

  return (
    <group>
      
      <mesh ref={ribbonRef} position={[0, -0.34, 0]}>
        <boxGeometry args={[(timeSteps - 1) * spacing, 0.07, 0.07]} />
        <meshStandardMaterial color="#ffcf5e" emissive="#ffcf5e" emissiveIntensity={0.3} />
      </mesh>

      
      <mesh ref={loopRef} position={[0, 0.52, 0]}>
        <torusGeometry args={[0.42, 0.035, 8, 36, Math.PI * 1.55]} />
        <meshBasicMaterial color="#4fd8ff" transparent opacity={0.85} depthWrite={false} />
      </mesh>

      {unrolledX.map((_, i) => (
        <mesh
          key={i}
          ref={(el: THREE.Mesh | null) => {
            cellRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.19, 14, 14]} />
          <meshStandardMaterial color="#4fd8ff" emissive="#4fd8ff" emissiveIntensity={0.9} />
        </mesh>
      ))}

      
      <group ref={chainRef} visible={false}>
        {unrolledX.slice(0, -1).map((x, i) => (
          <StaticLine
            key={i}
            start={new THREE.Vector3(x, 0, -0.05)}
            end={new THREE.Vector3(unrolledX[i + 1], 0, -0.05)}
            color="#4fd8ff"
            radius={0.014}
            opacity={0.32}
          />
        ))}
      </group>

      
      <group ref={gatesGroupRef} visible={false}>
        {gates.map((g, i) => (
          <group key={g}>
            <mesh
              ref={(el: THREE.Mesh | null) => {
                gateRefs.current[i] = el;
              }}
              position={[lastX + 0.55, gateLabelY - i * 0.34, 0.2]}
            >
              <boxGeometry args={[0.15, 0.15, 0.15]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.25} />
            </mesh>
            <Caption
              position={[lastX + 0.78, gateLabelY - i * 0.34, 0.2]}
              size={0.14}
              anchorX="left"
              color={i === activeGate ? "#ffffff" : "#6d7d8a"}
            >
              {g}
            </Caption>
          </group>
        ))}
      </group>

      <Caption position={[0, 1.55, 0]} size={0.185} color={phase === 2 ? "#ff9d4d" : "#4fd8ff"}>
        {RNN_PHASES[phase]}
      </Caption>
      <group ref={lstmCaptionRef} visible={false}>
        <Caption position={[0, -0.85, 0]} size={0.145} color="#ffcf5e">
          memory cell
        </Caption>
      </group>
      <group ref={unrollLabelsRef} visible={false}>
        <Caption position={[-lastX, -1.5, 0]} size={0.14} color="#6d7d8a">
          first word
        </Caption>
        <Caption position={[lastX, -1.5, 0]} size={0.14} color="#6d7d8a">
          latest word
        </Caption>
      </group>
    </group>
  );
}
function GradientDecayScene({ params }: { params: Scene3DParams }) {
  const sequenceLength = clampCount(params.sequenceLength, 100, 10, 400);
  const decayRate = typeof params.decayRate === "number" ? params.decayRate : 0.85;
  const memoryWallDistance = clampCount(params.memoryWallDistance, 50, 5, sequenceLength);
  const visibleSteps = Math.min(sequenceLength, 28);
  const spacing = 0.44;
  const positions = useMemo(() => {
    const offset = ((visibleSteps - 1) * spacing) / 2;
    return Array.from({ length: visibleSteps }, (_, i) => new THREE.Vector3(i * spacing - offset, 0, 0));
  }, [visibleSteps]);

  const material = useNeonGlowMaterial("#8a6a4d");
  const nodeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const wallRef = useRef<THREE.Mesh>(null!);

  const readoutRef = useRef("");
  const readout = useCoarseReadout("", () => readoutRef.current);
  const modeRef = useRef(0);
  const modeLabel = useCoarseReadout(0, () => modeRef.current);
  const EXPLODE_CYCLE = 13.0;
  const play = useAnimPlayhead({ morph: 1, loop: EXPLODE_CYCLE });
  const beat = useShowBeat();

  const wallPlay = useAnimPlayhead({ morph: 2, hold: 40 });
  const wallCaptionRef = useRef<THREE.Group>(null!);

  useFrame(() => {
    const t = play.current.armed ? play.current.t : 0;
    material.uniforms.uTime.value = play.current.armed ? t : 0;

    const exploding = beat.current.morphs >= 3;
    modeRef.current = exploding ? 1 : 0;
    const cyclePos = (t * 7) % (visibleSteps + 12);
    const wallStepVisible = (memoryWallDistance / sequenceLength) * visibleSteps;

    let frontStep = 0;

    nodeRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const stepsFromSource = visibleSteps - 1 - i;
      const arrived = cyclePos >= stepsFromSource;
      const magnitude = arrived
        ? exploding
          ?
            Math.min(1, Math.pow(1.18, stepsFromSource) * 0.12)
          : Math.pow(decayRate, stepsFromSource)
        : 0;
      if (arrived && stepsFromSource <= Math.floor(cyclePos)) {
        frontStep = stepsFromSource;
      }
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.15 + magnitude * 2.2;
      const hot = exploding ? "#ff5c6a" : "#ff9d4d";
      mat.color.set(magnitude > 0.05 ? hot : "#3a3f45");
      mat.emissive.copy(mat.color);
    });
    const scale = sequenceLength / visibleSteps;
    const realStep = Math.round(frontStep * scale);
    const realMagnitude = exploding
      ? Math.min(1, Math.pow(1.18, frontStep) * 0.12)
      : Math.pow(decayRate, realStep);
    readoutRef.current = exploding
      ? `×1.18 per step → clipped at 1.0`
      : `×${decayRate} per step · ${realStep} steps back → ${
          realMagnitude < 0.001 ? realMagnitude.toExponential(1) : realMagnitude.toFixed(3)
        }`;

    if (wallRef.current) {
      const idx = Math.round(visibleSteps - 1 - wallStepVisible);
      const p = positions[THREE.MathUtils.clamp(idx, 0, positions.length - 1)];
      wallRef.current.position.set(p.x, 0, 0);
      wallRef.current.visible = wallPlay.current.armed || beat.current.morphs >= 2;
    }
    if (wallCaptionRef.current) {
      wallCaptionRef.current.visible = wallPlay.current.armed || beat.current.morphs >= 2;
    }
  });

  const leftX = positions[0].x;
  const rightX = positions[positions.length - 1].x;
  const wallIdx = THREE.MathUtils.clamp(
    Math.round(visibleSteps - 1 - (memoryWallDistance / sequenceLength) * visibleSteps),
    0,
    positions.length - 1
  );

  return (
    <group>
      {positions.slice(0, -1).map((p, i) => (
        <StaticLine key={i} start={p} end={positions[i + 1]} color="#3a3f45" radius={0.008} opacity={0.35} />
      ))}
      {positions.map((p, i) => (
        <mesh
          key={i}
          ref={(el: THREE.Mesh | null) => {
            nodeRefs.current[i] = el;
          }}
          position={[p.x, p.y, p.z]}
        >
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshStandardMaterial color="#3a3f45" emissive="#3a3f45" emissiveIntensity={0.15} />
        </mesh>
      ))}

      
      <mesh ref={wallRef} visible={false}>
        <planeGeometry args={[0.03, 1.5]} />
        <primitive object={material} attach="material" />
      </mesh>
      <group ref={wallCaptionRef} visible={false}>
        <Caption position={[positions[wallIdx].x, -1.05, 0]} size={0.15} color="#8a6a4d">
          {`memory wall ≈ step ${memoryWallDistance}`}
        </Caption>
      </group>

      <Caption position={[0, 1.75, 0]} size={0.19} color={modeLabel === 1 ? "#ff5c6a" : "#ff9d4d"}>
        {modeLabel === 1
          ? "exploding gradient: patched by clipping it before training blows apart"
          : "backpropagation through time: error walking back, one step at a time"}
      </Caption>
      <Caption position={[0, 1.28, 0]} size={0.165} color="#c7d0d8">
        {readout}
      </Caption>

      <Caption position={[rightX + 0.15, 0.42, 0]} size={0.145} anchorX="right" color="#ff9d4d">
        ← error enters here
      </Caption>
      <Caption position={[leftX, 0.42, 0]} size={0.145} anchorX="left" color="#5a6169">
        nothing left to learn from
      </Caption>
    </group>
  );
}
const SEQ2SEQ_SOURCE = ["Le", "chat", "s'est", "assis", "sur", "le", "tapis"];
const SEQ2SEQ_TARGET = ["The", "cat", "sat", "on", "the", "mat"];
const SEQ2SEQ_PHASES = [
  "1 · encoder reads the source, one word at a time",
  "2 · the whole sentence is crushed into one fixed-size vector",
  "3 · decoder generates with NO access to the original words",
];
const SEQ2SEQ_CYCLE = 14.0;
const SEQ2SEQ_READ_END = 4.6;
const SEQ2SEQ_COMPRESS_END = 7.2;
const CONTEXT_CELLS = 16;

function Seq2SeqScene({ params }: { params: Scene3DParams }) {
  const encoderSteps = clampCount(params.encoderSteps, 7, 4, SEQ2SEQ_SOURCE.length);
  const decoderSteps = clampCount(params.decoderSteps, 6, 4, SEQ2SEQ_TARGET.length);
  const contextDims = clampCount(params.contextVectorDims, 1000, 64, 4096);

  const spacing = 0.72;
  const encoderX = useMemo(
    () =>
      Array.from({ length: encoderSteps }, (_, i) => -1.55 - (encoderSteps - 1 - i) * spacing),
    [encoderSteps]
  );
  const decoderX = useMemo(
    () => Array.from({ length: decoderSteps }, (_, i) => 1.55 + i * spacing),
    [decoderSteps]
  );

  const encoderRefs = useRef<(THREE.Mesh | null)[]>([]);
  const decoderRefs = useRef<(THREE.Mesh | null)[]>([]);
  const funnelRefs = useRef<(THREE.Mesh | null)[]>([]);
  const cellRefs = useRef<(THREE.Mesh | null)[]>([]);
  const overflowRefs = useRef<(THREE.Mesh | null)[]>([]);
  const frameRef = useRef<THREE.Mesh>(null!);

  const phaseRef = useRef(0);
  const phase = useCoarseReadout(0, () => phaseRef.current);
  const play = useAnimPlayhead({ morph: 1, loop: SEQ2SEQ_CYCLE });
  const beat = useShowBeat();

  const funnelSegs = useMemo(() => {
    const list: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let i = 0; i < encoderSteps; i++) {
      list.push({ x1: encoderX[i], y1: 0.55, x2: -0.42, y2: 0.55 });
    }
    for (let i = 0; i < decoderSteps; i++) {
      list.push({ x1: 0.42, y1: 0.55, x2: decoderX[i], y2: 0.55 });
    }
    return list;
  }, [encoderSteps, decoderSteps, encoderX, decoderX]);

  useFrame(() => {
    const elapsed = play.current.armed ? play.current.t : 0;
    const t = elapsed % SEQ2SEQ_CYCLE;
    const readProgress = THREE.MathUtils.clamp(t / SEQ2SEQ_READ_END, 0, 1);
    const compress = THREE.MathUtils.clamp(
      (t - SEQ2SEQ_READ_END) / (SEQ2SEQ_COMPRESS_END - SEQ2SEQ_READ_END),
      0,
      1
    );
    const generate = THREE.MathUtils.clamp(
      (t - SEQ2SEQ_COMPRESS_END) / (SEQ2SEQ_CYCLE - SEQ2SEQ_COMPRESS_END),
      0,
      1
    );
    phaseRef.current = t < SEQ2SEQ_READ_END ? 0 : t < SEQ2SEQ_COMPRESS_END ? 1 : 2;

    encoderRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const read = THREE.MathUtils.clamp(readProgress * encoderSteps - i, 0, 1);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.18 + read * 1.35;
      mat.opacity = 0.95 - compress * 0.72;
      mesh.scale.setScalar(1 - compress * 0.35);
    });

    decoderRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const emitted = THREE.MathUtils.clamp(generate * decoderSteps - i, 0, 1);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.12 + emitted * 1.55;
      mat.opacity = 0.18 + emitted * 0.78;
      mesh.scale.setScalar(0.45 + emitted * 0.55);
    });

    funnelRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const isEncoder = i < encoderSteps;
      mat.opacity = isEncoder ? 0.12 + readProgress * 0.35 * (1 - compress) : 0.08 + generate * 0.4;
    });

    cellRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const filled = compress > i / CONTEXT_CELLS;
      const jitter = filled ? 0.15 * Math.sin(elapsed * 14 + i) : 0;
      mat.emissiveIntensity = filled ? 0.85 + jitter : 0.08;
      mat.color.set(filled ? "#e8eef6" : "#2a3138");
      mat.emissive.set(filled ? "#c5d0dc" : "#2a3138");
    });

    if (frameRef.current) {
      const mat = frameRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.35 + compress * 0.35;
    }

    overflowRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const p = (elapsed * 0.55 + i * 0.14) % 1;
      mesh.position.set(1.15 + p * 1.35, -1.72 + Math.sin(p * 7 + i) * 0.16, 0.04);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = generate > 0.4 && beat.current.morphs >= 2 ? Math.sin(p * Math.PI) * 0.8 : 0;
    });
  });

  const encoderCaption = phase === 0 ? "encoder: reading, one word at a time" : "encoder states: discarded after the last word";
  const decoderCaption =
    phase < 2 ? "decoder: waiting on a single vector" : "decoder: no access to the source words";

  return (
    <group position={[0, 0.15, 0]}>
      <Caption position={[0, 2.55, 0]} size={0.2} color="#e8eef6">
        {SEQ2SEQ_PHASES[phase]}
      </Caption>
      <Caption position={[0, 2.18, 0]} size={0.14} color="#8a97a5">
        sequence to sequence, 2014: the entire sentence, forced through one needle
      </Caption>

      {encoderX.map((x, i) => (
        <group key={`e-${i}`} position={[x, 0.55, 0]}>
          <mesh
            ref={(el: THREE.Mesh | null) => {
              encoderRefs.current[i] = el;
            }}
          >
            <boxGeometry args={[0.58, 0.4, 0.12]} />
            <meshStandardMaterial color="#4fd8ff" emissive="#4fd8ff" emissiveIntensity={0.4} transparent />
          </mesh>
          <Caption position={[0, 0, 0.1]} size={0.13} color="#e8f7ff">
            {SEQ2SEQ_SOURCE[i] ?? ""}
          </Caption>
        </group>
      ))}
      <Caption position={[encoderX[0] ?? -4, 1.18, 0]} size={0.145} anchorX="left" color="#4fd8ff">
        {encoderCaption}
      </Caption>

      {funnelSegs.map((seg, i) => {
        const dx = seg.x2 - seg.x1;
        const dy = seg.y2 - seg.y1;
        const len = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        return (
          <mesh
            key={`funnel-${i}`}
            ref={(el: THREE.Mesh | null) => {
              funnelRefs.current[i] = el;
            }}
            position={[(seg.x1 + seg.x2) / 2, (seg.y1 + seg.y2) / 2, -0.08]}
            rotation={[0, 0, angle]}
          >
            <planeGeometry args={[len, 0.018]} />
            <meshBasicMaterial
              color={i < encoderSteps ? "#4fd8ff" : "#ff9d4d"}
              transparent
              opacity={0.2}
              depthWrite={false}
            />
          </mesh>
        );
      })}

      
      <mesh ref={frameRef} position={[0, 0.55, -0.06]}>
        <planeGeometry args={[0.92, 1.12]} />
        <meshBasicMaterial color="#8a97a5" transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.55, -0.08]}>
        <planeGeometry args={[0.84, 1.04]} />
        <meshBasicMaterial color="#12161c" transparent opacity={0.95} depthWrite={false} />
      </mesh>
      {Array.from({ length: CONTEXT_CELLS }, (_, i) => (
        <mesh
          key={`c-${i}`}
          ref={(el: THREE.Mesh | null) => {
            cellRefs.current[i] = el;
          }}
          position={[-0.27 + (i % 4) * 0.18, 0.88 - Math.floor(i / 4) * 0.18, 0]}
        >
          <boxGeometry args={[0.14, 0.14, 0.04]} />
          <meshStandardMaterial color="#2a3138" emissive="#2a3138" emissiveIntensity={0.08} />
        </mesh>
      ))}
      <Caption position={[0, 1.22, 0]} size={0.13} color="#e8eef6">
        {`context vector · ${contextDims} numbers`}
      </Caption>
      <Caption position={[0, -0.18, 0]} size={0.125} color="#c7d0d8">
        all the decoder ever sees
      </Caption>

      {decoderX.map((x, i) => (
        <group key={`d-${i}`} position={[x, 0.55, 0]}>
          <mesh
            ref={(el: THREE.Mesh | null) => {
              decoderRefs.current[i] = el;
            }}
          >
            <boxGeometry args={[0.58, 0.4, 0.12]} />
            <meshStandardMaterial color="#ff9d4d" emissive="#ff9d4d" emissiveIntensity={0.4} transparent />
          </mesh>
          <Caption position={[0, 0, 0.1]} size={0.13} color="#fff3e0">
            {SEQ2SEQ_TARGET[i] ?? ""}
          </Caption>
        </group>
      ))}
      <Caption
        position={[decoderX[decoderX.length - 1] ?? 4, 1.18, 0]}
        size={0.145}
        anchorX="right"
        color="#ff9d4d"
      >
        {decoderCaption}
      </Caption>

      <Caption position={[0, -0.72, 0]} size={0.145} color="#c7d0d8">
        same 1,000 numbers. two input sizes.
      </Caption>
      <CapacityBar
        y={-1.18}
        label="5-word sentence"
        verdict="room to spare"
        fill={0.22}
        color="#4fd8ff"
        verdictColor="#7dffb0"
      />
      <CapacityBar
        y={-1.72}
        label="500-word paragraph"
        verdict="something has to give"
        fill={1}
        color="#ff4d6a"
        verdictColor="#ff4d6a"
      />
      {Array.from({ length: 8 }, (_, i) => (
        <mesh
          key={`o-${i}`}
          ref={(el: THREE.Mesh | null) => {
            overflowRefs.current[i] = el;
          }}
        >
          <boxGeometry args={[0.08, 0.08, 0.04]} />
          <meshBasicMaterial color="#ff4d6a" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      <Caption position={[0, -2.28, 0]} size={0.135} color="#8a97a5">
        translation quality collapses as sentences grow: the flaw is architectural
      </Caption>
    </group>
  );
}


function CapacityBar({
  y,
  label,
  verdict,
  fill,
  color,
  verdictColor,
}: {
  y: number;
  label: string;
  verdict: string;
  fill: number;
  color: string;
  verdictColor: string;
}) {
  const TRACK = 2.1;
  const width = TRACK * THREE.MathUtils.clamp(fill, 0, 1);
  return (
    <group position={[0, y, 0]}>
      <Caption position={[-1.15, 0, 0]} size={0.135} anchorX="right" color="#8a97a5">
        {label}
      </Caption>
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[TRACK, 0.16, 0.02]} />
        <meshBasicMaterial color="#20262c" transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <mesh position={[-TRACK / 2 + width / 2, 0, 0]}>
        <boxGeometry args={[Math.max(0.02, width), 0.16, 0.05]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} />
      </mesh>
      <Caption position={[1.15, 0, 0]} size={0.135} anchorX="left" color={verdictColor}>
        {verdict}
      </Caption>
    </group>
  );
}
export default function SequenceVisualizer({
  mode,
  params = {},
  position = [0, 0, 0],
}: SequenceVisualizerProps) {
  return (
    <group position={position}>
      {mode === "BACKPROP_GRAPH" && <BackpropGraphScene params={params} />}
      {mode === "NGRAM_LATTICE" && <NgramLatticeScene params={params} />}
      {mode === "RNN_UNROLL" && <RnnUnrollScene params={params} />}
      {mode === "GRADIENT_DECAY_FIELD" && <GradientDecayScene params={params} />}
      {mode === "SEQ2SEQ_BOTTLENECK" && <Seq2SeqScene params={params} />}
    </group>
  );
}
