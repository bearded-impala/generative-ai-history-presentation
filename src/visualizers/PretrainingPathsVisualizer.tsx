import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { seededRandom } from "../shared/random";
import type { Scene3DParams } from "../presentation/types";
import { useAnimPlayhead, useShowBeat } from "../presentation/useShowBeat";
import { useNeonGlowMaterial } from "./useNeonGlowMaterial";

type PretrainingPath = "GPT" | "BERT";

interface PretrainingPathsVisualizerProps {
  path: PretrainingPath;
  params?: Scene3DParams;
  position?: [number, number, number];
}

function readString(raw: unknown, fallback: string): string {
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : fallback;
}

// Shared coordinates keep the GPT and BERT scenes aligned within the camera frame.
const TOKEN_COUNT = 9;
const TOKEN_SPACING = 0.7;
// Keep the token row clear of the layer stack.
const TOKEN_ROW_CX = -1.9;
const TOKEN_ROW_Y = 1.5;
const TOKEN_QUAD_W = 0.62;
const TOKEN_QUAD_H = 0.36;
const ARC_ANCHOR_Y = TOKEN_ROW_Y + 0.2;
const PRED_START_Y = TOKEN_ROW_Y - 0.85;

const MATRIX_PITCH = 0.33;
const MATRIX_CELL = 0.26;
const MATRIX_CX = 4.05;
const MATRIX_CY = 0.9;

const LAYER_X = -6.45;
const LAYER_PLATE_W = 0.72;
const LAYER_SPAN = 1.6;

const SCENE_Y = -0.45;

const LABEL_OUTLINE = 0.006;
const LABEL_OUTLINE_COLOR = "#05070f";

function tokenX(index: number): number {
  return TOKEN_ROW_CX + (index - (TOKEN_COUNT - 1) / 2) * TOKEN_SPACING;
}
function matrixCellX(col: number): number {
  return MATRIX_CX + (col - (TOKEN_COUNT - 1) / 2) * MATRIX_PITCH;
}
function matrixCellY(row: number): number {
  return MATRIX_CY + ((TOKEN_COUNT - 1) / 2 - row) * MATRIX_PITCH;
}

const GPT_TOKEN = "#ffd479";
const GPT_ARC = "#ffb347";
const GPT_PREDICT = "#ffe08a";
const GPT_DIM = "#8a6a3a";
const C_GPT_BLOCKED = new THREE.Color("#1a1208");
const C_GPT_LIT = new THREE.Color("#ffcf5e");

const BERT_TOKEN = "#c77dff";
const BERT_ARROW = "#b46aff";
const BERT_FILL = "#dcc6ff";
const BERT_DIM = "#7a55a3";
const C_BERT_GAP = new THREE.Color("#120a1e");
const C_BERT_LIT = new THREE.Color("#a06bff");

const MATRIX_BACKING = "#141a24";
const CAPTION_GREY = "#8a97a5";

const GPT_SENTENCE = ["the", "cat", "sat", "on", "the", "mat", "and", "fell", "asleep"] as const;
const BERT_SENTENCE = ["the", "river", "bank", "was", "steep", "and", "the", "water", "cold"] as const;
// Slide 19 highlights "bank" to connect back to Word2Vec.
const BERT_BANK_INDEX = 2;
const C_BERT_BANK = new THREE.Color("#ffd479");

// Pure phase functions keep scene elements synchronized without shared refs.
const GPT_STEP = 1.2;
// Include one step to hold the completed sentence.
const GPT_CYCLE = GPT_STEP * (TOKEN_COUNT + 1);

interface GptPhase {
  index: number;
  stepT: number;
  resting: boolean;
}
function gptPhase(t: number): GptPhase {
  const local = t % GPT_CYCLE;
  const raw = local / GPT_STEP;
  const step = Math.floor(raw);
  return {
    index: Math.min(TOKEN_COUNT - 1, step),
    stepT: raw - step,
    resting: step >= TOKEN_COUNT,
  };
}

const BERT_CYCLE = 4.2;

interface BertPhase {
  cycle: number;
  p: number;
}
function bertPhase(t: number): BertPhase {
  return { cycle: Math.floor(t / BERT_CYCLE), p: (t % BERT_CYCLE) / BERT_CYCLE };
}
// Mask one or two interior tokens to approximate 15% while preserving context on both sides.
function bertMaskBits(cycle: number): number {
  const wanted = seededRandom(cycle * 7.71 + 3.3) < 0.35 ? 2 : 1;
  let bits = 0;
  let picked = 0;
  for (let attempt = 0; picked < wanted && attempt < 24; attempt++) {
    const idx = 1 + Math.floor(seededRandom(cycle * 13.37 + attempt * 5.17) * (TOKEN_COUNT - 2));
    const safe = Math.min(TOKEN_COUNT - 2, idx);
    if (((bits >> safe) & 1) === 0) {
      bits |= 1 << safe;
      picked++;
    }
  }
  return bits;
}

