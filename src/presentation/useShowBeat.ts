import { createContext, createElement, useContext, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { timelineFor } from "./karaokeTimelines";
import { showBeatStore } from "./showBeat";
import { morphCountAt, paragraphIndexAt } from "./scriptTiming";

type ShowBeat = {
  slideIndex: number;
  elapsed: number;
  
  paragraph: number;
  
  morphs: number;
  isPaused: boolean;
};

const REST_BEAT: ShowBeat = {
  slideIndex: 0,
  elapsed: 0,
  paragraph: -1,
  morphs: 0,
  isPaused: true,
};

function readBeat(): ShowBeat {
  const store = showBeatStore;
  const timeline = timelineFor(store.slideIndex);
  return {
    slideIndex: store.slideIndex,
    elapsed: store.slideElapsed,
    paragraph: paragraphIndexAt(timeline, store.slideElapsed),
    morphs: morphCountAt(timeline, store.slideElapsed),
    isPaused: store.isPaused,
  };
}

const BeatLockContext = createContext(false);

export function BeatLock({ frozen, children }: { frozen: boolean; children: ReactNode }) {
  return createElement(BeatLockContext.Provider, { value: frozen }, children);
}

export function useShowBeat() {
  const frozen = useContext(BeatLockContext);
  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;
  const beatRef = useRef<ShowBeat>(REST_BEAT);

  useFrame(() => {
    if (!frozenRef.current) beatRef.current = readBeat();
  }, -1);

  return beatRef;
}

export type AnimPlayhead = {
  t: number;
  armed: boolean;
};


export function useAnimPlayhead(options?: { morph?: number; loop?: number; hold?: number }) {
  const frozen = useContext(BeatLockContext);
  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;
  const playRef = useRef<AnimPlayhead>({ t: 0, armed: false });
  const clockRef = useRef({ slideIndex: -1, armed: false, t: 0 });
  const optsRef = useRef(options);
  optsRef.current = options;

  useFrame((_, delta) => {
    const opts = optsRef.current;
    const clock = clockRef.current;
    if (frozenRef.current) return;
    const need = opts?.morph ?? 1;
    const beat = readBeat();
    const on = beat.morphs >= need;
    if (!on) {
      clock.slideIndex = beat.slideIndex;
      clock.armed = false;
      clock.t = 0;
      playRef.current.t = 0;
      playRef.current.armed = false;
      return;
    }

    const newlyArmed = !clock.armed || clock.slideIndex !== beat.slideIndex;
    if (newlyArmed) {
      clock.slideIndex = beat.slideIndex;
      clock.armed = true;
      clock.t = 0;
    } else {
      clock.t += Math.min(delta, 0.1);
    }

    let next = clock.t;
    if (opts?.hold != null) next = Math.min(next, opts.hold);
    if (opts?.loop != null && opts.loop > 0) next = next % opts.loop;
    playRef.current.armed = true;
    playRef.current.t = next;
  }, -1);

  return playRef;
}
