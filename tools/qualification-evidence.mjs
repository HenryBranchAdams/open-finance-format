import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const BEGIN = "<!-- OFF-INTEROPERABILITY-RECORD-BEGIN\n";
const END = "\nOFF-INTEROPERABILITY-RECORD-END -->";
const CANDIDATE = "v0.1-rc.1";
const PENDING = "pending";
const STATUS = new Set([
  "pending",
  "author-claimed",
  "publicly-authenticated",
  "independently-executed",
  "publicly-reviewed",
  "failed",
  "inapplicable",
]);
const HEX40 = /^[0-9a-f]{40}$/u;
const HEX64 = /^[0-9a-f]{64}$/u;

export class QualificationEvidenceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "QualificationEvidenceError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new QualificationEvidenceError(code, message, details);
}

function exactKeys(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return JSON.stringify(actual) === JSON.stringify(keys.slice().sort());
}

function strings(value, keys) {
  return exactKeys(value, keys) && keys.every((key) => typeof value[key] === "string");
}

function status(value, path) {
  const current = value?.status;
  if (typeof current !== "string" || !STATUS.has(current)) {
    fail("evidence_status_invalid", `${path}.status is not an allowed evidence state.`, {
      path,
      value: current,
    });
  }
}

function requireClaimState(value, path, sourceKind) {
  if (sourceKind === "local-rehearsal") {
    for (const [key, field] of Object.entries(value)) {
      if (field !== PENDING) {
        fail(
          "local_rehearsal_evidence_forbidden",
          "A local rehearsal cannot populate qualifying evidence fields.",
          { path: `${path}.${key}`, value: field },
        );
      }
    }
  }
  status(value, path);
  if (value.status === PENDING && value.claimBasis !== PENDING) {
    fail("evidence_state_contradiction", `${path} is pending but claimBasis is not pending.`, { path });
  }
  if (value.status === "author-claimed") {
    if (value.claimBasis !== "author-claimed" || value.evidencePath === PENDING) {
      fail("evidence_state_contradiction", `${path} author-claimed state lacks its claim basis or evidence path.`, { path });
    }
    if (
      value.publicHumanReview !== PENDING ||
      value.reviewer !== PENDING ||
      value.reviewEvidencePath !== PENDING
    ) {
      fail("evidence_state_contradiction", `${path} cannot claim public review while only author-claimed.`, { path });
    }
  }
  if (value.status === "publicly-reviewed") {
    if (
      value.claimBasis !== "publicly-reviewed" ||
      value.evidencePath === PENDING ||
      value.publicHumanReview === PENDING ||
      value.reviewer === PENDING ||
      value.reviewEvidencePath === PENDING
    ) {
      fail("evidence_state_contradiction", `${path} publicly-reviewed state lacks named review evidence.`, { path });
    }
  }
  if (["publicly-authenticated", "independently-executed"].includes(value.status)) {
    if (value.claimBasis !== value.status || value.evidencePath === PENDING) {
      fail("evidence_state_contradiction", `${path} lacks the evidence basis for its claimed state.`, { path });
    }
    if (
      value.status === "independently-executed" &&
      (value.publicHumanReview !== PENDING || value.reviewer !== PENDING || value.reviewEvidencePath !== PENDING)
    ) {
      fail("evidence_state_contradiction", `${path} cannot imply public review before a named reviewer acts.`, { path });
    }
  }
  if (value.status === "failed") {
    if (
      value.evidencePath === PENDING ||
      value.claimBasis !== "publicly-reviewed" ||
      value.publicHumanReview === PENDING ||
      value.reviewer === PENDING ||
      value.reviewEvidencePath === PENDING
    ) {
      fail(
        "evidence_state_contradiction",
        `${path} failed state may be recorded only by a named public reviewer against immutable evidence.`,
        { path },
      );
    }
  }
  if (value.status === "inapplicable" && value.claimBasis !== "inapplicable") {
    fail("evidence_state_contradiction", `${path} is inapplicable but claimBasis disagrees.`, { path });
  }
}

const independenceAttestationFields = [
  "unaffiliatedImplementer",
  "relationshipDisclosure",
  "publicMaterialsOnly",
  "noPrivateGuidance",
  "sourceCodeNotInspected",
  "distributionNotReverseEngineered",
];

