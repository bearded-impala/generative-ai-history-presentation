import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { clampCount, stringParam } from "./params";
import { seededRandom } from "../shared/random";
import type { Scene3DParams } from "../presentation/types";
import { useAnimPlayhead, useShowBeat } from "../presentation/useShowBeat";
import { useCoarseReadout } from "./useCoarseReadout";

type AttentionScene = "BAHDANAU" | "TRANSFORMER" | "QKV" | "MULTI_HEAD";

interface AttentionVisualizerProps {
  scene: AttentionScene;
  params?: Scene3DParams;
  position?: [number, number, number];
}


function nestedColor(bag: unknown, key: string, fallback: string): string {
  if (bag !== null && typeof bag === "object" && !Array.isArray(bag)) {
    const value = (bag as Record<string, unknown>)[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return fallback;
}


function normalizeRow(raw: number[]): number[] {
  const sum = raw.reduce((a, b) => a + b, 0);
  return sum > 0 ? raw.map((r) => r / sum) : raw.map(() => 1 / Math.max(1, raw.length));
}


function softmax(scores: number[]): number[] {
  if (scores.length === 0) return [];
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - max));
  const z = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / z);
}


function pseudoVector(seed: number, dim: number): number[] {
  return Array.from({ length: dim }, (_, d) => seededRandom(seed * 13.71 + d * 5.93 + 2.17) * 2 - 1);
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) s += a[i] * b[i];
  return s;
}
type AnchorX = "center" | "left" | "right";

function Label({
  text,
  position,
  size = 0.14,
  color = "#8fa2d6",
  anchorX = "center",
}: {
  text: string;
  position: [number, number, number];
  size?: number;
  color?: string;
  anchorX?: AnchorX;
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
    >
      {text}
    </Text>
  );
}
interface FlatSegment {
  mid: [number, number, number];
  angle: number;
  length: number;
}

function flatSegment(x1: number, y1: number, x2: number, y2: number, z = 0): FlatSegment {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return {
    mid: [(x1 + x2) / 2, (y1 + y2) / 2, z],
    angle: Math.atan2(dy, dx),
    length: Math.hypot(dx, dy),
  };
}


function useUnitPlane(): THREE.PlaneGeometry {
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}


const READOUT_UPDATE_MS = 260;
const SOURCE_WORDS = ["L'", "accord", "sur", "la", "zone", "économique", "européenne", "."];
const TARGET_WORDS = ["The", "agreement", "on", "the", "European", "…"];

const GOLD = "#ffd479";
const GOLD_HOT = "#ffe08a";
const DECODER_BLUE = "#dce6ff";
const GHOST_GREY = "#9aa3b2";
const DIM_STEEL = "#6d7a92";

const B_DEC_Y = 2.05;
const B_ENC_Y = -1.0;
const B_BAR_BASE = -2.55;
const B_BAR_MAX_H = 0.62;
const B_STEP_DUR = 2.5;


function alignmentRow(step: number, targetLen: number, sourceLen: number): number[] {
  const center = targetLen > 1 ? (step * (sourceLen - 1)) / (targetLen - 1) : 0;
  const sigma = 1.15;
  const raw: number[] = [];
  for (let j = 0; j < sourceLen; j++) {
    const d = j - center;
    const gaussian = Math.exp(-(d * d) / (2 * sigma * sigma));
    const jitter = 0.7 + 0.6 * seededRandom(step * 7.31 + j * 3.17 + 1.9);
    raw.push(gaussian * jitter + 0.012);
  }
  return normalizeRow(raw);
}

