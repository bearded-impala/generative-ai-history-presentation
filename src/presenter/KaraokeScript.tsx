import { useEffect, useRef, type MouseEvent, type RefObject } from "react";
import { FastForward, Pause, Play, Rewind } from "lucide-react";
import { formatClock } from "../shared/format";
import { KARAOKE_SKIP_SEC } from "../presentation/usePresentationSync";
import { wordIndexAt, type KaraokeTimeline, type KaraokeWord } from "../presentation/scriptTiming";

interface KaraokeScriptProps {
  timeline: KaraokeTimeline;
  elapsed: number;
  isPaused: boolean;
  scrollerRef: RefObject<HTMLDivElement | null>;
  onTogglePause: () => void;
  onSeek: (seconds: number) => void;
}

export default function KaraokeScript({
  timeline,
  elapsed,
  isPaused,
  scrollerRef,
  onTogglePause,
  onSeek,
}: KaraokeScriptProps) {
  const activeIndex = wordIndexAt(timeline.words, elapsed);
  const activeWord = activeIndex >= 0 ? timeline.words[activeIndex] : null;
  const activePara = activeWord?.paragraphIndex ?? 0;
  const activeRef = useRef<HTMLSpanElement | null>(null);
  const lastScrolled = useRef(-1);
  const followRef = useRef(true);
  const progress = Math.min(1, elapsed / Math.max(timeline.durationSec, 0.01));

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const release = (event: Event) => {
      const target = event.target;
      if (
        target instanceof Element &&
        (target.closest("[data-karaoke-transport]") || target.closest("[data-karaoke-word]"))
      ) {
        return;
      }
      followRef.current = false;
    };
    scroller.addEventListener("wheel", release, { passive: true });
    scroller.addEventListener("touchstart", release, { passive: true });
    scroller.addEventListener("pointerdown", release);
    return () => {
      scroller.removeEventListener("wheel", release);
      scroller.removeEventListener("touchstart", release);
      scroller.removeEventListener("pointerdown", release);
    };
  }, [scrollerRef]);

  useEffect(() => {
    if (!followRef.current) return;
    if (activeIndex < 0 || activeIndex === lastScrolled.current) return;
    const wordEl = activeRef.current;
    const scroller = scrollerRef.current;
    if (!wordEl || !scroller) return;

    const wordRect = wordEl.getBoundingClientRect();
    const box = scroller.getBoundingClientRect();
    const tooLow = wordRect.bottom > box.top + box.height * 0.64;
    const tooHigh = wordRect.top < box.top + box.height * 0.22;
    if (tooLow || tooHigh) {
      wordEl.scrollIntoView({ block: "center", behavior: "smooth" });
      lastScrolled.current = activeIndex;
    }
  }, [activeIndex, scrollerRef]);

  const nudge = (delta: number) => {
    followRef.current = true;
    lastScrolled.current = -1;
    onSeek(Math.max(0, elapsed + delta));
  };

  const jumpTo = (word: KaraokeWord) => {
    followRef.current = true;
    lastScrolled.current = -1;
    onSeek(word.start);
  };

  const seekOnBar = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
    followRef.current = true;
    lastScrolled.current = -1;
    onSeek(Math.max(0, Math.min(1, x)) * timeline.durationSec);
  };

  return (
    <div>
      <div
        data-karaoke-transport
        className="sticky top-0 z-10 -mx-1 mb-5 flex items-center gap-3 border-b border-white/10 bg-[#0a0a0d]/95 px-1 py-2.5 backdrop-blur-sm"
      >
        <button
          type="button"
          onClick={onTogglePause}
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium ${
            isPaused
              ? "bg-amber-400 text-black hover:bg-amber-300"
              : "bg-white/10 text-white hover:bg-white/15"
          }`}
          title="Play / pause teleprompter (P)"
          onKeyDown={(e) => {
            if (e.key === " ") e.preventDefault();
          }}
        >
          {isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} />}
          {isPaused ? "Play" : "Pause"}
          <kbd className={`rounded px-1 py-0.5 text-[10px] ${isPaused ? "bg-black/15" : "bg-white/10"}`}>P</kbd>
        </button>
        <button
          type="button"
          onClick={() => nudge(-KARAOKE_SKIP_SEC)}
          className="flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-white/15"
          title={`Rewind ${KARAOKE_SKIP_SEC}s (-)`}
          onKeyDown={(e) => {
            if (e.key === " ") e.preventDefault();
          }}
        >
          <Rewind size={14} />
          <kbd className="rounded bg-white/10 px-1 py-0.5 text-[10px]">-</kbd>
        </button>
        <button
          type="button"
          onClick={() => nudge(KARAOKE_SKIP_SEC)}
          className="flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-white/15"
          title={`Fast forward ${KARAOKE_SKIP_SEC}s (=)`}
          onKeyDown={(e) => {
            if (e.key === " ") e.preventDefault();
          }}
        >
          <FastForward size={14} />
          <kbd className="rounded bg-white/10 px-1 py-0.5 text-[10px]">=</kbd>
        </button>
        <span className="text-xs tabular-nums text-white/50">
          {formatClock(Math.min(elapsed, timeline.durationSec))} / {formatClock(timeline.durationSec)}
        </span>
        <div
          className="h-2 flex-1 cursor-pointer overflow-hidden rounded-full bg-white/10"
          title="Click to jump in this slide"
          onClick={seekOnBar}
        >
          <div className="h-full rounded-full bg-amber-400/80" style={{ width: `${progress * 100}%` }} />
        </div>
        {isPaused && <span className="text-[10px] uppercase tracking-wider text-amber-300/80">Paused</span>}
        <span className="hidden text-[10px] text-white/35 sm:inline">- / = skip · click a word to jump</span>
      </div>

      <div className="space-y-5 text-xl leading-relaxed">
        {timeline.paragraphs.map((para) => {
          const isCurrentPara = para.index === activePara;
          const isPastPara = para.index < activePara;

          return (
            <div key={para.index}>
              <p>
                {para.words.map((word, i) => {
                  const isActive = word.index === activeIndex;
                  const isPast = activeIndex >= 0 && word.index < activeIndex;
                  let color = "text-white/22";
                  if (isPast) color = isCurrentPara ? "text-white/60" : "text-white/38";
                  else if (isActive) color = "text-amber-50";
                  else if (isCurrentPara) color = "text-white/40";
                  else if (isPastPara) color = "text-white/38";

                  return (
                    <span key={word.index}>
                      <button
                        type="button"
                        data-karaoke-word
                        title={
                          word.isMorphAnchor
                            ? "Jump here - 3D animation fires on this word"
                            : "Jump karaoke here"
                        }
                        className="cursor-pointer rounded-sm border-0 bg-transparent p-0 text-left align-baseline font-[inherit] text-[1em] leading-[inherit] text-inherit hover:bg-white/10"
                        tabIndex={-1}
                        onClick={(event) => {
                          event.currentTarget.blur();
                          jumpTo(word);
                        }}
                      >
                        {word.isMorphAnchor && (
                          <span className="mr-1 inline-block translate-y-[-1px] rounded-sm border border-amber-400/55 bg-amber-400/15 px-1 py-px text-[9px] font-semibold uppercase tracking-wider text-amber-300">
                            3D
                          </span>
                        )}
                        <span
                          ref={isActive ? activeRef : undefined}
                          className={`rounded-sm transition-colors duration-100 ${color} ${
                            isActive ? "bg-amber-400/35 px-0.5" : ""
                          } ${word.isMorphAnchor ? "underline decoration-amber-400/70 decoration-2 underline-offset-4" : ""}`}
                        >
                          {word.text}
                        </span>
                      </button>
                      {i < para.words.length - 1 ? " " : ""}
                    </span>
                  );
                })}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
