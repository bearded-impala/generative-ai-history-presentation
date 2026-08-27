import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Ref } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Billboard, Points, PointMaterial, Text } from "@react-three/drei";
import * as THREE from "three";
import { seededRandom } from "../shared/random";
import type { Scene3DParams } from "../presentation/types";
import { useAnimPlayhead, useShowBeat } from "../presentation/useShowBeat";
import { useNeonGlowMaterial } from "./useNeonGlowMaterial";

interface VectorSpaceVisualizerProps {
  activeAnalogy: boolean;
  params?: Scene3DParams;
  position?: [number, number, number];
}

function easeOutCubic(x: number): number {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(x: number): number {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
const WORD_BANK: string[] = [
  "language", "meaning", "vector", "context", "neuron", "gradient", "syntax",
  "semantics", "corpus", "token", "embedding", "dimension", "cluster",
  "analogy", "grammar", "dialect", "metaphor", "concept", "symbol", "pattern",
  "signal", "weight", "layer", "network", "memory", "sequence", "attention",
  "translate", "predict", "sentence", "phrase", "letter", "sound", "voice",
  "text", "document", "library", "story", "narrative", "history", "science",
  "logic", "reason", "thought", "mind", "brain", "machine", "computer",
  "algorithm", "data", "knowledge", "wisdom", "learning", "training", "model",
  "system", "structure", "function", "process", "input", "output", "encode",
  "decode", "cipher", "code", "number", "matrix", "scalar", "tensor", "graph",
  "node", "edge", "root", "branch", "canopy", "forest", "river", "mountain",
  "ocean", "island", "desert", "valley", "city", "village", "nation",
  "border", "map", "compass", "horizon", "distance", "direction", "north",
  "south", "east", "west", "sun", "moon", "star", "sky", "cloud", "storm",
  "rain", "snow", "wind", "fire", "earth", "stone", "metal", "glass",
  "crystal", "light", "shadow", "mirror", "reflection", "echo", "silence",
  "music", "rhythm", "melody", "harmony", "color", "shape", "texture",
  "motion", "stillness", "time", "moment", "season", "spring", "summer",
  "autumn", "winter", "morning", "evening", "night", "dawn", "dusk", "clock",
  "calendar", "century", "era", "epoch", "ancestor", "descendant", "family",
  "friend", "stranger", "neighbor", "citizen", "traveler", "explorer",
  "scholar", "teacher", "student", "artist", "poet", "writer", "singer",
  "dancer", "builder", "farmer", "sailor", "soldier", "doctor", "engineer",
  "scientist", "philosopher", "child", "elder", "animal", "bird", "fish",
  "insect", "flower", "sapling", "leaf", "seed", "fruit", "harvest",
  "hunger", "thirst", "hope", "fear", "joy", "sorrow", "courage", "doubt",
  "trust", "truth", "justice", "freedom", "peace", "conflict", "victory",
  "journey", "home", "passage", "bridge", "doorway", "window", "path", "road",
];
interface Anchor {
  word: string;
  position: THREE.Vector3;
  color: string;
}

function buildAnchors(): Anchor[] {
  const king = new THREE.Vector3(2.35, 0.85, 1.05);
  const man = new THREE.Vector3(1.15, -1.45, 0.7);
  const woman = new THREE.Vector3(-2.45, 0.35, -0.55);
  const kingMinusMan = new THREE.Vector3().subVectors(king, man);
  const queen = woman.clone().add(kingMinusMan);

  const paris = new THREE.Vector3(-0.15, 1.45, -1.85);
  const france = new THREE.Vector3(1.05, 1.95, -2.85);

  return [
    { word: "King", position: king, color: "#ffd479" },
    { word: "Queen", position: queen, color: "#ffcf5e" },
    { word: "Man", position: man, color: "#c77dff" },
    { word: "Woman", position: woman, color: "#a06bff" },
    { word: "Paris", position: paris, color: "#4fd8ff" },
    { word: "France", position: france, color: "#7dd6ff" },
  ];
}
function useCloud(count: number) {
  return useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const words: string[] = new Array(count);
    const baseColor = new THREE.Color("#6d7dff");

    for (let i = 0; i < count; i++) {
      const u = seededRandom(i * 3.11 + 1);
      const v = seededRandom(i * 5.73 + 2);
      const w = seededRandom(i * 7.91 + 3);
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 9 * Math.cbrt(0.15 + 0.85 * w);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      positions[i * 3 + 2] = r * Math.cos(phi);

      const tint = 0.55 + seededRandom(i * 2.17 + 4) * 0.45;
      colors[i * 3] = baseColor.r * tint;
      colors[i * 3 + 1] = baseColor.g * tint;
      colors[i * 3 + 2] = baseColor.b * tint;

      words[i] = WORD_BANK[i % WORD_BANK.length];
    }

    return { positions, colors, words };
  }, [count]);
}