function requireIndependenceState(value, path, sourceKind) {
  if (sourceKind === "local-rehearsal") {
    for (const [key, field] of Object.entries(value)) {
      if (field !== PENDING) {
        fail(
          "local_rehearsal_evidence_forbidden",
          "A local rehearsal cannot populate qualifying evidence fields.",
          { path: `${path}.${key}`, value: field },
        );
      }
    }
  }
  status(value, path);
  const substantiveFields = [
    ...independenceAttestationFields,
    "evidencePath",
  ];
  const requireAttestations = () => {
    for (const field of substantiveFields) {
      if (value[field] === PENDING) {
        fail(
          "evidence_state_contradiction",
          `${path} cannot advance before ${field} is recorded.`,
          { path: `${path}.${field}` },
        );
      }
    }
  };

  if (value.status === PENDING) {
    if (Object.values(value).some((field) => field !== PENDING && field !== value.status)) {
      fail("evidence_state_contradiction", `${path} is pending but contains a populated claim.`, { path });
    }
    return;
  }
  if (value.status === "inapplicable") {
    if (value.claimBasis !== "inapplicable") {
      fail("evidence_state_contradiction", `${path} is inapplicable but claimBasis disagrees.`, { path });
    }
    if (Object.entries(value).some(([key, field]) => key !== "status" && key !== "claimBasis" && field !== PENDING)) {
      fail("evidence_state_contradiction", `${path} inapplicable state cannot contain qualifying evidence.`, { path });
    }
    return;
  }
  if (value.status === "author-claimed" || value.status === "independently-executed") {
    if (value.claimBasis !== value.status) {
      fail("evidence_state_contradiction", `${path} claimBasis must match its claimed state.`, { path });
    }
    requireAttestations();
    if (value.publicHumanReview !== PENDING || value.reviewer !== PENDING) {
      fail("evidence_state_contradiction", `${path} cannot imply public review before a named reviewer acts.`, { path });
    }
    return;
  }
  if (value.status === "publicly-reviewed" || value.status === "failed") {
    if (value.claimBasis !== "publicly-reviewed") {
      fail("evidence_state_contradiction", `${path} reviewed or failed state requires a publicly-reviewed claim basis.`, { path });
    }
    requireAttestations();
    if (value.publicHumanReview === PENDING || value.reviewer === PENDING) {
      fail("evidence_state_contradiction", `${path} reviewed state lacks named public review evidence.`, { path });
    }
    return;
  }
  fail(
    "evidence_state_contradiction",
    `${path} has an unsupported independence state: ${value.status}.`,
    { path, value: value.status },
  );
}

const gateEvidenceFields = {
  independentConsumer: [
    "evaluatorFailureVectorsReproduced",
    "implementationLanguage",
    "evidencePath",
  ],
  independentProducer: [
    "packageId",
    "packageBytesFrozenBeforeValidation",
    "firstCurrentValidatorResult",
    "firstStaleValidatorResult",
    "postValidationRepairs",
    "evidencePath",
  ],
  tenMinuteCoreAuthoring: ["durationSeconds", "evidencePath"],
  adoption: ["evidencePath"],
};

const gateStatuses = new Set([
  PENDING,
  "author-claimed",
  "publicly-reviewed",
  "failed",
  "inapplicable",
]);

function requireGateClaimState(value, path, sourceKind) {
  status(value, path);
  if (!gateStatuses.has(value.status)) {
    fail(
      "evidence_state_contradiction",
      `${path} has an unsupported gate transition: ${value.status}.`,
      { path, value: value.status },
    );
  }
  requireClaimState(value, path, sourceKind);
}

function requireGatePrerequisites(record) {
  const authenticationReady =
    record.authentication.publicVcsCommit !== PENDING &&
    record.authentication.checksumManifestSha256 !== PENDING &&
    record.authentication.claimBasis === "publicly-authenticated";
  const independenceStatus = record.independence.status;
  for (const [name, gate] of Object.entries(record.gates)) {
    if ([PENDING, "inapplicable"].includes(gate.status)) continue;
    if (!authenticationReady) {
      fail(
        "evidence_state_contradiction",
        `gates.${name} cannot advance while candidate authentication is pending.`,
        { path: `gates.${name}` },
      );
    }
    const minimumIndependence = gate.status === "author-claimed"
      ? ["author-claimed", "independently-executed", "publicly-reviewed"]
      : ["independently-executed", "publicly-reviewed"];
    if (!minimumIndependence.includes(independenceStatus)) {
      fail(
        "evidence_state_contradiction",
        `gates.${name} cannot advance before the independence state is established.`,
        { path: `gates.${name}`, independenceStatus },
      );
    }
    if (["author-claimed", "publicly-reviewed", "failed"].includes(gate.status)) {
      for (const field of gateEvidenceFields[name]) {
        if (gate[field] === PENDING) {
          fail(
            "evidence_state_contradiction",
            `gates.${name} requires immutable evidence for ${field}.`,
            { path: `gates.${name}.${field}` },
          );
        }
      }
    }
  }
}

