export const SHOW_CHANNEL = "genai_presentation_channel";

export type SyncRole = "presenter" | "audience";

export interface PresentationSyncState {
  currentSlideIndex: number;
  elapsedTime: number;
  slideElapsed: number;
  isPaused: boolean;
}

export const INITIAL_SYNC_STATE: PresentationSyncState = {
  currentSlideIndex: 0,
  elapsedTime: 0,
  slideElapsed: 0,
  isPaused: true,
};

export interface SyncPatchMessage {
  type: "PATCH";
  state: PresentationSyncState;
  seq: number;
  senderId: string;
}

export interface SyncRequestMessage {
  type: "SYNC_REQUEST";
  senderId: string;
}

export interface SyncReplyMessage {
  type: "SYNC_REPLY";
  state: PresentationSyncState;
  seq: number;
  senderId: string;
  targetId: string;
}

export type SyncMessage = SyncPatchMessage | SyncRequestMessage | SyncReplyMessage;

export function coerceSyncState(
  raw: Partial<PresentationSyncState> | null | undefined,
): PresentationSyncState {
  return {
    currentSlideIndex: raw?.currentSlideIndex ?? 0,
    elapsedTime: raw?.elapsedTime ?? 0,
    slideElapsed: raw?.slideElapsed ?? 0,
    isPaused: raw?.isPaused ?? true,
  };
}

export function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
}
