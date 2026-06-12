import { useState } from "react";

import type { ReviewCodebook } from "../../types/review";
import { descriptionText, innerPanel, titleText } from "./dashboardShared";

interface CodebookViewProps {
  codebook: ReviewCodebook | null;
  llmSkipped: boolean;
}

export const CodebookView = ({ codebook, llmSkipped }: CodebookViewProps) => {
  const [openVariable, setOpenVariable] = useState<string | null>(null);
  if (!codebook) {
    return (
      <section>
        <h2 className={titleText}>Generated codebook</h2>
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {llmSkipped ? "LLM key required for codebook generation and automatic coding. Add OPENAI_API_KEY to enable this panel." : "Run a review to generate a codebook."}
        </div>
      </section>
    );
  }
  return (
    <section>
      <h2 className={titleText}>Generated codebook</h2>
      <p className={`${descriptionText} mt-1`}>Review and edit later before final manual validation.</p>
      <div className="mt-4 space-y-3">
        {codebook.variables.map((variable) => {
          const open = openVariable === variable.name;
          return (
            <div className={innerPanel} key={variable.name}>
              <button className="flex w-full items-center justify-between gap-3 text-left" type="button" onClick={() => setOpenVariable(open ? null : variable.name)}>
                <span className="text-sm font-semibold text-slate-800">{variable.name}</span>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-500">{variable.type}</span>
              </button>
              {open ? (
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>{variable.definition}</p>
                  <p><span className="font-semibold text-slate-700">Rule:</span> {variable.extractionRule}</p>
                  {variable.allowedValues.length ? <p><span className="font-semibold text-slate-700">Allowed:</span> {variable.allowedValues.join(", ")}</p> : null}
                  {variable.examples.length ? <p><span className="font-semibold text-slate-700">Examples:</span> {variable.examples.join("; ")}</p> : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
};
