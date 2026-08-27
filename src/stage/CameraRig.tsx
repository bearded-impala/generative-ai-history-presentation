import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { waypointQueue } from "./camera";
import { DEFAULT_EASING, EASINGS } from "./easing";
import type { CameraWaypoint } from "../presentation/types";

const DEFAULT_FOV = 50;

interface Leg {
  waypoint: CameraWaypoint;
  startPos: THREE.Vector3;
  startLookAt: THREE.Vector3;
  startFov: number;
  startRoll: number;
  elapsed: number;
}

interface CameraRigProps {
  waypoints: CameraWaypoint | CameraWaypoint[];
  slideKey: string | number;
  baseFov?: number;
  onTransitionComplete?: () => void;
  snapOnMount?: boolean;
  yieldWhenResting?: boolean;
  onRestingChange?: (resting: boolean) => void;
}

function poseAt(leg: Leg, easeFn: (t: number) => number) {
  const duration = Math.max(leg.waypoint.transitionDuration, 0.0001);
  const t = easeFn(Math.min(leg.elapsed / duration, 1));
  return {
    lookAt: new THREE.Vector3().lerpVectors(
      leg.startLookAt,
      new THREE.Vector3(...leg.waypoint.lookAt),
      t
    ),
  };
}

export default function CameraRig({
  waypoints,
  slideKey,
  baseFov = DEFAULT_FOV,
  onTransitionComplete,
  snapOnMount = false,
  yieldWhenResting = false,
  onRestingChange,
}: CameraRigProps) {
  const { camera } = useThree();

  const queueRef = useRef<CameraWaypoint[]>([]);
  const legIndexRef = useRef(0);
  const legRef = useRef<Leg | null>(null);
  const restingLookAtRef = useRef(new THREE.Vector3());
  const isRestingRef = useRef(false);
  const idleClockRef = useRef(0);
  const lastSlideKeyRef = useRef<string | number | null>(null);
  const hasMountedRef = useRef(false);
  const notifiedRestingRef = useRef<boolean | null>(null);
  const onRestingChangeRef = useRef(onRestingChange);
  onRestingChangeRef.current = onRestingChange;

  const scratchPos = useMemo(() => new THREE.Vector3(), []);
  const scratchLookAt = useMemo(() => new THREE.Vector3(), []);
  const scratchTargetPos = useMemo(() => new THREE.Vector3(), []);
  const scratchTargetLook = useMemo(() => new THREE.Vector3(), []);

  const beginLeg = (wp: CameraWaypoint) => {
    const currentLookAt = isRestingRef.current
      ? restingLookAtRef.current
      : legRef.current
        ? poseAt(legRef.current, EASINGS[legRef.current.waypoint.easing ?? DEFAULT_EASING]).lookAt
        : restingLookAtRef.current;

    legRef.current = {
      waypoint: wp,
      startPos: camera.position.clone(),
      startLookAt: currentLookAt.clone(),
      startFov: camera instanceof THREE.PerspectiveCamera ? camera.fov : baseFov,
      startRoll: camera.rotation.z,
      elapsed: 0,
    };
    isRestingRef.current = false;
  };

  const snapTo = (wp: CameraWaypoint) => {
    camera.position.set(...wp.position);
    restingLookAtRef.current.set(...wp.lookAt);
    camera.lookAt(restingLookAtRef.current);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = wp.fov ?? baseFov;
      camera.updateProjectionMatrix();
    }
    camera.rotation.z = wp.roll ?? 0;
    legRef.current = null;
    isRestingRef.current = true;
    idleClockRef.current = 0;
  };

  if (slideKey !== lastSlideKeyRef.current) {
    lastSlideKeyRef.current = slideKey;
    const queue = waypointQueue(waypoints);
    queueRef.current = queue;
    legIndexRef.current = 0;

    if (!hasMountedRef.current && snapOnMount && queue[0]) {
      snapTo(queue[0]);
      legIndexRef.current = 1;
      if (queue.length > 1) beginLeg(queue[1]);
    } else if (queue[0]) {
      beginLeg(queue[0]);
    }
    hasMountedRef.current = true;
  }

  const notifyResting = (resting: boolean) => {
    if (notifiedRestingRef.current === resting) return;
    notifiedRestingRef.current = resting;
    onRestingChangeRef.current?.(resting);
  };

  useFrame((_, delta) => {
    const leg = legRef.current;

    if (!leg) {
      notifyResting(true);
      if (yieldWhenResting) return;
      const wp = queueRef.current[legIndexRef.current - 1] ?? queueRef.current[0];
      if (wp?.idleDrift?.enabled) {
        idleClockRef.current += delta;
        const amp = wp.idleDrift.amplitude ?? 0.15;
        const speed = wp.idleDrift.speed ?? 0.3;
        const t = idleClockRef.current;
        camera.position.set(
          wp.position[0] + Math.sin(t * speed) * amp,
          wp.position[1] + Math.sin(t * speed * 0.7) * amp * 0.5,
          wp.position[2] + Math.cos(t * speed * 0.9) * amp
        );
        scratchLookAt.set(...wp.lookAt);
        camera.lookAt(scratchLookAt);
      }
      return;
    }

    leg.elapsed += delta;
    const duration = Math.max(leg.waypoint.transitionDuration, 0.0001);
    const rawT = Math.min(leg.elapsed / duration, 1);
    const t = EASINGS[leg.waypoint.easing ?? DEFAULT_EASING](rawT);

    scratchTargetPos.set(...leg.waypoint.position);
    scratchTargetLook.set(...leg.waypoint.lookAt);
    scratchPos.lerpVectors(leg.startPos, scratchTargetPos, t);
    scratchLookAt.lerpVectors(leg.startLookAt, scratchTargetLook, t);

    camera.position.copy(scratchPos);
    camera.lookAt(scratchLookAt);

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(leg.startFov, leg.waypoint.fov ?? baseFov, t);
      camera.updateProjectionMatrix();
    }
    camera.rotation.z = THREE.MathUtils.lerp(leg.startRoll, leg.waypoint.roll ?? 0, t);

    if (rawT >= 1) {
      restingLookAtRef.current.copy(scratchLookAt);
      legIndexRef.current += 1;
      const next = queueRef.current[legIndexRef.current];
      if (next) {
        beginLeg(next);
      } else {
        legRef.current = null;
        isRestingRef.current = true;
        idleClockRef.current = 0;
        onTransitionComplete?.();
        notifyResting(true);
      }
    } else {
      notifyResting(false);
    }
  });

  return null;
}
