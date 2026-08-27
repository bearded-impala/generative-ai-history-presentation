import { MathUtils } from "three";

export function clampCount(raw: unknown, fallback: number, min: number, max: number): number {
  const n = typeof raw === "number" && Number.isFinite(raw) ? Math.round(raw) : fallback;
  return MathUtils.clamp(n, min, max);
}

export function stringParam(raw: unknown, fallback: string): string {
  return typeof raw === "string" && raw.length > 0 ? raw : fallback;
}
