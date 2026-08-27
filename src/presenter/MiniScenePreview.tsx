import { useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BeatLock } from "../presentation/useShowBeat";
import { firstWaypoint } from "../stage/camera";
import type { CameraWaypoint, SlideData } from "../presentation/types";
import SceneGraph from "../stage/SceneGraph";

function StaticCameraAim({ waypoint }: { waypoint: CameraWaypoint }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(...waypoint.position);
    camera.lookAt(...waypoint.lookAt);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = waypoint.fov ?? 50;
      camera.updateProjectionMatrix();
    }
  }, [camera, waypoint]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    camera.position.set(
      waypoint.position[0] + Math.sin(t * 0.2) * 0.15,
      waypoint.position[1],
      waypoint.position[2] + Math.cos(t * 0.17) * 0.15
    );
    camera.lookAt(...waypoint.lookAt);
  });
  return null;
}

export default function MiniScenePreview({
  slide,
  label,
  followShow = false,
}: {
  slide: SlideData;
  label: string;
  followShow?: boolean;
}) {
  const waypoint = useMemo(() => firstWaypoint(slide.camera), [slide]);
  const graph = <SceneGraph key={slide.id} slide={slide} fitSafeArea={false} />;
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-md border border-white/10 bg-black">
      <Canvas dpr={[1, 1]} frameloop="always">
        <StaticCameraAim waypoint={waypoint} />
        {followShow ? graph : <BeatLock frozen>{graph}</BeatLock>}
      </Canvas>
      <span className="absolute bottom-1 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/70">
        {label}
      </span>
    </div>
  );
}
