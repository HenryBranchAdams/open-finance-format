import {
  createDiagnostic,
  finalizeDiagnostics,
  type Diagnostic,
} from "./diagnostics.ts";
import { cloneAndDeepFreezeJson } from "./immutable.ts";
import { WORKBOOK_BINDING_PROFILE_URI } from "./profiles.ts";
import {
  validateWorkbookBindingSchema,
} from "./schema.ts";

export const XLSX_MEDIA_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export interface WorkbookBindingCoreResource {
  readonly id: string;
  readonly mediaType: string;
  readonly locations: readonly Readonly<Record<string, unknown>>[];
}

export interface WorkbookBindingCoreContext {
  readonly resources: ReadonlyMap<string, WorkbookBindingCoreResource>;
  readonly verifiedLocalResourceIds: ReadonlySet<string>;
}

export interface WorkbookBindingEntities {
  readonly workbooks: readonly Readonly<Record<string, unknown>>[];
  readonly subjects: readonly Readonly<Record<string, unknown>>[];
  readonly bindings: readonly Readonly<Record<string, unknown>>[];
  readonly unevaluated: {
    readonly workbookContents: "notEvaluated";
    readonly locatorExistence: "notEvaluated";
    readonly cellValues: "notEvaluated";
    readonly formulas: "notEvaluated";
    readonly recalculation: "notEvaluated";
  };
}

export type WorkbookBindingEvaluation =
  | {
      readonly ok: false;
      readonly stage: "schemaFailed" | "semanticFailed";
      readonly diagnostics: readonly Diagnostic[];
    }
  | {
      readonly ok: true;
      readonly stage: "passed";
      readonly entities: WorkbookBindingEntities;
      readonly diagnostics: readonly [];
    };

interface ProfileData extends Record<string, unknown> {
  readonly workbooks: readonly Record<string, unknown>[];
  readonly subjects: readonly Record<string, unknown>[];
  readonly bindings: readonly Record<string, unknown>[];
}

const collections = ["workbooks", "subjects", "bindings"] as const;

