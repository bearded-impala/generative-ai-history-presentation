

export interface KaraokeWord {
  text: string;
  start: number;
  end: number;
  paragraphIndex: number;
  index: number;
  
  isMorphAnchor?: boolean;
}

export interface KaraokeParagraph {
  index: number;
  words: KaraokeWord[];
  wpm: number;
  start: number;
  end: number;
}


export interface MorphMark {
  index: number;
  paragraphIndex: number;
  time: number;
}

export interface KaraokeTimeline {
  paragraphs: KaraokeParagraph[];
  words: KaraokeWord[];
  durationSec: number;
  morphs: MorphMark[];
}

const STAGE_RE =
  /\[PAUSE\s+(\d+(?:\.\d+)?)s\]|\[LOOK TO AUDIENCE\]|\[EMPHASIS\]|\[TRIGGER[^\]]*\]/gi;

const LEAD_IN_SEC = 0.15;
const LOOK_PAUSE_SEC = 0.55;
const TRIGGER_PAUSE_SEC = 0.12;
const PARA_GAP_SEC = 0.2;
const CRACK_GAP_SEC = 0.4;
const TAIL_HOLD_SEC = 0.45;
const EMPHASIS_WORD_COUNT = 5;
const EMPHASIS_STRETCH = 1.2;


const LINE_WPM: number[][] = [
  [118, 146, 136, 142, 114, 128, 120],
  [138, 124, 154, 126, 134, 140],
  [140, 122, 118, 150, 136, 122],
  [140, 112, 126, 132, 142, 120],
  [108, 138, 128, 126, 112, 108],
  [132, 128, 136, 122, 114],
  [124, 130, 142, 150, 136, 128, 114, 126],
  [140, 144, 142, 122, 142, 124, 130],
  [140, 132, 150, 118, 130, 136, 126],
  [144, 142, 138, 126, 110, 140, 122],
  [124, 136, 130, 128, 144, 126, 128],
  [132, 120, 102, 116, 144, 124],
  [140, 128, 138, 144, 116, 112],
  [140, 134, 148, 130, 124, 128, 130],
  [132, 136, 122, 140, 142, 130],
  [142, 116, 122, 126, 104, 122, 118],
  [136, 124, 112, 130, 116, 128, 124],
  [136, 126, 140, 130, 142, 146, 128],
  [140, 130, 136, 128, 108, 150, 136, 120],
  [112, 124, 118, 120, 96],
];

const FUNCTION_WORDS = new Set(
  (
    "a an the to of in on at for and or but as is are was were be been being " +
    "it its it's that this these those with from by not so if then than we you " +
    "they he she his her our your their i i'm i've i'd we're you're there's " +
    "that's into onto upon over out up down off who whom which what when where " +
    "how why can could would should will just also only own such both few more " +
    "most other some no nor too very about above after again all am any because"
  ).split(" "),
);

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function lineWpm(slideIndex: number | undefined, paraIndex: number, paraCount: number): number {
  const row = slideIndex != null ? LINE_WPM[slideIndex] : undefined;
  if (row && row.length === paraCount) return row[paraIndex]!;
  if (row && paraIndex < row.length) return row[paraIndex]!;
  return 132;
}

function bare(word: string): string {
  return word.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, "").toLowerCase();
}

