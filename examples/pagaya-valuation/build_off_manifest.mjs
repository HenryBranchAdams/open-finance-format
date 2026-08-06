import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const base = "https://openfinanceformat.org/examples/pagaya-valuation";
const profile = "https://openfinanceformat.org/profiles/public-equity-research/0.1";
const modelPath = "outputs/2026-07-30-q2-refresh/pagaya-valuation-model.xlsx";

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

const ids = {
  security: `${base}/entities/security/pgy`,
  units: {
    usdMm: `${base}/entities/unit/usd-mm`,
    usdBn: `${base}/entities/unit/usd-bn`,
    usdPerShare: `${base}/entities/unit/usd-per-share`,
    sharesMm: `${base}/entities/unit/shares-mm`,
    percentage: `${base}/entities/unit/percentage`,
  },
  scenarios: {
    bear: `${base}/entities/scenario/bear`,
    base: `${base}/entities/scenario/base`,
    bull: `${base}/entities/scenario/bull`,
  },
  sources: {
    sec: `${base}/entities/source/sec`,
    q1: `${base}/entities/source/q1-2026`,
    q2: `${base}/entities/source/q2-2026`,
    market: `${base}/entities/source/market`,
  },
  facts: {
    networkVolume: `${base}/entities/fact/network-volume-2025`,
    frlpc: `${base}/entities/fact/frlpc-2025`,
    q2FrlpcRate: `${base}/entities/fact/q2-frlpc-rate`,
    fy2026NetworkVolumeMidpoint: `${base}/entities/fact/fy2026-network-volume-guidance-midpoint`,
    fy2026NetIncomeMidpoint: `${base}/entities/fact/fy2026-net-income-guidance-midpoint`,
    cash: `${base}/entities/fact/cash`,
    riskInvestments: `${base}/entities/fact/risk-investments`,
    securedBorrowing: `${base}/entities/fact/secured-borrowing`,
    basicShares: `${base}/entities/fact/basic-shares`,
    sharePrice: `${base}/entities/fact/share-price`,
  },
  assumptions: {
    common: `${base}/entities/assumption/common-operating`,
    dilutedShares: `${base}/entities/assumption/diluted-shares`,
    bear: `${base}/entities/assumption/bear-path`,
    base: `${base}/entities/assumption/base-path`,
    bull: `${base}/entities/assumption/bull-path`,
  },
  outputs: {
    bear: `${base}/entities/output/bear-value-per-share`,
    base: `${base}/entities/output/base-value-per-share`,
    bull: `${base}/entities/output/bull-value-per-share`,
  },
  attestation: `${base}/entities/attestation/valuation`,
};

const scenarioRows = [
  {
    key: "bear",
    label: "Downside case",
    role: "bear",
    description: "Network Volume reaches $15.0 billion in 2031, FRLPC fades to 3.9%, and required risk-retention equity is 2.0% of incremental volume.",
    path: "Network Volume $12.5bn,$13.0bn,$13.5bn,$14.0bn,$14.5bn,$15.0bn; FRLPC 4.1%,4.0%,4.0%,3.95%,3.9%,3.9%; normalized net income/FRLPC 30.25%,30.0%,29.5%,29.0%,28.5%,28.0%; required equity/incremental volume 2.0%; cost of equity 16.0%; terminal growth 2.5%",
    value: "10.688537733616583",
  },
  {
    key: "base",
    label: "Base case",
    role: "base",
    description: "Network Volume reaches $21.0 billion in 2031, FRLPC stabilizes at 4.35%, and required risk-retention equity is 1.25% of incremental volume.",
    path: "Network Volume $12.875bn,$14.5bn,$16.2bn,$17.9bn,$19.5bn,$21.0bn; FRLPC 4.3%,4.3%,4.3%,4.35%,4.35%,4.35%; normalized net income/FRLPC 30.25%,32%,34%,36%,37%,38%; required equity/incremental volume 1.25%; cost of equity 14.0%; terminal growth 3.0%",
    value: "23.93434016758543",
  },
  {
    key: "bull",
    label: "Upside case",
    role: "bull",
    description: "Network Volume reaches $24.8 billion in 2031, FRLPC recovers to 4.6%, and required risk-retention equity is 0.75% of incremental volume.",
    path: "Network Volume $13.25bn,$15.4bn,$17.8bn,$20.2bn,$22.6bn,$24.8bn; FRLPC 4.4%,4.45%,4.5%,4.55%,4.6%,4.6%; normalized net income/FRLPC 30.9%,34%,37%,40%,42%,44%; required equity/incremental volume 0.75%; cost of equity 12.5%; terminal growth 3.5%",
    value: "41.65335377687214",
  },
];

const materialFacts = [
  ids.facts.networkVolume,
  ids.facts.frlpc,
  ids.facts.q2FrlpcRate,
  ids.facts.fy2026NetworkVolumeMidpoint,
  ids.facts.fy2026NetIncomeMidpoint,
  ids.facts.cash,
  ids.facts.riskInvestments,
  ids.facts.securedBorrowing,
];

