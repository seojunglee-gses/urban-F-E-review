import { BookOpen, Database, Sparkles } from "lucide-react";

import type { ReviewRunResponse } from "../../types/review";
import { badgeText, descriptionText } from "./dashboardShared";

interface HeaderProps {
  result: ReviewRunResponse | null;
}

export const Header = ({ result }: HeaderProps) => {
  const llmReady = result ? result.status.codebook === "success" : false;
  return (
    <header className="flex flex-col gap-4 rounded-3xl border border-[var(--border)] bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className={badgeText}>OpenAlex systematic review</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Urban Form &amp; Energy Evidence Map</h1>
        <p className={`${descriptionText} mt-1`}>Enter one topic or research question, then automatically search, code, summarize, and map the evidence.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1"><Database className="h-3.5 w-3.5" />OpenAlex</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1"><BookOpen className="h-3.5 w-3.5" />{result?.papers.length ?? 0} papers</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1"><Sparkles className="h-3.5 w-3.5" />{llmReady ? "LLM coded" : "LLM optional"}</span>
      </div>
    </header>
  );
};
