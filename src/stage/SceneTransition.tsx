import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { AmbientLight, DirectionalLight, Group } from "three";
import { lerpHex } from "./color";
import { EASINGS } from "./easing";
import { restingWaypoint } from "./camera";
import type { CameraWaypoint, EnvironmentConfig, SlideData, Vec3 } from "../presentation/types";
import SceneGraph from "./SceneGraph";
import { BeatLock } from "../presentation/useShowBeat";

function lookAtOf(slide: SlideData): Vec3 {
  return restingWaypoint(slide.camera).lookAt;
}


function cameraRightInto(wp: CameraWaypoint, target: THREE.Vector3) {
  const fx = wp.lookAt[0] - wp.position[0];
  const fy = wp.lookAt[1] - wp.position[1];
  const fz = wp.lookAt[2] - wp.position[2];
  if (fx * fx + fy * fy + fz * fz < 1e-8) {
    target.set(1, 0, 0);
    return;
  }
  target.set(-fz, 0, fx);
  if (target.lengthSq() < 1e-8) {
    target.set(1, 0, 0);
    return;
  }
  target.normalize();
}

function viewWidthAtLookAt(wp: CameraWaypoint): number {
  const dist =
    Math.hypot(
      wp.lookAt[0] - wp.position[0],
      wp.lookAt[1] - wp.position[1],
      wp.lookAt[2] - wp.position[2]
    ) || 10;
  const fovRad = ((wp.fov ?? 50) * Math.PI) / 180;
  return 2 * dist * Math.tan(fovRad / 2) * (16 / 9);
}

function timeDirection(from: SlideData, to: SlideData): number {
  const byYear = Math.sign(to.timelineYear - from.timelineYear);
  if (byYear !== 0) return byYear;
  return Math.sign(to.index - from.index) || 1;
}

function slidePose(slide: SlideData) {
  const wp = restingWaypoint(slide.camera);
  const look = new THREE.Vector3(...wp.lookAt);
  const right = new THREE.Vector3();
  cameraRightInto(wp, right);
  return { look, right, travel: viewWidthAtLookAt(wp) * 0.85 };
}

function offsetPose(look: THREE.Vector3, right: THREE.Vector3, amount: number): Vec3 {
  return [look.x + right.x * amount, look.y + right.y * amount, look.z + right.z * amount];
}


function PivotedScene({
  slide,
  pivotRef,
  scaleRef,
  freezeBeat = false,
  fitSafeArea = false,
  startScale = 1,
  startPosition,
}: {
  slide: SlideData;
  pivotRef: RefObject<Group | null>;
  scaleRef: RefObject<Group | null>;
  freezeBeat?: boolean;
  fitSafeArea?: boolean;
  startScale?: number;
  startPosition: Vec3;
}) {
  const lookAt = lookAtOf(slide);
  const graph = (
    <SceneGraph key={slide.id} slide={slide} renderEnvironment={false} fitSafeArea={fitSafeArea} />
  );

  useLayoutEffect(() => {
    scaleRef.current?.scale.setScalar(startScale);
    pivotRef.current?.position.set(...startPosition);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed remount applies intro; live frames own the transform
  }, []);

  return (
    <group ref={pivotRef}>
      <group ref={scaleRef}>
        <group position={[-lookAt[0], -lookAt[1], -lookAt[2]]}>
          <BeatLock frozen={freezeBeat}>{graph}</BeatLock>
        </group>
      </group>
    </group>
  );
}

