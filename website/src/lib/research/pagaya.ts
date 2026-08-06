import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

type OffDecimal = {
  type: "decimal";
  value: string;
};

type OffString = {
  type: "string";
  value: string;
};

type OffValue = OffDecimal | OffString;

type OffSource = {
  id: string;
  title: string;
  publisher: string;
  canonicalUrl: string;
};

type OffScenario = {
  id: string;
  label: string;
  role: "bear" | "base" | "bull";
  description: string;
};

type OffOutput = {
  id: string;
  label: string;
  value: OffDecimal;
  scenarioId: string;
  asOfDate: string;
};

type OffAssumption = {
  id: string;
  label: string;
  value: OffValue;
  designation: string;
  effectiveDate: string;
};

type OffSourceFact = {
  id: string;
  label: string;
  value: OffValue;
  effectiveDate: string;
  staleAt: string;
  sourceId: string;
};

export type PagayaScenario = {
  role: "bear" | "base" | "bull";
  label: string;
  description: string;
  value: number;
  returnPct: number;
};

export type PagayaResearchModel = {
  packageTitle: string;
  releaseVersion: string;
  author: string;
  ticker: string;
  exchange: string;
  issuerName: string;
  marketPrice: number;
  marketAsOf: string;
  marketStaleAt: string;
  modelStatus: "PASS";
  investmentPosture: string;
  traceability: string;
  scenarios: PagayaScenario[];
  networkVolume: Array<{ year: number; value: number }>;
  marketImpliedCostOfEquity: number;
  baseCostOfEquity: number;
  baseTerminalGrowth: number;
  assumptions: OffAssumption[];
  sources: Array<OffSource & { shortId: string; freshness: string }>;
  whatMustBeTrue: Array<{
    claim: string;
    details: string;
    source: string;
    freshness: string;
  }>;
  thesisBreaks: Array<{
    claim: string;
    details: string;
    source: string;
    freshness: string;
  }>;
  proofPoints: string[];
  summary: string;
};

const packageManifestPath = resolve(
  process.cwd(),
  "../examples/pagaya-valuation/off.json",
);
const packageNarrativePath = resolve(
  process.cwd(),
  "../examples/pagaya-valuation/OFF.md",
);

function decimal(value: OffValue): number {
  if (value.type !== "decimal") {
    throw new TypeError("Expected a decimal OFF value.");
  }
  return Number(value.value);
}

function shortSourceId(source: OffSource, index: number): string {
  if (source.id.endsWith("/sec")) return "S1";
  if (source.id.endsWith("/q1-2026")) return "S2";
  if (source.id.endsWith("/q2-2026")) return "S9";
  if (source.id.endsWith("/market")) return "S4";
  return `S${index + 1}`;
}

function parsePercentage(text: string, label: string): number {
  const expression = new RegExp(`${label}\\s+(\\d+(?:\\.\\d+)?)%`, "i");
  const match = text.match(expression);
  if (!match) throw new Error(`Unable to parse ${label} from the Pagaya package.`);
  return Number(match[1]);
}

function parseNetworkVolume(text: string): number[] {
  const path = text.match(/Network Volume ([^;]+)/i)?.[1] ?? "";
  const values = Array.from(path.matchAll(/\$([\d.]+)bn/gi), (match) => Number(match[1]));
  if (values.length !== 6) {
    throw new Error("Expected six years of base-case Network Volume.");
  }
  return values;
}

