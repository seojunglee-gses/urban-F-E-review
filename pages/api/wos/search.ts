import type { NextApiRequest, NextApiResponse } from "next";

import { defaultWosSearchConfig } from "../../../src/lib/config/searchConfig";
import { mockBibliographicRecords } from "../../../src/lib/mock/mockLiterature";
import {
  apiErrorResponseSchema,
  bibliographicRecordSchema,
  wosSearchRequestSchema,
} from "../../../src/lib/schemas/literatureSchemas";
import { normalizeWosRecord } from "../../../src/lib/wos/normalizeWos";
import type {
  ApiErrorResponse,
  BibliographicRecord,
  WosRawRecord,
  WosSearchResponse,
} from "../../../src/types/literature";

const sendError = (
  response: NextApiResponse<ApiErrorResponse>,
  status: number,
  error: ApiErrorResponse,
): void => {
  response.status(status).json(apiErrorResponseSchema.parse(error));
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};

const extractRawRecords = (payload: unknown): WosRawRecord[] => {
  const root = asRecord(payload);
  const data = asRecord(root.Data ?? root.data);
  const records = asRecord(
    data.Records ?? data.records ?? root.Records ?? root.records,
  );
  const recordList =
    records.records ?? records.REC ?? data.records ?? root.records;
  if (Array.isArray(recordList)) {
    return recordList.map((record) => asRecord(record) as WosRawRecord);
  }
  return [];
};

const extractTotal = (payload: unknown, fallback: number): number => {
  const root = asRecord(payload);
  const queryResult = asRecord(
    root.QueryResult ?? root.queryResult ?? root.metadata,
  );
  const total = Number(
    queryResult.RecordsFound ?? queryResult.recordsFound ?? queryResult.total,
  );
  return Number.isFinite(total) ? total : fallback;
};

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse<WosSearchResponse | ApiErrorResponse>,
): Promise<void> {
  if (request.method !== "POST") {
    sendError(response, 405, {
      error: "Unsupported method",
      code: "invalid-request",
      actionableMessage: "Use POST to run a Web of Science search.",
    });
    return;
  }

  const parsed = wosSearchRequestSchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    sendError(response, 400, {
      error: "Invalid Web of Science search request",
      code: "invalid-request",
      actionableMessage: parsed.error.issues
        .map((issue) => issue.message)
        .join("; "),
    });
    return;
  }

  const config = { ...defaultWosSearchConfig, ...parsed.data };
  const mockMode =
    process.env.MOCK_WOS === "true" && process.env.NODE_ENV !== "production";

  if (mockMode) {
    const records = mockBibliographicRecords.slice(0, config.count);
    response.status(200).json({
      records,
      total: mockBibliographicRecords.length,
      query: config.query,
      warnings: [
        "Mock data mode is active. Set MOCK_WOS=false and provide WOS_API_KEY for live retrieval.",
      ],
      mockMode: true,
      apiKeyDetected: Boolean(process.env.WOS_API_KEY),
    });
    return;
  }

  if (!process.env.WOS_API_KEY) {
    sendError(response, 200, {
      error: "Missing WOS_API_KEY",
      code: "missing-api-key",
      actionableMessage:
        "Add WOS_API_KEY to your local environment or set MOCK_WOS=true for development mock data.",
      warnings: [
        "No browser-visible key was used. Web of Science calls are server-side only.",
      ],
    });
    return;
  }

  const baseUrl =
    process.env.WOS_API_BASE_URL ?? "https://api.clarivate.com/apis/wos";
  const url = new URL(baseUrl);
  url.searchParams.set("databaseId", "WOS");
  url.searchParams.set(
    "usrQuery",
    `${config.query} AND PY=(${config.yearStart}-${config.yearEnd})`,
  );
  url.searchParams.set("count", String(config.count));
  url.searchParams.set("firstRecord", String(config.firstRecord));

  try {
    const wosResponse = await fetch(url.toString(), {
      headers: {
        "X-ApiKey": process.env.WOS_API_KEY,
        Accept: "application/json",
      },
    });

    if (wosResponse.status === 429) {
      sendError(response, 429, {
        error: "Web of Science rate limit reached",
        code: "rate-limited",
        actionableMessage:
          "Wait for the Clarivate rate-limit window to reset or lower the record count.",
      });
      return;
    }

    if (!wosResponse.ok) {
      sendError(response, wosResponse.status, {
        error: `Web of Science request failed with status ${wosResponse.status}`,
        code: "network-error",
        actionableMessage:
          "Check WOS_API_BASE_URL, WOS_API_KEY permissions, and the query syntax.",
      });
      return;
    }

    const payload = (await wosResponse.json()) as unknown;
    const rawRecords = extractRawRecords(payload);
    const records = rawRecords
      .map(normalizeWosRecord)
      .map(
        (record) =>
          bibliographicRecordSchema.parse(record) as BibliographicRecord,
      );
    const warnings = records.some((record) => !record.abstract)
      ? [
          "Some retrieved records do not include abstracts; they will be marked uncertain during normalization.",
        ]
      : [];

    if (records.length === 0) {
      sendError(response, 200, {
        error: "No records found",
        code: "no-records",
        actionableMessage: "Broaden the query, year range, or source filters.",
      });
      return;
    }

    response.status(200).json({
      records,
      total: extractTotal(payload, records.length),
      query: config.query,
      warnings,
      mockMode: false,
      apiKeyDetected: true,
    });
  } catch (error) {
    sendError(response, 500, {
      error:
        error instanceof Error ? error.message : "Unknown Web of Science error",
      code: "server-error",
      actionableMessage:
        "Inspect server logs and verify Clarivate API connectivity.",
    });
  }
}
