import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const root = path.dirname(fileURLToPath(import.meta.url));
const base = "https://openfinanceformat.org/examples/nrxs-valuation";
const profile = "https://openfinanceformat.org/profiles/public-equity-research/0.1";
const modelPath = "outputs/20260730-nrxs01/nrxs-valuation-model.xlsx";
const authorId = "https://github.com/HenryBranchAdams";

async function resource(pathname) {
  const bytes = await fs.readFile(path.join(root, pathname));
  return {
    byteSize: bytes.byteLength,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
}

const narrativeFile = await resource("OFF.md");
const modelFile = await resource(modelPath);
const evidenceFile = await resource("SOURCES.md");
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(path.join(root, modelPath)));
const dcf = JSON.parse((await workbook.inspect({
  kind: "table",
  range: "DCF!A3:N10",
  include: "values,formulas",
  tableMaxRows: 12,
  tableMaxCols: 15,
})).ndjson);

const modelValues = {
  bear: dcf.values[1][11],
  base: dcf.values[2][11],
  bull: dcf.values[3][11],
  weighted: dcf.values[6][1],
  market: dcf.values[7][1],
};

const ids = {
  security: `${base}/entities/security/nrxs`,
  units: {
    usdMm: `${base}/entities/unit/usd-mm`,
    usdPerShare: `${base}/entities/unit/usd-per-share`,
    sharesMm: `${base}/entities/unit/shares-mm`,
    percentage: `${base}/entities/unit/percentage`,
    multiple: `${base}/entities/unit/multiple`,
  },
  scenarios: {
    bear: `${base}/entities/scenario/bear`,
    base: `${base}/entities/scenario/base`,
    bull: `${base}/entities/scenario/bull`,
    weighted: `${base}/entities/scenario/probability-weighted`,
  },
  sources: {
    sec10k: `${base}/entities/source/sec-2025-10k`,
    sec10q: `${base}/entities/source/sec-2026-q1`,
    secS3: `${base}/entities/source/sec-2026-s3`,
    fda: `${base}/entities/source/fda-k252024`,
    cms: `${base}/entities/source/cms-2026`,
    market: `${base}/entities/source/market-snapshot`,
  },
  facts: {
    revenue2025: `${base}/entities/fact/revenue-2025`,
    revenueQ1: `${base}/entities/fact/revenue-q1-2026`,
    grossMarginQ1: `${base}/entities/fact/gross-margin-q1-2026`,
    cash: `${base}/entities/fact/cash-q1-2026`,
    notes: `${base}/entities/fact/notes-payable-q1-2026`,
    federalNol: `${base}/entities/fact/federal-nol-2025`,
    commonShares: `${base}/entities/fact/common-shares-2026-07-22`,
    rsus: `${base}/entities/fact/unvested-rsus-2026-07-22`,
    price: `${base}/entities/fact/share-price-2026-07-30`,
  },
  assumptions: {
    common: `${base}/entities/assumption/common-fcff-policy`,
    wacc: `${base}/entities/assumption/common-wacc`,
    terminalGrowth: `${base}/entities/assumption/common-terminal-growth`,
    bearPath: `${base}/entities/assumption/bear-path`,
    basePath: `${base}/entities/assumption/base-path`,
    bullPath: `${base}/entities/assumption/bull-path`,
    bearProbability: `${base}/entities/assumption/bear-probability`,
    baseProbability: `${base}/entities/assumption/base-probability`,
    bullProbability: `${base}/entities/assumption/bull-probability`,
  },
  outputs: {
    bear: `${base}/entities/output/bear-value-per-share`,
    base: `${base}/entities/output/base-value-per-share`,
    bull: `${base}/entities/output/bull-value-per-share`,
    weighted: `${base}/entities/output/probability-weighted-value-per-share`,
  },
  attestation: `${base}/entities/attestation/valuation`,
};

