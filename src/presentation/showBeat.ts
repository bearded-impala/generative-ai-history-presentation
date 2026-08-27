import type { PresentationSyncState } from "./sync";


type ShowBeatStore = {
  slideIndex: number;
  slideElapsed: number;
  isPaused: boolean;
};

const root = globalThis as typeof globalThis & { __genaiShowBeat?: ShowBeatStore };
export const showBeatStore: ShowBeatStore = (root.__genaiShowBeat ??= {
  slideIndex: 0,
  slideElapsed: 0,
  isPaused: true,
});

export function publishSyncBeat(state: PresentationSyncState): void {
  showBeatStore.slideIndex = state.currentSlideIndex;
  showBeatStore.slideElapsed = state.slideElapsed;
  showBeatStore.isPaused = state.isPaused;
}
