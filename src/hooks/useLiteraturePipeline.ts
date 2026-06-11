"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { defaultWosSearchConfig } from "../lib/config/searchConfig";
import { buildEvidenceMap } from "../lib/evidence/buildEvidenceMap";
import { normalizeBibliographicRecords } from "../lib/wos/normalizeWos";
import type {
  ApiErrorResponse,
  BibliographicRecord,
  EvidenceMapSummary,
  GeneratedCodebook,
  LLMClassification,
  NormalizedAbstractRecord,
  PipelineRunState,
  PipelineStageStatus,
  TopicModelResult,
  WosSearchConfig,
  WosSearchResponse,
} from "../types/literature";

const storageKey = "urban-form-energy-literature-pipeline-v1";

interface PersistedPipelineState {
  searchConfig: WosSearchConfig;
  records: BibliographicRecord[];
  normalizedRecords: NormalizedAbstractRecord[];
  topicModel: TopicModelResult | null;
  codebook: GeneratedCodebook | null;
  classifications: LLMClassification[];
  evidenceMap: EvidenceMapSummary | null;
  mockWos: boolean;
  mockLlm: boolean;
  apiKeyDetected: boolean | null;
  warnings: string[];
}

const initialRunState: PipelineRunState = {
  retrieve: { status: "idle", count: 0 },
  normalize: { status: "idle", count: 0 },
  topics: { status: "idle", count: 0 },
  codebook: { status: "idle", count: 0 },
  classify: { status: "idle", count: 0 },
  map: { status: "idle", count: 0 },
};

const initialState: PersistedPipelineState = {
  searchConfig: defaultWosSearchConfig,
  records: [],
  normalizedRecords: [],
  topicModel: null,
  codebook: null,
  classifications: [],
  evidenceMap: null,
  mockWos: false,
  mockLlm: false,
  apiKeyDetected: null,
  warnings: [],
};

const isApiErrorResponse = (value: unknown): value is ApiErrorResponse =>
  typeof value === "object" &&
  value !== null &&
  "code" in value &&
  "actionableMessage" in value &&
  "error" in value;

const requestJson = async <TResponse>(
  url: string,
  body: unknown,
): Promise<TResponse> => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as unknown;
  if (isApiErrorResponse(payload)) {
    throw new Error(`${payload.error}: ${payload.actionableMessage}`);
  }
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return payload as TResponse;
};

const loadPersistedState = (): PersistedPipelineState => {
  if (typeof window === "undefined") return initialState;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return initialState;
  try {
    return {
      ...initialState,
      ...(JSON.parse(raw) as Partial<PersistedPipelineState>),
    };
  } catch {
    return initialState;
  }
};