const profileData = {
  securities: [
    {
      id: ids.security,
      issuerName: "Pagaya Technologies Ltd.",
      ticker: "PGY",
      exchange: "XNAS",
      securityType: "common-stock",
      reportingCurrencyUnitId: ids.units.usdMm,
      identifiers: { CIK: "0001883085" },
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
    { id: ids.units.usdBn, label: "US dollars in billions", kind: "custom", symbol: "$bn" },
    { id: ids.units.usdPerShare, label: "US dollars per share", kind: "custom", symbol: "$/share" },
    { id: ids.units.sharesMm, label: "Shares in millions", kind: "shares", symbol: "mm" },
    { id: ids.units.percentage, label: "Percentage expressed as decimal", kind: "percentage", symbol: "%" },
  ],
  sources: [
    {
      id: ids.sources.sec,
      title: "Pagaya FY2025 Form 10-K",
      publisher: "U.S. Securities and Exchange Commission",
      canonicalUrl: "https://www.sec.gov/Archives/edgar/data/1883085/000188308526000018/pgy-20251231.htm",
      evidenceResourceId: `${base}/resources/evidence`,
    },
    {
      id: ids.sources.q1,
      title: "Pagaya Q1 2026 earnings release",
      publisher: "Pagaya Technologies Ltd.",
      canonicalUrl: "https://investor.pagaya.com/static-files/1f38d3e9-6d00-49c7-921d-a6b5be49a276",
      evidenceResourceId: `${base}/resources/evidence`,
    },
    {
      id: ids.sources.market,
      title: "PGY public market-data snapshot",
      publisher: "Public market data",
      canonicalUrl: "https://finance.yahoo.com/quote/PGY/",
      evidenceResourceId: `${base}/resources/evidence`,
    },
    {
      id: ids.sources.q2,
      title: "Pagaya Q2 2026 earnings release",
      publisher: "Pagaya Technologies Ltd. / U.S. Securities and Exchange Commission",
      canonicalUrl: "https://www.sec.gov/Archives/edgar/data/1883085/000188308526000052/earningspressreleasefina.htm",
      evidenceResourceId: `${base}/resources/evidence`,
    },
  ],
  sourceFacts: [
    { id: ids.facts.networkVolume, label: "FY2025 Network Volume", value: { type: "decimal", value: "10.534" }, unitId: ids.units.usdBn, effectiveDate: "2025-12-31", sourceId: ids.sources.sec, staleAt: "2027-03-01T00:00:00Z" },
    { id: ids.facts.frlpc, label: "FY2025 FRLPC", value: { type: "decimal", value: "512.172" }, unitId: ids.units.usdMm, effectiveDate: "2025-12-31", sourceId: ids.sources.sec, staleAt: "2027-03-01T00:00:00Z" },
    { id: ids.facts.q2FrlpcRate, label: "Q2 2026 FRLPC percentage", value: { type: "decimal", value: "0.042" }, unitId: ids.units.percentage, effectiveDate: "2026-06-30", sourceId: ids.sources.q2, staleAt: "2026-11-15T00:00:00Z" },
    { id: ids.facts.fy2026NetworkVolumeMidpoint, label: "FY2026 Network Volume guidance midpoint", value: { type: "decimal", value: "12.875" }, unitId: ids.units.usdBn, effectiveDate: "2026-07-30", sourceId: ids.sources.q2, staleAt: "2026-11-15T00:00:00Z" },
    { id: ids.facts.fy2026NetIncomeMidpoint, label: "FY2026 GAAP net-income guidance midpoint", value: { type: "decimal", value: "167.5" }, unitId: ids.units.usdMm, effectiveDate: "2026-07-30", sourceId: ids.sources.q2, staleAt: "2026-11-15T00:00:00Z" },
    { id: ids.facts.cash, label: "Cash and equivalents", value: { type: "decimal", value: "249.257" }, unitId: ids.units.usdMm, effectiveDate: "2026-06-30", sourceId: ids.sources.q2, staleAt: "2026-11-15T00:00:00Z" },
    { id: ids.facts.riskInvestments, label: "Risk-retention investments", value: { type: "decimal", value: "1040.118" }, unitId: ids.units.usdMm, effectiveDate: "2026-06-30", sourceId: ids.sources.q2, staleAt: "2026-11-15T00:00:00Z" },
    { id: ids.facts.securedBorrowing, label: "Secured borrowing", value: { type: "decimal", value: "252.995" }, unitId: ids.units.usdMm, effectiveDate: "2026-06-30", sourceId: ids.sources.q2, staleAt: "2026-11-15T00:00:00Z" },
    { id: ids.facts.basicShares, label: "Q2 weighted-average basic shares", value: { type: "decimal", value: "83.185" }, unitId: ids.units.sharesMm, effectiveDate: "2026-06-30", sourceId: ids.sources.q2, staleAt: "2026-11-15T00:00:00Z" },
    { id: ids.facts.sharePrice, label: "PGY intraday share-price snapshot at 09:28 CDT", value: { type: "decimal", value: "16.32" }, unitId: ids.units.usdPerShare, effectiveDate: "2026-07-30", sourceId: ids.sources.market, staleAt: "2026-07-31T00:00:00Z" },
  ],
  assumptions: [
    {
      id: ids.assumptions.common,
      label: "Common owner-cash-flow policy",
      value: { type: "string", value: "21% cash tax; D&A 5% of FRLPC; capex 4% of FRLPC; FCFE deducts equity capital required for incremental Network Volume" },
      effectiveDate: "2026-07-30",
      designation: "analystJudgment",
      reviewBy: "2026-10-31T00:00:00Z",
    },
    {
      id: ids.assumptions.dilutedShares,
      label: "Valuation diluted shares",
      value: { type: "decimal", value: "97.25" },
      unitId: ids.units.sharesMm,
      effectiveDate: "2026-07-30",
      designation: "analystJudgment",
      reviewBy: "2026-10-31T00:00:00Z",
    },
    ...scenarioRows.map(({ key, label, path }) => ({
      id: ids.assumptions[key],
      label: `${label} operating and valuation path`,
      value: { type: "string", value: path },
      effectiveDate: "2026-07-30",
      designation: "analystJudgment",
      reviewBy: "2026-10-31T00:00:00Z",
      scenarioIds: [ids.scenarios[key]],
    })),
  ],
  outputs: scenarioRows.map(({ key, label, value }) => ({
    id: ids.outputs[key],
    label: `${label} implied value per share`,
    value: { type: "decimal", value },
    unitId: ids.units.usdPerShare,
    asOfDate: "2026-07-30",
    scenarioId: ids.scenarios[key],
    headline: true,
    artifactResourceId: `${base}/resources/model`,
    methodology: "Six-year equity cash-flow valuation driven by Network Volume, FRLPC, normalized net income, D&A, capex, incremental risk-retention equity, year-end discounting, and a Gordon-growth terminal value.",
    attestationId: ids.attestation,
  })),
  lineageEdges: scenarioRows.flatMap(({ key }) =>
    [...materialFacts, ids.assumptions.common, ids.assumptions.dilutedShares, ids.assumptions[key]].map((toId) => ({
      fromId: ids.outputs[key],
      toId,
      material: true,
    })),
  ),
  attestations: [
    {
      id: ids.attestation,
      outputIds: scenarioRows.map(({ key }) => ids.outputs[key]),
      authorId: "https://github.com/HenryBranchAdams",
      attestedAt: "2026-07-30T14:28:51Z",
      artifactResourceId: `${base}/resources/model`,
      artifactSha256: modelFile.sha256,
      lineageBasis: "author-declared",
      materialityPolicy: "All sourced opening operating and capital inputs, common owner-cash-flow policies, diluted-share policy, scenario operating paths, discount rates, and terminal assumptions that materially drive the three headline FCFE outputs are declared.",
      scope: "The three headline implied values per share produced by the Pagaya valuation workbook as of 2026-07-30.",
      knownExclusions: [
        "The independently retrieved share-price snapshot is intraday at 09:28 CDT on 2026-07-30 and is not an official closing price.",
        "No licensed consensus estimates are used in the valuation engine.",
        "Required risk-retention equity and post-2026 operating paths are analyst judgment rather than company guidance.",
        "No Q2 Form 10-Q or official earnings-call transcript was available at refresh time.",
        "The peer snapshot is dated and used only as a corroborative screen.",
        "Lineage is author-declared and has not been independently verified.",
        "The package does not claim cross-engine spreadsheet execution equivalence.",
        "Native Excel accessibility review and print/PDF QA were not performed.",
      ],
      lineageCompleteness: "attested-not-independently-verified",
    },
  ],
};

const manifest = {
  offVersion: "0.1",
  package: {
    id: base,
    releaseId: `${base}/releases/2026-07-30-q2-refresh`,
    releaseVersion: "2026-07-30-q2-refresh",
    title: "Pagaya Technologies valuation — risk-retention FCFE",
    authors: [{ id: "https://github.com/HenryBranchAdams", name: "Henry Adams" }],
    license: { id: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
    publishedAt: "2026-07-30T14:28:51Z",
    canonicalUrl: "https://github.com/HenryBranchAdams/open-finance-format/tree/main/examples/pagaya-valuation",
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
    { fromResourceId: `${base}/resources/narrative`, relation: "describes", toResourceId: `${base}/resources/model` },
    { fromResourceId: `${base}/resources/evidence`, relation: "supports", toResourceId: `${base}/resources/model` },
  ],
  profileData: { [profile]: profileData },
};

await fs.writeFile(path.join(root, "off.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`WROTE=${path.join(root, "off.json")}`);
console.log(`MODEL_SHA256=${modelFile.sha256}`);
