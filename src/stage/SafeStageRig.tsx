import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { CameraWaypoint } from "../presentation/types";
import { restingWaypoint } from "./camera";
import {
  applyProjectionShift,
  audienceStage,
  collectLocalBox,
  dampVec3,
  fitPoseToBox,
  measureSafeRect,
  stageControl,
} from "./safeStage";

interface SafeStageRigProps {
  slideId: string;
  authoredCamera: CameraWaypoint | CameraWaypoint[];
  framedWaypoints: CameraWaypoint[];
}


export default function SafeStageRig({ slideId, authoredCamera, framedWaypoints }: SafeStageRigProps) {
  const { camera, gl, size } = useThree();
  const heldBox = useRef(new THREE.Box3());
  const heldForSlide = useRef<string | null>(null);

  useEffect(() => {
    heldBox.current.makeEmpty();
    heldForSlide.current = slideId;
    stageControl.userOrbiting = false;
  }, [slideId]);

  useFrame((_, delta) => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    const safe = measureSafeRect(gl.domElement, size.width, size.height);
    const last = framedWaypoints[framedWaypoints.length - 1];
    if (!last) return;

    const group = audienceStage.group;
    if (group && audienceStage.slideId === slideId) {
      const local = collectLocalBox(group);
      if (local) {
        if (heldForSlide.current !== slideId) {
          heldBox.current.makeEmpty();
          heldForSlide.current = slideId;
        }
        heldBox.current.copy(local);

        const restAnchor = restingWaypoint(authoredCamera).lookAt;
        const fit = fitPoseToBox(authoredCamera, heldBox.current, restAnchor, safe, camera.aspect);
        if (fit) {
          const dt = Math.min(delta, 0.05);
          dampVec3(last.position, fit.position, 10, dt);
          dampVec3(last.lookAt, fit.lookAt, 10, dt);
          last.fov = fit.fov;
        }
      }
    }

    if (stageControl.resting && !stageControl.userOrbiting) {
      camera.position.set(last.position[0], last.position[1], last.position[2]);
      camera.lookAt(last.lookAt[0], last.lookAt[1], last.lookAt[2]);
      camera.rotation.z = last.roll ?? 0;
      if (last.fov != null && Math.abs(camera.fov - last.fov) > 0.01) {
        camera.fov = last.fov;
      }
    }

    applyProjectionShift(camera, safe);
  }, 1);

  return null;
}