const scenarioRows = [
  {
    key: "bear",
    label: "Downside case",
    role: "bear",
    description: "Slow reimbursement conversion, limited operating leverage, $10 million financing at $2.50 per share, and full disputed option/RSU overhang.",
    value: modelValues.bear,
  },
  {
    key: "base",
    label: "Base case",
    role: "base",
    description: "Steady hospital activation, 23% mature EBIT margin, $5 million financing at $5 per share, and full disputed option/RSU overhang.",
    value: modelValues.base,
  },
  {
    key: "bull",
    label: "Upside case",
    role: "bull",
    description: "Rapid utilization, 30% mature EBIT margin, $2 million financing at $6 per share, and no full-value option-replacement overhang.",
    value: modelValues.bull,
  },
  {
    key: "weighted",
    label: "Probability-weighted case",
    role: "other",
    description: "Thirty percent downside, fifty percent base, and twenty percent upside value per share.",
    value: modelValues.weighted,
  },
];

const commonFacts = [
  ids.facts.revenue2025,
  ids.facts.revenueQ1,
  ids.facts.grossMarginQ1,
  ids.facts.cash,
  ids.facts.notes,
  ids.facts.federalNol,
  ids.facts.commonShares,
  ids.facts.rsus,
];

const profileData = {
  securities: [
    {
      id: ids.security,
      issuerName: "Neuraxis, Inc.",
      ticker: "NRXS",
      exchange: "XASE",
      securityType: "common-stock",
      reportingCurrencyUnitId: ids.units.usdMm,
      identifiers: { CIK: "0001933567" },
    },
  ],
  scenarios: scenarioRows.map(({ key, label, role, description }) => ({
    id: ids.scenarios[key],
    label,
    role,
    description,
  })),
  units: [
    { id: ids.units.usdMm, label: "US dollars in millions", kind: "currency", symbol: "$mm", currency: "USD" },
    { id: ids.units.usdPerShare, label: "US dollars per share", kind: "custom", symbol: "$/share" },
    { id: ids.units.sharesMm, label: "Shares in millions", kind: "shares", symbol: "mm" },
    { id: ids.units.percentage, label: "Percentage expressed as decimal", kind: "percentage", symbol: "%" },
    { id: ids.units.multiple, label: "Valuation or operating multiple", kind: "multiple", symbol: "x" },
  ],
  sources: [
    {
      id: ids.sources.sec10k,
      title: "Neuraxis FY2025 Form 10-K",
      publisher: "U.S. Securities and Exchange Commission",
      canonicalUrl: "https://www.sec.gov/Archives/edgar/data/1933567/000149315226011505/form10-k.htm",
      evidenceResourceId: `${base}/resources/evidence`,
    },
    {
      id: ids.sources.sec10q,
      title: "Neuraxis Q1 2026 Form 10-Q",
      publisher: "U.S. Securities and Exchange Commission",
      canonicalUrl: "https://www.sec.gov/Archives/edgar/data/1933567/000149315226022384/form10-q.htm",
      evidenceResourceId: `${base}/resources/evidence`,
    },
    {
      id: ids.sources.secS3,
      title: "Neuraxis July 2026 Form S-3",
      publisher: "U.S. Securities and Exchange Commission",
      canonicalUrl: "https://www.sec.gov/Archives/edgar/data/1933567/000149315226034417/forms-3.htm",
      evidenceResourceId: `${base}/resources/evidence`,
    },
    {
      id: ids.sources.fda,
      title: "FDA 510(k) decision summary K252024",
      publisher: "U.S. Food and Drug Administration",
      canonicalUrl: "https://www.accessdata.fda.gov/cdrh_docs/pdf25/K252024.pdf",
      evidenceResourceId: `${base}/resources/evidence`,
    },
    {
      id: ids.sources.cms,
      title: "CMS CY2026 PFS and OPPS evidence",
      publisher: "Centers for Medicare & Medicaid Services",
      canonicalUrl: "https://www.cms.gov/medicare/payment/fee-schedules/physician/pfs-relative-value-files/rvu26c",
      evidenceResourceId: `${base}/resources/evidence`,
    },
    {
      id: ids.sources.market,
      title: "NRXS public market-data snapshot",
      publisher: "Aggregated public market data",
      canonicalUrl: "https://www.nyse.com/quote/XASE:NRXS",
      evidenceResourceId: `${base}/resources/evidence`,
    },
  ],
  sourceFacts: [
    { id: ids.facts.revenue2025, label: "FY2025 net sales", value: { type: "decimal", value: "3.569282" }, unitId: ids.units.usdMm, effectiveDate: "2025-12-31", sourceId: ids.sources.sec10k, staleAt: "2027-03-01T00:00:00Z" },
    { id: ids.facts.revenueQ1, label: "Q1 2026 net sales", value: { type: "decimal", value: "1.607883" }, unitId: ids.units.usdMm, effectiveDate: "2026-03-31", sourceId: ids.sources.sec10q, staleAt: "2026-08-15T00:00:00Z" },
    { id: ids.facts.grossMarginQ1, label: "Q1 2026 gross margin", value: { type: "decimal", value: "0.864378" }, unitId: ids.units.percentage, effectiveDate: "2026-03-31", sourceId: ids.sources.sec10q, staleAt: "2026-08-15T00:00:00Z" },
    { id: ids.facts.cash, label: "Cash and equivalents", value: { type: "decimal", value: "7.078659" }, unitId: ids.units.usdMm, effectiveDate: "2026-03-31", sourceId: ids.sources.sec10q, staleAt: "2026-08-15T00:00:00Z" },
    { id: ids.facts.notes, label: "Notes payable", value: { type: "decimal", value: "0.100735" }, unitId: ids.units.usdMm, effectiveDate: "2026-03-31", sourceId: ids.sources.sec10q, staleAt: "2026-08-15T00:00:00Z" },
    { id: ids.facts.federalNol, label: "Federal net operating loss carryforward", value: { type: "decimal", value: "43.16" }, unitId: ids.units.usdMm, effectiveDate: "2025-12-31", sourceId: ids.sources.sec10k, staleAt: "2027-03-01T00:00:00Z" },
    { id: ids.facts.commonShares, label: "Common shares outstanding", value: { type: "decimal", value: "12.477309" }, unitId: ids.units.sharesMm, effectiveDate: "2026-07-22", sourceId: ids.sources.secS3, staleAt: "2026-10-31T00:00:00Z" },
    { id: ids.facts.rsus, label: "Unvested RSUs identified in S-3", value: { type: "decimal", value: "0.923776" }, unitId: ids.units.sharesMm, effectiveDate: "2026-07-22", sourceId: ids.sources.secS3, staleAt: "2026-10-31T00:00:00Z" },
    { id: ids.facts.price, label: "NRXS intraday share-price snapshot at 13:36:28 UTC", value: { type: "decimal", value: String(modelValues.market) }, unitId: ids.units.usdPerShare, effectiveDate: "2026-07-30", sourceId: ids.sources.market, staleAt: "2026-07-31T00:00:00Z" },
  ],
  assumptions: [
    {
      id: ids.assumptions.common,
      label: "Common FCFF and equity-bridge policy",
      value: { type: "string", value: "Fifteen-year FCFF; $43.16m opening federal NOL with an 80% taxable-income limitation and no separately capitalized DTA; 21% cash tax thereafter; D&A 1.5% of revenue; capex 2.0%; NWC 5.0% of revenue change; March cash and notes; negative FCFF remains in operating enterprise value while scenario financing proceeds are added once to post-money equity and create new shares at externally fixed issue prices; no value for unapproved indications." },
      effectiveDate: "2026-07-30",
      designation: "analystJudgment",
      reviewBy: "2026-10-31T00:00:00Z",
    },
    {
      id: ids.assumptions.wacc,
      label: "Common WACC",
      value: { type: "decimal", value: "0.19" },
      unitId: ids.units.percentage,
      effectiveDate: "2026-07-30",
      designation: "analystJudgment",
      reviewBy: "2026-10-31T00:00:00Z",
    },
    {
      id: ids.assumptions.terminalGrowth,
      label: "Common terminal growth",
      value: { type: "decimal", value: "0.025" },
      unitId: ids.units.percentage,
      effectiveDate: "2026-07-30",
      designation: "analystJudgment",
      reviewBy: "2026-10-31T00:00:00Z",
    },
    {
      id: ids.assumptions.bearPath,
      label: "Downside operating and financing path",
      value: { type: "string", value: "2026 revenue $6.0m; 2030 revenue $10.7m; mature EBIT margin 10%; $10m financing at $2.50; 23.224m fully diluted shares after financing." },
      effectiveDate: "2026-07-30",
      designation: "analystJudgment",
      reviewBy: "2026-10-31T00:00:00Z",
      scenarioIds: [ids.scenarios.bear],
    },
    {
      id: ids.assumptions.basePath,
      label: "Base operating and financing path",
      value: { type: "string", value: "2026 revenue $7.2m; 2030 revenue $19.5m; mature EBIT margin 23%; $5m financing at $5.00; 20.224m fully diluted shares after financing." },
      effectiveDate: "2026-07-30",
      designation: "analystJudgment",
      reviewBy: "2026-10-31T00:00:00Z",
      scenarioIds: [ids.scenarios.base],
    },
    {
      id: ids.assumptions.bullPath,
      label: "Upside operating and financing path",
      value: { type: "string", value: "2026 revenue $9.2m; 2030 revenue $47.0m; mature EBIT margin 30%; $2m financing at $6.00; 18.237m fully diluted shares after financing." },
      effectiveDate: "2026-07-30",
      designation: "analystJudgment",
      reviewBy: "2026-10-31T00:00:00Z",
      scenarioIds: [ids.scenarios.bull],
    },
    ...[
      ["bearProbability", "Downside probability", "0.3", "bear"],
      ["baseProbability", "Base probability", "0.5", "base"],
      ["bullProbability", "Upside probability", "0.2", "bull"],
    ].map(([key, label, value, scenario]) => ({
      id: ids.assumptions[key],
      label,
      value: { type: "decimal", value },
      unitId: ids.units.percentage,
      effectiveDate: "2026-07-30",
      designation: "analystJudgment",
      reviewBy: "2026-10-31T00:00:00Z",
      scenarioIds: [ids.scenarios[scenario]],
    })),
  ],
  outputs: [
    ...scenarioRows.filter((x) => x.key !== "weighted").map(({ key, label, value }) => ({
      id: ids.outputs[key],
      label: `${label} implied value per share`,
      value: { type: "decimal", value: String(value) },
      unitId: ids.units.usdPerShare,
      asOfDate: "2026-07-30",
      scenarioId: ids.scenarios[key],
      headline: true,
      artifactResourceId: `${base}/resources/model`,
      methodology: "Fifteen-year FCFF DCF for approved commercial operations, common 19% WACC and 2.5% terminal growth, current cash less notes, scenario financing proceeds added once to post-money equity with corresponding new shares, and a zero floor for common equity.",
      attestationId: ids.attestation,
    })),
    {
      id: ids.outputs.weighted,
      label: "Probability-weighted implied value per share",
      value: { type: "decimal", value: String(modelValues.weighted) },
      unitId: ids.units.usdPerShare,
      asOfDate: "2026-07-30",
      scenarioId: ids.scenarios.weighted,
      headline: true,
      artifactResourceId: `${base}/resources/model`,
      methodology: "Thirty percent downside, fifty percent base, and twenty percent upside value per share.",
      attestationId: ids.attestation,
    },
  ],
  lineageEdges: [
    ...["bear", "base", "bull"].flatMap((key) =>
      [...commonFacts, ids.assumptions.common, ids.assumptions.wacc, ids.assumptions.terminalGrowth, ids.assumptions[`${key}Path`]].map((toId) => ({
        fromId: ids.outputs[key],
        toId,
        material: true,
      })),
    ),
    ...[
      ids.outputs.bear,
      ids.outputs.base,
      ids.outputs.bull,
      ids.assumptions.bearProbability,
      ids.assumptions.baseProbability,
      ids.assumptions.bullProbability,
    ].map((toId) => ({
      fromId: ids.outputs.weighted,
      toId,
      material: true,
    })),
  ],
  attestations: [
    {
      id: ids.attestation,
      outputIds: [ids.outputs.bear, ids.outputs.base, ids.outputs.bull, ids.outputs.weighted],
      authorId,
      attestedAt: "2026-07-30T16:00:00Z",
      artifactResourceId: `${base}/resources/model`,
      artifactSha256: modelFile.sha256,
      lineageBasis: "author-declared",
      materialityPolicy: "All sourced opening financial and capital inputs, common FCFF policies, discount and terminal assumptions, scenario operating paths, financing dilution, and scenario probabilities material to the four headline outputs are declared.",
      scope: "Bear, base, bull, and probability-weighted NRXS implied values per share produced by the bound workbook as of 2026-07-30.",
      knownExclusions: [
        "The $6.235 market reference is an intraday secondary snapshot and not an official closing price.",
        "No licensed consensus or time-synchronized normalized peer-estimate dataset was available.",
        "Realized reimbursement, prior-authorization success, active ordering centers, patient starts, repeat utilization, and product-level RED economics are not disclosed.",
        "The July preferred dividend is approximate, the option-for-RSU consummation remains unresolved, and current transfer-agent fully diluted shares were unavailable.",
        "Unapproved indications receive zero value because an evidence-complete indication-level rNPV was unavailable.",
        "Formula recalculation and financial reasonableness were locally reviewed but are outside the OFF structural-conformance claim.",
      ],
      lineageCompleteness: "attested-not-independently-verified",
    },
  ],
};

