import { Download, FileJson } from "lucide-react";
import { useRef } from "react";
import type { ChangeEvent } from "react";

import type { LiteraturePipelineController } from "../../hooks/useLiteraturePipeline";
import {
  classificationsToCsv,
  downloadCsv,
  downloadJson,
  parseImportedJson,
  validationSampleToCsv,
} from "../../lib/export/exportLiterature";
import { secondaryButtonClass } from "./dashboardShared";

export function ExportPanel({
  pipeline,
}: {
  pipeline: LiteraturePipelineController;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canExportClassifications = pipeline.classifications.length > 0;

  const importJson = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;
    const parsed = parseImportedJson(await file.text());
    if (typeof parsed === "object" && parsed !== null) {
      pipeline.importExistingJson(
        parsed as Parameters<typeof pipeline.importExistingJson>[0],
      );
    }
    event.target.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() =>
            downloadJson("normalized-records.json", pipeline.normalizedRecords)
          }
          disabled={pipeline.normalizedRecords.length === 0}
        >
          Export normalized records JSON
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() =>
            downloadJson("generated-codebook.json", pipeline.codebook)
          }
          disabled={!pipeline.codebook}
        >
          Export generated codebook JSON
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() =>
            downloadJson("classifications.json", pipeline.classifications)
          }
          disabled={!canExportClassifications}
        >
          Export classifications JSON
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() =>
            downloadJson("evidence-map-summary.json", pipeline.evidenceMap)
          }
          disabled={!pipeline.evidenceMap}
        >
          Export evidence map JSON
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() =>
            downloadCsv(
              "classifications.csv",
              classificationsToCsv(
                pipeline.classifications,
                pipeline.normalizedRecords,
              ),
            )
          }
          disabled={!canExportClassifications}
        >
          Export classifications CSV
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() =>
            downloadCsv(
              "validation-sample-10-percent.csv",
              validationSampleToCsv(
                pipeline.classifications,
                pipeline.normalizedRecords,
              ),
            )
          }
          disabled={!canExportClassifications}
        >
          Export 10% validation sample CSV
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => inputRef.current?.click()}
        >
          <FileJson className="h-3.5 w-3.5" /> Import JSON
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={importJson}
      />
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Download className="h-3.5 w-3.5" /> Export artifacts for analysis
        outside the dashboard.
      </div>
    </div>
  );
}