function useAnchorBuffers(anchors: Anchor[]) {
  return useMemo(() => {
    const positions = new Float32Array(anchors.length * 3);
    const colors = new Float32Array(anchors.length * 3);
    anchors.forEach((a, i) => {
      positions[i * 3] = a.position.x;
      positions[i * 3 + 1] = a.position.y;
      positions[i * 3 + 2] = a.position.z;
      const c = new THREE.Color(a.color);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    });
    return { positions, colors };
  }, [anchors]);
}
function AnchorGlow({ anchor }: { anchor: Anchor }) {
  const material = useNeonGlowMaterial(anchor.color);
  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uPulseSpeed.value = 0.28;
    material.uniforms.uIntensity.value = 0.55;
  });

  return (
    <group position={[anchor.position.x, anchor.position.y, anchor.position.z]}>
      <mesh>
        <sphereGeometry args={[0.22, 20, 20]} />
        <primitive object={material} attach="material" />
      </mesh>
      <Billboard follow>
        <Text
          position={[0, 0.42, 0]}
          fontSize={0.3}
          color={anchor.color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#05070f"
        >
          {anchor.word}
        </Text>
      </Billboard>
    </group>
  );
}

function WordMarker({
  markerRef,
  position,
  material,
  children,
}: {
  markerRef: Ref<THREE.Group>;
  position: [number, number, number];
  material: THREE.Material;
  children: string;
}) {
  return (
    <group ref={markerRef} position={position} visible={false}>
      <mesh>
        <sphereGeometry args={[0.2, 20, 20]} />
        <primitive object={material} attach="material" />
      </mesh>
      <Billboard follow>
        <Text
          position={[0, 0.42, 0]}
          fontSize={0.32}
          color="#eaffb0"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#05070f"
        >
          {children}
        </Text>
      </Billboard>
    </group>
  );
}
function updateArrowMeshes(
  shaftMesh: THREE.Mesh,
  headMesh: THREE.Mesh,
  origin: THREE.Vector3,
  target: THREE.Vector3,
  progress: number,
  shaftRadius: number,
  headLength: number
) {
  const fullDir = new THREE.Vector3().subVectors(target, origin);
  const fullLength = fullDir.length();
  const dirNorm = fullLength > 0.0001 ? fullDir.clone().normalize() : new THREE.Vector3(0, 1, 0);
  const currentLength = Math.max(0, fullLength * progress);
  const visible = currentLength > 0.01;

  shaftMesh.visible = visible;
  headMesh.visible = visible;
  if (!visible) return;

  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirNorm);
  const shaftLength = Math.max(0.001, currentLength - headLength);

  shaftMesh.position.copy(origin).addScaledVector(dirNorm, shaftLength / 2);
  shaftMesh.quaternion.copy(quat);
  shaftMesh.scale.set(shaftRadius, shaftLength, shaftRadius);

  const headRadius = shaftRadius * 3.4;
  headMesh.position.copy(origin).addScaledVector(dirNorm, currentLength - headLength / 2);
  headMesh.quaternion.copy(quat);
  headMesh.scale.set(headRadius, headLength, headRadius);
}
const CYCLE_SECONDS = 6.4;
const GROW1_END = 1.3;
const HOLD1_END = 1.9;
const GROW2_END = 3.2;
const BURST_END = 4.1;

