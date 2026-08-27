import { useCallback, useEffect, useRef, useState } from "react";
import type { SlideData } from "./types";
import { publishSyncBeat } from "./showBeat";
import {
  INITIAL_SYNC_STATE,
  SHOW_CHANNEL,
  coerceSyncState,
  isTypingTarget,
  type PresentationSyncState,
  type SyncMessage,
  type SyncPatchMessage,
  type SyncReplyMessage,
  type SyncRequestMessage,
  type SyncRole,
} from "./sync";

const TICK_MS = 50;
const HEARTBEAT_MS = 400;
export const KARAOKE_SKIP_SEC = 5;

interface UsePresentationSyncOptions {
  slides: SlideData[];
  role?: SyncRole;
}

interface UsePresentationSyncResult extends PresentationSyncState {
  slide: SlideData;
  nextSlide: () => void;
  prevSlide: () => void;
  goToSlide: (index: number) => void;
  togglePause: () => void;
  seekSlideElapsed: (seconds: number) => void;
}

function enterSlide(state: PresentationSyncState, currentSlideIndex: number): PresentationSyncState {
  return { ...state, currentSlideIndex, slideElapsed: 0, isPaused: true };
}

function usePresentationSync({
  slides,
  role = "audience",
}: UsePresentationSyncOptions): UsePresentationSyncResult {
  const isPresenter = role === "presenter";
  const [selfId] = useState(() => `sync-${crypto.randomUUID()}`);
  const [state, setState] = useState<PresentationSyncState>(INITIAL_SYNC_STATE);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const stateRef = useRef(state);
  const seqRef = useRef(0);
  const lastSenderRef = useRef<string | null>(null);
  const lastSeqRef = useRef(-1);
  const syncedRef = useRef(isPresenter);

  const acceptRemote = (senderId: string, seq: number, next: PresentationSyncState) => {
    if (lastSenderRef.current !== senderId) {
      lastSenderRef.current = senderId;
      lastSeqRef.current = -1;
    }
    if (seq < lastSeqRef.current) return;
    lastSeqRef.current = seq;
    stateRef.current = next;
    syncedRef.current = true;
    publishSyncBeat(next);
    setState(next);
  };

  const broadcastState = useCallback(
    (next: PresentationSyncState) => {
      seqRef.current += 1;
      channelRef.current?.postMessage({
        type: "PATCH",
        state: next,
        seq: seqRef.current,
        senderId: selfId,
      } satisfies SyncPatchMessage);
    },
    [selfId]
  );

  useEffect(() => {
    stateRef.current = state;
    if (syncedRef.current) publishSyncBeat(state);
  }, [state]);

  useEffect(() => {
    const channel = new BroadcastChannel(SHOW_CHANNEL);
    channelRef.current = channel;

    const onMessage = (event: MessageEvent<SyncMessage>) => {
      const msg = event.data;
      if (!msg || msg.senderId === selfId) return;

      if (msg.type === "PATCH") {
        if (isPresenter) return;
        acceptRemote(msg.senderId, msg.seq, coerceSyncState(msg.state));
        return;
      }

      if (msg.type === "SYNC_REQUEST") {
        if (!isPresenter) return;
        seqRef.current += 1;
        channel.postMessage({
          type: "SYNC_REPLY",
          state: stateRef.current,
          seq: seqRef.current,
          senderId: selfId,
          targetId: msg.senderId,
        } satisfies SyncReplyMessage);
        return;
      }

      if (msg.type === "SYNC_REPLY" && msg.targetId === selfId) {
        if (isPresenter) return;
        acceptRemote(msg.senderId, msg.seq, coerceSyncState(msg.state));
      }
    };

    channel.addEventListener("message", onMessage);
    if (isPresenter) {
      seqRef.current += 1;
      channel.postMessage({
        type: "PATCH",
        state: stateRef.current,
        seq: seqRef.current,
        senderId: selfId,
      } satisfies SyncPatchMessage);
    } else {
      channel.postMessage({ type: "SYNC_REQUEST", senderId: selfId } satisfies SyncRequestMessage);
    }

    return () => {
      channel.removeEventListener("message", onMessage);
      channel.close();
      channelRef.current = null;
    };
  }, [selfId, isPresenter]);

  const applyLocal = useCallback(
    (updater: (prev: PresentationSyncState) => PresentationSyncState) => {
      if (!isPresenter) return;
      const prev = stateRef.current;
      const next = updater(prev);
      if (next === prev) return;
      stateRef.current = next;
      publishSyncBeat(next);
      setState(next);
      broadcastState(next);
    },
    [broadcastState, isPresenter]
  );

  const slide = slides[state.currentSlideIndex] ?? slides[0];

  const goToSlide = useCallback(
    (index: number) => {
      applyLocal((prev) => {
        const clamped = Math.max(0, Math.min(index, slides.length - 1));
        if (clamped === prev.currentSlideIndex) return prev;
        return enterSlide(prev, clamped);
      });
    },
    [applyLocal, slides.length]
  );

  const nextSlide = useCallback(() => {
    applyLocal((prev) => {
      const clamped = Math.min(prev.currentSlideIndex + 1, slides.length - 1);
      if (clamped === prev.currentSlideIndex) return prev;
      return enterSlide(prev, clamped);
    });
  }, [applyLocal, slides.length]);

  const prevSlide = useCallback(() => {
    applyLocal((prev) => {
      const clamped = Math.max(prev.currentSlideIndex - 1, 0);
      if (clamped === prev.currentSlideIndex) return prev;
      return enterSlide(prev, clamped);
    });
  }, [applyLocal]);

  const togglePause = useCallback(() => {
    applyLocal((prev) => ({ ...prev, isPaused: !prev.isPaused }));
  }, [applyLocal]);

  const seekSlideElapsed = useCallback(
    (seconds: number) => {
      applyLocal((prev) => {
        const next = Math.max(0, seconds);
        if (Math.abs(next - prev.slideElapsed) < 0.001) return prev;
        return { ...prev, slideElapsed: next };
      });
    },
    [applyLocal]
  );

  useEffect(() => {
    if (!isPresenter) return;
    const id = window.setInterval(() => {
      const prev = stateRef.current;
      if (prev.isPaused) return;
      const dt = TICK_MS / 1000;
      const next = {
        ...prev,
        elapsedTime: prev.elapsedTime + dt,
        slideElapsed: prev.slideElapsed + dt,
      };
      stateRef.current = next;
      publishSyncBeat(next);
      setState(next);
      broadcastState(next);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [isPresenter, broadcastState]);

  useEffect(() => {
    if (!isPresenter) return;
    const beat = () => broadcastState(stateRef.current);
    const id = window.setInterval(beat, HEARTBEAT_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") beat();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [isPresenter, broadcastState]);

  useEffect(() => {
    if (!isPresenter) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      switch (e.key) {
        case " ":
        case "ArrowRight":
          e.preventDefault();
          nextSlide();
          break;
        case "ArrowLeft":
          e.preventDefault();
          prevSlide();
          break;
        case "p":
        case "P":
          togglePause();
          break;
        case "-":
        case "_":
        case "Subtract":
          e.preventDefault();
          if (e.repeat) break;
          seekSlideElapsed(stateRef.current.slideElapsed - KARAOKE_SKIP_SEC);
          break;
        case "=":
        case "+":
        case "Add":
          e.preventDefault();
          if (e.repeat) break;
          seekSlideElapsed(stateRef.current.slideElapsed + KARAOKE_SKIP_SEC);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPresenter, nextSlide, prevSlide, togglePause, seekSlideElapsed]);

  return {
    ...state,
    slide,
    nextSlide,
    prevSlide,
    goToSlide,
    togglePause,
    seekSlideElapsed,
  };
}

export default usePresentationSync;
