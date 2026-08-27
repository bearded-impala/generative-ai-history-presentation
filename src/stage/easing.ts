import type { EasingName } from "../presentation/types";

export const EASINGS: Record<EasingName, (t: number) => number> = {
  linear: (t) => t,
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeInOutQuint: (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2),
  easeOutExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
};

export const DEFAULT_EASING: EasingName = "easeInOutCubic";