const manifest = {
  offVersion: "0.1",
  package: {
    id: base,
    releaseId: `${base}/releases/2026-07-30-v1`,
    releaseVersion: "2026-07-30-v1",
    title: "Neuraxis valuation — probability-weighted commercial FCFF",
    authors: [{ id: authorId, name: "Henry Adams" }],
    license: { id: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
    publishedAt: "2026-07-30T16:00:00Z",
    canonicalUrl: "https://github.com/HenryBranchAdams/open-finance-format/tree/main/examples/nrxs-valuation",
    entrypointResourceId: `${base}/resources/narrative`,
  },
  profiles: [profile],
  resources: [
    {
      id: `${base}/resources/narrative`,
      mediaType: "text/markdown",
      roles: ["entrypoint", "narrative"],
      locations: [{ kind: "local", path: "OFF.md" }],
      ...narrativeFile,
    },
    {
      id: `${base}/resources/model`,
      mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      roles: ["model-artifact"],
      locations: [{ kind: "local", path: modelPath }],
      ...modelFile,
    },
    {
      id: `${base}/resources/evidence`,
      mediaType: "text/markdown",
      roles: ["source-evidence"],
      locations: [{ kind: "local", path: "SOURCES.md" }],
      ...evidenceFile,
    },
  ],
  relationships: [
    {
      fromResourceId: `${base}/resources/narrative`,
      relation: "describes",
      toResourceId: `${base}/resources/model`,
    },
    {
      fromResourceId: `${base}/resources/evidence`,
      relation: "supports",
      toResourceId: `${base}/resources/model`,
    },
  ],
  profileData: { [profile]: profileData },
};

await fs.writeFile(path.join(root, "off.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  path: path.join(root, "off.json"),
  modelSha256: modelFile.sha256,
  modelValues,
}));
