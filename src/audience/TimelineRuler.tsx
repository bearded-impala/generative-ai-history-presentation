import { useMemo } from "react";
import type { SlideData } from "../presentation/types";

interface TimelineRulerProps {
  slides: SlideData[];
  activeIndex: number;
  className?: string;
}

function yearPercent(year: number, min: number, max: number): number {
  if (max === min) return 50;
  return ((year - min) / (max - min)) * 100;
}

export default function TimelineRuler({ slides, activeIndex, className = "" }: TimelineRulerProps) {
  const { minYear, maxYear } = useMemo(() => {
    const years = slides.map((s) => s.timelineYear);
    return { minYear: Math.min(...years), maxYear: Math.max(...years) };
  }, [slides]);

  const activeSlide = slides[activeIndex];
  const activePercent = activeSlide ? yearPercent(activeSlide.timelineYear, minYear, maxYear) : 0;
  const prevYear = activeIndex > 0 ? slides[activeIndex - 1]?.timelineYear : undefined;
  const isRewind = prevYear != null && activeSlide != null && activeSlide.timelineYear < prevYear;

  return (
    <div className={`pointer-events-none select-none ${className}`}>
      <div className="relative h-10 w-full">
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/15" />

        {slides.map((s, i) => {
          const pct = yearPercent(s.timelineYear, minYear, maxYear);
          const isActive = i === activeIndex;
          const isPast = i < activeIndex;
          return (
            <div
              key={s.id}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500"
              style={{
                left: `${pct}%`,
                width: isActive ? 7 : 4,
                height: isActive ? 7 : 4,
                backgroundColor: isActive ? "#ffb347" : isPast ? "#8a97a5" : "#3a4149",
                boxShadow: isActive ? "0 0 8px 2px rgba(255,179,71,0.55)" : "none",
              }}
            />
          );
        })}

        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 transition-[left] duration-[1400ms] ease-in-out"
          style={{ left: `${activePercent}%` }}
        />

        <div
          className="absolute -top-6 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-white/80 transition-[left] duration-[1400ms] ease-in-out"
          style={{ left: `${activePercent}%` }}
        >
          {isRewind && <span className="mr-1.5 uppercase tracking-wider text-amber-300/90">rewind</span>}
          {activeSlide?.timelineLabel}
        </div>
      </div>

      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-white/30">
        <span>{minYear}</span>
        <span>{maxYear}s</span>
      </div>
    </div>
  );
}
