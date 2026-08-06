import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  QualificationEvidenceError,
  parseQualificationEvidence,
} from "../tools/qualification-evidence.mjs";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const pinnedPublicCommit = "2570e38998dd735b83da301a5b6f0e95aca47073";
const pinnedChecksumManifestSha256 =
  "65ac8b6b7521ab1582275317d43d7fff819a706a233be599f2285b40f7d3a59e";

function mutateIndependence(
  markdown: string,
  replacements: readonly [string, string][],
): string {
  const start = markdown.indexOf('"independence": {');
  const end = markdown.indexOf('\n  },\n  "gates"', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  let block = markdown.slice(start, end);
  for (const [from, to] of replacements) block = block.replace(from, to);
  return markdown.slice(0, start) + block + markdown.slice(end);
}

function mutateRecord(
  markdown: string,
  mutate: (record: Record<string, any>) => void,
): string {
  const begin = "<!-- OFF-INTEROPERABILITY-RECORD-BEGIN\n";
  const end = "\nOFF-INTEROPERABILITY-RECORD-END -->";
  const start = markdown.indexOf(begin);
  const finish = markdown.indexOf(end, start + begin.length);
  assert.notEqual(start, -1);
  assert.notEqual(finish, -1);
  const record = JSON.parse(markdown.slice(start + begin.length, finish));
  mutate(record);
  return markdown.slice(0, start) + begin + JSON.stringify(record, null, 2) + markdown.slice(finish);
}

async function template(): Promise<string> {
  return readFile(
    join(repositoryRoot, "clean-room/INTEROPERABILITY_REPORT.template.md"),
    "utf8",
  );
}

function authenticateAndEstablishIndependence(record: Record<string, any>): void {
  record.authentication.publicVcsCommit = pinnedPublicCommit;
  record.authentication.checksumManifestSha256 = pinnedChecksumManifestSha256;
  record.authentication.claimBasis = "publicly-authenticated";
  record.independence.status = "independently-executed";
  record.independence.claimBasis = "independently-executed";
  record.independence.evidencePath = "attempt/independence.json";
  record.independence.unaffiliatedImplementer = "Participant";
  record.independence.relationshipDisclosure = "No relationship disclosed";
  record.independence.publicMaterialsOnly = "confirmed";
  record.independence.noPrivateGuidance = "confirmed";
  record.independence.sourceCodeNotInspected = "confirmed";
  record.independence.distributionNotReverseEngineered = "confirmed";
}

async function errorCode(
  promise: Promise<unknown>,
  expected: string,
): Promise<void> {
  await assert.rejects(promise, (error: unknown) => {
    assert.equal(error instanceof QualificationEvidenceError, true);
    assert.equal((error as QualificationEvidenceError).code, expected);
    return true;
  });
}

test("the copied pending report is a canonical evidence record", async () => {
  const result = parseQualificationEvidence(await template());
  assert.equal(result.kind, "offQualificationEvidence");
  assert.equal(result.candidate, "v0.1-rc.1");
  assert.deepEqual(result.states, {
    independence: "pending",
    independentConsumer: "pending",
    independentProducer: "pending",
    tenMinuteCoreAuthoring: "pending",
    adoption: "pending",
  });
});

test("the exported parser rejects unsupported source kinds", async () => {
  const pending = await template();
  await errorCode(
    Promise.resolve().then(() =>
      parseQualificationEvidence(pending, {
        sourceKind: "local_rehearsal" as "local-rehearsal",
      }),
    ),
    "invalid_source_kind",
  );
});

test("missing and internally contradictory evidence fails closed", async () => {
  await errorCode(
    Promise.resolve().then(() => parseQualificationEvidence("# no record\n")),
    "evidence_record_missing",
  );
  const pending = await template();
  await errorCode(
    Promise.resolve().then(() =>
      parseQualificationEvidence(mutateIndependence(pending, [
        ['"claimBasis": "pending"', '"claimBasis": "author-claimed"'],
      ])),
    ),
    "evidence_state_contradiction",
  );
  await errorCode(
    Promise.resolve().then(() =>
      parseQualificationEvidence(mutateRecord(pending, (record) => {
        record.gates.independentConsumer.evidencePath = "attempt/consumer.json";
      })),
    ),
    "evidence_state_contradiction",
  );
});

test("author-claimed and publicly-reviewed states require their distinct evidence", async () => {
  const pending = await template();
  const incompleteAuthorClaimed = mutateRecord(pending, (record) => {
    record.independence.status = "author-claimed";
    record.independence.claimBasis = "author-claimed";
    record.independence.evidencePath = "attempt/independence.json";
    record.independence.unaffiliatedImplementer = "Participant";
    record.independence.relationshipDisclosure = "No relationship disclosed";
    record.independence.publicMaterialsOnly = "confirmed";
    record.independence.noPrivateGuidance = "confirmed";
    record.independence.sourceCodeNotInspected = "pending";
    record.independence.distributionNotReverseEngineered = "confirmed";
  });
  await errorCode(Promise.resolve().then(() => parseQualificationEvidence(incompleteAuthorClaimed)), "evidence_state_contradiction");

  const authorClaimed = mutateRecord(pending, (record) => {
    record.independence.status = "author-claimed";
    record.independence.claimBasis = "author-claimed";
    record.independence.evidencePath = "attempt/independence.json";
    record.independence.unaffiliatedImplementer = "Participant";
    record.independence.relationshipDisclosure = "No relationship disclosed";
    record.independence.publicMaterialsOnly = "confirmed";
    record.independence.noPrivateGuidance = "confirmed";
    record.independence.sourceCodeNotInspected = "confirmed";
    record.independence.distributionNotReverseEngineered = "confirmed";
  });
  const authorResult = parseQualificationEvidence(authorClaimed);
  assert.equal(authorResult.states.independence, "author-claimed");

  const locallyFailed = mutateRecord(pending, (record) => {
    record.independence.status = "failed";
    record.independence.claimBasis = "publicly-reviewed";
    record.independence.evidencePath = "attempt/independence.json";
    record.independence.unaffiliatedImplementer = "Participant";
    record.independence.relationshipDisclosure = "No relationship disclosed";
    record.independence.publicMaterialsOnly = "confirmed";
    record.independence.noPrivateGuidance = "confirmed";
    record.independence.sourceCodeNotInspected = "confirmed";
    record.independence.distributionNotReverseEngineered = "confirmed";
  });
  await errorCode(Promise.resolve().then(() => parseQualificationEvidence(locallyFailed)), "evidence_state_contradiction");

  const reviewed = mutateRecord(pending, (record) => {
    record.independence.status = "publicly-reviewed";
    record.independence.claimBasis = "publicly-reviewed";
    record.independence.evidencePath = "attempt/independence.json";
    record.independence.unaffiliatedImplementer = "Participant";
    record.independence.relationshipDisclosure = "No relationship disclosed";
    record.independence.publicMaterialsOnly = "confirmed";
    record.independence.noPrivateGuidance = "confirmed";
    record.independence.sourceCodeNotInspected = "confirmed";
    record.independence.distributionNotReverseEngineered = "confirmed";
    record.independence.publicHumanReview = "reviewed";
    record.independence.reviewer = "Public Reviewer";
  });
  const result = parseQualificationEvidence(reviewed);
  assert.equal(result.states.independence, "publicly-reviewed");

  await errorCode(
    Promise.resolve().then(() =>
      parseQualificationEvidence(mutateRecord(reviewed, (record) => {
        record.independence.reviewer = "";
      })),
    ),
    "evidence_state_contradiction",
  );
});

test("local rehearsal cannot populate qualifying evidence", async () => {
  const pending = await template();
  await errorCode(
    Promise.resolve().then(() =>
      parseQualificationEvidence(
        pending.replace('"publicVcsCommit": "pending"', '"publicVcsCommit": "0000000000000000000000000000000000000000"'),
        { sourceKind: "local-rehearsal" },
      ),
    ),
    "local_rehearsal_evidence_forbidden",
  );
  await errorCode(
    Promise.resolve().then(() =>
      parseQualificationEvidence(
        mutateIndependence(pending, [['"evidencePath": "pending"', '"evidencePath": "attempt/evidence"']]),
        { sourceKind: "local-rehearsal" },
      ),
    ),
    "local_rehearsal_evidence_forbidden",
  );
});

test("reviewed gates require candidate authentication, independence, and immutable gate evidence", async () => {
  const pending = await template();
  const reviewed = mutateRecord(pending, (record) => {
    authenticateAndEstablishIndependence(record);
    record.gates.independentConsumer.status = "publicly-reviewed";
    record.gates.independentConsumer.claimBasis = "publicly-reviewed";
    record.gates.independentConsumer.evidencePath = "attempt/consumer.json";
    record.gates.independentConsumer.publicHumanReview = "reviewed";
    record.gates.independentConsumer.reviewer = "Public Reviewer";
    record.gates.independentConsumer.reviewEvidencePath = "review/review.json";
  });
  await errorCode(
    Promise.resolve().then(() => parseQualificationEvidence(reviewed)),
    "evidence_state_contradiction",
  );
});

test("gate records reject authentication and implementation states as unsupported transitions", async () => {
  const pending = await template();
  for (const status of ["publicly-authenticated", "independently-executed"]) {
    await errorCode(
      Promise.resolve().then(() =>
        parseQualificationEvidence(
          mutateRecord(pending, (record) => {
            record.gates.independentConsumer.status = status;
          }),
        ),
      ),
      "evidence_state_contradiction",
    );
  }
});

test("author-claimed gates require complete immutable result fields before review", async () => {
  const pending = await template();
  const complete = (missingLanguage: boolean): string => mutateRecord(pending, (record) => {
    authenticateAndEstablishIndependence(record);
    record.gates.independentConsumer.status = "author-claimed";
    record.gates.independentConsumer.claimBasis = "author-claimed";
    record.gates.independentConsumer.evidencePath = "attempt/consumer.json";
    record.gates.independentConsumer.implementationLanguage = missingLanguage ? "pending" : "Rust";
    record.gates.independentConsumer.evaluatorFailureVectorsReproduced = "reproduced";
  });

  const result = parseQualificationEvidence(complete(false));
  assert.equal(result.states.independentConsumer, "author-claimed");
  await errorCode(
    Promise.resolve().then(() => parseQualificationEvidence(complete(true))),
    "evidence_state_contradiction",
  );
  await errorCode(
    Promise.resolve().then(() =>
      parseQualificationEvidence(mutateRecord(complete(false), (record) => {
        record.gates.independentConsumer.evidencePath = " pending ";
      })),
    ),
    "evidence_state_contradiction",
  );
});

test("authentication anchors must bind the exact frozen candidate", async () => {
  const pending = await template();
  await errorCode(
    Promise.resolve().then(() =>
      parseQualificationEvidence(mutateRecord(pending, (record) => {
        record.authentication.publicVcsCommit = "0000000000000000000000000000000000000000";
        record.authentication.checksumManifestSha256 = pinnedChecksumManifestSha256;
        record.authentication.claimBasis = "publicly-authenticated";
      })),
    ),
    "evidence_authentication_invalid",
  );
});

test("successful gate claims enforce the frozen task results", async () => {
  const pending = await template();
  const timed = (durationSeconds: number): string => mutateRecord(pending, (record) => {
    authenticateAndEstablishIndependence(record);
    record.gates.tenMinuteCoreAuthoring.status = "author-claimed";
    record.gates.tenMinuteCoreAuthoring.durationSeconds = durationSeconds;
    record.gates.tenMinuteCoreAuthoring.evidencePath = "attempt/timed-core.json";
    record.gates.tenMinuteCoreAuthoring.claimBasis = "author-claimed";
  });
  assert.equal(
    parseQualificationEvidence(timed(600)).states.tenMinuteCoreAuthoring,
    "author-claimed",
  );
  await errorCode(
    Promise.resolve().then(() => parseQualificationEvidence(timed(601))),
    "evidence_state_contradiction",
  );

  const producer = (frozen: string): string => mutateRecord(pending, (record) => {
    authenticateAndEstablishIndependence(record);
    Object.assign(record.gates.independentProducer, {
      status: "author-claimed",
      packageId: "clean-room-producer-package",
      packageBytesFrozenBeforeValidation: frozen,
      firstCurrentValidatorResult: "pass",
      firstStaleValidatorResult: "pass",
      postValidationRepairs: "0",
      evidencePath: "attempt/producer.json",
      claimBasis: "author-claimed",
    });
  });
  assert.equal(
    parseQualificationEvidence(producer("confirmed")).states.independentProducer,
    "author-claimed",
  );
  await errorCode(
    Promise.resolve().then(() => parseQualificationEvidence(producer("not-confirmed"))),
    "evidence_state_contradiction",
  );
});