function pointerEscape(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

const profilePointer =
  `/profileData/${pointerEscape(WORKBOOK_BINDING_PROFILE_URI)}`;

function compareUtf16(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function profileData(value: unknown): ProfileData | undefined {
  if (
    typeof value !== "object" ||
    value === null ||
    !("profileData" in value)
  ) {
    return undefined;
  }
  const allProfiles = (value as { profileData?: unknown }).profileData;
  if (typeof allProfiles !== "object" || allProfiles === null) {
    return undefined;
  }
  const profile = (allProfiles as Record<string, unknown>)[
    WORKBOOK_BINDING_PROFILE_URI
  ];
  return typeof profile === "object" && profile !== null
    ? (profile as ProfileData)
    : undefined;
}

interface IdOccurrence {
  readonly collection: (typeof collections)[number];
  readonly index: number;
}

function idOccurrences(
  profile: ProfileData,
): ReadonlyMap<string, readonly IdOccurrence[]> {
  const occurrences = new Map<string, IdOccurrence[]>();
  for (const collection of collections) {
    profile[collection].forEach((record, index) => {
      const id = String(record.id);
      const current = occurrences.get(id) ?? [];
      current.push({ collection, index });
      occurrences.set(id, current);
    });
  }
  return occurrences;
}

function duplicateDiagnostics(
  occurrences: ReadonlyMap<string, readonly IdOccurrence[]>,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const [id, records] of occurrences) {
    for (const duplicate of records.slice(1)) {
      diagnostics.push(
        createDiagnostic(
          "OFF.WORKBOOK_BINDING.DUPLICATE_ID",
          `${profilePointer}/${duplicate.collection}/${duplicate.index}/id`,
          { id },
        ),
      );
    }
  }
  return diagnostics;
}

function workbookDiagnostics(
  profile: ProfileData,
  occurrences: ReadonlyMap<string, readonly IdOccurrence[]>,
  core: WorkbookBindingCoreContext,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  profile.workbooks.forEach((workbook, index) => {
    const workbookId = String(workbook.id);
    if ((occurrences.get(workbookId)?.length ?? 0) > 1) {
      return;
    }
    const snapshotResourceId = String(workbook.snapshotResourceId);
    const snapshot = core.resources.get(snapshotResourceId);
    const snapshotPointer =
      `${profilePointer}/workbooks/${index}/snapshotResourceId`;
    if (snapshot === undefined) {
      diagnostics.push(
        createDiagnostic(
          "OFF.WORKBOOK_BINDING.SNAPSHOT_RESOURCE",
          snapshotPointer,
          { reason: "missing", resourceId: snapshotResourceId },
        ),
      );
    } else if (!core.verifiedLocalResourceIds.has(snapshotResourceId)) {
      diagnostics.push(
        createDiagnostic(
          "OFF.WORKBOOK_BINDING.SNAPSHOT_RESOURCE",
          snapshotPointer,
          { reason: "notLocallyVerified", resourceId: snapshotResourceId },
        ),
      );
    } else if (snapshot.mediaType !== XLSX_MEDIA_TYPE) {
      diagnostics.push(
        createDiagnostic(
          "OFF.WORKBOOK_BINDING.SNAPSHOT_MEDIA_TYPE",
          snapshotPointer,
          {
            actualMediaType: snapshot.mediaType,
            resourceId: snapshotResourceId,
          },
        ),
      );
    }

    if (workbook.liveSourceResourceId === undefined) {
      return;
    }
    const liveSourceResourceId = String(workbook.liveSourceResourceId);
    const livePointer =
      `${profilePointer}/workbooks/${index}/liveSourceResourceId`;
    let reason: "missing" | "sameAsSnapshot" | "notHttpsRemote" | undefined;
    if (liveSourceResourceId === snapshotResourceId) {
      reason = "sameAsSnapshot";
    } else {
      const live = core.resources.get(liveSourceResourceId);
      if (live === undefined) {
        reason = "missing";
      } else if (
        !live.locations.some(
          (location) =>
            location.kind === "remote" &&
            typeof location.url === "string" &&
            /^https:\/\//iu.test(location.url),
        )
      ) {
        reason = "notHttpsRemote";
      }
    }
    if (reason !== undefined) {
      diagnostics.push(
        createDiagnostic(
          "OFF.WORKBOOK_BINDING.LIVE_SOURCE",
          livePointer,
          { reason, resourceId: liveSourceResourceId },
        ),
      );
    }
  });
  return diagnostics;
}

function referenceDiagnostics(
  profile: ProfileData,
  occurrences: ReadonlyMap<string, readonly IdOccurrence[]>,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const subjectIds = new Set(profile.subjects.map(({ id }) => String(id)));
  const workbookIds = new Set(profile.workbooks.map(({ id }) => String(id)));
  profile.bindings.forEach((binding, index) => {
    const subjectId = String(binding.subjectId);
    if (
      !subjectIds.has(subjectId) ||
      (occurrences.get(subjectId)?.length ?? 0) > 1
    ) {
      diagnostics.push(
        createDiagnostic(
          "OFF.WORKBOOK_BINDING.SUBJECT_REFERENCE",
          `${profilePointer}/bindings/${index}/subjectId`,
          { subjectId },
        ),
      );
    }
    const workbookId = String(binding.workbookId);
    if (
      !workbookIds.has(workbookId) ||
      (occurrences.get(workbookId)?.length ?? 0) > 1
    ) {
      diagnostics.push(
        createDiagnostic(
          "OFF.WORKBOOK_BINDING.WORKBOOK_REFERENCE",
          `${profilePointer}/bindings/${index}/workbookId`,
          { workbookId },
        ),
      );
    }
  });
  return diagnostics;
}

function normalize(profile: ProfileData): WorkbookBindingEntities {
  const sorted = (records: readonly Record<string, unknown>[]) =>
    [...records]
      .sort((left, right) =>
        compareUtf16(String(left.id), String(right.id)),
      )
      .map((record) => ({
        ...record,
        ...(record.liveSourceResourceId === undefined
          ? {}
          : { liveSourceStatus: "notEvaluated" }),
      }));
  return cloneAndDeepFreezeJson({
    workbooks: sorted(profile.workbooks),
    subjects: sorted(profile.subjects),
    bindings: sorted(profile.bindings),
    unevaluated: {
      workbookContents: "notEvaluated",
      locatorExistence: "notEvaluated",
      cellValues: "notEvaluated",
      formulas: "notEvaluated",
      recalculation: "notEvaluated",
    },
  });
}

export function workbookBindingCoreContextFromNormalized(
  normalized: Readonly<Record<string, unknown>>,
): WorkbookBindingCoreContext {
  const resources = new Map<string, WorkbookBindingCoreResource>();
  const verifiedLocalResourceIds = new Set<string>();
  const inventory = Array.isArray(normalized.resourceInventory)
    ? normalized.resourceInventory
    : [];
  for (const candidate of inventory) {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      typeof (candidate as Record<string, unknown>).id !== "string" ||
      typeof (candidate as Record<string, unknown>).mediaType !== "string" ||
      !Array.isArray((candidate as Record<string, unknown>).locations)
    ) {
      continue;
    }
    const resource = candidate as Record<string, unknown>;
    const locations = resource.locations as readonly Record<string, unknown>[];
    const id = resource.id as string;
    resources.set(id, {
      id,
      mediaType: resource.mediaType as string,
      locations,
    });
    if (
      locations.filter(
        (location) =>
          location.kind === "local" &&
          location.availability === "available" &&
          location.integrity === "verified",
      ).length === 1
    ) {
      verifiedLocalResourceIds.add(id);
    }
  }
  return { resources, verifiedLocalResourceIds };
}

export function evaluateWorkbookBinding(
  value: unknown,
  core: WorkbookBindingCoreContext,
): WorkbookBindingEvaluation {
  const schema = validateWorkbookBindingSchema(value);
  const profile = profileData(value);
  if (!schema.valid || profile === undefined) {
    return {
      ok: false,
      stage: "schemaFailed",
      diagnostics: schema.diagnostics,
    };
  }

  const occurrences = idOccurrences(profile);
  const diagnostics = finalizeDiagnostics([
    ...duplicateDiagnostics(occurrences),
    ...workbookDiagnostics(profile, occurrences, core),
    ...referenceDiagnostics(profile, occurrences),
  ]);
  if (diagnostics.length > 0) {
    return {
      ok: false,
      stage: "semanticFailed",
      diagnostics,
    };
  }
  return {
    ok: true,
    stage: "passed",
    entities: normalize(profile),
    diagnostics: [],
  };
}
