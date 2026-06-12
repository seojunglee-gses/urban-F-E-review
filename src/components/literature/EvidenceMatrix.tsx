import type { CodedPaper } from "../../types/review";
import { descriptionText, titleText } from "./dashboardShared";

interface EvidenceMatrixProps {
  codedPapers: CodedPaper[];
}

const unique = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean))).slice(0, 10);

export const EvidenceMatrix = ({ codedPapers }: EvidenceMatrixProps) => {
  const forms = unique(codedPapers.flatMap((paper) => paper.codes.urbanFormVariables));
  const outcomes = unique(codedPapers.flatMap((paper) => paper.codes.energyOutcomes));
  const max = Math.max(1, ...forms.flatMap((form) => outcomes.map((outcome) => codedPapers.filter((paper) => paper.codes.urbanFormVariables.includes(form) && paper.codes.energyOutcomes.includes(outcome)).length)));
  if (!forms.length || !outcomes.length) {
    return <section><h2 className={titleText}>Evidence matrix</h2><p className={`${descriptionText} mt-2`}>The matrix appears after automatic coding completes.</p></section>;
  }
  return (
    <section>
      <h2 className={titleText}>Urban form × energy outcome matrix</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr><th className="px-3 py-3">Urban form</th>{outcomes.map((outcome) => <th className="px-3 py-3" key={outcome}>{outcome}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {forms.map((form) => (
              <tr key={form}>
                <th className="px-3 py-3 text-left font-semibold text-slate-700">{form}</th>
                {outcomes.map((outcome) => {
                  const count = codedPapers.filter((paper) => paper.codes.urbanFormVariables.includes(form) && paper.codes.energyOutcomes.includes(outcome)).length;
                  return <td className="px-3 py-3" key={`${form}-${outcome}`}><span className="inline-flex min-w-9 justify-center rounded-lg px-2 py-1 text-xs font-semibold text-slate-800" style={{ backgroundColor: `rgba(100,116,139,${0.08 + (count / max) * 0.3})` }}>{count}</span></td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
