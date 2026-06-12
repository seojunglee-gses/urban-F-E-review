import type { GapMapItem } from "../../types/review";
import { descriptionText, innerPanel, majorCard, titleText } from "./dashboardShared";

interface ResearchGapsPanelProps {
  gaps: GapMapItem[];
  compact?: boolean;
}

export const ResearchGapsPanel = ({ gaps, compact = false }: ResearchGapsPanelProps) => {
  const visible = gaps.slice(0, compact ? 5 : 20);
  return (
    <section className={compact ? majorCard : "space-y-4"}>
      <h2 className={titleText}>Research gaps</h2>
      {visible.length ? (
        <div className="mt-4 space-y-3">
          {visible.map((gap) => (
            <div className={innerPanel} key={`${gap.dimensionA}-${gap.valueA}-${gap.dimensionB}-${gap.valueB}`}>
              <p className="text-sm font-semibold text-slate-800">{gap.valueA} × {gap.valueB}</p>
              <p className="mt-1 text-sm text-slate-500">{gap.paperCount} papers · {gap.gapType}</p>
              {!compact ? <p className="mt-2 text-sm text-slate-600">{gap.recommendation}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <p className={`${descriptionText} mt-3`}>Gap statements appear after papers are coded. If the OpenAI key is missing, search and map still work but coded gaps are unavailable.</p>
      )}
    </section>
  );
};
