import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import type { Group } from "three";
import dartmouthPhoto from "../assets/dartmouth.jpg";
import type { EnvironmentConfig, SlideData, Vec3 } from "../presentation/types";
import { averageLookAt, restingWaypoint } from "./camera";
import { registerAudienceStage, unregisterAudienceStage } from "./safeStage";
import { seededRandom } from "../shared/random";
import SlideHeroPhoto from "./SlideHeroPhoto";
import VisualizerFor from "../visualizers/VisualizerFor";

interface SceneGraphProps {
  slide: SlideData;
  
  renderEnvironment?: boolean;
  
  fitSafeArea?: boolean;
}

function AtmosphereField({
  particles,
  anchor,
}: {
  particles: EnvironmentConfig["particles"];
  anchor: Vec3;
}) {
  const groupRef = useRef<Group>(null!);
  const spread = particles.spread ?? 14;

  const positions = useMemo(() => {
    const arr = new Float32Array(particles.count * 3);
    for (let i = 0; i < particles.count; i++) {
      const u = seededRandom(i * 3.31 + 1);
      const v = seededRandom(i * 5.17 + 2);
      const w = seededRandom(i * 7.53 + 3);
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = spread * Math.cbrt(0.2 + 0.8 * w);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55;
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [particles.count, spread]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * particles.speed;
    }
  });

  return (
    <group ref={groupRef} position={anchor}>
      <Points positions={positions} stride={3}>
        <PointMaterial
          transparent
          color={particles.color}
          size={particles.size}
          sizeAttenuation
          depthWrite={false}
          toneMapped={false}
          opacity={0.75}
        />
      </Points>
    </group>
  );
}

export default function SceneGraph({
  slide,
  renderEnvironment = true,
  fitSafeArea = true,
}: SceneGraphProps) {
  const { environment } = slide;
  const anchor = useMemo(() => averageLookAt(slide.camera), [slide.camera]);
  const heroSrc = slide.visualState.mode === "DARTMOUTH_ROUNDTABLE" ? dartmouthPhoto : undefined;
  const restLookAt = useMemo(() => restingWaypoint(slide.camera).lookAt, [slide.camera]);
  const stageRef = useRef<Group>(null);

  useLayoutEffect(() => {
    if (!fitSafeArea || heroSrc) return;
    const group = stageRef.current;
    if (!group) return;
    registerAudienceStage(slide.id, group);
    return () => unregisterAudienceStage(slide.id, group);
  }, [fitSafeArea, heroSrc, slide.id]);

  return (
    <>
      {renderEnvironment && (
        <>
          <color attach="background" args={[environment.background]} />
          <fog attach="fog" args={[environment.fog.color, environment.fog.near, environment.fog.far]} />
          <ambientLight intensity={environment.ambientIntensity} />
          {environment.keyLight && (
            <directionalLight
              color={environment.keyLight.color}
              intensity={environment.keyLight.intensity}
              position={environment.keyLight.position}
            />
          )}
        </>
      )}

      {heroSrc ? (
        <SlideHeroPhoto src={heroSrc} waypoint={restingWaypoint(slide.camera)} />
      ) : (
        <>
          <AtmosphereField particles={environment.particles} anchor={anchor} />
          <group ref={stageRef} position={restLookAt}>
            <VisualizerFor slide={slide} anchor={[0, 0, 0]} />
          </group>
        </>
      )}
    </>
  );
}