export const useLiteraturePipeline = () => {
  const [state, setState] = useState<PersistedPipelineState>(initialState);
  const [runState, setRunState] = useState<PipelineRunState>(initialRunState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadPersistedState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [hydrated, state]);

  const updateStage = useCallback(
    (
      stage: keyof PipelineRunState,
      status: PipelineStageStatus,
      count: number,
      error?: string,
    ) => {
      setRunState((current) => ({
        ...current,
        [stage]: { status, count, error },
      }));
    },
    [],
  );

  const setSearchConfig = useCallback((config: WosSearchConfig) => {
    setState((current) => ({ ...current, searchConfig: config }));
  }, []);

  const runSearch = useCallback(async () => {
    updateStage("retrieve", "running", 0);
    try {
      const payload = await requestJson<WosSearchResponse>("/api/wos/search", {
        query: state.searchConfig.query,
        yearStart: state.searchConfig.yearStart,
        yearEnd: state.searchConfig.yearEnd,
        count: state.searchConfig.count,
        firstRecord: state.searchConfig.firstRecord,
      });
      setState((current) => ({
        ...current,
        records: payload.records,
        normalizedRecords: [],
        topicModel: null,
        codebook: null,
        classifications: [],
        evidenceMap: null,
        mockWos: payload.mockMode,
        apiKeyDetected: payload.apiKeyDetected,
        warnings: payload.warnings,
      }));
      updateStage("retrieve", "success", payload.records.length);
      updateStage("normalize", "idle", 0);
      updateStage("topics", "idle", 0);
      updateStage("codebook", "idle", 0);
      updateStage("classify", "idle", 0);
      updateStage("map", "idle", 0);
    } catch (error) {
      updateStage(
        "retrieve",
        "error",
        0,
        error instanceof Error ? error.message : "Search failed",
      );
    }
  }, [state.searchConfig, updateStage]);

  const normalizeRecords = useCallback(() => {
    updateStage("normalize", "running", state.records.length);
    const normalizedRecords = normalizeBibliographicRecords(state.records);
    const warnings = normalizedRecords.some(
      (record) => record.abstract.length < 80,
    )
      ? ["Some records lack usable abstracts and are marked uncertain."]
      : [];
    setState((current) => ({
      ...current,
      normalizedRecords,
      topicModel: null,
      codebook: null,
      classifications: [],
      evidenceMap: null,
      warnings: [...current.warnings, ...warnings],
    }));
    updateStage("normalize", "success", normalizedRecords.length);
  }, [state.records, updateStage]);

  const runTopicModeling = useCallback(async () => {
    updateStage("topics", "running", 0);
    try {
      const payload = await requestJson<{
        topicModel: TopicModelResult;
        warnings: string[];
      }>("/api/llm/topic-model", { records: state.normalizedRecords });
      setState((current) => ({
        ...current,
        topicModel: payload.topicModel,
        codebook: null,
        classifications: [],
        evidenceMap: null,
        mockLlm: payload.topicModel.mockMode,
        warnings: [...current.warnings, ...payload.warnings],
      }));
      updateStage("topics", "success", payload.topicModel.clusters.length);
      updateStage("codebook", "idle", 0);
      updateStage("classify", "idle", 0);
      updateStage("map", "idle", 0);
    } catch (error) {
      updateStage(
        "topics",
        "error",
        0,
        error instanceof Error ? error.message : "Topic modeling failed",
      );
    }
  }, [state.normalizedRecords, updateStage]);

  const generateCodebook = useCallback(async () => {
    if (!state.topicModel) return;
    updateStage("codebook", "running", 0);
    try {
      const payload = await requestJson<{
        codebook: GeneratedCodebook;
        warnings: string[];
      }>("/api/llm/generate-codebook", {
        topicModel: state.topicModel,
        records: state.normalizedRecords,
      });
      setState((current) => ({
        ...current,
        codebook: payload.codebook,
        classifications: [],
        evidenceMap: null,
        warnings: [...current.warnings, ...payload.warnings],
      }));
      updateStage("codebook", "success", payload.codebook.dimensions.length);
      updateStage("classify", "idle", 0);
      updateStage("map", "idle", 0);
    } catch (error) {
      updateStage(
        "codebook",
        "error",
        0,
        error instanceof Error ? error.message : "Codebook generation failed",
      );
    }
  }, [state.normalizedRecords, state.topicModel, updateStage]);

  const classifyRecords = useCallback(async () => {
    if (!state.codebook) return;
    updateStage("classify", "running", 0);
    try {
      const payload = await requestJson<{
        classifications: LLMClassification[];
        warnings: string[];
        mockMode: boolean;
      }>("/api/llm/classify-records", {
        records: state.normalizedRecords,
        codebook: state.codebook,
      });
      const evidenceMap = buildEvidenceMap({
        records: state.normalizedRecords,
        topicClusters: state.topicModel?.clusters ?? [],
        codebook: state.codebook,
        classifications: payload.classifications,
      });
      setState((current) => ({
        ...current,
        classifications: payload.classifications,
        evidenceMap,
        mockLlm: payload.mockMode,
        warnings: [...current.warnings, ...payload.warnings],
      }));
      updateStage("classify", "success", payload.classifications.length);
      updateStage("map", "success", evidenceMap.evidenceMatrix.length);
    } catch (error) {
      updateStage(
        "classify",
        "error",
        0,
        error instanceof Error ? error.message : "Classification failed",
      );
    }
  }, [
    state.codebook,
    state.normalizedRecords,
    state.topicModel?.clusters,
    updateStage,
  ]);

  const resetPipeline = useCallback(() => {
    setState(initialState);
    setRunState(initialRunState);
    if (typeof window !== "undefined")
      window.localStorage.removeItem(storageKey);
  }, []);

  const importExistingJson = useCallback(
    (payload: Partial<PersistedPipelineState>) => {
      setState((current) => ({ ...current, ...payload }));
    },
    [],
  );

  const statusCounts = useMemo(
    () => ({
      retrieved: state.records.length,
      normalized: state.normalizedRecords.length,
      topics: state.topicModel?.clusters.length ?? 0,
      codebookDimensions: state.codebook?.dimensions.length ?? 0,
      classified: state.classifications.length,
    }),
    [state],
  );

  return {
    ...state,
    runState,
    statusCounts,
    setSearchConfig,
    runSearch,
    normalizeRecords,
    runTopicModeling,
    generateCodebook,
    classifyRecords,
    resetPipeline,
    importExistingJson,
  };
};

export type LiteraturePipelineController = ReturnType<
  typeof useLiteraturePipeline
>;
