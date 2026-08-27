import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Grid, Text } from "@react-three/drei";
import * as THREE from "three";
import { NEON_VERTEX } from "./neonGlow";
import { seededRandom } from "../shared/random";
import { useAnimPlayhead, useShowBeat } from "../presentation/useShowBeat";
import type { Scene3DParams } from "../presentation/types";
import { useNeonGlowMaterial } from "./useNeonGlowMaterial";

type PerceptronVisualizerMode = "PERCEPTRON" | "XOR_HYPERPLANE" | "AI_WINTER";

interface PerceptronVisualizerProps {
  mode: PerceptronVisualizerMode;
  params?: Scene3DParams;
  position?: [number, number, number];
}
const FROST_VERTEX = NEON_VERTEX;

const FROST_FRAGMENT =  `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 3.0);
    float sparkle = 0.5 + 0.5 * sin(uTime * 2.0 + vViewPosition.x * 4.0 + vViewPosition.y * 3.0);
    vec3 glow = uColor * (0.35 + fresnel * 1.4) + vec3(sparkle * 0.12);
    gl_FragColor = vec4(glow, uOpacity * (0.2 + fresnel * 0.6));
  }
`;

class FrostMaterial extends THREE.ShaderMaterial {
  constructor(color: THREE.ColorRepresentation = "#bfe8ff") {
    super({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uTime: { value: 0 },
        uOpacity: { value: 0.5 },
      },
      vertexShader: FROST_VERTEX,
      fragmentShader: FROST_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  }
}

function readGridSize(params: Scene3DParams): { cols: number; rows: number } {
  const raw = params.inputGridSize;
  if (
    Array.isArray(raw) &&
    raw.length >= 2 &&
    typeof raw[0] === "number" &&
    typeof raw[1] === "number"
  ) {
    return {
      cols: THREE.MathUtils.clamp(Math.round(raw[0]), 4, 24),
      rows: THREE.MathUtils.clamp(Math.round(raw[1]), 4, 24),
    };
  }
  return { cols: 20, rows: 20 };
}

const CELL_SPACING = 0.14;
const SAMPLE_WIRE_COUNT = 16;

function usePhotocellLayout(cols: number, rows: number) {
  return useMemo(() => {
    const panelOrigin = new THREE.Vector3(-1.85, 0.05, 0);
    const cellOrient = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2);
    const cells: THREE.Vector3[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells.push(
          new THREE.Vector3(
            panelOrigin.x + 0.1,
            panelOrigin.y + ((rows - 1) / 2 - r) * CELL_SPACING,
            panelOrigin.z + (c - (cols - 1) / 2) * CELL_SPACING
          )
        );
      }
    }
    const chassisPos = new THREE.Vector3(panelOrigin.x - 0.08, panelOrigin.y, panelOrigin.z);
    const chassisSize: [number, number, number] = [
      0.22,
      rows * CELL_SPACING + 0.28,
      cols * CELL_SPACING + 0.28,
    ];
    const sum = new THREE.Vector3(2.15, 0.05, 0);
    return { cells, sum, cellOrient, chassisPos, chassisSize };
  }, [cols, rows]);
}