const NSP_CYCLE = 5.6;

// Flat ring segments remain camera-facing; tubes read as side-on pipes.
interface ArcPiece {
  query: number;
  distance: number;
  geometry: THREE.RingGeometry;
  x: number;
  y: number;
  squash: number;
}

function buildArcs(pairs: readonly (readonly [number, number])[]): ArcPiece[] {
  return pairs.map(([query, key]) => {
    const x1 = tokenX(query);
    const x2 = tokenX(key);
    const r = Math.max(0.12, Math.abs(x2 - x1) / 2);
    return {
      query,
      distance: Math.abs(query - key),
      geometry: new THREE.RingGeometry(Math.max(0.01, r - 0.025), r + 0.025, 28, 1, 0, Math.PI),
      x: (x1 + x2) / 2,
      y: ARC_ANCHOR_Y,
      squash: 0.42,
    };
  });
}

interface ArcState {
  activeQueries: number;
  reveal: number;
  opacity: number;
}

function ArcLayer({
  pairs,
  color,
  resolve,
  morph = 1,
}: {
  pairs: readonly (readonly [number, number])[];
  color: string;
  resolve: (t: number) => ArcState;
  morph?: number;
}) {
  const arcs = useMemo(() => buildArcs(pairs), [pairs]);
  useEffect(() => () => arcs.forEach((a) => a.geometry.dispose()), [arcs]);

  const arcRefs = useRef<(THREE.Mesh | null)[]>([]);
  const play = useAnimPlayhead({ morph });

  useFrame(() => {
    const t = play.current.armed ? play.current.t : 0;
    const { activeQueries, reveal, opacity } = resolve(t);
    const maxDistance = 1 + reveal * (TOKEN_COUNT - 1);
    for (let i = 0; i < arcs.length; i++) {
      const arc = arcs[i];
      const mesh = arcRefs.current[i];
      if (!mesh) continue;
      const on =
        opacity > 0.01 && ((activeQueries >> arc.query) & 1) === 1 && arc.distance <= maxDistance;
      mesh.visible = on;
      if (on) {
        (mesh.material as THREE.MeshBasicMaterial).opacity = opacity * (0.25 + 0.55 / Math.max(1, arc.distance));
      }
    }
  });

  return (
    <group>
      {arcs.map((arc, i) => (
        <mesh
          key={`arc-${i}`}
          ref={(el: THREE.Mesh | null) => {
            arcRefs.current[i] = el;
          }}
          geometry={arc.geometry}
          position={[arc.x, arc.y, 0.08]}
          scale={[1, arc.squash, 1]}
          visible={false}
        >
          <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// Shared geometry keeps the causal triangle and full matrix directly comparable.
function AttentionMatrix({ path, label }: { path: PretrainingPath; label: string }) {
  const cellGeometry = useMemo(() => new THREE.PlaneGeometry(MATRIX_CELL, MATRIX_CELL), []);
  const backingGeometry = useMemo(() => {
    const side = TOKEN_COUNT * MATRIX_PITCH;
    return new THREE.PlaneGeometry(side, side);
  }, []);
  useEffect(
    () => () => {
      cellGeometry.dispose();
      backingGeometry.dispose();
    },
    [cellGeometry, backingGeometry]
  );

  const cells = useMemo(() => {
    const out: { row: number; col: number; x: number; y: number }[] = [];
    for (let row = 0; row < TOKEN_COUNT; row++) {
      for (let col = 0; col < TOKEN_COUNT; col++) {
        out.push({ row, col, x: matrixCellX(col), y: matrixCellY(row) });
      }
    }
    return out;
  }, []);

  const cellRefs = useRef<(THREE.Mesh | null)[]>([]);
  const causal = path === "GPT";
  const maskPlay = useAnimPlayhead({ morph: 1 });
  const actionPlay = useAnimPlayhead({ morph: 2 });

  useFrame(() => {
    const maskOn = maskPlay.current.armed;
    const actionOn = actionPlay.current.armed;
    const t = actionOn ? actionPlay.current.t : maskOn ? maskPlay.current.t : 0;
    const cursorRow = causal && actionOn ? gptPhase(t).index : -1;
    const maskBits = !causal && actionOn ? bertMaskBits(bertPhase(t).cycle) : 0;

    for (let i = 0; i < cells.length; i++) {
      const mesh = cellRefs.current[i];
      if (!mesh) continue;
      const { row, col } = cells[i];
      const material = mesh.material as THREE.MeshBasicMaterial;
      if (causal) {
        const blocked = col > row;
        material.color.copy(blocked ? C_GPT_BLOCKED : C_GPT_LIT);
        if (blocked) {
          material.opacity = maskOn ? 1 : 0.42;
        } else {
          material.opacity = actionOn
            ? (row === cursorRow ? 0.95 : 0.5) + 0.08 * Math.sin(t * 1.6 - (row + col) * 0.3)
            : maskOn
              ? 0.62
              : 0.38;
        }
      } else {
        const touched = actionOn && (((maskBits >> row) & 1) === 1 || ((maskBits >> col) & 1) === 1);
        material.color.copy(C_BERT_LIT);
        material.opacity = actionOn
          ? (touched ? 0.92 : 0.52) + 0.08 * Math.sin(t * 1.4 - (row + col) * 0.28)
          : maskOn
            ? 0.7 + 0.08 * Math.sin(t * 1.4 - (row + col) * 0.28)
            : 0.32;
      }
    }
  });

  const accent = causal ? GPT_TOKEN : BERT_TOKEN;

  return (
    <group>
        {/* Backing separates blocked cells from the background. */}
      <mesh geometry={backingGeometry} position={[MATRIX_CX, MATRIX_CY, -0.16]}>
        <meshBasicMaterial color={MATRIX_BACKING} transparent opacity={0.92} />
      </mesh>
      <mesh geometry={backingGeometry} position={[MATRIX_CX, MATRIX_CY, -0.22]} scale={1.06}>
        <meshBasicMaterial color={accent} transparent opacity={0.16} />
      </mesh>

      {cells.map((cell, i) => (
        <mesh
          key={i}
          ref={(el: THREE.Mesh | null) => {
            cellRefs.current[i] = el;
          }}
          geometry={cellGeometry}
          position={[cell.x, cell.y, 0]}
        >
          <meshBasicMaterial color={causal ? C_GPT_LIT : C_BERT_LIT} transparent opacity={0.5} />
        </mesh>
      ))}

      <Text
        position={[MATRIX_CX, MATRIX_CY + 1.88, 0]}
        fontSize={0.15}
        color={accent}
        anchorX="center"
        anchorY="middle"
        maxWidth={3.4}
        textAlign="center"
        outlineWidth={LABEL_OUTLINE}
        outlineColor={LABEL_OUTLINE_COLOR}
      >
        {label}
      </Text>
      <Text
        position={[MATRIX_CX, MATRIX_CY - 1.72, 0]}
        fontSize={0.12}
        color={CAPTION_GREY}
        anchorX="center"
        anchorY="middle"
        maxWidth={3.4}
        textAlign="center"
        outlineWidth={LABEL_OUTLINE}
        outlineColor={LABEL_OUTLINE_COLOR}
      >
        rows = attending token · columns = token attended to
      </Text>
    </group>
  );
}

// A fixed span makes 12 and 24 layers comparable without changing scene bounds.
function LayerStack({
  count,
  color,
  label,
  chip,
  morph = 1,
}: {
  count: number;
  color: string;
  label: string;
  chip: string;
  morph?: number;
}) {
  const pitch = LAYER_SPAN / count;
  const plateGeometry = useMemo(
    () => new THREE.PlaneGeometry(LAYER_PLATE_W, Math.max(0.03, pitch * 0.55)),
    [pitch]
  );
  useEffect(() => () => plateGeometry.dispose(), [plateGeometry]);

  const plateRefs = useRef<(THREE.Mesh | null)[]>([]);
  const play = useAnimPlayhead({ morph });

  useFrame(() => {
    const t = play.current.armed ? play.current.t : 0;
    const head = ((t * 0.4) % 1) * count;
    for (let i = 0; i < count; i++) {
      const mesh = plateRefs.current[i];
      if (!mesh) continue;
      const material = mesh.material as THREE.MeshStandardMaterial;
      const nearness = Math.max(0, 1 - Math.abs(head - i) / 2.2);
      material.emissiveIntensity = 0.3 + nearness * 2.1;
    }
  });

  return (
    <group position={[0, -0.4, 0]}>
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          ref={(el: THREE.Mesh | null) => {
            plateRefs.current[i] = el;
          }}
          geometry={plateGeometry}
          position={[LAYER_X, i * pitch, 0]}
        >
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
        </mesh>
      ))}
      <Text
        position={[LAYER_X, LAYER_SPAN + 0.28, 0]}
        fontSize={0.12}
        color={CAPTION_GREY}
        anchorX="center"
        anchorY="middle"
        maxWidth={1.15}
        textAlign="center"
        outlineWidth={LABEL_OUTLINE}
        outlineColor={LABEL_OUTLINE_COLOR}
      >
        {chip}
      </Text>
      <Text
        position={[LAYER_X, -0.35, 0]}
        fontSize={0.13}
        color={color}
        anchorX="center"
        anchorY="middle"
        maxWidth={1.3}
        textAlign="center"
        outlineWidth={LABEL_OUTLINE}
        outlineColor={LABEL_OUTLINE_COLOR}
      >
        {label}
      </Text>
    </group>
  );
}

function TokenBaseline({ color }: { color: string }) {
  const width = (TOKEN_COUNT - 1) * TOKEN_SPACING + TOKEN_QUAD_W + 0.3;
  return (
    <mesh position={[TOKEN_ROW_CX, TOKEN_ROW_Y - TOKEN_QUAD_H / 2 - 0.09, -0.2]}>
      <planeGeometry args={[width, 0.015]} />
      <meshBasicMaterial color={color} transparent opacity={0.35} />
    </mesh>
  );
}

function GptScene({ params }: { params: Scene3DParams }) {
  const paramCount = readString(params.paramCount, "117M");
  const corpus = readString(params.trainingCorpus, "BooksCorpus (~7,000 books)");
  const mode = readString(params.mode, "decoder-only");
  const maskingType = readString(params.maskingType, "causal");
  const direction = readString(params.direction, "left-to-right");

  // GPT arcs only target earlier tokens.
  const pairs = useMemo(() => {
    const out: [number, number][] = [];
    for (let query = 1; query < TOKEN_COUNT; query++) {
      for (let key = 0; key < query; key++) out.push([query, key]);
    }
    return out;
  }, []);

  const tokenQuadGeometry = useMemo(() => new THREE.PlaneGeometry(TOKEN_QUAD_W, TOKEN_QUAD_H), []);
  const cursorGeometry = useMemo(() => new THREE.PlaneGeometry(TOKEN_QUAD_W + 0.16, TOKEN_QUAD_H + 0.16), []);
  useEffect(
    () => () => {
      tokenQuadGeometry.dispose();
      cursorGeometry.dispose();
    },
    [tokenQuadGeometry, cursorGeometry]
  );

  const cursorMaterial = useNeonGlowMaterial(GPT_TOKEN);
  const predictMaterial = useNeonGlowMaterial(GPT_PREDICT);

  const quadRefs = useRef<(THREE.Mesh | null)[]>([]);
  const wordRefs = useRef<(THREE.Group | null)[]>([]);
  const predictRefs = useRef<(THREE.Group | null)[]>([]);
  const cursorRef = useRef<THREE.Mesh>(null!);
  const maskCaptionRef = useRef<THREE.Group>(null!);
  const play = useAnimPlayhead({ morph: 2 });
  const maskPlay = useAnimPlayhead({ morph: 1, hold: 40 });
  const beat = useShowBeat();

  useFrame((_, delta) => {
    const armed = play.current.armed;
    const t = armed ? play.current.t : 0;
    const { index, stepT, resting } = gptPhase(t);
    cursorMaterial.uniforms.uTime.value = t;
    predictMaterial.uniforms.uTime.value = t;

    const rise = THREE.MathUtils.clamp((stepT - 0.5) / 0.45, 0, 1);
    const eased = 1 - Math.pow(1 - rise, 3);
    const nextIndex = index + 1;
    const predicting = armed && !resting && nextIndex < TOKEN_COUNT && stepT >= 0.5;

    for (let i = 0; i < TOKEN_COUNT; i++) {
      const revealed = armed && (resting || i <= index);
      const arriving = armed && !resting && i === nextIndex;
      const opacity = revealed ? 0.42 : arriving ? 0.1 + 0.3 * eased : 0.1;
      const quad = quadRefs.current[i];
      if (quad) {
        const material = quad.material as THREE.MeshBasicMaterial;
        material.opacity = opacity;
        material.color.set(revealed || arriving ? GPT_TOKEN : GPT_DIM);
      }
      const word = wordRefs.current[i];
      if (word) word.visible = revealed || (arriving && eased > 0.35);

      const predicted = predictRefs.current[i];
      if (predicted) {
        const on = predicting && i === nextIndex;
        predicted.visible = on;
        if (on) {
          predicted.position.y = THREE.MathUtils.lerp(PRED_START_Y, TOKEN_ROW_Y, eased);
          predicted.scale.setScalar(0.8 + 0.2 * eased);
        }
      }
    }
    predictMaterial.uniforms.uOpacity.value = predicting ? 0.5 + 0.5 * eased : 0;

    if (cursorRef.current) {
      cursorRef.current.visible = armed;
      const targetX = tokenX(index);
      cursorRef.current.position.x = THREE.MathUtils.lerp(
        cursorRef.current.position.x,
        targetX,
        Math.min(1, delta * 12)
      );
      cursorMaterial.uniforms.uOpacity.value = armed ? (resting ? 0.25 : 1) : 0;
    }
    if (maskCaptionRef.current) {
      maskCaptionRef.current.visible = maskPlay.current.armed || beat.current.morphs >= 1;
    }
  });

  return (
    <group position={[0, SCENE_Y, 0]}>
      <LayerStack
        count={12}
        color={GPT_TOKEN}
        label="× 12 decoder layers"
        chip={`${mode.replace(/-/g, " ")} · ${maskingType} mask`}
        morph={1}
      />

      <TokenBaseline color={GPT_TOKEN} />

      <mesh ref={cursorRef} geometry={cursorGeometry} position={[tokenX(0), TOKEN_ROW_Y, -0.1]} visible={false}>
        <primitive object={cursorMaterial} attach="material" />
      </mesh>

      {GPT_SENTENCE.map((word, i) => (
        <group key={`tok-${i}`}>
          <mesh
            ref={(el: THREE.Mesh | null) => {
              quadRefs.current[i] = el;
            }}
            geometry={tokenQuadGeometry}
            position={[tokenX(i), TOKEN_ROW_Y, 0]}
          >
            <meshBasicMaterial color={GPT_DIM} transparent opacity={0.1} />
          </mesh>
          <group
            ref={(el: THREE.Group | null) => {
              wordRefs.current[i] = el;
            }}
            position={[tokenX(i), TOKEN_ROW_Y, 0.05]}
            visible={false}
          >
            <Text
              fontSize={0.16}
              color={GPT_TOKEN}
              anchorX="center"
              anchorY="middle"
              outlineWidth={LABEL_OUTLINE}
              outlineColor={LABEL_OUTLINE_COLOR}
            >
              {word}
            </Text>
          </group>
        </group>
      ))}

      {GPT_SENTENCE.map((word, i) => (
        <group
          key={`pred-${i}`}
          ref={(el: THREE.Group | null) => {
            predictRefs.current[i] = el;
          }}
          position={[tokenX(i), PRED_START_Y, 0.1]}
          visible={false}
        >
          <mesh geometry={tokenQuadGeometry}>
            <primitive object={predictMaterial} attach="material" />
          </mesh>
          <Text
            position={[0, 0, 0.05]}
            fontSize={0.16}
            color={GPT_PREDICT}
            anchorX="center"
            anchorY="middle"
            outlineWidth={LABEL_OUTLINE}
            outlineColor={LABEL_OUTLINE_COLOR}
          >
            {word}
          </Text>
        </group>
      ))}

      <ArcLayer
        pairs={pairs}
        color={GPT_ARC}
        morph={2}
        resolve={(t) => {
          const { index, stepT, resting } = gptPhase(t);
          if (resting) return { activeQueries: 0, reveal: 0, opacity: 0 };
          const fadeIn = THREE.MathUtils.clamp(stepT / 0.3, 0, 1);
          const fadeOut = 1 - THREE.MathUtils.clamp((stepT - 0.82) / 0.18, 0, 1);
          return {
            activeQueries: 1 << index,
            reveal: THREE.MathUtils.clamp(stepT / 0.45, 0, 1),
            opacity: Math.min(fadeIn, fadeOut) * 0.85,
          };
        }}
      />

      <AttentionMatrix path="GPT" label="causal mask: the future is blacked out" />
      <group ref={maskCaptionRef} visible={false}>
        <Text
          position={[MATRIX_CX + 1.85, MATRIX_CY + 0.95, 0.05]}
          fontSize={0.12}
          color="#ff9d4d"
          anchorX="center"
          anchorY="middle"
          outlineWidth={LABEL_OUTLINE}
          outlineColor={LABEL_OUTLINE_COLOR}
        >
          FUTURE
        </Text>
        <Text
          position={[MATRIX_CX + 1.85, MATRIX_CY + 0.72, 0.05]}
          fontSize={0.12}
          color="#ff9d4d"
          anchorX="center"
          anchorY="middle"
          outlineWidth={LABEL_OUTLINE}
          outlineColor={LABEL_OUTLINE_COLOR}
        >
          BLOCKED
        </Text>
      </group>

      <Text
        position={[TOKEN_ROW_CX, 3.22, 0]}
        fontSize={0.2}
        color={GPT_PREDICT}
        anchorX="center"
        anchorY="middle"
        maxWidth={6.2}
        textAlign="center"
        outlineWidth={LABEL_OUTLINE}
        outlineColor={LABEL_OUTLINE_COLOR}
      >
        DECODER PATH · GPT-1
      </Text>
      <Text
        position={[TOKEN_ROW_CX, 2.88, 0]}
        fontSize={0.14}
        color={GPT_TOKEN}
        anchorX="center"
        anchorY="middle"
        maxWidth={6.2}
        textAlign="center"
        outlineWidth={LABEL_OUTLINE}
        outlineColor={LABEL_OUTLINE_COLOR}
      >
        generate left → right · each word may look ONLY backward
      </Text>
      <Text
        position={[TOKEN_ROW_CX, 0.15, 0]}
        fontSize={0.13}
        color={CAPTION_GREY}
        anchorX="center"
        anchorY="middle"
        maxWidth={5.6}
        textAlign="center"
        outlineWidth={LABEL_OUTLINE}
        outlineColor={LABEL_OUTLINE_COLOR}
      >
        {`training objective: predict the next word · ${direction.replace(/-/g, " ")} · no labels`}
      </Text>
      <Text
        position={[TOKEN_ROW_CX, -0.45, 0]}
        fontSize={0.15}
        color={GPT_TOKEN}
        anchorX="center"
        anchorY="middle"
        maxWidth={5.6}
        textAlign="center"
        outlineWidth={LABEL_OUTLINE}
        outlineColor={LABEL_OUTLINE_COLOR}
      >
        {`${paramCount} parameters · ${corpus} · no labels`}
      </Text>
    </group>
  );
}

function BertScene({ params }: { params: Scene3DParams }) {
  const paramCount = readString(params.paramCount, "340M (BERT-Large)");
  const objective = readString(params.trainingObjective, "MLM + Next Sentence Prediction");
  const mode = readString(params.mode, "encoder-only");
  const direction = readString(params.direction, "bidirectional");

  // Limit each mask to three neighbors per side to keep the fan legible.
  const pairs = useMemo(() => {
    const out: [number, number][] = [];
    for (let query = 1; query <= TOKEN_COUNT - 2; query++) {
      for (let key = query - 3; key <= query + 3; key++) {
        if (key >= 0 && key < TOKEN_COUNT && key !== query) out.push([query, key]);
      }
    }
    return out;
  }, []);

  const tokenQuadGeometry = useMemo(() => new THREE.PlaneGeometry(TOKEN_QUAD_W, TOKEN_QUAD_H), []);
  const nspBarGeometry = useMemo(() => new THREE.PlaneGeometry(2.4, 0.17), []);
  useEffect(
    () => () => {
      tokenQuadGeometry.dispose();
      nspBarGeometry.dispose();
    },
    [tokenQuadGeometry, nspBarGeometry]
  );

  const quadRefs = useRef<(THREE.Mesh | null)[]>([]);
  const wordRefs = useRef<(THREE.Group | null)[]>([]);
  const maskRefs = useRef<(THREE.Group | null)[]>([]);
  const fillRefs = useRef<(THREE.Group | null)[]>([]);
  const isNextRef = useRef<THREE.Group>(null!);
  const notNextRef = useRef<THREE.Group>(null!);
  const nspBarRef = useRef<THREE.Mesh>(null!);
  const bankCaptionRef = useRef<THREE.Group>(null!);
  const play = useAnimPlayhead({ morph: 2 });
  const bankPlay = useAnimPlayhead({ morph: 3, hold: 24 });
  const beat = useShowBeat();

  useFrame(() => {
    const armed = play.current.armed;
    const t = armed ? play.current.t : 0;
    const { cycle, p } = bertPhase(t);
    const bits = armed ? bertMaskBits(cycle) : 0;
    const filled = p >= 0.62;
    const fillIn = THREE.MathUtils.clamp((p - 0.62) / 0.16, 0, 1);

    for (let i = 0; i < TOKEN_COUNT; i++) {
      const masked = ((bits >> i) & 1) === 1;
      const quad = quadRefs.current[i];
      if (quad) {
        const material = quad.material as THREE.MeshBasicMaterial;
        if (masked && !filled) {
          material.color.copy(C_BERT_GAP);
          material.opacity = 1;
        } else if (masked) {
          // Keep enough contrast for the filled word above this plate.
          material.color.set(BERT_FILL);
          material.opacity = 0.18 + 0.32 * fillIn;
        } else if (i === BERT_BANK_INDEX) {
          const bankOn = bankPlay.current.armed || beat.current.morphs >= 3;
          material.color.copy(C_BERT_BANK);
          material.opacity = 0.42 + (bankOn ? 0.28 + 0.18 * Math.sin(t * 2.2) : armed ? 0.1 * Math.sin(t * 1.6) : 0);
        } else {
          material.color.set(BERT_TOKEN);
          material.opacity = 0.28 + (armed ? 0.06 * Math.sin(t * 1.3 + i * 0.7) : 0);
        }
      }
      const word = wordRefs.current[i];
      if (word) word.visible = !masked;
      const maskTag = maskRefs.current[i];
      if (maskTag) maskTag.visible = masked && !filled;
      const fill = fillRefs.current[i];
      if (fill) {
        fill.visible = masked && filled;
        if (fill.visible) fill.scale.setScalar(0.85 + 0.15 * fillIn);
      }
    }

    // Keep the NSP verdict slower than the MLM cycle.
    const nspIsNext = armed && seededRandom(Math.floor(t / NSP_CYCLE) * 4.41 + 1.7) > 0.5;
    if (isNextRef.current) isNextRef.current.visible = nspIsNext;
    if (notNextRef.current) notNextRef.current.visible = armed && !nspIsNext;
    if (nspBarRef.current) {
      const material = nspBarRef.current.material as THREE.MeshBasicMaterial;
      material.color.set(nspIsNext ? BERT_FILL : BERT_DIM);
      material.opacity = nspIsNext ? 0.75 : 0.4;
    }
    if (bankCaptionRef.current) {
      bankCaptionRef.current.visible = bankPlay.current.armed || beat.current.morphs >= 3;
    }
  });

  return (
    <group position={[0, SCENE_Y, 0]}>
      <LayerStack
        count={24}
        color={BERT_TOKEN}
        label="× 24 encoder layers"
        chip={`${mode.replace(/-/g, " ")} · ${direction.replace(/-/g, " ")}`}
        morph={1}
      />

      <TokenBaseline color={BERT_TOKEN} />

      {BERT_SENTENCE.map((word, i) => (
        <group key={`tok-${i}`}>
          <mesh
            ref={(el: THREE.Mesh | null) => {
              quadRefs.current[i] = el;
            }}
            geometry={tokenQuadGeometry}
            position={[tokenX(i), TOKEN_ROW_Y, 0]}
          >
            <meshBasicMaterial color={BERT_TOKEN} transparent opacity={0.28} />
          </mesh>
          <group
            ref={(el: THREE.Group | null) => {
              wordRefs.current[i] = el;
            }}
            position={[tokenX(i), TOKEN_ROW_Y, 0.05]}
          >
            <Text
              fontSize={0.16}
              color={BERT_TOKEN}
              anchorX="center"
              anchorY="middle"
              outlineWidth={LABEL_OUTLINE}
              outlineColor={LABEL_OUTLINE_COLOR}
            >
              {word}
            </Text>
          </group>
          <group
            ref={(el: THREE.Group | null) => {
              maskRefs.current[i] = el;
            }}
            position={[tokenX(i), TOKEN_ROW_Y, 0.05]}
            visible={false}
          >
            <Text
              fontSize={0.135}
              color={BERT_ARROW}
              anchorX="center"
              anchorY="middle"
              outlineWidth={LABEL_OUTLINE}
              outlineColor={LABEL_OUTLINE_COLOR}
            >
              [MASK]
            </Text>
          </group>
          <group
            ref={(el: THREE.Group | null) => {
              fillRefs.current[i] = el;
            }}
            position={[tokenX(i), TOKEN_ROW_Y, 0.08]}
            visible={false}
          >
            <Text
              fontSize={0.17}
              color={BERT_FILL}
              anchorX="center"
              anchorY="middle"
              outlineWidth={LABEL_OUTLINE}
              outlineColor={LABEL_OUTLINE_COLOR}
            >
              {word}
            </Text>
          </group>
        </group>
      ))}

      <ArcLayer
        pairs={pairs}
        color={BERT_ARROW}
        morph={2}
        resolve={(t) => {
          const { cycle, p } = bertPhase(t);
          const fadeIn = THREE.MathUtils.clamp((p - 0.18) / 0.14, 0, 1);
          const fadeOut = 1 - THREE.MathUtils.clamp((p - 0.82) / 0.12, 0, 1);
          return {
            activeQueries: bertMaskBits(cycle),
            reveal: THREE.MathUtils.clamp((p - 0.18) / 0.3, 0, 1),
            opacity: Math.min(fadeIn, fadeOut) * 0.85,
          };
        }}
      />

      <AttentionMatrix path="BERT" label="no mask: a full square, both directions" />

      <Text
        position={[TOKEN_ROW_CX, 3.22, 0]}
        fontSize={0.2}
        color={BERT_FILL}
        anchorX="center"
        anchorY="middle"
        maxWidth={6.2}
        textAlign="center"
        outlineWidth={LABEL_OUTLINE}
        outlineColor={LABEL_OUTLINE_COLOR}
      >
        ENCODER PATH · BERT
      </Text>
      <Text
        position={[TOKEN_ROW_CX, 2.88, 0]}
        fontSize={0.14}
        color={BERT_TOKEN}
        anchorX="center"
        anchorY="middle"
        maxWidth={6.2}
        textAlign="center"
        outlineWidth={LABEL_OUTLINE}
        outlineColor={LABEL_OUTLINE_COLOR}
      >
        every word sees every other word · both directions at once
      </Text>
      <Text
        position={[TOKEN_ROW_CX, 0.15, 0]}
        fontSize={0.13}
        color={CAPTION_GREY}
        anchorX="center"
        anchorY="middle"
        maxWidth={5.6}
        textAlign="center"
        outlineWidth={LABEL_OUTLINE}
        outlineColor={LABEL_OUTLINE_COLOR}
      >
        {`Masked Language Modeling · ${direction.replace(/-/g, " ")} · no causal mask`}
      </Text>

      <group position={[0, -0.55, 0]}>
        <Text
          position={[TOKEN_ROW_CX, 0, 0]}
          fontSize={0.13}
          color={BERT_DIM}
          anchorX="center"
          anchorY="middle"
          outlineWidth={LABEL_OUTLINE}
          outlineColor={LABEL_OUTLINE_COLOR}
        >
          Next Sentence Prediction
        </Text>

        <Text
          position={[-4.15, -0.33, 0]}
          fontSize={0.13}
          color={CAPTION_GREY}
          anchorX="center"
          anchorY="middle"
          outlineWidth={LABEL_OUTLINE}
          outlineColor={LABEL_OUTLINE_COLOR}
        >
          A
        </Text>
        <mesh geometry={nspBarGeometry} position={[-2.7, -0.33, 0]}>
          <meshBasicMaterial color={BERT_TOKEN} transparent opacity={0.5} />
        </mesh>

        <Text
          position={[-4.15, -0.66, 0]}
          fontSize={0.13}
          color={CAPTION_GREY}
          anchorX="center"
          anchorY="middle"
          outlineWidth={LABEL_OUTLINE}
          outlineColor={LABEL_OUTLINE_COLOR}
        >
          B
        </Text>
        <mesh ref={nspBarRef} geometry={nspBarGeometry} position={[-2.7, -0.66, 0]}>
          <meshBasicMaterial color={BERT_DIM} transparent opacity={0.4} />
        </mesh>

        <group ref={isNextRef} position={[-1.3, -0.5, 0]} visible={false}>
          <Text
            fontSize={0.14}
            color={BERT_FILL}
            anchorX="left"
            anchorY="middle"
            outlineWidth={LABEL_OUTLINE}
            outlineColor={LABEL_OUTLINE_COLOR}
          >
            IsNext
          </Text>
        </group>
        <group ref={notNextRef} position={[-1.3, -0.5, 0]} visible={false}>
          <Text
            fontSize={0.14}
            color={BERT_DIM}
            anchorX="left"
            anchorY="middle"
            outlineWidth={LABEL_OUTLINE}
            outlineColor={LABEL_OUTLINE_COLOR}
          >
            NotNext
          </Text>
        </group>
      </group>

      <Text
        position={[TOKEN_ROW_CX, -1.75, 0]}
        fontSize={0.15}
        color={BERT_TOKEN}
        anchorX="center"
        anchorY="middle"
        maxWidth={5.6}
        textAlign="center"
        outlineWidth={LABEL_OUTLINE}
        outlineColor={LABEL_OUTLINE_COLOR}
      >
        {`${paramCount} parameters · ${objective}`}
      </Text>
      <group ref={bankCaptionRef} visible={false}>
        <Text
          position={[tokenX(BERT_BANK_INDEX), TOKEN_ROW_Y + 0.55, 0.08]}
          fontSize={0.13}
          color="#ffd479"
          anchorX="center"
          anchorY="middle"
          outlineWidth={LABEL_OUTLINE}
          outlineColor={LABEL_OUTLINE_COLOR}
        >
          riverbank · savings account
        </Text>
      </group>
    </group>
  );
}

export default function PretrainingPathsVisualizer({
  path,
  params = {},
  position = [0, 0, 0],
}: PretrainingPathsVisualizerProps) {
  return (
    <group position={position}>
      {path === "GPT" && <GptScene params={params} />}
      {path === "BERT" && <BertScene params={params} />}
    </group>
  );
}