function AnalogyAnimation({ anchors }: { anchors: Anchor[] }) {
  const king = anchors.find((a) => a.word === "King")!.position;
  const man = anchors.find((a) => a.word === "Man")!.position;
  const woman = anchors.find((a) => a.word === "Woman")!.position;
  const queen = anchors.find((a) => a.word === "Queen")!.position;

  const shaft1 = useRef<THREE.Mesh>(null!);
  const head1 = useRef<THREE.Mesh>(null!);
  const shaft2 = useRef<THREE.Mesh>(null!);
  const head2 = useRef<THREE.Mesh>(null!);
  const burst = useRef<THREE.Mesh>(null!);
  const captionRef = useRef<THREE.Group>(null!);

  const material1 = useNeonGlowMaterial("#eaffb0");
  const material2 = useNeonGlowMaterial("#eaffb0");
  const burstMaterial = useNeonGlowMaterial("#ffe08a");
  const play = useAnimPlayhead({ morph: 1, loop: CYCLE_SECONDS });
  const arithPlay = useAnimPlayhead({ morph: 2, hold: 24 });
  const beat = useShowBeat();

  useFrame(() => {
    const elapsed = play.current.armed ? play.current.t : 0;
    const t = elapsed % CYCLE_SECONDS;
    let p1: number;
    let p2 = 0;
    let burstAmt = 0;

    if (t < GROW1_END) {
      p1 = easeOutCubic(t / GROW1_END);
    } else if (t < HOLD1_END) {
      p1 = 1;
    } else if (t < GROW2_END) {
      p1 = 1;
      p2 = easeOutCubic((t - HOLD1_END) / (GROW2_END - HOLD1_END));
    } else if (t < BURST_END) {
      p1 = 1;
      p2 = 1;
      burstAmt = Math.sin(((t - GROW2_END) / (BURST_END - GROW2_END)) * Math.PI);
    } else {
      const fade = 1 - easeInOutCubic((t - BURST_END) / (CYCLE_SECONDS - BURST_END));
      p1 = fade;
      p2 = fade;
    }

    material1.uniforms.uTime.value = elapsed;
    material2.uniforms.uTime.value = elapsed;

    if (shaft1.current && head1.current) {
      updateArrowMeshes(shaft1.current, head1.current, man, king, play.current.armed ? p1 : 0, 0.04, 0.28);
    }
    if (shaft2.current && head2.current) {
      updateArrowMeshes(shaft2.current, head2.current, woman, queen, play.current.armed ? p2 : 0, 0.04, 0.28);
    }

    if (burst.current) {
      const live = play.current.armed && (arithPlay.current.armed || beat.current.morphs >= 2) && burstAmt > 0.04;
      burst.current.visible = live;
      if (live) {
        const scale = 0.45 + burstAmt * 0.7;
        burst.current.scale.set(scale, scale, scale);
        burstMaterial.uniforms.uOpacity.value = burstAmt * 0.55;
        burstMaterial.uniforms.uIntensity.value = 0.45 + burstAmt * 0.6;
        burstMaterial.uniforms.uPulseSpeed.value = 0.2;
        burstMaterial.uniforms.uTime.value = elapsed;
      }
    }
    if (captionRef.current) captionRef.current.visible = arithPlay.current.armed || beat.current.morphs >= 2;
  });

  return (
    <group>
      <mesh ref={shaft1} visible={false}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <primitive object={material1} attach="material" />
      </mesh>
      <mesh ref={head1} visible={false}>
        <coneGeometry args={[1, 1, 8]} />
        <primitive object={material1} attach="material" />
      </mesh>

      <mesh ref={shaft2} visible={false}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <primitive object={material2} attach="material" />
      </mesh>
      <mesh ref={head2} visible={false}>
        <coneGeometry args={[1, 1, 8]} />
        <primitive object={material2} attach="material" />
      </mesh>

      
      <mesh ref={burst} position={[queen.x, queen.y, queen.z]} visible={false}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <primitive object={burstMaterial} attach="material" />
      </mesh>
      <group ref={captionRef} visible={false}>
        <Text
          position={[0, -2.55, 0.8]}
          fontSize={0.28}
          color="#eaffb0"
          anchorX="center"
          outlineWidth={0.008}
          outlineColor="#05070f"
        >
          King − Man + Woman = Queen
        </Text>
      </group>
    </group>
  );
}
const ORGANIZE_SECONDS = 3.0;
const REST_TINT = new THREE.Color("#6d7dff");
const ORGANIZE_CLUSTERS = [
  { center: new THREE.Vector3(-4.5, 2.15, 0.25), color: new THREE.Color("#7dffb0") },
  { center: new THREE.Vector3(4.6, 2.05, -0.2), color: new THREE.Color("#4fd8ff") },
  { center: new THREE.Vector3(0.05, -3.35, 0.45), color: new THREE.Color("#c77dff") },
] as const;

