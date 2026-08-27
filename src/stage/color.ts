import { MathUtils } from "three";

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function lerpHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(MathUtils.lerp(ar, br, t));
  const g = Math.round(MathUtils.lerp(ag, bg, t));
  const bch = Math.round(MathUtils.lerp(ab, bb, t));
  return `#${[r, g, bch].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
