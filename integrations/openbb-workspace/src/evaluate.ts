import type { EvaluationState, OffApi, PackageRecord } from "./types.ts";

const WHOLE_SECOND_UTC = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/u;

export function nowWholeSecond(): string {
  return new Date(Math.floor(Date.now() / 1_000) * 1_000).toISOString().replace(".000Z", "Z");
}

export function parseEvaluatedAt(value: string | null): string {
  if (value === null || value === "") return nowWholeSecond();
  const match = WHOLE_SECOND_UTC.exec(value);
  const year = Number(match?.[1]);
  const month = Number(match?.[2]);
  const day = Number(match?.[3]);
  const hour = Number(match?.[4]);
  const minute = Number(match?.[5]);
  const second = Number(match?.[6]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    match === null ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > (daysInMonth[month - 1] ?? 0) ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    throw new RequestError(400, "invalid_evaluated_at", "evaluated_at must be a real whole-second UTC timestamp");
  }
  return value;
}

export class RequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    status: number,
    code: string,
    message: string,
  ) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function requestedFromUrl(url: URL): string[] | undefined {
  const repeated = url.searchParams.getAll("profile");
  const packed = url.searchParams.get("profiles")?.split(",").filter(Boolean) ?? [];
  if (repeated.length === 0 && packed.length === 0) return undefined;
  const values = [...repeated, ...packed];
  if (values.length > 16 || new Set(values).size !== values.length) {
    throw new RequestError(400, "invalid_profiles", "Profiles must be unique and limited to 16 values");
  }
  if (values.some((value) => {
    try {
      return new URL(value).protocol.length === 0;
    } catch {
      return true;
    }
  })) {
    throw new RequestError(400, "invalid_profiles", "Every requested profile must be an absolute URI");
  }
  return values.sort();
}

export async function evaluateRecord(
  api: OffApi,
  record: PackageRecord,
  url: URL,
): Promise<EvaluationState> {
  const evaluatedAt = parseEvaluatedAt(url.searchParams.get("evaluated_at"));
  const explicit = requestedFromUrl(url);
  const supported = new Set([api.PUBLIC_EQUITY_PROFILE_URI, api.WORKBOOK_BINDING_PROFILE_URI]);
  const requestedProfiles = explicit ?? record.declaredProfiles.filter((uri) => supported.has(uri)).sort();
  const result = await api.evaluatePackage({
    packageRoot: record.packageRoot,
    evaluatedAt,
    requestedProfiles,
  });
  return { record, evaluatedAt, requestedProfiles, result };
}