function punctuationHold(word: string): number {
  if (/\?["')\]]*$/.test(word)) return 0.22;
  if (/!["')\]]*$/.test(word)) return 0.16;
  if (/\.["')\]]*$/.test(word)) return 0.1;
  if (/[-–]["')\]]*$/.test(word) || word === "-" || word === "–") return 0.08;
  if (/[;:]["')\]]*$/.test(word)) return 0.06;
  if (/,["')\]]*$/.test(word)) return 0.04;
  return 0;
}

function wordContour(
  word: string,
  wordIndexInPara: number,
  paraWordCount: number,
  isLastPara: boolean,
  emphasis: boolean,
): number {
  let f = 1;
  const stem = bare(word);
  if (FUNCTION_WORDS.has(stem)) f *= 0.76;
  else if (/^\d/.test(stem) || /billion|million|thousand|hundred/.test(stem)) f *= 1.1;
  if (wordIndexInPara < 3) f *= 0.93;
  if (wordIndexInPara >= paraWordCount - 4) f *= isLastPara ? 1.16 : 1.05;
  if (emphasis) f *= EMPHASIS_STRETCH;
  return f;
}

function wordDurationSec(word: string, wpm: number, contour: number): number {
  const letters = word.replace(/[^A-Za-z0-9']/g, "").length;
  const units = Math.max(0.42, letters / 5);
  return ((units * 60) / wpm) * contour + punctuationHold(word);
}

function pauseForTag(
  token: string,
  pauseSeconds: string | undefined,
): { hold: number; emphasis: boolean; morph: boolean } {
  if (pauseSeconds != null) return { hold: Number(pauseSeconds), emphasis: false, morph: false };
  if (/^\[LOOK TO AUDIENCE\]$/i.test(token)) return { hold: LOOK_PAUSE_SEC, emphasis: false, morph: false };
  if (/^\[EMPHASIS\]$/i.test(token)) return { hold: 0, emphasis: true, morph: false };
  return {
    hold: TRIGGER_PAUSE_SEC,
    emphasis: false,
    morph: /TRIGGER\s+3D\s+MORPH/i.test(token),
  };
}

export function buildKaraokeTimeline(
  script: string[],
  options?: { slideIndex?: number },
): KaraokeTimeline {
  const paragraphs: KaraokeParagraph[] = [];
  const words: KaraokeWord[] = [];
  const morphs: MorphMark[] = [];
  let t = LEAD_IN_SEC;
  let wordIndex = 0;
  const slideIndex = options?.slideIndex;

  script.forEach((raw, paragraphIndex) => {
    const wpm = clamp(lineWpm(slideIndex, paragraphIndex, script.length), 92, 158);
    const isLastPara = paragraphIndex === script.length - 1;
    if (paragraphIndex > 0) t += isLastPara ? CRACK_GAP_SEC : PARA_GAP_SEC;

    const paraStart = t;
    const paraWords: KaraokeWord[] = [];
    let emphasisLeft = 0;

    const spokenChunks: string[] = [];
    const rePreview = new RegExp(STAGE_RE.source, "gi");
    let cursorPreview = 0;
    let mPreview: RegExpExecArray | null;
    while ((mPreview = rePreview.exec(raw)) !== null) {
      spokenChunks.push(raw.slice(cursorPreview, mPreview.index));
      cursorPreview = mPreview.index + mPreview[0].length;
    }
    spokenChunks.push(raw.slice(cursorPreview));
    const paraWordCount = spokenChunks
      .join(" ")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

    const re = new RegExp(STAGE_RE.source, "gi");
    let cursor = 0;
    let match: RegExpExecArray | null;
    let spokenInPara = 0;
    let pendingMorphAnchor = false;

    const speak = (chunk: string) => {
      for (const text of chunk.trim().split(/\s+/).filter(Boolean)) {
        const emphasis = emphasisLeft > 0;
        if (emphasisLeft > 0) emphasisLeft -= 1;
        const contour = wordContour(text, spokenInPara, paraWordCount, isLastPara, emphasis);
        const duration = wordDurationSec(text, wpm, contour);
        const word: KaraokeWord = {
          text,
          start: t,
          end: t + duration,
          paragraphIndex,
          index: wordIndex,
          isMorphAnchor: pendingMorphAnchor,
        };
        pendingMorphAnchor = false;
        wordIndex += 1;
        spokenInPara += 1;
        t = word.end;
        paraWords.push(word);
        words.push(word);
      }
    };

    while ((match = re.exec(raw)) !== null) {
      speak(raw.slice(cursor, match.index));
      const { hold, emphasis, morph } = pauseForTag(match[0], match[1]);
      if (morph) {
        morphs.push({ index: morphs.length, paragraphIndex, time: t });
        pendingMorphAnchor = true;
      }
      if (emphasis) emphasisLeft = EMPHASIS_WORD_COUNT;
      else t += hold;
      cursor = match.index + match[0].length;
    }
    speak(raw.slice(cursor));
    if (pendingMorphAnchor && paraWords.length > 0) {
      paraWords[paraWords.length - 1]!.isMorphAnchor = true;
    }

    const paraEnd = Math.max(paraStart, t);
    paragraphs.push({
      index: paragraphIndex,
      words: paraWords,
      wpm,
      start: paraStart,
      end: paraEnd,
    });
  });

  const lastEnd = words.length > 0 ? words[words.length - 1].end : LEAD_IN_SEC;
  return {
    paragraphs,
    words,
    durationSec: lastEnd + TAIL_HOLD_SEC,
    morphs,
  };
}

export function wordIndexAt(words: KaraokeWord[], elapsedSec: number): number {
  if (words.length === 0) return -1;
  if (elapsedSec < words[0].start) return -1;
  let held = 0;
  for (let i = 0; i < words.length; i++) {
    if (elapsedSec < words[i].start) return held;
    held = i;
    if (elapsedSec < words[i].end) return i;
  }
  return words.length - 1;
}

export function paragraphIndexAt(timeline: KaraokeTimeline, elapsedSec: number): number {
  const index = wordIndexAt(timeline.words, elapsedSec);
  if (index < 0) return -1;
  return timeline.words[index].paragraphIndex;
}

export function morphCountAt(timeline: KaraokeTimeline, elapsedSec: number): number {
  let count = 0;
  for (const mark of timeline.morphs) {
    if (elapsedSec >= mark.time) count += 1;
  }
  return count;
}
