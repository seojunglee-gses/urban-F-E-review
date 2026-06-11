"use client";

import { useLiteraturePipeline } from "../../hooks/useLiteraturePipeline";
import { CityEvidenceMap } from "./CityEvidenceMap";
import { Header } from "./Header";
import { InsightSidebar } from "./InsightSidebar";
import { SearchHero } from "./SearchHero";
import { WorkbenchTabs } from "./WorkbenchTabs";

export default function LiteratureReviewWorkbench() {
  const pipeline = useLiteraturePipeline();

  return (
    <>
      <Header pipeline={pipeline} />
      <SearchHero pipeline={pipeline} />
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.8fr)]">
        <CityEvidenceMap pipeline={pipeline} />
        <InsightSidebar pipeline={pipeline} />
      </section>
      <WorkbenchTabs pipeline={pipeline} />
    </>
  );
}
