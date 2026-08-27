import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Clock, Sparkles } from "lucide-react";
import KaraokeScript from "./KaraokeScript";
import MiniScenePreview from "./MiniScenePreview";
import usePresentationSync from "../presentation/usePresentationSync";
import { karaokeTimelines } from "../presentation/karaokeTimelines";
import { presentationData } from "../presentation/slides";
import { actLabel, formatClock } from "../shared/format";

const slideStartTimes = karaokeTimelines.map((_, index) =>
  karaokeTimelines.slice(0, index).reduce((sum, timeline) => sum + timeline.durationSec, 0),
);
const totalDurationSeconds = karaokeTimelines.reduce(
  (sum, timeline) => sum + timeline.durationSec,
  0,
);

export default function PresenterConsole() {
  const {
    slide,
    currentSlideIndex,
    elapsedTime,
    slideElapsed,
    isPaused,
    goToSlide,
    nextSlide: goNextSlide,
    prevSlide: goPrevSlide,
    togglePause,
    seekSlideElapsed,
  } = usePresentationSync({ slides: presentationData, role: "presenter" });

  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeSlideRef = useRef<HTMLButtonElement>(null);
  const upcomingSlide = presentationData[currentSlideIndex + 1] ?? null;

  useEffect(() => {
    activeSlideRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentSlideIndex]);

  const plannedElapsedAtSlideStart = slideStartTimes[currentSlideIndex] ?? 0;
  const paceDelta = elapsedTime - plannedElapsedAtSlideStart;
  const paceLabel =
    Math.abs(paceDelta) < 5 ? "on pace" : paceDelta > 0 ? `${formatClock(paceDelta)} behind` : `${formatClock(-paceDelta)} ahead`;
  const paceColor = Math.abs(paceDelta) < 5 ? "text-emerald-400" : paceDelta > 0 ? "text-red-400" : "text-sky-400";
  const remaining = Math.max(0, totalDurationSeconds - elapsedTime);

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0a0a0d] font-sans text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="text-xs uppercase tracking-[0.3em] text-white/40">{actLabel(slide.act)}</span>
          <span className="text-sm text-white/60">
            Slide {currentSlideIndex + 1} / {presentationData.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={goPrevSlide}
              className="flex items-center rounded px-1.5 py-1 hover:bg-white/10"
              title="Previous slide"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={goNextSlide}
              className="flex items-center rounded px-1.5 py-1 hover:bg-white/10"
              title="Next slide"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Clock size={14} className="text-white/50" />
            <span className="tabular-nums">
              {formatClock(remaining)} left · {formatClock(elapsedTime)} / {formatClock(totalDurationSeconds)}
            </span>
          </div>

          <span className={`text-sm font-medium tabular-nums ${paceColor}`}>{paceLabel}</span>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_320px] overflow-hidden">
        <div className="flex min-h-0 flex-col px-10 pt-8">
          <h2 className="mb-1 shrink-0 text-3xl font-semibold">{slide.title}</h2>
          {slide.subtitle && <p className="mb-3 shrink-0 text-white/50">{slide.subtitle}</p>}

          <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto pb-8">
            <KaraokeScript
              key={slide.id}
              timeline={karaokeTimelines[currentSlideIndex] ?? karaokeTimelines[0]}
              elapsed={slideElapsed}
              isPaused={isPaused}
              scrollerRef={scrollerRef}
              onTogglePause={togglePause}
              onSeek={seekSlideElapsed}
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-col border-l border-white/10 bg-white/[0.02]">
          <div className="space-y-2 border-b border-white/10 p-3">
            <p className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40">
              <Sparkles size={11} /> Mini preview
            </p>
            <MiniScenePreview slide={slide} label="Now" followShow />
            {upcomingSlide ? (
              <MiniScenePreview slide={upcomingSlide} label="Next" />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded-md border border-white/10 bg-black text-[11px] text-white/30">
                Show complete
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-3">
            <p className="mb-2 text-[10px] uppercase tracking-wider text-white/40">Slides</p>
            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1" aria-label="Presentation slides">
              {presentationData.map((item, index) => {
                const isActive = index === currentSlideIndex;

                return (
                  <button
                    key={item.id}
                    ref={isActive ? activeSlideRef : null}
                    type="button"
                    onClick={() => goToSlide(index)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex w-full items-start gap-2 rounded px-2.5 py-2 text-left transition-colors ${
                      isActive
                        ? "bg-white/15 text-white"
                        : "text-white/55 hover:bg-white/[0.07] hover:text-white/85"
                    }`}
                  >
                    <span className={`w-6 shrink-0 text-xs tabular-nums ${isActive ? "text-emerald-400" : "text-white/30"}`}>
                      {index + 1}
                    </span>
                    <span className="text-sm leading-snug">{item.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 px-6 py-2.5 text-xs text-white/40">
        <div className="flex items-center gap-4">
          <button onClick={goPrevSlide} className="flex items-center gap-1 rounded px-2 py-1 hover:bg-white/10 hover:text-white">
            <ChevronLeft size={14} /> Prev slide
          </button>
          <button onClick={goNextSlide} className="flex items-center gap-1 rounded px-2 py-1 hover:bg-white/10 hover:text-white">
            Next slide <ChevronRight size={14} />
          </button>
        </div>
        <span>
          <kbd className="rounded bg-white/10 px-1.5 py-0.5">Space</kbd>/
          <kbd className="rounded bg-white/10 px-1.5 py-0.5">→</kbd> next slide ·{" "}
          <kbd className="rounded bg-white/10 px-1.5 py-0.5">←</kbd> prev slide ·{" "}
          <kbd className="rounded bg-white/10 px-1.5 py-0.5">P</kbd> play/pause ·{" "}
          <kbd className="rounded bg-white/10 px-1.5 py-0.5">-</kbd>/
          <kbd className="rounded bg-white/10 px-1.5 py-0.5">=</kbd> skip 5s · click a word to jump
        </span>
      </div>
    </div>
  );
}
