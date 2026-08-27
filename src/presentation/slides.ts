import type { SlideData } from "./types";
import { ACT_I_SLIDES } from "./slides.act1";
import { ACT_II_SLIDES } from "./slides.act2";
import { ACT_III_SLIDES } from "./slides.act3";

export const presentationData: SlideData[] = [
  ...ACT_I_SLIDES,
  ...ACT_II_SLIDES,
  ...ACT_III_SLIDES,
];