function validateRecordShape(record) {
  if (
    !exactKeys(record, ["authentication", "candidate", "gates", "independence", "recordVersion"]) ||
    record.recordVersion !== "0.1" ||
    record.candidate !== CANDIDATE ||
    !strings(record.authentication, [
      "checksumManifestSha256",
      "claimBasis",
      "publicHumanReview",
      "publicVcsCommit",
      "reviewEvidencePath",
      "reviewer",
    ]) ||
    !strings(record.independence, [
      "claimBasis",
      "distributionNotReverseEngineered",
      "evidencePath",
      "noPrivateGuidance",
      "publicHumanReview",
      "publicMaterialsOnly",
      "relationshipDisclosure",
      "reviewer",
      "sourceCodeNotInspected",
      "status",
      "unaffiliatedImplementer",
    ]) ||
    !exactKeys(record.gates, ["adoption", "independentConsumer", "independentProducer", "tenMinuteCoreAuthoring"])
  ) {
    fail("evidence_shape_invalid", "The copied report does not have the canonical machine-record shape.");
  }
  const consumerKeys = [
    "claimBasis",
    "evaluatorFailureVectorsReproduced",
    "evidencePath",
    "implementationLanguage",
    "publicHumanReview",
    "reviewEvidencePath",
    "reviewer",
    "status",
  ];
  const producerKeys = [
    "claimBasis",
    "evidencePath",
    "firstCurrentValidatorResult",
    "firstStaleValidatorResult",
    "packageBytesFrozenBeforeValidation",
    "packageId",
    "postValidationRepairs",
    "publicHumanReview",
    "reviewEvidencePath",
    "reviewer",
    "status",
  ];
  const authorKeys = [
    "claimBasis",
    "durationSeconds",
    "evidencePath",
    "publicHumanReview",
    "reviewEvidencePath",
    "reviewer",
    "status",
  ];
  const adoptionKeys = [
    "claimBasis",
    "evidencePath",
    "publicHumanReview",
    "reviewEvidencePath",
    "reviewer",
    "status",
  ];
  if (
    !strings(record.gates.independentConsumer, consumerKeys) ||
    !strings(record.gates.independentProducer, producerKeys) ||
    !exactKeys(record.gates.tenMinuteCoreAuthoring, authorKeys) ||
    !strings(record.gates.adoption, adoptionKeys) ||
    !authorKeys
      .filter((key) => key !== "durationSeconds")
      .every((key) => typeof record.gates.tenMinuteCoreAuthoring[key] === "string")
  ) {
    fail("evidence_shape_invalid", "The copied report has missing or extra machine-record fields.");
  }
  if (
    !(
      typeof record.gates.tenMinuteCoreAuthoring.durationSeconds === "string" ||
      (typeof record.gates.tenMinuteCoreAuthoring.durationSeconds === "number" &&
        Number.isFinite(record.gates.tenMinuteCoreAuthoring.durationSeconds))
    )
  ) {
    fail("evidence_shape_invalid", "The timed-author duration must be a finite number or pending string.");
  }
}

