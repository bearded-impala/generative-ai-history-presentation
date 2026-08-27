import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import * as THREE from "three";
import { clampCount } from "./params";
import { seededRandom } from "../shared/random";
import type { Scene3DParams } from "../presentation/types";
import { useAnimPlayhead, useShowBeat, type AnimPlayhead } from "../presentation/useShowBeat";

interface ScalingHorizonVisualizerProps {
  params?: Scene3DParams;
  position?: [number, number, number];
}

const GOLD = new THREE.Color("#ffd24a");
const VIOLET = new THREE.Color("#b46aff");


const YEAR_START = 1950;
const YEAR_END = 2020;
const SHAFT_H = 6;

const REST_CUTOFF = 0.78;

function yearHeight(year: number): number {
  return ((year - YEAR_START) / (YEAR_END - YEAR_START)) * SHAFT_H;
}

function ringRadiusAt(y: number): number {
  const heightFrac = THREE.MathUtils.clamp(y / SHAFT_H, 0, 1);
  return 1.4 + heightFrac * 2.2;
}

function CathedralRing({
  heightFrac,
  radius,
  y,
  cutoffRef,
}: {
  heightFrac: number;
  radius: number;
  y: number;
  cutoffRef: RefObject<number>;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const color = useMemo(() => new THREE.Color().lerpColors(GOLD, VIOLET, heightFrac), [heightFrac]);

  useFrame(() => {
    if (meshRef.current) meshRef.current.visible = heightFrac >= cutoffRef.current;
  });

  return (
    <mesh ref={meshRef} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} visible={heightFrac >= REST_CUTOFF}>
      <torusGeometry args={[radius, 0.03, 8, 48]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function ScalingCurve({
  horizonLabel,
  scalingCitation,
  play,
}: {
  horizonLabel: string;
  scalingCitation: string | null;
  play: RefObject<AnimPlayhead>;
}) {
  const POINTS = 24;
  const points = useMemo(
    () =>
      Array.from({ length: POINTS }, (_, i) => {
        const logX = i / (POINTS - 1);
        const logLoss = 1 - logX;
        return new THREE.Vector3(logX * 2.6 - 1.3, logLoss * 1.15 - 0.2, 0);
      }),
    []
  );

  const lineGrowRef = useRef<THREE.Group>(null!);
  const tipRef = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    const armed = play.current.armed;
    const t = armed ? play.current.t : 0;
    const progress = armed ? THREE.MathUtils.smoothstep(t, 0, 2.4) : 0;
    if (lineGrowRef.current) {
      lineGrowRef.current.visible = armed;
      lineGrowRef.current.scale.setX(Math.max(progress, 0.001));
    }
    if (tipRef.current) tipRef.current.visible = progress > 0.92;
  });

  return (
    <Billboard position={[0, SHAFT_H + 1.15, ringRadiusAt(SHAFT_H) + 1.7]} follow>
      <mesh position={[0, 0.2, -0.05]}>
        <planeGeometry args={[4.8, 3.4]} />
        <meshBasicMaterial color="#050308" transparent opacity={0.92} depthWrite={false} />
      </mesh>
      <Text position={[0, 1.38, 0]} fontSize={0.36} color="#ffe9b0" anchorX="center" outlineWidth={0.014} outlineColor="#050308">
        {horizonLabel}
      </Text>
      {scalingCitation && (
        <Text position={[0, 0.98, 0]} fontSize={0.16} color="#e0c8ff" anchorX="center" outlineWidth={0.01} outlineColor="#050308">
          {scalingCitation}
        </Text>
      )}
      <Text position={[0, 0.72, 0]} fontSize={0.13} color="#ffe9b0" anchorX="center" outlineWidth={0.01} outlineColor="#050308">
        test loss falls as a power law
      </Text>
      <Text position={[-1.35, 0.42, 0]} fontSize={0.11} color="#e8eef6" anchorX="left" outlineWidth={0.008} outlineColor="#050308">
        higher loss
      </Text>
      <Text position={[-1.35, -0.72, 0]} fontSize={0.12} color="#e8eef6" anchorX="left" outlineWidth={0.008} outlineColor="#050308">
        10^6 params
      </Text>
      <Text position={[0.7, -0.72, 0]} fontSize={0.12} color="#e8eef6" anchorX="left" outlineWidth={0.008} outlineColor="#050308">
        10^12
      </Text>
      <Text position={[0.7, -0.48, 0]} fontSize={0.11} color="#e0c8ff" anchorX="left" outlineWidth={0.008} outlineColor="#050308">
        lower loss
      </Text>
      <group ref={lineGrowRef} position={[-1.3, 0, 0]} scale={[0.001, 1, 1]} visible={false}>
        <group position={[1.3, 0, 0]}>
          {points.slice(0, -1).map((p, i) => {
            const next = points[i + 1];
            const dir = new THREE.Vector3().subVectors(next, p);
            const len = dir.length();
            const q = new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              len > 0.0001 ? dir.clone().normalize() : new THREE.Vector3(0, 1, 0)
            );
            const mid = new THREE.Vector3().addVectors(p, next).multiplyScalar(0.5);
            const color = new THREE.Color().lerpColors(GOLD, VIOLET, i / points.length);
            return (
              <mesh key={i} position={[mid.x, mid.y, mid.z]} quaternion={q}>
                <cylinderGeometry args={[0.04, 0.04, len, 8]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} toneMapped={false} />
              </mesh>
            );
          })}
          <mesh
            ref={tipRef}
            position={[points[points.length - 1].x, points[points.length - 1].y, points[points.length - 1].z]}
            visible={false}
          >
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshBasicMaterial color="#ffd24a" toneMapped={false} />
          </mesh>
        </group>
      </group>
    </Billboard>
  );
}