function scatterXYZ(i: number, spread: number, out: Float32Array, offset: number) {
  const u = seededRandom(i * 3.11 + 1);
  const v = seededRandom(i * 5.73 + 2);
  const w = seededRandom(i * 7.91 + 3);
  const theta = u * Math.PI * 2;
  const phi = Math.acos(2 * v - 1);
  const r = spread * Math.cbrt(0.15 + 0.85 * w);
  out[offset] = r * Math.sin(phi) * Math.cos(theta);
  out[offset + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
  out[offset + 2] = r * Math.cos(phi);
}

function useOrganizeCloud(count: number) {
  return useMemo(() => {
    const start = new Float32Array(count * 3);
    const target = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const targetColors = new Float32Array(count * 3);
    const words: string[] = new Array(count);
    const tmp = new THREE.Color();

    for (let i = 0; i < count; i++) {
      scatterXYZ(i, 8.2, start, i * 3);
      const cluster =
        i < 2 ? 0 : Math.min(ORGANIZE_CLUSTERS.length - 1, Math.floor(seededRandom(i * 9.17 + 8) * 3));
      const c = ORGANIZE_CLUSTERS[cluster];
      if (i === 0) {
        target[0] = c.center.x - 0.3;
        target[1] = c.center.y + 0.22;
        target[2] = c.center.z + 0.08;
        words[i] = "cat";
      } else if (i === 1) {
        target[3] = c.center.x + 0.34;
        target[4] = c.center.y - 0.16;
        target[5] = c.center.z + 0.12;
        words[i] = "dog";
      } else {
        const jx = (seededRandom(i * 4.1 + 11) - 0.5) * 0.48;
        const jy = (seededRandom(i * 5.7 + 13) - 0.5) * 0.38;
        const jz = (seededRandom(i * 6.3 + 17) - 0.5) * 0.42;
        target[i * 3] = c.center.x + jx;
        target[i * 3 + 1] = c.center.y + jy;
        target[i * 3 + 2] = c.center.z + jz;
        words[i] = WORD_BANK[i % WORD_BANK.length];
      }
      tmp.copy(REST_TINT).multiplyScalar(0.55 + seededRandom(i * 2.17 + 4) * 0.45);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
      const hot = i < 2 ? new THREE.Color("#eaffb0") : c.color;
      tmp.copy(hot).multiplyScalar(0.7 + seededRandom(i * 3.3 + 5) * 0.3);
      targetColors[i * 3] = tmp.r;
      targetColors[i * 3 + 1] = tmp.g;
      targetColors[i * 3 + 2] = tmp.b;
    }

    return { start, target, colors, targetColors, words };
  }, [count]);
}

function OrganizingCloud({ count }: { count: number }) {
  const cloud = useOrganizeCloud(count);
  const labelPlay = useAnimPlayhead({ morph: 1, hold: 40 });
  const archPlay = useAnimPlayhead({ morph: 2, hold: 16 });
  const organizePlay = useAnimPlayhead({ morph: 3, hold: ORGANIZE_SECONDS + 8 });
  const generalizePlay = useAnimPlayhead({ morph: 4, hold: 16 });
  const seedPlay = useAnimPlayhead({ morph: 5, hold: 24 });
  const beat = useShowBeat();
  const localT = useRef(0);
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tint = useMemo(() => new THREE.Color(), []);
  const catRef = useRef<THREE.Group>(null!);
  const dogRef = useRef<THREE.Group>(null!);
  const bridgeRef = useRef<THREE.Mesh>(null!);
  const haloRefs = useRef<(THREE.Mesh | null)[]>([]);
  const caption0 = useRef<THREE.Group>(null!);
  const captionArch = useRef<THREE.Group>(null!);
  const caption1 = useRef<THREE.Group>(null!);
  const caption2 = useRef<THREE.Group>(null!);
  const captionSeed = useRef<THREE.Group>(null!);
  const live = useRef(cloud.start.slice());
  const [hovered, setHovered] = useState<number | null>(null);

  const catMat = useNeonGlowMaterial("#eaffb0");
  const dogMat = useNeonGlowMaterial("#eaffb0");

  const writeInstances = (p: number) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (!mesh.instanceColor || mesh.instanceColor.count !== count) {
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    }
    const { start, target, colors, targetColors } = cloud;
    const s = 0.12 + p * 0.04;
    for (let i = 0; i < count; i++) {
      const o = i * 3;
      const x = THREE.MathUtils.lerp(start[o], target[o], p);
      const y = THREE.MathUtils.lerp(start[o + 1], target[o + 1], p);
      const z = THREE.MathUtils.lerp(start[o + 2], target[o + 2], p);
      live.current[o] = x;
      live.current[o + 1] = y;
      live.current[o + 2] = z;
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      tint.setRGB(
        THREE.MathUtils.lerp(colors[o], targetColors[o], p),
        THREE.MathUtils.lerp(colors[o + 1], targetColors[o + 1], p),
        THREE.MathUtils.lerp(colors[o + 2], targetColors[o + 2], p)
      );
      mesh.setColorAt(i, tint);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  useLayoutEffect(() => {
    writeInstances(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listed values define initial instances
  }, [cloud, count]);

  useFrame((_, delta) => {
    const morphs = beat.current.morphs;
    const organizing = organizePlay.current.armed || morphs >= 3;
    if (!organizing) localT.current = 0;
    else localT.current += Math.min(delta, 0.1);
    const t = Math.min(localT.current, ORGANIZE_SECONDS + 4);
    const p = organizing ? easeOutCubic(THREE.MathUtils.smoothstep(t, 0, ORGANIZE_SECONDS)) : 0;
    writeInstances(p);

    const showLabels = labelPlay.current.armed || morphs >= 1;
    const showArch = (archPlay.current.armed || morphs >= 2) && p < 0.2 && morphs < 3;
    const showGen = generalizePlay.current.armed || morphs >= 4;
    const showSeed = seedPlay.current.armed || morphs >= 5;

    if (catRef.current) {
      catRef.current.visible = showLabels;
      catRef.current.position.set(live.current[0], live.current[1], live.current[2]);
      catRef.current.scale.setScalar(0.85 + 0.45 * p);
    }
    if (dogRef.current) {
      dogRef.current.visible = showLabels;
      dogRef.current.position.set(live.current[3], live.current[4], live.current[5]);
      dogRef.current.scale.setScalar(0.85 + 0.45 * p);
    }
    catMat.uniforms.uTime.value = t;
    dogMat.uniforms.uTime.value = t;
    catMat.uniforms.uPulseSpeed.value = 0.4;
    dogMat.uniforms.uPulseSpeed.value = 0.4;
    catMat.uniforms.uIntensity.value = 0.7 + p * 0.9;
    dogMat.uniforms.uIntensity.value = 0.7 + p * 0.9;
    catMat.uniforms.uOpacity.value = 0.55 + 0.45 * p;
    dogMat.uniforms.uOpacity.value = 0.55 + 0.45 * p;

    const cat = new THREE.Vector3(live.current[0], live.current[1], live.current[2]);
    const dog = new THREE.Vector3(live.current[3], live.current[4], live.current[5]);
    if (bridgeRef.current) {
      const gap = cat.distanceTo(dog);
      const showBridge = showGen && p > 0.55 && gap < 1.4;
      bridgeRef.current.visible = showBridge;
      if (showBridge) {
        const dir = new THREE.Vector3().subVectors(dog, cat);
        const len = Math.max(dir.length(), 0.001);
        bridgeRef.current.position.copy(cat).add(dog).multiplyScalar(0.5);
        bridgeRef.current.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir.multiplyScalar(1 / len)
        );
        bridgeRef.current.scale.set(0.03, len, 0.03);
      }
    }

    ORGANIZE_CLUSTERS.forEach((_, i) => {
      const halo = haloRefs.current[i];
      if (!halo) return;
      const on = p > 0.12;
      halo.visible = on;
      const grow = THREE.MathUtils.smoothstep(p, 0.12, 0.7);
      halo.scale.setScalar(0.35 + grow * 0.9);
      const mat = halo.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.05 + grow * 0.16;
    });

    if (caption0.current) caption0.current.visible = morphs < 2 && p < 0.12;
    if (captionArch.current) captionArch.current.visible = showArch;
    if (caption1.current) caption1.current.visible = organizing && p >= 0.12 && !showGen;
    if (caption2.current) caption2.current.visible = showGen && !showSeed;
    if (captionSeed.current) captionSeed.current.visible = showSeed;
  });

  const hoverPos =
    hovered !== null
      ? ([live.current[hovered * 3], live.current[hovered * 3 + 1] + 0.35, live.current[hovered * 3 + 2]] as [
          number,
          number,
          number,
        ])
      : null;

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, count]}
        frustumCulled={false}
        onPointerMove={(e) => {
          if (typeof e.instanceId === "number") setHovered(e.instanceId);
        }}
        onPointerOut={() => setHovered(null)}
      >
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>

      {ORGANIZE_CLUSTERS.map((c, i) => (
        <mesh
          key={`halo-${i}`}
          ref={(el) => {
            haloRefs.current[i] = el;
          }}
          position={[c.center.x, c.center.y, c.center.z]}
          visible={false}
        >
          <sphereGeometry args={[1.35, 24, 24]} />
          <meshBasicMaterial
            color={c.color}
            transparent
            opacity={0.08}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}

      <mesh ref={bridgeRef} visible={false}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshBasicMaterial color="#eaffb0" toneMapped={false} />
      </mesh>

      {hoverPos && hovered !== null && (
        <Text
          position={hoverPos}
          fontSize={0.2}
          color="#dce6ff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.006}
          outlineColor="#05070f"
        >
          {cloud.words[hovered]}
        </Text>
      )}

      <WordMarker
        markerRef={catRef}
        position={[cloud.start[0], cloud.start[1], cloud.start[2]]}
        material={catMat}
      >
        cat
      </WordMarker>
      <WordMarker
        markerRef={dogRef}
        position={[cloud.start[3], cloud.start[4], cloud.start[5]]}
        material={dogMat}
      >
        dog
      </WordMarker>

      <group ref={caption0}>
        <Text
          position={[0, -2.55, 0.8]}
          fontSize={0.22}
          color="#8fa2d6"
          anchorX="center"
          outlineWidth={0.006}
          outlineColor="#05070f"
        >
          words start as random numbers
        </Text>
      </group>
      <group ref={captionArch} visible={false}>
        <Text
          position={[0, 3.15, 0.6]}
          fontSize={0.2}
          color="#7dffb0"
          anchorX="center"
          outlineWidth={0.006}
          outlineColor="#05070f"
        >
          lookup table → hidden layer → next-word prediction
        </Text>
      </group>
      <group ref={caption1} visible={false}>
        <Text
          position={[0, -2.55, 0.8]}
          fontSize={0.22}
          color="#8fa2d6"
          anchorX="center"
          outlineWidth={0.006}
          outlineColor="#05070f"
        >
          similar usage · points drift together
        </Text>
      </group>
      <group ref={caption2} visible={false}>
        <Text
          position={[0, -2.55, 0.8]}
          fontSize={0.22}
          color="#eaffb0"
          anchorX="center"
          outlineWidth={0.006}
          outlineColor="#05070f"
        >
          the cat sat on the mat · so can the dog
        </Text>
      </group>
      <group ref={captionSeed} visible={false}>
        <Text
          position={[0, -2.55, 0.8]}
          fontSize={0.22}
          color="#c77dff"
          anchorX="center"
          outlineWidth={0.006}
          outlineColor="#05070f"
        >
          the seed waits · a decade later, the field changes
        </Text>
      </group>
    </>
  );
}
function BankAmbiguity() {
  const play = useAnimPlayhead({ morph: 3 });
  const groupRef = useRef<THREE.Group>(null!);
  const bankRef = useRef<THREE.Group>(null!);
  const material = useNeonGlowMaterial("#ff5c6a");

  const river = useMemo(() => new THREE.Vector3(-2.9, -1.35, 1.45), []);
  const money = useMemo(() => new THREE.Vector3(2.75, -1.5, -0.95), []);

  useFrame(() => {
    const armed = play.current.armed;
    const t = armed ? play.current.t : 0;
    if (groupRef.current) groupRef.current.visible = armed;
    if (!armed || !bankRef.current) return;
    const blend = 0.5 + 0.5 * Math.sin(t * 1.15);
    bankRef.current.position.lerpVectors(river, money, blend);
    const pulse = 0.85 + 0.25 * Math.sin(t * 4.2);
    bankRef.current.scale.setScalar(pulse);
    material.uniforms.uTime.value = t;
    material.uniforms.uIntensity.value = 1.3 + 0.7 * Math.abs(Math.sin(t * 1.15));
  });

  return (
    <group ref={groupRef} visible={false}>
      <group position={[river.x, river.y, river.z]}>
        <mesh>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshBasicMaterial color="#4fd8ff" transparent opacity={0.55} />
        </mesh>
        <Text
          position={[0, 0.32, 0]}
          fontSize={0.16}
          color="#4fd8ff"
          anchorX="center"
          outlineWidth={0.006}
          outlineColor="#05070f"
        >
          river
        </Text>
      </group>
      <group position={[money.x, money.y, money.z]}>
        <mesh>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshBasicMaterial color="#ffd479" transparent opacity={0.55} />
        </mesh>
        <Text
          position={[0, 0.32, 0]}
          fontSize={0.16}
          color="#ffd479"
          anchorX="center"
          outlineWidth={0.006}
          outlineColor="#05070f"
        >
          savings
        </Text>
      </group>
      <group ref={bankRef}>
        <mesh>
          <sphereGeometry args={[0.2, 20, 20]} />
          <primitive object={material} attach="material" />
        </mesh>
        <Text
          position={[0, 0.42, 0]}
          fontSize={0.26}
          color="#ff5c6a"
          anchorX="center"
          outlineWidth={0.008}
          outlineColor="#05070f"
        >
          bank
        </Text>
      </group>
      <Text
        position={[0, -3.05, 0]}
        fontSize={0.2}
        color="#ff8fa0"
        anchorX="center"
        outlineWidth={0.006}
        outlineColor="#05070f"
      >
        one vector · two meanings · context still missing
      </Text>
    </group>
  );
}

export default function VectorSpaceVisualizer({
  activeAnalogy,
  params = {},
  position = [0, 0, 0],
}: VectorSpaceVisualizerProps) {
  const totalCount =
    typeof params.wordCount === "number" ? Math.max(20, Math.round(params.wordCount)) : 400;

  const anchors = useMemo(() => buildAnchors(), []);
  const genericCount = Math.max(0, totalCount - anchors.length);

  const cloud = useCloud(genericCount);
  const anchorBuffers = useAnchorBuffers(anchors);
  const [hovered, setHovered] = useState<number | null>(null);
  const { raycaster } = useThree();
  useEffect(() => {
    const pointsParams = raycaster.params as { Points?: { threshold?: number } };
    if (pointsParams.Points) {
      pointsParams.Points.threshold = 0.28;
    } else {
      pointsParams.Points = { threshold: 0.28 };
    }
  }, [raycaster]);

  if (!activeAnalogy) {
    return (
      <group position={position}>
        <OrganizingCloud count={totalCount} />
      </group>
    );
  }

  return (
    <group position={position}>
      <Points
        positions={cloud.positions}
        colors={cloud.colors}
        stride={3}
        onPointerMove={(e) => {
          if (typeof e.index === "number") setHovered(e.index);
        }}
        onPointerOut={() => setHovered(null)}
      >
        <PointMaterial
          transparent
          vertexColors
          size={0.13}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </Points>

      {hovered !== null && (
        <Text
          position={[
            cloud.positions[hovered * 3],
            cloud.positions[hovered * 3 + 1] + 0.35,
            cloud.positions[hovered * 3 + 2],
          ]}
          fontSize={0.2}
          color="#dce6ff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.006}
          outlineColor="#05070f"
        >
          {cloud.words[hovered]}
        </Text>
      )}

      {anchors.map((a) => (
        <AnchorGlow key={a.word} anchor={a} />
      ))}
      <Points positions={anchorBuffers.positions} colors={anchorBuffers.colors} stride={3}>
        <PointMaterial
          transparent
          vertexColors
          size={0.22}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </Points>
      <AnalogyAnimation anchors={anchors} />
      <BankAmbiguity />
    </group>
  );
}
