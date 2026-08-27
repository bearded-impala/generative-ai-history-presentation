import type { VisualGuide as VisualGuideData } from "../presentation/types";

interface VisualGuideProps {
  guide: VisualGuideData | undefined;
}

export default function VisualGuide({ guide }: VisualGuideProps) {
  if (!guide) return null;

  return (
    <div
      data-stage-chrome="guide"
      className="visual-guide pointer-events-none absolute right-5 top-5 w-[20rem] max-w-[28vw] max-h-[min(64vh,calc(100vh-12rem))] overflow-y-auto select-none rounded-lg border border-white/10 bg-black/55 p-4 backdrop-blur-md hyphens-none"
    >
      <p className="text-lg font-medium leading-snug text-white/95">{guide.headline}</p>

      <ul className="mt-3 space-y-1.5">
        {guide.legend.map((entry) => (
          <li key={entry.label} className="flex items-start gap-2.5">
            <span
              className="mt-[8px] h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color, boxShadow: `0 0 8px ${entry.color}` }}
            />
            <span className="text-[15px] leading-snug text-white/70">{entry.label}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 border-t border-white/10 pt-2.5 text-[15px] italic leading-snug text-white/60">
        {guide.takeaway}
      </p>
    </div>
  );
}
