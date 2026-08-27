import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { Mesh } from "three";
import { seededRandom } from "../shared/random";
import type { Scene3DParams } from "../presentation/types";
import { useAnimPlayhead } from "../presentation/useShowBeat";
import { useCoarseReadout } from "./useCoarseReadout";
import { useNeonGlowMaterial } from "./useNeonGlowMaterial";

interface DimensionalityCollapseVisualizerProps {
  params?: Scene3DParams;
  position?: [number, number, number];
}
function unitBallVolumes(maxDim: number): number[] {
  const v: number[] = [1, 2];
  for (let n = 2; n <= maxDim; n++) {
    v[n] = ((2 * Math.PI) / n) * v[n - 2];
  }
  return v;
}
function volumeRatios(maxDim: number): number[] {
  return unitBallVolumes(maxDim).map((v, n) => v / Math.pow(2, n));
}

const GREY = "#5a6b78";
const HOT = "#ff9d4d";
const READOUT_UPDATE_MS = 150;

function formatReadoutText(dimension: number, ratio: number): string {
  const pct = ratio >= 0.001 ? `${(ratio * 100).toFixed(2)}%` : ratio.toExponential(2);
  return `Dimension ${dimension} · sphere holds ${pct} of the cube`;
}

export default function DimensionalityCollapseVisualizer({
  params = {},
  position = [0, 0, 0],
}: DimensionalityCollapseVisualizerProps) {
  const maxDim = THREE.MathUtils.clamp(
    typeof params.maxDimension === "number" ? Math.round(params.maxDimension) : 12,
    4,
    16
  );
  const ratios = useMemo(() => volumeRatios(maxDim), [maxDim]);

  const sphereRef = useRef<Mesh>(null!);
  const sphereMaterial = useNeonGlowMaterial(GREY);

  const cornerRefs = useRef<(Mesh | null)[]>([]);
  const cornerOffsets = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const sx = i & 1 ? 1 : -1;
        const sy = i & 2 ? 1 : -1;
        const sz = i & 4 ? 1 : -1;
        return new THREE.Vector3(sx, sy, sz);
      }),
    []
  );
  const latestReadout = useRef<{ dimension: number; ratio: number }>({ dimension: 1, ratio: 1 });
  const readout = useCoarseReadout(
    { dimension: 1, ratio: 1 },
    () => ({ ...latestReadout.current }),
    READOUT_UPDATE_MS,
  );
  const barRefs = useRef<(Mesh | null)[]>([]);
  const barHeights = useMemo(
    () => ratios.slice(1).map((r) => THREE.MathUtils.clamp(-Math.log10(r) * 0.28 + 0.06, 0.06, 1.05)),
    [ratios]
  );

  const STEP_DUR = 1.5;
  const HOLD_DUR = 1.8;
  const CYCLE = (maxDim - 1) * STEP_DUR + HOLD_DUR;
  const play = useAnimPlayhead({ morph: 2, loop: CYCLE });
  const wrapRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const armed = play.current.armed;
    if (wrapRef.current) wrapRef.current.visible = armed;
    const t = armed ? play.current.t : 0;
    const rawDim = 1 + THREE.MathUtils.clamp(t / STEP_DUR, 0, maxDim - 1);
    const dimFloor = Math.min(maxDim - 1, Math.floor(rawDim));
    const frac = rawDim - dimFloor;
    const rNow = ratios[dimFloor];
    const rNext = ratios[Math.min(dimFloor + 1, maxDim)];
    const ratio = THREE.MathUtils.lerp(rNow, rNext, frac);
    const dimensionDisplay = Math.round(rawDim);
    const r = Math.cbrt((6 * ratio) / Math.PI);
    if (sphereRef.current) sphereRef.current.scale.setScalar(Math.max(0.02, r));
    sphereMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    sphereMaterial.uniforms.uIntensity.value = 1.0 + (1 - ratio) * 0.6;
    cornerRefs.current.forEach((mesh) => {
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.2 + (1 - ratio) * 2.6;
    });

    latestReadout.current.dimension = dimensionDisplay;
    latestReadout.current.ratio = ratio;

    barRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const isCurrent = i + 1 === dimensionDisplay;
      mat.emissiveIntensity = isCurrent ? 2.2 : 0.5;
      mat.color.set(isCurrent ? HOT : GREY);
      mat.emissive.set(isCurrent ? HOT : GREY);
    });
  });

  return (
    <group ref={wrapRef} position={position} visible={false}>
      
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial color={GREY} wireframe transparent opacity={0.4} />
      </mesh>

      
      <mesh ref={sphereRef}>
        <sphereGeometry args={[1, 24, 24]} />
        <primitive object={sphereMaterial} attach="material" />
      </mesh>

      
      {cornerOffsets.map((c, i) => (
        <mesh
          key={i}
          ref={(el: Mesh | null) => {
            cornerRefs.current[i] = el;
          }}
          position={[c.x, c.y, c.z]}
        >
          <icosahedronGeometry args={[0.09 + seededRandom(i * 3.3) * 0.02, 0]} />
          <meshStandardMaterial color={HOT} emissive={HOT} emissiveIntensity={0.3} />
        </mesh>
      ))}

      
      <Text
        position={[0, -1.3, 0]}
        fontSize={0.15}
        color="#ffcf5e"
        anchorX="center"
        anchorY="middle"
        maxWidth={3.6}
        textAlign="center"
      >
        {formatReadoutText(readout.dimension, readout.ratio)}
      </Text>

      
      <group position={[0, -2.0, 0]}>
        {barHeights.map((h, i) => (
          <mesh
            key={i}
            ref={(el: Mesh | null) => {
              barRefs.current[i] = el;
            }}
            position={[(i - (barHeights.length - 1) / 2) * 0.32, -h / 2, 0]}
          >
            <boxGeometry args={[0.2, h, 0.2]} />
            <meshStandardMaterial color={GREY} emissive={GREY} emissiveIntensity={0.5} />
          </mesh>
        ))}
        <Text
          position={[0, 0.22, 0]}
          fontSize={0.12}
          color="#8a97a5"
          anchorX="center"
          maxWidth={3.4}
          textAlign="center"
        >
          ball ÷ cube volume by dimension (log scale)
        </Text>
      </group>

      <Text
        position={[0, 2.15, 0]}
        fontSize={0.155}
        color="#c7d0d8"
        anchorX="center"
        anchorY="middle"
        maxWidth={3.3}
        textAlign="center"
      >
        Nearly all of a high-dimensional cube's volume lives in its corners - a rhyme for the empty box, not its cause
      </Text>
    </group>
  );
}