function PhotocellGrid({
  cells,
  cols,
  cellOrient,
  frozen,
}: {
  cells: THREE.Vector3[];
  cols: number;
  cellOrient: THREE.Quaternion;
  frozen: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const play = useAnimPlayhead({ morph: 1 });

  const writeGrid = (waveOn: boolean, t: number) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < cells.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const wave = waveOn ? 0.5 + 0.5 * Math.sin(t * 1.35 - (col + row) * 0.22) : 0;
      const s = 0.88 + wave * 0.22;
      dummy.position.copy(cells[i]);
      dummy.quaternion.copy(cellOrient);
      dummy.scale.set(s, 1 + wave * 0.35, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  useLayoutEffect(() => {
    writeGrid(false, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listed values define the initial grid
  }, [cells, cols, cellOrient]);

  useFrame(() => {
    const t = play.current.armed ? play.current.t : 0;
    writeGrid(Boolean(play.current.armed && !frozen), t);
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, cells.length]} castShadow>
      <cylinderGeometry args={[0.042, 0.048, 0.16, 8]} />
      <meshStandardMaterial
        color={frozen ? "#bfe8ff" : "#3ea6ff"}
        emissive={frozen ? "#bfe8ff" : "#3ea6ff"}
        emissiveIntensity={frozen ? 0.25 : 0.95}
        metalness={0.35}
        roughness={0.4}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

function orientBetween(
  mesh: THREE.Mesh,
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = Math.max(dir.length(), 0.001);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.multiplyScalar(1 / len));
  mesh.scale.set(radius, len, radius);
}


function PotentiometerWire({
  start,
  end,
  sign,
  seed,
  frozen,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  sign: number;
  seed: number;
  frozen: number;
}) {
  const play = useAnimPlayhead({ morph: 2 });
  const seg1 = useRef<THREE.Mesh>(null!);
  const seg2 = useRef<THREE.Mesh>(null!);
  const motor = useRef<THREE.Mesh>(null!);
  const weight = useRef(0.28 + seededRandom(seed) * 0.5);
  const lastTick = useRef(-1);
  const period = 1.35 + seededRandom(seed * 2.1) * 0.9;
  const color = sign > 0 ? "#4fd8ff" : "#ff5cd6";
  const potT = 0.4 + seededRandom(seed * 3.7) * 0.16;
  const pot = useMemo(
    () => start.clone().lerp(end, potT),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- vector components define memo identity
    [start.x, start.y, start.z, end.x, end.y, end.z, potT],
  );

  useFrame(() => {
    const armed = play.current.armed && frozen < 0.5;
    if (armed) {
      const tick = Math.floor(play.current.t / period);
      if (tick !== lastTick.current && tick > 0) {
        lastTick.current = tick;
        if (seededRandom(seed * 19 + tick * 4.1) > 0.42) {
          const nudge = (seededRandom(tick * 8.3 + seed) > 0.5 ? 1 : -1) * (0.05 + seededRandom(tick) * 0.08);
          weight.current = THREE.MathUtils.clamp(weight.current + nudge, 0.1, 1);
          if (motor.current) {
            motor.current.rotation.z += (nudge > 0 ? 0.55 : -0.55) + seededRandom(tick + 3) * 0.15;
          }
        }
      }
    }
    const radius = 0.008 + weight.current * 0.026;
    if (seg1.current) orientBetween(seg1.current, start, pot, radius);
    if (seg2.current) orientBetween(seg2.current, pot, end, radius);
  });

  return (
    <group>
      <mesh ref={seg1}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={frozen ? 0.2 : 0.95}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={seg2}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={frozen ? 0.2 : 0.95}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={motor} position={pot} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.16, 12]} />
        <meshStandardMaterial
          color={frozen ? "#bfe8ff" : "#c9a227"}
          emissive={frozen ? "#bfe8ff" : "#c9a227"}
          emissiveIntensity={frozen ? 0.2 : 0.75}
          metalness={0.45}
          roughness={0.35}
        />
      </mesh>
    </group>
  );
}

function PerceptronGraph({
  cells,
  cols,
  rows,
  sum,
  cellOrient,
  chassisPos,
  chassisSize,
  frozen,
}: {
  cells: THREE.Vector3[];
  cols: number;
  rows: number;
  sum: THREE.Vector3;
  cellOrient: THREE.Quaternion;
  chassisPos: THREE.Vector3;
  chassisSize: [number, number, number];
  frozen: number;
}) {
  const sampleIdx = useMemo(() => {
    const n = cells.length;
    const idx: number[] = [0, cols - 1, (rows - 1) * cols, rows * cols - 1];
    for (let i = idx.length; i < SAMPLE_WIRE_COUNT; i++) {
      idx.push(Math.floor(seededRandom(i * 11.3 + 2) * n));
    }
    return idx.slice(0, SAMPLE_WIRE_COUNT);
  }, [cells, cols, rows]);

  const lineSigns = useMemo(
    () => sampleIdx.map((_, i) => (seededRandom(i + 1) > 0.5 ? 1 : -1)),
    [sampleIdx]
  );

  const sumColor = frozen ? "#e2f6ff" : "#ffe08a";
  const cellCount = cells.length;
  const gutsRef = useRef<THREE.Group>(null!);
  const labelsRef = useRef<THREE.Group>(null!);
  const motorLabelRef = useRef<THREE.Group>(null!);
  const betsRef = useRef<THREE.Group>(null!);
  const motorPlay = useAnimPlayhead({ morph: 2, hold: 40 });
  const betsPlay = useAnimPlayhead({ morph: 3, hold: 24 });
  const beat = useShowBeat();

  useFrame(() => {
    if (gutsRef.current) {
      gutsRef.current.visible = true;
      gutsRef.current.scale.setScalar(1);
    }
    if (labelsRef.current) labelsRef.current.visible = true;
    const morphs = beat.current.morphs;
    if (motorLabelRef.current) {
      motorLabelRef.current.visible = frozen < 0.5 && (motorPlay.current.armed || morphs >= 2);
    }
    if (betsRef.current) {
      betsRef.current.visible = frozen < 0.5 && (betsPlay.current.armed || morphs >= 3);
    }
  });

  return (
    <>
      <mesh position={chassisPos}>
        <boxGeometry args={chassisSize} />
        <meshStandardMaterial
          color={frozen ? "#152028" : "#0c1218"}
          emissive={frozen ? "#3a5a68" : "#1a3048"}
          emissiveIntensity={0.35}
          metalness={0.55}
          roughness={0.5}
        />
      </mesh>
      <group ref={gutsRef}>
        <PhotocellGrid cells={cells} cols={cols} cellOrient={cellOrient} frozen={frozen} />

        {sampleIdx.map((cellI, i) => (
          <PotentiometerWire
            key={`weight-${i}`}
            start={cells[cellI]}
            end={sum}
            sign={lineSigns[i]}
            seed={i * 11.3 + 2}
            frozen={frozen}
          />
        ))}

        <GlowNode
          position={[sum.x, sum.y, sum.z]}
          color={sumColor}
          radius={0.48}
          intensity={1.8}
          pulseSpeed={2.2}
          frozen={frozen}
        />
      </group>
      <group ref={labelsRef}>
        <Billboard follow>
          <Text
            position={[-1.85, 1.95, 1.55]}
            fontSize={0.15}
            color={frozen ? "#bfe8ff" : "#3ea6ff"}
            anchorX="center"
            outlineWidth={0.01}
            outlineColor="#05070f"
          >
            {frozen ? "frozen mid-thought" : `photocells: ${cellCount} electronic eyes`}
          </Text>
        </Billboard>
        <group ref={motorLabelRef} visible={false}>
          <Billboard follow>
            <Text
              position={[0.2, 1.55, 1.25]}
              fontSize={0.13}
              color="#c9a227"
              anchorX="center"
              outlineWidth={0.01}
              outlineColor="#05070f"
            >
              each wire hits a motor · a miss turns it
            </Text>
          </Billboard>
        </group>
        <Billboard follow>
          <Text
            position={[2.15, 1.0, 0.85]}
            fontSize={0.16}
            color={frozen ? "#e2f6ff" : "#ffe08a"}
            anchorX="center"
            outlineWidth={0.01}
            outlineColor="#05070f"
          >
            {frozen ? "DARPA: the checks stop" : "summation: fires, or doesn't"}
          </Text>
        </Billboard>
        {!frozen && (
          <Billboard follow>
            <Text
              position={[0.15, -1.9, 1.5]}
              fontSize={0.14}
              color="#c7d0d8"
              anchorX="center"
              outlineWidth={0.01}
              outlineColor="#05070f"
            >
            512 motor-driven weights · a miss ticks the motor and the line changes thickness
          </Text>
          </Billboard>
        )}
        <group ref={betsRef} visible={false}>
          <Billboard follow>
            <Text
              position={[0.15, -2.28, 1.5]}
              fontSize={0.15}
              color="#ffe08a"
              anchorX="center"
              outlineWidth={0.01}
              outlineColor="#05070f"
            >
              two bets · symbols, or neurons that learn
            </Text>
          </Billboard>
        </group>
      </group>
    </>
  );
}
interface GlowNodeProps {
  position: [number, number, number];
  color: THREE.ColorRepresentation;
  radius?: number;
  intensity?: number;
  pulseSpeed?: number;
  
  frozen?: number;
}

function GlowNode({
  position,
  color,
  radius = 0.25,
  intensity = 1.2,
  pulseSpeed = 1.4,
  frozen = 0,
}: GlowNodeProps) {
  const material = useNeonGlowMaterial(color);
  const frozenRef = useRef(0);
  const play = useAnimPlayhead({ morph: 1 });

  useEffect(() => {
    material.uniforms.uIntensity.value = intensity;
  }, [material, intensity]);

  useFrame(() => {
    const armed = play.current.armed && frozen < 0.5;
    material.uniforms.uTime.value = armed ? play.current.t : 0;
    material.uniforms.uPulseSpeed.value = armed ? pulseSpeed : 0;
    frozenRef.current = THREE.MathUtils.lerp(frozenRef.current, frozen, 0.04);
    material.uniforms.uFrozen.value = frozenRef.current;
  });

  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, 24, 24]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
interface WinterFragmentsProps {
  originPositions: THREE.Vector3[];
  count?: number;
  radius?: number;
  frostDensity?: number;
}

function WinterFragments({
  originPositions,
  count = 60,
  radius = 5,
  frostDensity = 0.6,
}: WinterFragmentsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const material = useMemo(() => new FrostMaterial(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const play = useAnimPlayhead({ morph: 3 });
  const fragments = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const origin =
          originPositions[
            Math.floor(seededRandom(i * 13.7 + 8) * originPositions.length)
          ].clone();
        const a = seededRandom(i * 3.1 + 1) * Math.PI * 2;
        const b = seededRandom(i * 5.7 + 2) * Math.PI - Math.PI / 2;
        const dir = new THREE.Vector3(
          Math.cos(a) * Math.cos(b),
          Math.sin(b),
          Math.sin(a) * Math.cos(b)
        );
        return {
          origin,
          dir,
          speed: 0.12 + seededRandom(i * 7.3 + 3) * 0.3,
          maxDist: radius * (0.35 + seededRandom(i * 2.2 + 4) * 0.65),
          rotSpeed: 0.2 + seededRandom(i * 4.4 + 5) * 0.5,
          seed: seededRandom(i * 9.9 + 6) * Math.PI * 2,
          scale: 0.05 + seededRandom(i * 6.6 + 7) * 0.08,
        };
      }),
    [originPositions, count, radius]
  );

  useEffect(() => () => material.dispose(), [material]);

  useFrame((state) => {
    const t = play.current.armed ? play.current.t : 0;
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uOpacity.value = play.current.armed ? 0.2 + frostDensity * 0.5 : 0;

    const mesh = meshRef.current;
    if (!mesh) return;

    fragments.forEach((f, i) => {
      if (!play.current.armed) {
        dummy.position.copy(f.origin);
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        return;
      }
      const progress = 1 - Math.exp(-t * f.speed);
      const dist = f.maxDist * progress;
      dummy.position.set(
        f.origin.x + f.dir.x * dist,
        f.origin.y + f.dir.y * dist,
        f.origin.z + f.dir.z * dist
      );
      dummy.rotation.set(
        f.seed + t * f.rotSpeed,
        f.seed * 1.3 + t * f.rotSpeed * 0.7,
        f.seed * 0.6
      );
      dummy.scale.set(f.scale, f.scale, f.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, fragments.length]}>
      <icosahedronGeometry args={[1, 0]} />
      <primitive object={material} attach="material" />
    </instancedMesh>
  );
}

const FUNDING_BARS = [
  { label: "ALPAC 1966", morph: 1 },
  { label: "Lighthill 1973", morph: 2 },
  { label: "Mansfield 1973", morph: 3 },
];


function FundingCollapse() {
  const beat = useShowBeat();
  const heights = useRef([1, 1, 1]);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(() => {
    const morphs = beat.current.morphs;
    FUNDING_BARS.forEach((bar, i) => {
      const collapsed = morphs >= bar.morph;
      const target = collapsed ? 0.07 : 1;
      heights.current[i] = THREE.MathUtils.lerp(heights.current[i], target, 0.05);
      const mesh = meshRefs.current[i];
      if (!mesh) return;
      const h = 0.18 + heights.current[i] * 1.55;
      mesh.scale.y = h;
      mesh.position.y = h / 2;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.25 + (1 - heights.current[i]) * 0.9;
    });
  });

  return (
    <group position={[3.55, -0.55, 0.2]}>
      <Text
        position={[0, 2.05, 0]}
        fontSize={0.13}
        color="#8eb0c8"
        anchorX="center"
        outlineWidth={0.008}
        outlineColor="#05070f"
      >
        funding → 0
      </Text>
      {FUNDING_BARS.map((bar, i) => (
        <group key={bar.label} position={[(i - 1) * 0.72, 0, 0]}>
          <mesh
            ref={(el) => {
              meshRefs.current[i] = el;
            }}
            position={[0, 0.9, 0]}
          >
            <boxGeometry args={[0.42, 1, 0.28]} />
            <meshStandardMaterial
              color="#4a6b8a"
              emissive="#4a6b8a"
              emissiveIntensity={0.35}
              toneMapped={false}
            />
          </mesh>
          <Text
            position={[0, -0.22, 0]}
            fontSize={0.1}
            color="#c5d6e4"
            anchorX="center"
            outlineWidth={0.006}
            outlineColor="#05070f"
          >
            {bar.label}
          </Text>
        </group>
      ))}
    </group>
  );
}
interface XorPoint {
  label: string;
  pos: THREE.Vector3;
  
  positive: boolean;
}

const XOR_POINTS: XorPoint[] = [
  { label: "(0,0) → 0", pos: new THREE.Vector3(-2.2, 0.6, -2.2), positive: false },
  { label: "(1,1) → 0", pos: new THREE.Vector3(2.2, 0.6, 2.2), positive: false },
  { label: "(0,1) → 1", pos: new THREE.Vector3(-2.2, 0.6, 2.2), positive: true },
  { label: "(1,0) → 1", pos: new THREE.Vector3(2.2, 0.6, -2.2), positive: true },
];

function SeparatingPlane({
  points,
  fractureIntensity = 0.9,
}: {
  points: XorPoint[];
  fractureIntensity?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const material = useNeonGlowMaterial("#9dffb0");
  const play = useAnimPlayhead({ morph: 1 });

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const armed = play.current.armed;
    mesh.visible = armed;
    if (!armed) return;
    const t = play.current.t;
    mesh.rotation.y = t * 0.35;
    mesh.rotation.x = Math.sin(t * 0.5) * 0.3;
    mesh.position.x = Math.sin(t * 0.22) * 0.7;
    mesh.position.z = Math.cos(t * 0.18) * 0.7;
    mesh.updateMatrixWorld();
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(mesh.quaternion).normalize();
    const planePoint = mesh.position;
    const signs = points.map((p) => {
      const d = normal.dot(p.pos.clone().sub(planePoint));
      return { positive: p.positive, side: d >= 0 };
    });
    const redSides = signs.filter((s) => !s.positive).map((s) => s.side);
    const blueSides = signs.filter((s) => s.positive).map((s) => s.side);
    const redsAgree = redSides.every((s) => s === redSides[0]);
    const bluesAgree = blueSides.every((s) => s === blueSides[0]);
    const separated = redsAgree && bluesAgree && redSides[0] !== blueSides[0];

    const flashPhase = 0.5 + 0.5 * Math.sin(t * 6);
    material.uniforms.uTime.value = t;
    material.uniforms.uColor.value.set(separated ? "#7dffb0" : "#ff4d6a");
    material.uniforms.uIntensity.value = separated ? 1.6 : 1.0 + flashPhase * fractureIntensity * 1.4;
  });

  return (
    <mesh ref={meshRef} position={[0, 0.6, 0]} visible={false}>
      <planeGeometry args={[6, 6]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function XorProofCaption() {
  const play = useAnimPlayhead({ morph: 1 });
  const wallPlay = useAnimPlayhead({ morph: 2, hold: 24 });
  const leavePlay = useAnimPlayhead({ morph: 3, hold: 24 });
  const beat = useShowBeat();
  const proofRef = useRef<THREE.Group>(null!);
  const wallRef = useRef<THREE.Group>(null!);
  const leaveRef = useRef<THREE.Group>(null!);
  useFrame(() => {
    const morphs = beat.current.morphs;
    if (proofRef.current) proofRef.current.visible = play.current.armed && morphs < 2;
    if (wallRef.current) wallRef.current.visible = wallPlay.current.armed || morphs >= 2;
    if (leaveRef.current) leaveRef.current.visible = leavePlay.current.armed || morphs >= 3;
  });
  return (
    <>
      <group ref={proofRef} visible={false}>
        <Text
          position={[0, 2.55, 0]}
          fontSize={0.2}
          color="#ff5c6a"
          anchorX="center"
          outlineWidth={0.008}
          outlineColor="#1a0508"
        >
          one straight line · four points · no solution exists
        </Text>
      </group>
      <group ref={wallRef} visible={false}>
        <Text
          position={[0, 2.55, 0]}
          fontSize={0.2}
          color="#ff5c6a"
          anchorX="center"
          outlineWidth={0.008}
          outlineColor="#1a0508"
        >
          a wall built into the geometry itself
        </Text>
      </group>
      <group ref={leaveRef} visible={false}>
        <Text
          position={[0, -1.85, 0]}
          fontSize={0.18}
          color="#e8dcc0"
          anchorX="center"
          outlineWidth={0.008}
          outlineColor="#1a0508"
        >
          the dollars that built this are about to leave the room
        </Text>
      </group>
    </>
  );
}

function XorHyperplaneScene({ params }: { params: Scene3DParams }) {
  const fractureIntensity =
    typeof params.fractureIntensity === "number" ? params.fractureIntensity : 0.9;
  const proofText =
    typeof params.proofTextOverlay === "string" ? params.proofTextOverlay : undefined;

  return (
    <group>
      <Grid
        args={[10, 10]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#2a2440"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#7d5fff"
        fadeDistance={16}
        fadeStrength={1.2}
        infiniteGrid={false}
        position={[0, 0, 0]}
      />

      {XOR_POINTS.map((p) => (
        <group key={p.label} position={[p.pos.x, p.pos.y, p.pos.z]}>
          <GlowNode
            position={[0, 0, 0]}
            color={p.positive ? "#4fd8ff" : "#ff5c6a"}
            radius={0.28}
            intensity={1.6}
            pulseSpeed={1.4}
          />
          <Text
            position={[0, 0.55, 0]}
            fontSize={0.26}
            color={p.positive ? "#4fd8ff" : "#ff5c6a"}
            anchorX="center"
            anchorY="middle"
          >
            {p.label}
          </Text>
        </group>
      ))}

      <SeparatingPlane points={XOR_POINTS} fractureIntensity={fractureIntensity} />
      <XorProofCaption />

      {proofText && (
        <Text
          position={[0, 3.4, 0]}
          fontSize={0.42}
          color="#ff5c6a"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#1a0508"
        >
          {proofText}
        </Text>
      )}
    </group>
  );
}

function LighthillPages() {
  const PAGE_COUNT = 11;
  const play = useAnimPlayhead({ morph: 2, hold: 7 });
  const pageRefs = useRef<(THREE.Group | null)[]>([]);
  const matRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

  const pages = useMemo(
    () =>
      Array.from({ length: PAGE_COUNT }, (_, i) => ({
        label: i % 3 === 0 ? "Lighthill 1973" : i % 3 === 1 ? "combinatorial explosion" : "SRC report",
        angle: (i / PAGE_COUNT) * Math.PI * 2,
        tilt: (seededRandom(i * 4.2 + 1) - 0.5) * 1.4,
        dist: 1.4 + seededRandom(i * 6.1 + 2) * 1.5,
        delay: i * 0.07,
      })),
    []
  );

  useFrame(() => {
    const armed = play.current.armed;
    const t = armed ? play.current.t : 0;
    pages.forEach((page, i) => {
      const group = pageRefs.current[i];
      const mat = matRefs.current[i];
      if (!group) return;
      const local = THREE.MathUtils.clamp((t - page.delay) / 2.6, 0, 1);
      group.visible = armed && local < 0.96;
      if (!armed || local >= 0.96) return;
      const ease = 1 - Math.pow(1 - local, 3);
      group.position.set(
        Math.cos(page.angle) * page.dist * ease,
        1.55 - ease * 2.85,
        Math.sin(page.angle) * page.dist * 0.7 * ease
      );
      group.rotation.set(ease * page.tilt, ease * (i % 2 ? 2.1 : -1.8), ease * 0.45);
      if (mat) mat.opacity = armed ? Math.max(0, 0.9 - ease * 0.92) : 0;
    });
  });

  return (
    <group position={[-0.2, 0.4, 0.35]}>
      {pages.map((page, i) => (
        <group
          key={i}
          ref={(el) => {
            pageRefs.current[i] = el;
          }}
          visible={false}
        >
          <mesh>
            <planeGeometry args={[0.72, 0.95]} />
            <meshBasicMaterial
              ref={(el) => {
                matRefs.current[i] = el;
              }}
              color="#d7e6f2"
              transparent
              opacity={0}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <Text
            position={[0, 0.08, 0.01]}
            fontSize={0.07}
            color="#1a3048"
            anchorX="center"
            maxWidth={0.62}
            textAlign="center"
          >
            {page.label}
          </Text>
        </group>
      ))}
    </group>
  );
}

export default function PerceptronVisualizer({
  mode,
  params = {},
  position = [0, 0, 0],
}: PerceptronVisualizerProps) {
  const { cols, rows } = readGridSize(params);
  const frozen = mode === "AI_WINTER" ? 1 : 0;
  const { cells, sum, cellOrient, chassisPos, chassisSize } = usePhotocellLayout(cols, rows);

  if (mode === "XOR_HYPERPLANE") {
    return (
      <group position={position}>
        <XorHyperplaneScene params={params} />
      </group>
    );
  }

  return (
    <group position={position}>
      <PerceptronGraph
        cells={cells}
        cols={cols}
        rows={rows}
        sum={sum}
        cellOrient={cellOrient}
        chassisPos={chassisPos}
        chassisSize={chassisSize}
        frozen={frozen}
      />

      {mode === "AI_WINTER" && (
        <>
          <WinterFragments
            originPositions={[...cells, sum]}
            count={typeof params.frozenNodeCount === "number" ? params.frozenNodeCount : 60}
            radius={
              typeof params.emptinessRadius === "number"
                ? Math.min(params.emptinessRadius, 10)
                : 5
            }
            frostDensity={typeof params.frostDensity === "number" ? params.frostDensity : 0.6}
          />
          {params.fundingGraphCollapse !== false && <FundingCollapse />}
          {params.lighthillReportOverlay !== false && <LighthillPages />}
        </>
      )}
    </group>
  );
}