export function SceneEnvironment({
  from,
  to,
  transitionDuration,
}: {
  from: EnvironmentConfig | null;
  to: EnvironmentConfig;
  transitionDuration: number;
}) {
  const { scene } = useThree();
  const ambientRef = useRef<AmbientLight>(null!);
  const keyLightRef = useRef<DirectionalLight>(null!);
  const fog = useMemo(
    () => new THREE.Fog(to.fog.color, to.fog.near, to.fog.far),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- paintEnv updates the stable fog instance
    []
  );
  const elapsedRef = useRef(0);

  const paintEnv = (t: number) => {
    const bg = from ? lerpHex(from.background, to.background, t) : to.background;
    if (scene.background instanceof THREE.Color) {
      scene.background.set(bg);
    } else {
      scene.background = new THREE.Color(bg);
    }

    fog.color.set(from ? lerpHex(from.fog.color, to.fog.color, t) : to.fog.color);
    fog.near = from ? THREE.MathUtils.lerp(from.fog.near, to.fog.near, t) : to.fog.near;
    fog.far = from ? THREE.MathUtils.lerp(from.fog.far, to.fog.far, t) : to.fog.far;

    if (ambientRef.current) {
      ambientRef.current.intensity = from
        ? THREE.MathUtils.lerp(from.ambientIntensity, to.ambientIntensity, t)
        : to.ambientIntensity;
    }

    if (keyLightRef.current) {
      const toKey = to.keyLight;
      const fromKey = from?.keyLight;
      if (toKey) {
        keyLightRef.current.visible = true;
        const baseline = fromKey ?? toKey;
        keyLightRef.current.intensity = THREE.MathUtils.lerp(baseline.intensity, toKey.intensity, t);
        keyLightRef.current.color.set(lerpHex(baseline.color, toKey.color, t));
        keyLightRef.current.position.set(
          THREE.MathUtils.lerp(baseline.position[0], toKey.position[0], t),
          THREE.MathUtils.lerp(baseline.position[1], toKey.position[1], t),
          THREE.MathUtils.lerp(baseline.position[2], toKey.position[2], t)
        );
      } else {
        keyLightRef.current.visible = false;
      }
    }
  };

  useLayoutEffect(() => {
    elapsedRef.current = 0;
    paintEnv(from ? 0 : 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pose from/to at the start of each env pair
  }, [from, to]);

  useEffect(() => {
    scene.fog = fog;
    return () => {
      if (scene.fog === fog) scene.fog = null;
    };
  }, [scene, fog]);

  useFrame((_, delta) => {
    let t = 1;
    if (from) {
      elapsedRef.current += delta;
      t = THREE.MathUtils.clamp(elapsedRef.current / Math.max(transitionDuration, 0.0001), 0, 1);
    }
    paintEnv(t);
  });

  return (
    <>
      <ambientLight ref={ambientRef} />
      <directionalLight ref={keyLightRef} />
    </>
  );
}

export function SlideCrossfade({
  fromSlide,
  toSlide,
  transitionDuration,
  onComplete,
}: {
  fromSlide: SlideData | null;
  toSlide: SlideData;
  transitionDuration: number;
  onComplete: () => void;
}) {
  const outgoingPivot = useRef<Group>(null);
  const outgoingScale = useRef<Group>(null);
  const incomingPivot = useRef<Group>(null);
  const incomingScale = useRef<Group>(null);
  const elapsedRef = useRef(0);
  const completedRef = useRef(!fromSlide);
  const dirRef = useRef(1);
  const fromLook = useRef(new THREE.Vector3());
  const toLook = useRef(new THREE.Vector3());
  const fromRight = useRef(new THREE.Vector3(1, 0, 0));
  const toRight = useRef(new THREE.Vector3(1, 0, 0));
  const fromTravel = useRef(8);
  const toTravel = useRef(8);

  const toPose = slidePose(toSlide);
  const fromPose = fromSlide ? slidePose(fromSlide) : null;
  const dir = fromSlide ? timeDirection(fromSlide, toSlide) : 1;
  const incomingStart = offsetPose(toPose.look, toPose.right, fromSlide ? dir * toPose.travel : 0);
  const outgoingStart = fromPose ? offsetPose(fromPose.look, fromPose.right, 0) : ([0, 0, 0] satisfies Vec3);

  useLayoutEffect(() => {
    elapsedRef.current = 0;
    completedRef.current = !fromSlide;
    const to = slidePose(toSlide);
    toLook.current.copy(to.look);
    toRight.current.copy(to.right);
    toTravel.current = to.travel;
    if (fromSlide) {
      const from = slidePose(fromSlide);
      fromLook.current.copy(from.look);
      fromRight.current.copy(from.right);
      fromTravel.current = from.travel;
      dirRef.current = timeDirection(fromSlide, toSlide);
    }
  }, [fromSlide, toSlide]);

  useFrame((_, delta) => {
    if (!fromSlide || completedRef.current) return;
    elapsedRef.current += delta;
    const t = THREE.MathUtils.clamp(elapsedRef.current / Math.max(transitionDuration, 0.0001), 0, 1);
    const eased = EASINGS.easeInOutCubic(t);
    const slideDir = dirRef.current;

    if (outgoingScale.current) outgoingScale.current.scale.setScalar(Math.max(0.001, 1 - eased));
    if (incomingScale.current) incomingScale.current.scale.setScalar(Math.max(0.001, eased));
    outgoingPivot.current?.position
      .copy(fromLook.current)
      .addScaledVector(fromRight.current, -slideDir * eased * fromTravel.current);
    incomingPivot.current?.position
      .copy(toLook.current)
      .addScaledVector(toRight.current, slideDir * (1 - eased) * toTravel.current);

    if (t >= 1) {
      completedRef.current = true;
      onComplete();
    }
  });

  return (
    <>
      {fromSlide && (
        <PivotedScene
          key={fromSlide.id}
          slide={fromSlide}
          pivotRef={outgoingPivot}
          scaleRef={outgoingScale}
          freezeBeat
          startPosition={outgoingStart}
        />
      )}
      <PivotedScene
        key={toSlide.id}
        slide={toSlide}
        pivotRef={incomingPivot}
        scaleRef={incomingScale}
        fitSafeArea
        startScale={fromSlide ? 0.001 : 1}
        startPosition={incomingStart}
      />
    </>
  );
}
