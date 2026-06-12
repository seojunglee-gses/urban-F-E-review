import { Download } from "lucide-react";

import { codedPapersToCsv, downloadCsv, downloadJson, validationSampleToReviewCsv } from "../../lib/export/exportLiterature";
import type { ReviewRunResponse } from "../../types/review";
import { descriptionText, secondaryButton, titleText } from "./dashboardShared";

interface ExportPanelProps {
  result: ReviewRunResponse | null;
}

export const ExportPanel = ({ result }: ExportPanelProps) => {
  const disabled = !result;
  return (
    <section>
      <h2 className={titleText}>Exports</h2>
      <p className={`${descriptionText} mt-1`}>Download machine-readable papers, codebook, coding results, and a 10% manual-review sample.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className={secondaryButton} disabled={disabled} onClick={() => result && downloadJson("openalex-papers.json", result.papers)} type="button"><Download className="mr-1 inline h-3 w-3" />Papers JSON</button>
        <button className={secondaryButton} disabled={disabled || !result?.codebook} onClick={() => result?.codebook && downloadJson("generated-codebook.json", result.codebook)} type="button">Codebook JSON</button>
        <button className={secondaryButton} disabled={disabled || !result?.codedPapers.length} onClick={() => result && downloadJson("coded-papers.json", result.codedPapers)} type="button">Coded papers JSON</button>
        <button className={secondaryButton} disabled={disabled || !result?.evidenceSummary} onClick={() => result && downloadJson("evidence-summary.json", result.evidenceSummary)} type="button">Evidence summary JSON</button>
        <button className={secondaryButton} disabled={disabled || !result?.codedPapers.length} onClick={() => result && downloadCsv("coded-papers.csv", codedPapersToCsv(result.codedPapers, result.papers))} type="button">Coded papers CSV</button>
        <button className={secondaryButton} disabled={disabled || !result?.codedPapers.length} onClick={() => result && downloadCsv("validation-sample.csv", validationSampleToReviewCsv(result.codedPapers, result.papers))} type="button">10% validation sample CSV</button>
      </div>
    </section>
  );
};