function CallbackGlyph({
  label,
  year,
  morph,
  delay = 0,
}: {
  label: string;
  year: number;
  morph: number;
  delay?: number;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const vis = useRef(0);
  const play = useAnimPlayhead({ morph, hold: 16 });
  const beat = useShowBeat();
  const y0 = yearHeight(year);
  const z = ringRadiusAt(y0) + 1.3;

  useFrame((_, delta) => {
    const on = beat.current.morphs > morph || (play.current.armed && play.current.t >= delay);
    vis.current += ((on ? 1 : 0) - vis.current) * Math.min(1, delta * 5);
    const g = groupRef.current;
    if (!g) return;
    g.visible = vis.current > 0.02;
    const s = 0.72 + vis.current * 0.28;
    g.scale.setScalar(s);
  });

  return (
    <group ref={groupRef} position={[0, y0, z]} visible={false}>
      <mesh position={[0, 0, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.95, 4]} />
        <meshBasicMaterial color="#cfd8ff" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <Billboard follow>
        <mesh position={[0, 0, -0.04]}>
          <planeGeometry args={[2.7, 0.42]} />
          <meshBasicMaterial color="#050308" transparent opacity={0.88} depthWrite={false} />
        </mesh>
        <Text
          fontSize={0.17}
          color="#f4f7ff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.012}
          outlineColor="#050308"
        >
          {label}
        </Text>
      </Billboard>
    </group>
  );
}

export default function ScalingHorizonVisualizer({
  params = {},
  position = [0, 0, 0],
}: ScalingHorizonVisualizerProps) {
  const cathedralLayerCount = clampCount(params.cathedralLayerCount, 36, 8, 48);
  const horizonLabel = typeof params.horizonLabel === "string" ? params.horizonLabel : "next token prediction";
  const scalingCitation =
    typeof params.scalingCitation === "string" ? params.scalingCitation : null;

  const rings = useMemo(
    () =>
      Array.from({ length: cathedralLayerCount }, (_, i) => {
        const heightFrac = i / (cathedralLayerCount - 1);
        return {
          heightFrac,
          radius: ringRadiusAt(heightFrac * SHAFT_H) + seededRandom(i * 3.7) * 0.12,
          y: heightFrac * SHAFT_H,
        };
      }),
    [cathedralLayerCount]
  );

  const stackRef = useRef<THREE.Group>(null!);
  const cutoffRef = useRef(REST_CUTOFF);

  const curvePlay = useAnimPlayhead({ morph: 1, hold: 10 });
  const risePlay = useAnimPlayhead({ morph: 2, hold: 14 });
  const finalePlay = useAnimPlayhead({ morph: 5, hold: 24 });
  const beat = useShowBeat();

  useFrame(() => {
    const morphs = beat.current.morphs;
    const riseArmed = risePlay.current.armed || morphs >= 2;
    const riseT = riseArmed ? risePlay.current.t : 0;
    const rise = riseArmed ? THREE.MathUtils.smoothstep(riseT, 0, 2.6) : 0;
    cutoffRef.current = REST_CUTOFF * (1 - rise);

    const finale = finalePlay.current.armed || morphs >= 5;
    const finaleT = finale ? finalePlay.current.t : 0;
    const glow = finale ? THREE.MathUtils.smoothstep(finaleT, 0, 2.8) : 0;

    if (stackRef.current) {
      const xz = 1 + rise * 0.4 + glow * 0.12;
      stackRef.current.scale.set(xz, 1, xz);
    }
  });

  return (
    <group position={position}>
      
      <group position={[0, -SHAFT_H, 0]}>
        <group ref={stackRef}>
          {rings.map((r, i) => (
            <CathedralRing
              key={i}
              heightFrac={r.heightFrac}
              radius={r.radius}
              y={r.y}
              cutoffRef={cutoffRef}
            />
          ))}
        </group>

        <ScalingCurve horizonLabel={horizonLabel} scalingCitation={scalingCitation} play={curvePlay} />

        <CallbackGlyph label="TURING, 1950" year={1950} morph={4} />
        <CallbackGlyph label="XOR, 1969" year={1969} morph={4} delay={2.1} />
        <CallbackGlyph label="MYCIN / XCON, 1980s" year={1984} morph={3} />
      </group>
    </group>
  );
}
