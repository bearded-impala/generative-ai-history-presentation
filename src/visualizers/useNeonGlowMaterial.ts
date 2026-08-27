import { useEffect, useMemo } from "react";
import type { ColorRepresentation } from "three";
import { NeonGlowMaterial } from "./neonGlow";

export function useNeonGlowMaterial(color: ColorRepresentation): NeonGlowMaterial {
  const material = useMemo(() => new NeonGlowMaterial(color), [color]);
  useEffect(() => () => material.dispose(), [material]);
  return material;
}
