const ROMAN_ACTS = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

export function actLabel(act: number): string {
  return `Act ${ROMAN_ACTS[act] ?? act}`;
}

export function formatClock(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? "-" : "";
  const s = Math.floor(Math.abs(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${sign}${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}
