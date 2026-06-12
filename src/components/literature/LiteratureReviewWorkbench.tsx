import { CityEvidenceMap } from "./CityEvidenceMap";
import { Header } from "./Header";
import { InsightSidebar } from "./InsightSidebar";
import { SearchHero } from "./SearchHero";
import { WorkbenchTabs } from "./WorkbenchTabs";
import { useReviewPipeline } from "../../hooks/useReviewPipeline";

export const LiteratureReviewWorkbench = () => {
  const pipeline = useReviewPipeline();
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <Header result={pipeline.result} />
        <SearchHero
          query={pipeline.query}
          setQuery={pipeline.setQuery}
          isRunning={pipeline.isRunning}
          error={pipeline.error}
          steps={pipeline.progressSteps}
          onRun={pipeline.runReview}
          onReset={pipeline.reset}
        />
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.8fr)]">
          <CityEvidenceMap mapData={pipeline.result?.mapData ?? []} papers={pipeline.result?.papers ?? []} />
          <InsightSidebar result={pipeline.result} />
        </section>
        <WorkbenchTabs result={pipeline.result} />
      </div>
    </main>
  );
};
