import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CameraWaypoint } from "../presentation/types";
import { measureSafeRect, STAGE_FILL } from "./safeStage";

interface SlideHeroPhotoProps {
  src: string;
  waypoint: CameraWaypoint;
}

export default function SlideHeroPhoto({ src, waypoint }: SlideHeroPhotoProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const target = useRef(new THREE.Vector3());
  const [map, setMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let disposed = false;
    const texture = loader.load(
      src,
      (tex) => {
        if (disposed) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = 8;
        tex.needsUpdate = true;
        setMap(tex);
      },
      undefined,
      () => {
        console.error("Failed to load slide hero photo", src);
      }
    );
    return () => {
      disposed = true;
      texture.dispose();
      setMap(null);
    };
  }, [src]);

  useFrame(({ camera, gl, size }) => {
    const mesh = meshRef.current;
    if (!mesh || !(camera instanceof THREE.PerspectiveCamera)) return;

    target.current.set(...waypoint.lookAt);
    const dist = Math.max(camera.position.distanceTo(target.current), 0.5);
    const viewH = 2 * Math.tan((camera.fov * Math.PI) / 360) * dist;
    const viewW = viewH * camera.aspect;
    const safe = measureSafeRect(gl.domElement, size.width, size.height);
    const sx = THREE.MathUtils.clamp(safe.width / safe.canvasW, 0.2, 1);
    const sy = THREE.MathUtils.clamp(safe.height / safe.canvasH, 0.2, 1);

    mesh.position.copy(target.current);
    mesh.quaternion.copy(camera.quaternion);
    mesh.scale.set(viewW * sx * STAGE_FILL, viewH * sy * STAGE_FILL, 1);
  });

  if (!map) return null;

  return (
    <mesh ref={meshRef} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={map} side={THREE.DoubleSide} toneMapped={false} fog={false} depthWrite />
    </mesh>
  );
}
