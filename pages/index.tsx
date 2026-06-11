import LiteratureReviewWorkbench from "../src/components/literature/LiteratureReviewWorkbench";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <LiteratureReviewWorkbench />
      </div>
    </main>
  );
}
