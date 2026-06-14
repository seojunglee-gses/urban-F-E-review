import { useCallback, useEffect, useMemo, useState } from "react";

import type { ReviewRunResponse } from "../types/review";

const STORAGE_KEY = "urban-fe-openalex-review-v1";

export type ReviewProgressState = "idle" | "running" | "complete" | "error";

export interface ReviewProgressStep {
  label: string;
  status: ReviewProgressState;
}

interface StoredReviewState {
  query: string;
  result: ReviewRunResponse | null;
}

export const REVIEW_PROGRESS_LABELS = [
  "Searching articles",
  "Reconstructing abstracts",
  "Grouping topics",
  "Generating codebook",
  "Coding papers",
  "Summarizing evidence",
  "Done",
] as const;

const defaultQuery = "urban form and building energy consumption";

const parseResponse = async (response: Response): Promise<ReviewRunResponse> => {
  const raw = await response.text();
  let payload: unknown;
  try {
    payload = raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    const message = raw.trim() || "Review pipeline returned a non-JSON response.";
    throw new Error(message.length > 300 ? `${message.slice(0, 300)}…` : message);
  }
  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null && "error" in payload ? String((payload as { error: unknown }).error) : "Review pipeline failed.";
    throw new Error(message);
  }
  return payload as ReviewRunResponse;
};

export const useReviewPipeline = () => {
  const [query, setQuery] = useState(defaultQuery);
  const [result, setResult] = useState<ReviewRunResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const stored = JSON.parse(raw) as Partial<StoredReviewState>;
      if (typeof stored.query === "string") setQuery(stored.query);
      if (stored.result) setResult(stored.result);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored: StoredReviewState = { query, result };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [query, result]);

  const runReview = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    try {
      const response = await fetch("/api/review/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, researchQuestion: query }),
      });
      const review = await parseResponse(response);
      setResult(review);
      if (review.errors.length > 0) setError(review.errors[0]);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Review pipeline failed.");
    } finally {
      setIsRunning(false);
    }
  }, [query]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setQuery(defaultQuery);
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const progressSteps: ReviewProgressStep[] = useMemo(() => {
    if (isRunning) {
      return REVIEW_PROGRESS_LABELS.map((label, index) => ({ label, status: index === REVIEW_PROGRESS_LABELS.length - 1 ? "idle" : "running" }));
    }
    if (!result) return REVIEW_PROGRESS_LABELS.map((label) => ({ label, status: "idle" }));
    return REVIEW_PROGRESS_LABELS.map((label, index) => {
      if (label === "Done") return { label, status: result.status.summary === "success" ? "complete" : "idle" };
      const failed =
        (label === "Searching articles" && result.status.search === "failed") ||
        (label === "Generating codebook" && result.status.codebook === "failed") ||
        (label === "Coding papers" && result.status.coding === "failed") ||
        (label === "Summarizing evidence" && result.status.summary === "failed");
      if (failed) return { label, status: "error" };
      const skipped =
        (label === "Generating codebook" && result.status.codebook === "skipped") ||
        (label === "Coding papers" && result.status.coding === "skipped");
      if (skipped) return { label, status: "idle" };
      return { label, status: index <= 5 ? "complete" : "idle" };
    });
  }, [isRunning, result]);

  return {
    query,
    setQuery,
    result,
    isRunning,
    error,
    runReview,
    reset,
    progressSteps,
  };
};
