import LiteratureReviewWorkbench from "../src/components/literature/LiteratureReviewWorkbench";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <LiteratureReviewWorkbench />
      </div>
    </main>
  );
}