function validateAuthentication(record, sourceKind) {
  const authentication = record.authentication;
  if (
    authentication.publicVcsCommit !== PENDING && !HEX40.test(authentication.publicVcsCommit)
  ) {
    fail("evidence_authentication_invalid", "publicVcsCommit must be pending or a full lowercase SHA-1.");
  }
  if (
    authentication.checksumManifestSha256 !== PENDING && !HEX64.test(authentication.checksumManifestSha256)
  ) {
    fail("evidence_authentication_invalid", "checksumManifestSha256 must be pending or a full lowercase SHA-256.");
  }
  const anchorsPending =
    authentication.publicVcsCommit === PENDING ||
    authentication.checksumManifestSha256 === PENDING;
  if (anchorsPending && authentication.claimBasis !== PENDING) {
    fail("evidence_state_contradiction", "Pending authentication anchors require a pending claim basis.");
  }
  if (!anchorsPending && authentication.claimBasis !== "publicly-authenticated") {
    fail("evidence_state_contradiction", "Authenticated anchors require a publicly-authenticated claim basis.");
  }
  if (
    authentication.publicHumanReview !== PENDING &&
    (authentication.reviewer === PENDING || authentication.reviewEvidencePath === PENDING)
  ) {
    fail("evidence_state_contradiction", "Authentication review status requires a named reviewer and evidence path.");
  }
  if (sourceKind === "local-rehearsal") {
    for (const key of ["publicVcsCommit", "checksumManifestSha256", "claimBasis", "publicHumanReview", "reviewer", "reviewEvidencePath"]) {
      if (authentication[key] !== PENDING) {
        fail("local_rehearsal_evidence_forbidden", `A local rehearsal cannot populate authentication.${key}.`, { key });
      }
    }
  }
}

export function parseQualificationEvidence(markdown, { sourceKind = "external-attempt" } = {}) {
  if (typeof markdown !== "string") fail("evidence_input_invalid", "Report content must be text.");
  const start = markdown.indexOf(BEGIN);
  if (start < 0 || markdown.indexOf(BEGIN, start + BEGIN.length) >= 0) {
    fail("evidence_record_missing", "The report must contain exactly one machine-readable evidence record.");
  }
  const finish = markdown.indexOf(END, start + BEGIN.length);
  if (finish < 0 || markdown.indexOf(END, finish + END.length) >= 0) {
    fail("evidence_record_missing", "The report must contain exactly one complete machine-readable evidence record.");
  }
  const source = markdown.slice(start + BEGIN.length, finish);
  let record;
  try {
    record = JSON.parse(source);
  } catch (error) {
    fail("evidence_record_invalid_json", "The machine-readable evidence record is not valid JSON.", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
  validateRecordShape(record);
  if (JSON.stringify(record, null, 2) !== source) {
    fail("evidence_record_noncanonical", "The machine-readable record must use the canonical two-space JSON form.");
  }
  validateAuthentication(record, sourceKind);
  requireIndependenceState(record.independence, "independence", sourceKind);
  for (const [name, value] of Object.entries(record.gates)) {
    requireGateClaimState(value, `gates.${name}`, sourceKind);
  }
  requireGatePrerequisites(record);
  return {
    kind: "offQualificationEvidence",
    candidate: record.candidate,
    sourceKind,
    record,
    states: {
      independence: record.independence.status,
      independentConsumer: record.gates.independentConsumer.status,
      independentProducer: record.gates.independentProducer.status,
      tenMinuteCoreAuthoring: record.gates.tenMinuteCoreAuthoring.status,
      adoption: record.gates.adoption.status,
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const reportFlag = args.indexOf("--report");
  if (reportFlag < 0 || args[reportFlag + 1] === undefined) {
    process.stderr.write("Usage: node tools/qualification-evidence.mjs --report <copied-report> [--source-kind external-attempt|local-rehearsal]\n");
    process.exitCode = 64;
    return;
  }
  const kindFlag = args.indexOf("--source-kind");
  const sourceKind = kindFlag >= 0 ? args[kindFlag + 1] : "external-attempt";
  if (sourceKind !== "external-attempt" && sourceKind !== "local-rehearsal") {
    process.stderr.write(JSON.stringify({ kind: "offQualificationEvidence", ok: false, code: "invalid_source_kind" }) + "\n");
    process.exitCode = 64;
    return;
  }
  try {
    const result = parseQualificationEvidence(await readFile(resolve(args[reportFlag + 1]), "utf8"), { sourceKind });
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } catch (error) {
    const result = error instanceof QualificationEvidenceError
      ? { kind: "offQualificationEvidence", ok: false, code: error.code, message: error.message, details: error.details }
      : { kind: "offQualificationEvidence", ok: false, code: "internal_error", message: error instanceof Error ? error.message : String(error) };
    process.stderr.write(JSON.stringify(result, null, 2) + "\n");
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) await main();
