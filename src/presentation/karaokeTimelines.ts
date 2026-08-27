import { buildKaraokeTimeline, type KaraokeTimeline } from "./scriptTiming";
import { presentationData } from "./slides";

export const karaokeTimelines: KaraokeTimeline[] = presentationData.map((slide) =>
  buildKaraokeTimeline(slide.script, { slideIndex: slide.index }),
);

export function timelineFor(slideIndex: number): KaraokeTimeline {
  return karaokeTimelines[slideIndex] ?? karaokeTimelines[0]!;
}