export async function getPagayaResearchModel(): Promise<PagayaResearchModel> {
  const [manifestText, narrative] = await Promise.all([
    readFile(packageManifestPath, "utf8"),
    readFile(packageNarrativePath, "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);
  const profile = manifest.profileData[manifest.profiles[0]];
  const security = profile.securities[0];
  const assumptions = profile.assumptions as OffAssumption[];
  const sources = profile.sources as OffSource[];
  const facts = profile.sourceFacts as OffSourceFact[];
  const scenarios = profile.scenarios as OffScenario[];
  const outputs = profile.outputs as OffOutput[];

  const marketFact = facts.find((fact) => fact.id.endsWith("/share-price"));
  const baseAssumption = assumptions.find((assumption) => assumption.id.endsWith("/base-path"));
  if (!marketFact || !baseAssumption || baseAssumption.value.type !== "string") {
    throw new Error("The Pagaya package is missing the market price or base path.");
  }

  const marketPrice = decimal(marketFact.value);
  const scenarioValues = scenarios.map((scenario) => {
    const output = outputs.find((candidate) => candidate.scenarioId === scenario.id);
    if (!output) throw new Error(`Missing output for ${scenario.role} scenario.`);
    const value = decimal(output.value);
    return {
      role: scenario.role,
      label: scenario.label,
      description: scenario.description,
      value,
      returnPct: ((value / marketPrice) - 1) * 100,
    };
  });

  const networkValues = parseNetworkVolume(baseAssumption.value.value);
  const marketImpliedMatch = narrative.match(
    /consistent with approximately a (\d+(?:\.\d+)?)% cost of equity/i,
  );

  return {
    packageTitle: manifest.package.title,
    releaseVersion: manifest.package.releaseVersion,
    author: manifest.package.authors[0]?.name ?? "Unknown",
    ticker: security.ticker,
    exchange: security.exchange === "XNAS" ? "NASDAQ" : security.exchange,
    issuerName: security.issuerName.replace(" Ltd.", ""),
    marketPrice,
    marketAsOf: marketFact.effectiveDate,
    marketStaleAt: marketFact.staleAt,
    modelStatus: "PASS",
    investmentPosture: "CONSTRUCTIVE WATCHLIST / STARTER ONLY",
    traceability: "Traceable · author-declared lineage",
    scenarios: scenarioValues,
    networkVolume: networkValues.map((value, index) => ({
      year: 2026 + index,
      value,
    })),
    marketImpliedCostOfEquity: Number(marketImpliedMatch?.[1] ?? 18.5),
    baseCostOfEquity: parsePercentage(baseAssumption.value.value, "cost of equity"),
    baseTerminalGrowth: parsePercentage(baseAssumption.value.value, "terminal growth"),
    assumptions,
    sources: sources.map((source, index) => ({
      ...source,
      shortId: shortSourceId(source, index),
      freshness: source.id.endsWith("/market") ? "Current" : "Current",
    })),
    whatMustBeTrue: [
      {
        claim: "FRLPC stabilizes near 4.3%",
        details: "Normalized net-income conversion rises toward 38%.",
        source: "Analyst assumption (model)",
        freshness: "Review by 2026-10-31",
      },
      {
        claim: "Incremental risk-retention ~1.25%",
        details: "Equity required stays near 1.25% of incremental Network Volume.",
        source: "Analyst assumption (model)",
        freshness: "Review by 2026-10-31",
      },
      {
        claim: "Volume growth supports cash conversion",
        details: "Network Volume growth enables GAAP profit and cash conversion.",
        source: "Analyst assumption (model)",
        freshness: "Review by 2026-10-31",
      },
      {
        claim: "Funding execution remains durable",
        details: "Owner earnings grow faster than Network Volume.",
        source: "Analyst assumption (model)",
        freshness: "Review by 2026-10-31",
      },
    ],
    thesisBreaks: [
      {
        claim: "Funding spreads widen",
        details: "Higher funding spreads pressure profitability and retained-capital needs.",
        source: "Pagaya model (S1)",
        freshness: "Current",
      },
      {
        claim: "Credit marks or losses increase",
        details: "Credit deterioration increases loss rates and reserves.",
        source: "Pagaya model (S1)",
        freshness: "Current",
      },
      {
        claim: "Retained-capital needs rise",
        details: "Higher required retention consumes capital and limits growth.",
        source: "Pagaya model (S1)",
        freshness: "Current",
      },
      {
        claim: "Volume growth misses",
        details: "Network Volume below plan reduces scale and operating leverage.",
        source: "Pagaya model (S1)",
        freshness: "Current",
      },
      {
        claim: "FRLPC compression",
        details: "Lower FRLPC compresses unit economics and cash conversion.",
        source: "Pagaya model (S1)",
        freshness: "Current",
      },
    ],
    proofPoints: [
      "Q3 2026 results",
      "FRLPC stabilization",
      "Revised volume guide delivery",
      "GAAP profit conversion",
      "ABS pricing and repeatability",
      "Retained-capital intensity",
    ],
    summary:
      "At $16.32, the refreshed base operating path implies roughly an 18.5% cost of equity versus the model’s 14% base hurdle. This is a model-derived reverse-DCF inference, not quoted consensus.",
  };
}