function BahdanauScene({ params }: { params: Scene3DParams }) {
  const sourceLen = clampCount(params.sourceLength, 8, 4, 10);
  const targetLen = clampCount(params.targetStep, 5, 3, 8);
  const unitPlane = useUnitPlane();

  const sourceWords = useMemo(
    () => Array.from({ length: sourceLen }, (_, j) => SOURCE_WORDS[j % SOURCE_WORDS.length]),
    [sourceLen]
  );
  const targetWords = useMemo(
    () => Array.from({ length: targetLen }, (_, i) => TARGET_WORDS[i % TARGET_WORDS.length]),
    [targetLen]
  );

  const encSpacing = Math.min(1.25, 9.0 / Math.max(1, sourceLen - 1));
  const decSpacing = Math.min(1.5, 6.4 / Math.max(1, targetLen - 1));
  const encBoxW = Math.max(0.5, Math.min(1.02, encSpacing - 0.22));
  const decBoxW = Math.max(0.5, Math.min(0.98, decSpacing - 0.5));

  const encX = useMemo(
    () => Array.from({ length: sourceLen }, (_, j) => (j - (sourceLen - 1) / 2) * encSpacing),
    [sourceLen, encSpacing]
  );
  const decX = useMemo(
    () => Array.from({ length: targetLen }, (_, i) => (i - (targetLen - 1) / 2) * decSpacing),
    [targetLen, decSpacing]
  );
  const weightRows = useMemo(
    () => Array.from({ length: targetLen }, (_, i) => alignmentRow(i, targetLen, sourceLen)),
    [targetLen, sourceLen]
  );
  const fanLines = useMemo(() => {
    const list: { key: string; step: number; j: number; seg: FlatSegment }[] = [];
    for (let s = 0; s < targetLen; s++) {
      for (let j = 0; j < sourceLen; j++) {
        list.push({
          key: `${s}-${j}`,
          step: s,
          j,
          seg: flatSegment(decX[s], B_DEC_Y - 0.25, encX[j], B_ENC_Y + 0.24, -0.15),
        });
      }
    }
    return list;
  }, [targetLen, sourceLen, decX, encX]);

  const fanRefs = useRef<(THREE.Mesh | null)[]>([]);
  const encRefs = useRef<(THREE.Mesh | null)[]>([]);
  const decRefs = useRef<(THREE.Mesh | null)[]>([]);
  const barRefs = useRef<(THREE.Mesh | null)[]>([]);
  const cursorRef = useRef<THREE.Mesh>(null!);
  const ghostRef = useRef<THREE.Mesh>(null!);
  const latestWeights = useRef<number[]>(weightRows[0].slice());
  const readout = useCoarseReadout(
    weightRows[0].slice(),
    () => latestWeights.current.slice(),
    READOUT_UPDATE_MS,
  );

  const cycle = targetLen * B_STEP_DUR;
  const scratchColor = useMemo(() => new THREE.Color(), []);
  const hotColor = useMemo(() => new THREE.Color(GOLD_HOT), []);
  const warmColor = useMemo(() => new THREE.Color(GOLD), []);
  const keepPlay = useAnimPlayhead({ morph: 1, hold: 40 });
  const play = useAnimPlayhead({ morph: 2 });
  const beat = useShowBeat();

  useFrame(() => {
    const morphs = beat.current.morphs;
    const keepOn = keepPlay.current.armed || morphs >= 1;
    const armed = play.current.armed || morphs >= 2;
    const dissolve = morphs >= 3;
    const elapsed = armed ? play.current.t : 0;
    const t = elapsed % cycle;
    const raw = t / B_STEP_DUR;
    const step = THREE.MathUtils.clamp(Math.floor(raw), 0, targetLen - 1);
    const frac = raw - Math.floor(raw);
    const blend = armed ? THREE.MathUtils.smoothstep(frac, 0, 0.34) : 0;
    const prev = (step - 1 + targetLen) % targetLen;

    const live = latestWeights.current;
    for (let j = 0; j < sourceLen; j++) {
      live[j] = armed
        ? THREE.MathUtils.lerp(weightRows[prev][j], weightRows[step][j], blend)
        : 0;
    }
    const alive = dissolve ? 0.5 + 0.5 * Math.cos((2 * Math.PI * t) / cycle) : 1;
    const fanBoost = 0.72 + 0.28 * (1 - alive);

    fanRefs.current.forEach((mesh, idx) => {
      if (!mesh) return;
      if (!armed) {
        mesh.visible = false;
        return;
      }
      const line = fanLines[idx];
      const share = line.step === step ? blend : line.step === prev ? 1 - blend : 0;
      if (share <= 0.001) {
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      const w = weightRows[line.step][line.j];
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = share * fanBoost * (0.06 + w * 0.92);
      scratchColor.copy(warmColor).lerp(hotColor, THREE.MathUtils.clamp(w * 2.6, 0, 1));
      material.color.copy(scratchColor);
      mesh.scale.set(line.seg.length, 0.014 + w * 0.17, 1);
    });

    decRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (!armed) {
        material.emissiveIntensity = 0.22;
        return;
      }
      const focus = i === step ? blend : i === prev ? 1 - blend : 0;
      material.emissiveIntensity = 0.22 + focus * 2.1;
    });

    encRefs.current.forEach((mesh, j) => {
      if (!mesh) return;
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (armed) {
        material.emissiveIntensity = 0.28 + live[j] * 3.4;
      } else if (keepOn) {
        material.emissiveIntensity = 0.55 + 0.35 * Math.sin(keepPlay.current.t * 2.1 + j * 0.4);
      } else {
        material.emissiveIntensity = 0.12;
      }
    });

    barRefs.current.forEach((mesh, j) => {
      if (!mesh) return;
      const h = armed ? Math.max(0.012, live[j] * B_BAR_MAX_H * (1 / 0.55)) : 0.012;
      const clamped = Math.min(h, B_BAR_MAX_H);
      mesh.scale.y = clamped;
      mesh.position.y = B_BAR_BASE + clamped / 2;
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = armed ? 0.4 + live[j] * 3.0 : 0.15;
    });

    if (cursorRef.current) {
      cursorRef.current.visible = armed;
      if (armed) {
        cursorRef.current.position.x = THREE.MathUtils.lerp(decX[prev], decX[step], blend);
      }
    }

    if (ghostRef.current) {
      const mat = ghostRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.08 + alive * 0.4;
      mat.emissiveIntensity = 0.1 + alive * 0.5;
      ghostRef.current.scale.setScalar(0.85 + alive * 0.2);
    }
  });

  return (
    <group position={[-0.1, 0, 0]}>
      <Label
        text="BAHDANAU 2014 · alignment: the decoder looks back"
        position={[0, 3.05, 0]}
        size={0.2}
        color={GOLD}
      />
      <Label
        text="decoder output steps: a fresh weighted blend each step"
        position={[0, 2.7, 0]}
        size={0.15}
        color={DECODER_BLUE}
      />

      
      <mesh
        ref={cursorRef}
        position={[decX[0], 2.46, 0.05]}
        geometry={unitPlane}
        scale={[decBoxW, 0.055, 1]}
        visible={false}
      >
        <meshStandardMaterial
          color={DECODER_BLUE}
          emissive={DECODER_BLUE}
          emissiveIntensity={1.6}
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </mesh>

      
      {targetWords.map((word, i) => (
        <group key={`dec-${i}`} position={[decX[i], B_DEC_Y, 0]}>
          <mesh
            ref={(el: THREE.Mesh | null) => {
              decRefs.current[i] = el;
            }}
          >
            <boxGeometry args={[decBoxW, 0.46, 0.16]} />
            <meshStandardMaterial
              color={DECODER_BLUE}
              emissive={DECODER_BLUE}
              emissiveIntensity={0.22}
              transparent
              opacity={0.55}
            />
          </mesh>
          <Label text={word} position={[0, 0, 0.26]} size={0.145} color="#f2f6ff" />
        </group>
      ))}

      
      {fanLines.map((line, idx) => (
        <mesh
          key={line.key}
          ref={(el: THREE.Mesh | null) => {
            fanRefs.current[idx] = el;
          }}
          geometry={unitPlane}
          position={line.seg.mid}
          rotation={[0, 0, line.seg.angle]}
        >
          <meshBasicMaterial color={GOLD} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}

      
      {sourceWords.map((word, j) => (
        <group key={`enc-${j}`} position={[encX[j], B_ENC_Y, 0]}>
          <mesh
            ref={(el: THREE.Mesh | null) => {
              encRefs.current[j] = el;
            }}
          >
            <boxGeometry args={[encBoxW, 0.44, 0.16]} />
            <meshStandardMaterial
              color={GOLD}
              emissive={GOLD}
              emissiveIntensity={0.28}
              transparent
              opacity={0.55}
            />
          </mesh>
          <Label text={word} position={[0, 0, 0.26]} size={0.125} color="#fff3d4" />
        </group>
      ))}
      <Label
        text="encoder hidden states: one per input word"
        position={[0, -1.52, 0]}
        size={0.15}
        color={GOLD}
      />

      
      {sourceWords.map((_, j) => (
        <mesh
          key={`bar-${j}`}
          ref={(el: THREE.Mesh | null) => {
            barRefs.current[j] = el;
          }}
          position={[encX[j], B_BAR_BASE, 0]}
        >
          <boxGeometry args={[0.19, 1, 0.12]} />
          <meshStandardMaterial color={GOLD_HOT} emissive={GOLD_HOT} emissiveIntensity={0.4} />
        </mesh>
      ))}
      {sourceWords.map((_, j) => (
        <Label
          key={`num-${j}`}
          text={(readout[j] ?? 0).toFixed(2)}
          position={[encX[j], -2.76, 0]}
          size={0.12}
          color="#ffe08a"
        />
      ))}
      <Label
        text="alignment weights: learned, softmax-normalized, Σ = 1.00"
        position={[0, -3.02, 0]}
        size={0.14}
        color={DIM_STEEL}
      />

      
      <mesh ref={ghostRef} position={[4.55, 1.42, -0.1]}>
        <boxGeometry args={[0.55, 0.7, 0.08]} />
        <meshStandardMaterial color={GHOST_GREY} emissive={GHOST_GREY} emissiveIntensity={0.2} transparent opacity={0.35} />
      </mesh>
      <Label text="one fixed vector" position={[4.55, 0.88, 0]} size={0.125} color={GHOST_GREY} />
      <Label text="no longer needed" position={[4.55, 0.68, 0]} size={0.125} color={GHOST_GREY} />
    </group>
  );
}

const T_TOKENS = ["Every", "word", "attends", "to", "every", "other", "word"];
const T_DEC_TOKENS = ["Le", "chat", "s'est", "assis", "sur", "le", "tapis"];
const T_ROW_CENTER_X = -1.7;
const T_ROW_Y = 0.35;
const T_DEC_Y = -1.12;
const T_ARC_BASE_Y = 0.6;
const T_ARC_SQUASH = 0.38;
const T_GRID_CENTER_X = 3.72;
const T_ENC_X = -3.95;
const T_DEC_X = 0.55;
const T_TOWER_W = 1.4;
const ENCODER_VIOLET = "#c77dff";
const DECODER_GOLD = "#ffd24a";

const RECURRENT_DIM = "#ff9d4d";
const MESH_VIOLET = "#c77dff";
const PARALLEL_GOLD = "#ffd24a";
const TOKEN_BLUE = "#dce6ff";

function TransformerScene({ params }: { params: Scene3DParams }) {
  const layerCount = clampCount(params.layerCount, 6, 2, 8);
  const headsPerLayer = clampCount(params.headsPerLayer, 8, 1, 16);
  const unitPlane = useUnitPlane();

  const n = T_TOKENS.length;
  const nDec = T_DEC_TOKENS.length;
  const spacing = 0.92;
  const tokenX = useMemo(
    () => Array.from({ length: n }, (_, i) => T_ROW_CENTER_X + (i - (n - 1) / 2) * spacing),
    [n]
  );
  const decX = useMemo(
    () => Array.from({ length: nDec }, (_, i) => T_ROW_CENTER_X + (i - (nDec - 1) / 2) * 0.92),
    [nDec]
  );
  const crossWeights = useMemo(() => {
    return Array.from({ length: nDec }, (_, di) => {
      const raw = Array.from({ length: n }, (_, ei) => {
        const center = (di / Math.max(1, nDec - 1)) * (n - 1);
        const g = Math.exp(-((ei - center) ** 2) / 2.4);
        return g + 0.04 * seededRandom(di * 9.1 + ei * 3.7);
      });
      return softmax(raw);
    });
  }, [n, nDec]);
  const pairWeights = useMemo(() => {
    const q = Array.from({ length: n }, (_, i) => pseudoVector(i + 1, 4));
    const k = Array.from({ length: n }, (_, i) => pseudoVector(i + 41, 4));
    const rows = q.map((qi) => softmax(k.map((kj) => dot(qi, kj))));
    const max = Math.max(0.0001, ...rows.flat());
    return rows.map((row) => row.map((v) => v / max));
  }, [n]);
  const arcs = useMemo(() => {
    const list: {
      key: string;
      geometry: THREE.RingGeometry;
      x: number;
      weight: number;
      phase: number;
      yOff: number;
    }[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const r = Math.abs(tokenX[j] - tokenX[i]) / 2;
        const reverse = i > j;
        list.push({
          key: `arc-${i}-${j}`,
          geometry: new THREE.RingGeometry(
            Math.max(0.005, r - (reverse ? 0.04 : 0.022)),
            r + (reverse ? 0.006 : 0.018),
            28,
            1,
            reverse ? 0.22 : 0,
            Math.PI - (reverse ? 0.22 : 0),
          ),
          x: (tokenX[i] + tokenX[j]) / 2,
          weight: pairWeights[i][j],
          phase: seededRandom(i * 4.7 + j * 9.1),
          yOff: reverse ? 0.14 : 0,
        });
      }
    }
    return list;
  }, [n, tokenX, pairWeights]);
  useEffect(() => () => arcs.forEach((a) => a.geometry.dispose()), [arcs]);

  const chainSegments = useMemo(
    () =>
      Array.from({ length: n - 1 }, (_, i) => ({
        key: `chain-${i}`,
        seg: flatSegment(tokenX[i], -0.3, tokenX[i + 1] - 0.13, -0.3, -0.05),
        tipX: tokenX[i + 1] - 0.06,
      })),
    [n, tokenX]
  );

  const crossSegments = useMemo(() => {
    const list: { key: string; seg: FlatSegment; di: number; ei: number }[] = [];
    for (let di = 0; di < nDec; di++) {
      for (let ei = 0; ei < n; ei++) {
        list.push({
          key: `xattn-${di}-${ei}`,
          seg: flatSegment(decX[di], T_DEC_Y + 0.22, tokenX[ei], T_ROW_Y - 0.22, -0.08),
          di,
          ei,
        });
      }
    }
    return list;
  }, [n, nDec, decX, tokenX]);

  const arcRefs = useRef<(THREE.Mesh | null)[]>([]);
  const tokenRefs = useRef<(THREE.Mesh | null)[]>([]);
  const chainRefs = useRef<(THREE.Mesh | null)[]>([]);
  const tipRefs = useRef<(THREE.Mesh | null)[]>([]);
  const seqCellRefs = useRef<(THREE.Mesh | null)[]>([]);
  const parCellRefs = useRef<(THREE.Mesh | null)[]>([]);
  const encoderPlateRefs = useRef<(THREE.Mesh | null)[]>([]);
  const decoderPlateRefs = useRef<(THREE.Mesh | null)[]>([]);
  const bridgeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const crossRefs = useRef<(THREE.Mesh | null)[]>([]);
  const decTokenRefs = useRef<(THREE.Mesh | null)[]>([]);
  const recurrentPipRef = useRef<THREE.Mesh>(null!);
  const attentionPipRef = useRef<THREE.Mesh>(null!);
  const towersHudRef = useRef<THREE.Group>(null!);
  const parHudRef = useRef<THREE.Group>(null!);
  const seqHudRef = useRef<THREE.Group>(null!);

  const CELLS = 8;
  const cellX = useMemo(
    () => Array.from({ length: CELLS }, (_, k) => T_GRID_CENTER_X + (k - (CELLS - 1) / 2) * 0.375),
    []
  );
  const beat = useShowBeat();
  const play = useAnimPlayhead({ morph: 1, hold: 3.05 });

  useFrame((state) => {
    const elapsed = play.current.armed ? play.current.t : 0;
    const t = elapsed;
    const morphs = beat.current.morphs;
    const towersIn = morphs >= 2;
    const chainAlpha = play.current.armed ? 1 - THREE.MathUtils.smoothstep(t, 2.1, 2.9) : 1;
    const meshAlpha = play.current.armed ? THREE.MathUtils.smoothstep(t, 2.9, 3.05) : 0;
    const seqActive = Math.floor((t / 0.28) % n);
    const unisonPulse = 0.78 + 0.22 * Math.sin(state.clock.elapsedTime * 2.4);

    arcRefs.current.forEach((mesh, idx) => {
      if (!mesh) return;
      const arc = arcs[idx];
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = meshAlpha * unisonPulse * (0.12 + arc.weight * 0.55);
      mesh.scale.set(1, T_ARC_SQUASH, 1);
      mesh.position.y = T_ARC_BASE_Y + arc.yOff;
    });

    tokenRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const material = mesh.material as THREE.MeshStandardMaterial;
      const sequential = chainAlpha * (i === seqActive ? 2.3 : 0.3);
      material.emissiveIntensity = 0.2 + sequential + meshAlpha * 1.7 * unisonPulse;
    });

    chainRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = chainAlpha * (i === seqActive ? 0.95 : 0.22);
      const tip = tipRefs.current[i];
      if (tip) (tip.material as THREE.MeshBasicMaterial).opacity = material.opacity;
    });
    const seqFill = play.current.armed ? Math.floor((elapsed * 3.2) % (CELLS + 2)) : -1;
    seqCellRefs.current.forEach((mesh, k) => {
      if (!mesh) return;
      const material = mesh.material as THREE.MeshStandardMaterial;
      const done = k < seqFill;
      const current = k === seqFill;
      material.emissiveIntensity = current ? 2.6 : done ? 0.85 : 0.14;
    });
    const parOn = morphs >= 3;
    const parFlash = parOn ? 0.45 + 0.55 * Math.pow(1 - ((state.clock.elapsedTime * 1.4) % 1), 2.2) : 0;
    parCellRefs.current.forEach((mesh) => {
      if (!mesh) return;
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = parOn ? 0.35 + parFlash * 2.4 : 0;
    });
    if (parHudRef.current) parHudRef.current.visible = parOn;
    if (seqHudRef.current) seqHudRef.current.visible = play.current.armed;

    const towerAlpha = towersIn ? 1 : 0;
    const sweep = (state.clock.elapsedTime * 0.55) % (layerCount + 1.4);
    encoderPlateRefs.current.forEach((mesh, l) => {
      if (!mesh) return;
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = towerAlpha * (0.16 + Math.max(0, 1 - Math.abs(sweep - l) * 1.6) * 0.5);
    });
    decoderPlateRefs.current.forEach((mesh, l) => {
      if (!mesh) return;
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = towerAlpha * (0.16 + Math.max(0, 1 - Math.abs(sweep - l) * 1.6) * 0.5);
    });
    bridgeRefs.current.forEach((mesh) => {
      if (!mesh) return;
      (mesh.material as THREE.MeshBasicMaterial).opacity = towerAlpha * 0.45;
    });

    const decCursor = Math.floor((elapsed * 0.65) % nDec);
    crossRefs.current.forEach((mesh, idx) => {
      if (!mesh) return;
      const di = Math.floor(idx / n);
      const ei = idx % n;
      const w = crossWeights[di][ei];
      const focus = di === decCursor ? 1 : 0.28;
      (mesh.material as THREE.MeshBasicMaterial).opacity = towerAlpha * focus * (0.06 + w * 0.85);
    });
    decTokenRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.opacity = 0.2 + towerAlpha * 0.55;
      material.emissiveIntensity = towerAlpha * (i === decCursor ? 2.2 : 0.55);
    });

    if (recurrentPipRef.current) {
      (recurrentPipRef.current.material as THREE.MeshBasicMaterial).opacity = 0.12 + chainAlpha * 0.8;
    }
    if (attentionPipRef.current) {
      (attentionPipRef.current.material as THREE.MeshBasicMaterial).opacity = 0.12 + meshAlpha * 0.8;
    }
    if (towersHudRef.current) towersHudRef.current.visible = towersIn;
  });

  return (
    <group position={[0, -0.3, 0]}>
      <Label
        text="2017 · throw the recurrent loop away entirely"
        position={[0, 3.42, 0]}
        size={0.19}
        color={PARALLEL_GOLD}
      />

      
      {Array.from({ length: layerCount }, (_, l) => (
        <mesh
          key={`enc-plate-${l}`}
          ref={(el: THREE.Mesh | null) => {
            encoderPlateRefs.current[l] = el;
          }}
          geometry={unitPlane}
          position={[T_ENC_X, 2.05 + l * 0.17, -0.6]}
          scale={[T_TOWER_W, 0.085, 1]}
        >
          <meshBasicMaterial color={ENCODER_VIOLET} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      {Array.from({ length: layerCount }, (_, l) => (
        <mesh
          key={`dec-plate-${l}`}
          ref={(el: THREE.Mesh | null) => {
            decoderPlateRefs.current[l] = el;
          }}
          geometry={unitPlane}
          position={[T_DEC_X, 2.05 + l * 0.17, -0.6]}
          scale={[T_TOWER_W, 0.085, 1]}
        >
          <meshBasicMaterial color={DECODER_GOLD} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      {Array.from({ length: 3 }, (_, i) => {
        const y = 2.05 + (i * 2 + 0.5) * 0.17;
        const seg = flatSegment(T_ENC_X + T_TOWER_W * 0.5, y, T_DEC_X - T_TOWER_W * 0.5, y, -0.55);
        return (
          <mesh
            key={`bridge-${i}`}
            ref={(el: THREE.Mesh | null) => {
              bridgeRefs.current[i] = el;
            }}
            geometry={unitPlane}
            position={seg.mid}
            rotation={[0, 0, seg.angle]}
            scale={[seg.length, 0.02, 1]}
          >
            <meshBasicMaterial color={TOKEN_BLUE} transparent opacity={0} depthWrite={false} />
          </mesh>
        );
      })}
      <group ref={towersHudRef} visible={false}>
      <Label text="ENCODER" position={[T_ENC_X, 3.12, 0]} size={0.15} color={ENCODER_VIOLET} />
      <Label text="DECODER" position={[T_DEC_X, 3.12, 0]} size={0.15} color={DECODER_GOLD} />
      <Label
        text={`${layerCount} + ${layerCount} layers · ${headsPerLayer} heads · still a translator`}
        position={[T_ROW_CENTER_X, 2.48, 0]}
        size={0.145}
        color={MESH_VIOLET}
      />
      {crossSegments.map((c, idx) => (
        <mesh
          key={c.key}
          ref={(el: THREE.Mesh | null) => {
            crossRefs.current[idx] = el;
          }}
          geometry={unitPlane}
          position={c.seg.mid}
          rotation={[0, 0, c.seg.angle]}
          scale={[c.seg.length, 0.018, 1]}
        >
          <meshBasicMaterial color={DECODER_GOLD} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      {T_DEC_TOKENS.map((word, i) => (
        <group key={`dec-${i}`} position={[decX[i], T_DEC_Y, 0]}>
          <mesh
            ref={(el: THREE.Mesh | null) => {
              decTokenRefs.current[i] = el;
            }}
          >
            <boxGeometry args={[0.78, 0.38, 0.14]} />
            <meshStandardMaterial
              color={DECODER_GOLD}
              emissive={DECODER_GOLD}
              emissiveIntensity={0.3}
              transparent
              opacity={0}
            />
          </mesh>
          <Label text={word} position={[0, 0, 0.22]} size={0.13} color="#fff6d6" />
        </group>
      ))}
      <Label
        text="cross-attention: the writer looks back at the reader"
        position={[T_ROW_CENTER_X, T_DEC_Y - 0.48, 0]}
        size={0.13}
        color={DECODER_GOLD}
      />
      </group>

      
      {arcs.map((arc, idx) => (
        <mesh
          key={arc.key}
          ref={(el: THREE.Mesh | null) => {
            arcRefs.current[idx] = el;
          }}
          geometry={arc.geometry}
          position={[arc.x, T_ARC_BASE_Y, 0.1]}
        >
          <meshBasicMaterial color={MESH_VIOLET} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      <mesh ref={attentionPipRef} geometry={unitPlane} position={[-3.68, 1.72, 0]} scale={[0.12, 0.12, 1]}>
        <meshBasicMaterial color={MESH_VIOLET} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <Label
        text="self attention: all pairs, one matrix multiply"
        position={[T_ROW_CENTER_X, 1.72, 0]}
        size={0.145}
        color={MESH_VIOLET}
      />

      
      {T_TOKENS.map((word, i) => (
        <group key={`tok-${i}`} position={[tokenX[i], T_ROW_Y, 0]}>
          <mesh
            ref={(el: THREE.Mesh | null) => {
              tokenRefs.current[i] = el;
            }}
          >
            <boxGeometry args={[0.78, 0.42, 0.14]} />
            <meshStandardMaterial
              color={TOKEN_BLUE}
              emissive={TOKEN_BLUE}
              emissiveIntensity={0.3}
              transparent
              opacity={0.5}
            />
          </mesh>
          <Label text={word} position={[0, 0, 0.22]} size={0.13} color="#f2f6ff" />
        </group>
      ))}

      {crossSegments.map((c, idx) => (
        <mesh
          key={c.key}
          ref={(el: THREE.Mesh | null) => {
            crossRefs.current[idx] = el;
          }}
          geometry={unitPlane}
          position={c.seg.mid}
          rotation={[0, 0, c.seg.angle]}
          scale={[c.seg.length, 0.018, 1]}
        >
          <meshBasicMaterial color={DECODER_GOLD} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      {T_DEC_TOKENS.map((word, i) => (
        <group key={`dec-${i}`} position={[decX[i], T_DEC_Y, 0]}>
          <mesh
            ref={(el: THREE.Mesh | null) => {
              decTokenRefs.current[i] = el;
            }}
          >
            <boxGeometry args={[0.95, 0.4, 0.14]} />
            <meshStandardMaterial
              color={DECODER_GOLD}
              emissive={DECODER_GOLD}
              emissiveIntensity={0.3}
              transparent
              opacity={0}
            />
          </mesh>
          <Label text={word} position={[0, 0, 0.22]} size={0.13} color="#fff6d6" />
        </group>
      ))}
      <Label
        text="cross-attention: the writer looks back at the reader"
        position={[T_ROW_CENTER_X, T_DEC_Y - 0.48, 0]}
        size={0.13}
        color={DECODER_GOLD}
      />

      {crossSegments.map((c, idx) => (
        <mesh
          key={c.key}
          ref={(el: THREE.Mesh | null) => {
            crossRefs.current[idx] = el;
          }}
          geometry={unitPlane}
          position={c.seg.mid}
          rotation={[0, 0, c.seg.angle]}
          scale={[c.seg.length, 0.018, 1]}
        >
          <meshBasicMaterial color={DECODER_GOLD} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      {T_DEC_TOKENS.map((word, i) => (
        <group key={`dec-${i}`} position={[decX[i], T_DEC_Y, 0]}>
          <mesh
            ref={(el: THREE.Mesh | null) => {
              decTokenRefs.current[i] = el;
            }}
          >
            <boxGeometry args={[0.95, 0.4, 0.14]} />
            <meshStandardMaterial
              color={DECODER_GOLD}
              emissive={DECODER_GOLD}
              emissiveIntensity={0.3}
              transparent
              opacity={0}
            />
          </mesh>
          <Label text={word} position={[0, 0, 0.22]} size={0.13} color="#fff6d6" />
        </group>
      ))}
      <Label
        text="cross-attention: the writer looks back at the reader"
        position={[T_ROW_CENTER_X, T_DEC_Y - 0.48, 0]}
        size={0.13}
        color={DECODER_GOLD}
      />

      
      {chainSegments.map((c, i) => (
        <group key={c.key}>
          <mesh
            ref={(el: THREE.Mesh | null) => {
              chainRefs.current[i] = el;
            }}
            geometry={unitPlane}
            position={c.seg.mid}
            rotation={[0, 0, c.seg.angle]}
            scale={[c.seg.length, 0.03, 1]}
          >
            <meshBasicMaterial color={RECURRENT_DIM} transparent opacity={0.3} depthWrite={false} />
          </mesh>
          <mesh
            ref={(el: THREE.Mesh | null) => {
              tipRefs.current[i] = el;
            }}
            position={[c.tipX, -0.3, -0.05]}
            rotation={[0, 0, -Math.PI / 2]}
          >
            <coneGeometry args={[0.055, 0.13, 8]} />
            <meshBasicMaterial color={RECURRENT_DIM} transparent opacity={0.3} depthWrite={false} />
          </mesh>
        </group>
      ))}
      <mesh ref={recurrentPipRef} geometry={unitPlane} position={[-3.28, -0.66, 0]} scale={[0.12, 0.12, 1]}>
        <meshBasicMaterial color={RECURRENT_DIM} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <Label
        text="recurrent: step n waits for step n−1"
        position={[T_ROW_CENTER_X, -0.66, 0]}
        size={0.145}
        color={RECURRENT_DIM}
      />

      
      <mesh geometry={unitPlane} position={[1.72, 0.45, -0.2]} scale={[0.015, 2.6, 1]}>
        <meshBasicMaterial color={DIM_STEEL} transparent opacity={0.35} depthWrite={false} />
      </mesh>

      
      <group ref={seqHudRef} visible={false}>
        <Label
          text="sequential: one token at a time"
          position={[T_GRID_CENTER_X, 1.42, 0]}
          size={0.13}
          color={RECURRENT_DIM}
        />
        {cellX.map((x, k) => (
          <mesh
            key={`seq-${k}`}
            ref={(el: THREE.Mesh | null) => {
              seqCellRefs.current[k] = el;
            }}
            position={[x, 1.08, 0]}
          >
            <boxGeometry args={[0.3, 0.24, 0.1]} />
            <meshStandardMaterial color={RECURRENT_DIM} emissive={RECURRENT_DIM} emissiveIntensity={0.14} />
          </mesh>
        ))}
      </group>
      <group ref={parHudRef} visible={false}>
        <Label
          text="parallel: the whole sequence at once"
          position={[T_GRID_CENTER_X, 0.5, 0]}
          size={0.13}
          color={PARALLEL_GOLD}
        />
        {cellX.map((x, k) => (
          <mesh
            key={`par-${k}`}
            ref={(el: THREE.Mesh | null) => {
              parCellRefs.current[k] = el;
            }}
            position={[x, 0.16, 0]}
          >
            <boxGeometry args={[0.3, 0.24, 0.1]} />
            <meshStandardMaterial color={PARALLEL_GOLD} emissive={PARALLEL_GOLD} emissiveIntensity={0} />
          </mesh>
        ))}
        <Label
          text="GPUs: n sequential steps → 1 step"
          position={[T_GRID_CENTER_X, -0.24, 0]}
          size={0.12}
          color={DIM_STEEL}
        />
      </group>
    </group>
  );
}

const QKV_WORDS = ["The", "river", "bank", "was", "steep", "."];
const QKV_DIM = 4;
const QKV_ROW_DWELL = 3.0;
const QKV_GRID_CENTER_X = -1.5;
const QKV_ROW_SPACING = 0.44;
const QKV_CELL = 0.4;
const QKV_ROWS_CENTER_Y = 0.1;
const QKV_BAR_BASE_Y = -1.2;
const QKV_BAR_SCALE = 1.55;

function QkvScene({ params }: { params: Scene3DParams }) {
  const n = clampCount(params.sequenceLength, 6, 4, 8);
  const dModel = clampCount(params.dModel, 512, 32, 4096);
  const dK = clampCount(params.dK, 64, 8, 512);
  const qColor = nestedColor(params.qkvColors, "q", "#ffd479");
  const kColor = nestedColor(params.qkvColors, "k", "#c77dff");
  const vColor = nestedColor(params.qkvColors, "v", "#7dd6ff");
  const unitPlane = useUnitPlane();

  const words = useMemo(
    () => Array.from({ length: n }, (_, i) => QKV_WORDS[i % QKV_WORDS.length]),
    [n]
  );

  const rowY = useMemo(
    () => Array.from({ length: n }, (_, i) => QKV_ROWS_CENTER_Y + ((n - 1) / 2 - i) * QKV_ROW_SPACING),
    [n]
  );
  const colX = useMemo(
    () => Array.from({ length: n }, (_, j) => QKV_GRID_CENTER_X + (j - (n - 1) / 2) * QKV_ROW_SPACING),
    [n]
  );

  
  const { scores, weights, valueNorms, valueVectors } = useMemo(() => {
    const q = Array.from({ length: n }, (_, i) => pseudoVector(i + 3, QKV_DIM));
    const k = Array.from({ length: n }, (_, j) => pseudoVector(j + 29, QKV_DIM));
    const v = Array.from({ length: n }, (_, j) => pseudoVector(j + 71, QKV_DIM));
    const scale = Math.sqrt(dK) / QKV_DIM;
    const s = q.map((qi) => k.map((kj) => dot(qi, kj) * scale));
    const w = s.map((row) => softmax(row));
    const norms = v.map((vec) => Math.hypot(...vec));
    const maxNorm = Math.max(0.0001, ...norms);
    return {
      scores: s,
      weights: w,
      valueNorms: norms.map((x) => x / maxNorm),
      valueVectors: v,
    };
  }, [n, dK]);

  const scoreRange = useMemo(() => {
    const flat = scores.flat();
    const min = Math.min(...flat);
    const max = Math.max(...flat);
    return { min, span: Math.max(0.0001, max - min) };
  }, [scores]);

  const cellRefs = useRef<(THREE.Mesh | null)[]>([]);
  const barRefs = useRef<(THREE.Mesh | null)[]>([]);
  const valueRefs = useRef<(THREE.Mesh | null)[]>([]);
  const outRefs = useRef<(THREE.Mesh | null)[]>([]);
  const rowHighlightRef = useRef<THREE.Mesh>(null!);
  const rowMarkerRef = useRef<THREE.Group>(null!);
  const qkvRefs = useRef<(THREE.Mesh | null)[]>([]);
  const latest = useRef<{ row: number; sum: number; shown: number[] }>({
    row: 0,
    sum: 1,
    shown: new Array(n).fill(0),
  });
  const readout = useCoarseReadout(
    { row: 0, sum: 1, shown: new Array(n).fill(0) },
    () => ({ row: latest.current.row, sum: latest.current.sum, shown: latest.current.shown.slice() }),
    READOUT_UPDATE_MS,
  );

  const cycle = n * QKV_ROW_DWELL;
  const play = useAnimPlayhead({ morph: 1 });
  const beat = useShowBeat();

  useFrame(() => {
    const morphs = beat.current.morphs;
    const armed = play.current.armed;
    const elapsed = armed ? play.current.t : 0;
    const t = elapsed % cycle;
    const raw = t / QKV_ROW_DWELL;
    const row = THREE.MathUtils.clamp(Math.floor(raw), 0, n - 1);
    const frac = raw - Math.floor(raw);
    const softmaxOn = morphs >= 2;
    const valuesOn = morphs >= 3;
    const morph = armed && softmaxOn ? THREE.MathUtils.smoothstep(frac, 0.18, 0.58) : 0;

    cellRefs.current.forEach((mesh, idx) => {
      if (!mesh) return;
      const i = Math.floor(idx / n);
      const j = idx % n;
      const norm = (scores[i][j] - scoreRange.min) / scoreRange.span;
      const material = mesh.material as THREE.MeshBasicMaterial;
      if (!armed) {
        material.opacity = 0.04;
        return;
      }
      const active = i === row ? 1 : 0.32;
      material.opacity = (0.08 + norm * 0.72) * active;
    });

    if (rowHighlightRef.current) {
      rowHighlightRef.current.visible = armed;
      rowHighlightRef.current.position.y = rowY[row];
    }
    if (rowMarkerRef.current) {
      rowMarkerRef.current.visible = armed;
      rowMarkerRef.current.position.y = rowY[row];
    }

    qkvRefs.current.forEach((mesh, idx) => {
      if (!mesh) return;
      const token = Math.floor(idx / 3);
      const material = mesh.material as THREE.MeshStandardMaterial;
      const kind = idx % 3;
      if (!armed) {
        material.emissiveIntensity = 0.45;
        return;
      }
      const isActiveQuery = kind === 0 && token === row;
      material.emissiveIntensity = isActiveQuery ? 2.4 : 0.45 + (kind === 2 && valuesOn ? weights[row][token] * 2.0 : 0);
    });

    const expRow = scores[row].map((s) => Math.exp(s));
    const maxExp = Math.max(0.0001, ...expRow);
    let sum = 0;
    for (let j = 0; j < n; j++) {
      const shown = armed ? THREE.MathUtils.lerp(expRow[j] / maxExp, weights[row][j], morph) : 0;
      latest.current.shown[j] = shown;
      sum += shown;
      const mesh = barRefs.current[j];
      if (mesh) {
        const h = Math.max(0.014, shown * QKV_BAR_SCALE);
        mesh.scale.y = h;
        mesh.position.y = QKV_BAR_BASE_Y + h / 2;
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = armed ? 0.5 + shown * 2.6 : 0.15;
        material.color.set(morph > 0.5 ? qColor : "#7f8aa3");
        material.emissive.set(morph > 0.5 ? qColor : "#7f8aa3");
      }
    }
    latest.current.row = row;
    latest.current.sum = armed ? sum : 0;

    valueRefs.current.forEach((mesh, j) => {
      if (!mesh) return;
      const h = 0.16 + valueNorms[j] * 0.42;
      mesh.scale.y = h;
      mesh.position.y = -0.3 + h / 2;
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = valuesOn ? 0.25 + weights[row][j] * morph * 4.0 : 0.12;
    });
    outRefs.current.forEach((mesh, d) => {
      if (!mesh) return;
      let blended = 0;
      for (let j = 0; j < n; j++) blended += weights[row][j] * valueVectors[j][d];
      const material = mesh.material as THREE.MeshStandardMaterial;
      mesh.scale.x = 0.35 + Math.min(1, Math.abs(blended) * 1.8) * 0.65;
      material.emissiveIntensity = valuesOn
        ? (0.3 + Math.min(1, Math.abs(blended) * 2.2) * 2.0) * (0.35 + morph * 0.65)
        : 0.12;
    });
  });

  const tokenLabelX = -4.5;
  const qkvX = [-4.3, -4.07, -3.84];
  const barSpacing = Math.min(0.36, 1.9 / Math.max(1, n - 1));
  const valueSpacing = Math.min(0.2, 1.0 / Math.max(1, n - 1));
  const barX = useMemo(
    () => Array.from({ length: n }, (_, j) => 1.45 + (j - (n - 1) / 2) * barSpacing),
    [n, barSpacing]
  );
  const valueX = useMemo(
    () => Array.from({ length: n }, (_, j) => 3.85 + (j - (n - 1) / 2) * valueSpacing),
    [n, valueSpacing]
  );
  const gridSpan = (n - 1) * QKV_ROW_SPACING + QKV_CELL;

  return (
    <group position={[0, -0.34, 0]}>
      <Label
        text="self attention · Query · Key · Value: one search per word"
        position={[0, 2.62, 0]}
        size={0.18}
        color={qColor}
      />

      
      <Label text="1 · Q / K / V projections" position={[-4.3, 2.15, 0]} size={0.14} color={qColor} />
      {words.map((word, i) => (
        <group key={`tok-${i}`} position={[0, rowY[i], 0]}>
          <Label text={word} position={[tokenLabelX, 0, 0]} size={0.125} color="#f2f6ff" anchorX="right" />
          {[qColor, kColor, vColor].map((c, kind) => (
            <mesh
              key={kind}
              ref={(el: THREE.Mesh | null) => {
                qkvRefs.current[i * 3 + kind] = el;
              }}
              position={[qkvX[kind], 0, 0]}
            >
              <boxGeometry args={[0.19, 0.19, 0.1]} />
              <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.45} />
            </mesh>
          ))}
        </group>
      ))}
      <Label text="→" position={[-3.35, QKV_ROWS_CENTER_Y, 0]} size={0.22} color={DIM_STEEL} />

      
      <Label
        text="2 · scores  Q · Kᵀ"
        position={[QKV_GRID_CENTER_X, 2.15, 0]}
        size={0.14}
        color={kColor}
      />
      <Label text="keys" position={[-3.02, 1.8, 0]} size={0.11} color={DIM_STEEL} anchorX="right" />
      {colX.map((x, j) => (
        <Label key={`col-${j}`} text={String(j + 1)} position={[x, 1.8, 0]} size={0.11} color={DIM_STEEL} />
      ))}
      <mesh
        ref={rowHighlightRef}
        geometry={unitPlane}
        position={[QKV_GRID_CENTER_X, rowY[0], -0.12]}
        scale={[gridSpan + 0.14, QKV_CELL + 0.1, 1]}
        visible={false}
      >
        <meshBasicMaterial color={qColor} transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <group ref={rowMarkerRef} position={[0, rowY[0], 0]} visible={false}>
        <Label text="query →" position={[-3.02, 0, 0]} size={0.11} color={qColor} anchorX="right" />
      </group>
      {rowY.map((y, i) =>
        colX.map((x, j) => (
          <mesh
            key={`cell-${i}-${j}`}
            ref={(el: THREE.Mesh | null) => {
              cellRefs.current[i * n + j] = el;
            }}
            geometry={unitPlane}
            position={[x, y, 0]}
            scale={[QKV_CELL, QKV_CELL, 1]}
          >
            <meshBasicMaterial color={kColor} transparent opacity={0.2} depthWrite={false} />
          </mesh>
        ))
      )}
      <Label
        text={`÷ √d_k   (d_k = ${dK}, d_model = ${dModel})`}
        position={[QKV_GRID_CENTER_X, -1.45, 0]}
        size={0.115}
        color={DIM_STEEL}
      />
      <Label text="→" position={[0.19, QKV_ROWS_CENTER_Y, 0]} size={0.22} color={DIM_STEEL} />

      
      <Label text="3 · softmax → weights" position={[1.45, 2.15, 0]} size={0.14} color={qColor} />
      <Label
        text={`Σ = ${readout.sum.toFixed(2)}`}
        position={[1.45, 0.85, 0]}
        size={0.16}
        color={readout.sum < 1.05 ? GOLD_HOT : DIM_STEEL}
      />
      {barX.map((x, j) => (
        <mesh
          key={`bar-${j}`}
          ref={(el: THREE.Mesh | null) => {
            barRefs.current[j] = el;
          }}
          position={[x, QKV_BAR_BASE_Y, 0]}
        >
          <boxGeometry args={[0.24, 1, 0.1]} />
          <meshStandardMaterial color="#7f8aa3" emissive="#7f8aa3" emissiveIntensity={0.5} />
        </mesh>
      ))}
      {barX.map((x, j) => (
        <Label
          key={`barnum-${j}`}
          text={(readout.shown[j] ?? 0).toFixed(2)}
          position={[x, -1.42, 0]}
          size={0.105}
          color="#ffe08a"
        />
      ))}
      <Label text="→" position={[2.85, QKV_ROWS_CENTER_Y, 0]} size={0.22} color={DIM_STEEL} />

      
      <Label text="4 · blend the Values" position={[4.35, 2.15, 0]} size={0.14} color={vColor} />
      {valueX.map((x, j) => (
        <mesh
          key={`val-${j}`}
          ref={(el: THREE.Mesh | null) => {
            valueRefs.current[j] = el;
          }}
          position={[x, -0.3, 0]}
        >
          <boxGeometry args={[0.15, 1, 0.1]} />
          <meshStandardMaterial color={vColor} emissive={vColor} emissiveIntensity={0.3} />
        </mesh>
      ))}
      <Label text="→" position={[4.56, 0.1, 0]} size={0.2} color={DIM_STEEL} />
      {Array.from({ length: QKV_DIM }, (_, d) => (
        <mesh
          key={`out-${d}`}
          ref={(el: THREE.Mesh | null) => {
            outRefs.current[d] = el;
          }}
          position={[5.0, 0.1 + ((QKV_DIM - 1) / 2 - d) * 0.19, 0]}
        >
          
          <boxGeometry args={[0.66, 0.14, 0.1]} />
          <meshStandardMaterial color="#eaffb0" emissive="#eaffb0" emissiveIntensity={0.5} />
        </mesh>
      ))}
      <Label
        text={`context aware "${words[readout.row] ?? words[0]}"`}
        position={[4.4, -0.75, 0]}
        size={0.12}
        color="#eaffb0"
      />

      
      {(
        [
          { c: qColor, x: -3.86, text: "Query: what I'm looking for" },
          { c: kColor, x: -0.86, text: "Key: what I offer" },
          { c: vColor, x: 1.64, text: "Value: what I actually pass on" },
        ] as const
      ).map((entry) => (
        <group key={entry.text} position={[0, -1.95, 0]}>
          <mesh geometry={unitPlane} position={[entry.x, 0, 0]} scale={[0.15, 0.15, 1]}>
            <meshBasicMaterial color={entry.c} transparent opacity={0.9} depthWrite={false} />
          </mesh>
          <Label text={entry.text} position={[entry.x + 0.17, 0, 0]} size={0.12} color={entry.c} anchorX="left" />
        </group>
      ))}
    </group>
  );
}

const MH_SENTENCE = ["The", "dog", "bit", "him", "and", "ran"];
const MH_D_MODEL = 512;

const MH_FREQ_BANDS = [0, 4, 10, 20, 40, 80];

interface HeadSpec {
  caption: string;
  color: string;
  
  score: (i: number, j: number, n: number) => number;
}


const HEAD_SPECS: HeadSpec[] = [
  {
    caption: "coreference (pronoun → noun)",
    color: "#ffd479",
    score: (i, j) => (i === 3 ? (j === 1 ? 1 : 0.05) : i === j ? 1 : 0.06),
  },
  {
    caption: "adjacent word",
    color: "#7dd6ff",
    score: (i, j) => (Math.abs(i - j) === 1 ? 1 : 0.05),
  },
  {
    caption: "previous token",
    color: "#c77dff",
    score: (i, j) => (j === i - 1 ? 1 : 0.05),
  },
  {
    caption: "next token",
    color: "#8affc1",
    score: (i, j) => (j === i + 1 ? 1 : 0.05),
  },
  {
    caption: "long-range dependency",
    color: "#ff9d4d",
    score: (i, j, n) => {
      const far = n - 2;
      const d = Math.abs(i - j);
      return 0.05 + Math.exp(-((d - far) * (d - far)) / 1.2);
    },
  },
  {
    caption: "sentence start",
    color: "#ffe08a",
    score: (_i, j) => (j === 0 ? 1 : 0.07),
  },
  {
    caption: "syntactic head",
    color: "#a06bff",
    score: (i, j) => (j === (i === 5 ? 5 : 2) ? 1 : 0.05),
  },
  {
    caption: "broad / diffuse",
    color: "#eaffb0",
    score: (i, j) => 0.6 + 0.4 * seededRandom(i * 11.13 + j * 4.71 + 6.2),
  },
];

const MH_COL_X = [-3.825, -1.275, 1.275, 3.825];
const MH_PANEL_CENTER_Y = [1.62, 0.1];
const MH_CAPTION_Y = [2.3, 0.78];
const MH_CELL = 0.14;
const MH_CELL_SPACING = 0.155;
const MH_BAR_Y = -1.05;
const MH_PE_ROW_Y = [-2.25, -2.45, -2.65, -2.85, -3.05, -3.25];

function MultiHeadScene({ params }: { params: Scene3DParams }) {
  const headCount = clampCount(params.headCount, 8, 4, 8);
  const encodingType = stringParam(params.encodingType, "sinusoidal");
  const unitPlane = useUnitPlane();

  const n = MH_SENTENCE.length;
  const heads = useMemo(() => HEAD_SPECS.slice(0, headCount), [headCount]);
  const columns = Math.ceil(headCount / 2);
  const patterns = useMemo(
    () =>
      heads.map((head) =>
        Array.from({ length: n }, (_, i) => normalizeRow(Array.from({ length: n }, (_, j) => head.score(i, j, n))))
      ),
    [heads, n]
  );

  const panelLayout = useMemo(
    () =>
      heads.map((head, h) => {
        const row = Math.floor(h / columns);
        const col = h % columns;
        const cx = columns === MH_COL_X.length ? MH_COL_X[col] : (col - (columns - 1) / 2) * (9.6 / columns);
        return {
          head,
          cx,
          cy: MH_PANEL_CENTER_Y[row],
          captionY: MH_CAPTION_Y[row],
          sweepSpeed: 0.9 + seededRandom(h * 3.31) * 0.9,
          sweepPhase: seededRandom(h * 7.77),
        };
      }),
    [heads, columns]
  );

  const outSegW = 5.76 / headCount;
  const outSegX = useMemo(
    () => Array.from({ length: headCount }, (_, h) => (h - (headCount - 1) / 2) * outSegW),
    [headCount, outSegW]
  );

  const convergeLines = useMemo(
    () =>
      panelLayout.map((p, h) =>
        flatSegment(p.cx, p.cy - (n * MH_CELL_SPACING) / 2 - 0.05, outSegX[h], MH_BAR_Y + 0.12, -0.4)
      ),
    [panelLayout, outSegX, n]
  );
  const peValues = useMemo(
    () =>
      MH_FREQ_BANDS.map((i) =>
        Array.from({ length: n }, (_, pos) => Math.sin(pos / Math.pow(10000, (2 * i) / MH_D_MODEL)))
      ),
    [n]
  );

  const cellRefs = useRef<(THREE.Mesh | null)[]>([]);
  const convergeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const outRefs = useRef<(THREE.Mesh | null)[]>([]);
  const peRefs = useRef<(THREE.Mesh | null)[]>([]);
  const play = useAnimPlayhead({ morph: 1 });
  const beat = useShowBeat();
  const peGroupRef = useRef<THREE.Group>(null!);
  const stackRef = useRef<THREE.Group>(null!);

  useFrame(() => {
    const elapsed = play.current.armed ? play.current.t : 0;
    const headsOn = play.current.armed;
    const peOn = beat.current.morphs >= 2;
    const stackOn = beat.current.morphs >= 3;

    panelLayout.forEach((panel, h) => {
      const sweep = headsOn ? Math.floor((elapsed * panel.sweepSpeed + panel.sweepPhase * n) % n) : -1;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const mesh = cellRefs.current[h * n * n + i * n + j];
          if (!mesh) continue;
          const w = patterns[h][i][j];
          const focus = !headsOn ? 0.45 : i === sweep ? 1 : 0.34;
          (mesh.material as THREE.MeshBasicMaterial).opacity = (0.06 + w * 0.85) * focus;
        }
      }
    });

    const unison = headsOn ? 0.45 + 0.55 * Math.pow(1 - ((elapsed * 0.7) % 1), 1.6) : 0.2;
    convergeRefs.current.forEach((mesh) => {
      if (!mesh) return;
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.1 + unison * 0.4;
    });
    outRefs.current.forEach((mesh) => {
      if (!mesh) return;
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + unison * 1.9;
    });

    const shimmer = peOn ? 0.82 + 0.18 * Math.sin(elapsed * 1.6) : 0.35;
    peRefs.current.forEach((mesh, idx) => {
      if (!mesh) return;
      const band = Math.floor(idx / n);
      const pos = idx % n;
      const value = peValues[band][pos];
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = peOn ? (0.1 + Math.abs(value) * 0.8) * shimmer : 0.08;
      mesh.scale.x = peOn ? 0.16 + Math.abs(value) * 0.34 : 0.16;
    });
    if (peGroupRef.current) peGroupRef.current.visible = peOn;
    if (stackRef.current) stackRef.current.visible = stackOn;
  });

  return (
    <group>
      <Label
        text={`${headCount} heads · ${Math.round(MH_D_MODEL / headCount)} dims each · d_model ${MH_D_MODEL}`}
        position={[0, 3.2, 0]}
        size={0.2}
        color={GOLD}
      />
      <Label
        text={`${headCount} heads at once: each a different way of reading the same sentence`}
        position={[0, 2.88, 0]}
        size={0.135}
        color={DIM_STEEL}
      />
      <Label text={MH_SENTENCE.join(" · ")} position={[0, 2.6, 0]} size={0.145} color={TOKEN_BLUE} />

      
      {panelLayout.map((panel, h) => (
        <group key={`head-${h}`}>
          <Label
            text={`HEAD ${h + 1}/${headCount} · ${panel.head.caption}`}
            position={[panel.cx, panel.captionY, 0]}
            size={0.11}
            color={panel.head.color}
          />
          <mesh
            geometry={unitPlane}
            position={[panel.cx, panel.cy, -0.06]}
            scale={[n * MH_CELL_SPACING + 0.08, n * MH_CELL_SPACING + 0.08, 1]}
          >
            <meshBasicMaterial color={panel.head.color} transparent opacity={0.07} depthWrite={false} />
          </mesh>
          {Array.from({ length: n }, (_, i) =>
            Array.from({ length: n }, (_, j) => (
              <mesh
                key={`c-${i}-${j}`}
                ref={(el: THREE.Mesh | null) => {
                  cellRefs.current[h * n * n + i * n + j] = el;
                }}
                geometry={unitPlane}
                position={[
                  panel.cx + (j - (n - 1) / 2) * MH_CELL_SPACING,
                  panel.cy + ((n - 1) / 2 - i) * MH_CELL_SPACING,
                  0,
                ]}
                scale={[MH_CELL, MH_CELL, 1]}
              >
                <meshBasicMaterial color={panel.head.color} transparent opacity={0.2} depthWrite={false} />
              </mesh>
            ))
          )}
        </group>
      ))}

      
      {convergeLines.map((seg, h) => (
        <mesh
          key={`conv-${h}`}
          ref={(el: THREE.Mesh | null) => {
            convergeRefs.current[h] = el;
          }}
          geometry={unitPlane}
          position={seg.mid}
          rotation={[0, 0, seg.angle]}
          scale={[seg.length, 0.02, 1]}
        >
          <meshBasicMaterial color={heads[h].color} transparent opacity={0.2} depthWrite={false} />
        </mesh>
      ))}
      {outSegX.map((x, h) => (
        <group key={`out-${h}`}>
          <mesh
            ref={(el: THREE.Mesh | null) => {
              outRefs.current[h] = el;
            }}
            position={[x, MH_BAR_Y, 0]}
          >
            <boxGeometry args={[outSegW - 0.03, 0.24, 0.12]} />
            <meshStandardMaterial color={heads[h].color} emissive={heads[h].color} emissiveIntensity={0.6} />
          </mesh>
          <Label
            text={String(Math.round(MH_D_MODEL / headCount))}
            position={[x, -1.32, 0]}
            size={0.095}
            color={DIM_STEEL}
          />
        </group>
      ))}
      <Label
        text="concatenated → one richer representation"
        position={[0, -1.6, 0]}
        size={0.145}
        color={GOLD}
      />

      
      <group ref={peGroupRef} visible={false}>
      <Label
        text={`+ ${encodingType} positional encoding: order without a loop`}
        position={[-1.5, -1.98, 0]}
        size={0.135}
        color="#7dd6ff"
      />
      {MH_FREQ_BANDS.map((band, b) => (
        <group key={`band-${b}`}>
          <Label
            text={`i=${band}`}
            position={[-3.42, MH_PE_ROW_Y[b], 0]}
            size={0.095}
            color={DIM_STEEL}
            anchorX="right"
          />
          {Array.from({ length: n }, (_, pos) => (
            <mesh
              key={`pe-${pos}`}
              ref={(el: THREE.Mesh | null) => {
                peRefs.current[b * n + pos] = el;
              }}
              geometry={unitPlane}
              position={[-1.5 + (pos - (n - 1) / 2) * 0.62, MH_PE_ROW_Y[b], 0]}
              scale={[0.5, 0.16, 1]}
            >
              <meshBasicMaterial
                color={peValues[b][pos] >= 0 ? "#ffd479" : "#7dd6ff"}
                transparent
                opacity={0.3}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      ))}
      {Array.from({ length: n }, (_, pos) => (
        <Label
          key={`pos-${pos}`}
          text={`pos ${pos + 1}`}
          position={[-1.5 + (pos - (n - 1) / 2) * 0.62, -3.46, 0]}
          size={0.1}
          color={DIM_STEEL}
        />
      ))}

      
      <Label text={'"the dog bit the man"'} position={[2.9, -2.18, 0]} size={0.12} color="#f2f6ff" />
      <Label text={'"the man bit the dog"'} position={[2.9, -2.44, 0]} size={0.12} color="#f2f6ff" />
      <Label
        text="mathematically identical without it"
        position={[2.9, -2.74, 0]}
        size={0.115}
        color={RECURRENT_DIM}
      />
      </group>
      <group ref={stackRef} visible={false}>
        <Label
          text="stack this block · a dozen · two dozen · ninety-six times"
          position={[0, 2.52, 0]}
          size={0.145}
          color={GOLD}
        />
      </group>
    </group>
  );
}
export default function AttentionVisualizer({
  scene,
  params = {},
  position = [0, 0, 0],
}: AttentionVisualizerProps) {
  return (
    <group position={position}>
      {scene === "BAHDANAU" && <BahdanauScene params={params} />}
      {scene === "TRANSFORMER" && <TransformerScene params={params} />}
      {scene === "QKV" && <QkvScene params={params} />}
      {scene === "MULTI_HEAD" && <MultiHeadScene params={params} />}
    </group>
  );
}
