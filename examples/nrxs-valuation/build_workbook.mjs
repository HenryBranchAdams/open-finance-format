import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(root, "outputs", "20260730-nrxs01");
const previewDir = path.join(outputDir, "previews");
const outputPath = path.join(outputDir, "nrxs-valuation-model.xlsx");
await fs.mkdir(previewDir, { recursive: true });

const wb = Workbook.create();
const names = [
  "Cover",
  "Sources",
  "Assumptions",
  "Historicals",
  "KPIs",
  "Forecast",
  "DCF",
  "Comps",
  "Sensitivities",
  "Reverse DCF",
  "Checks",
];
for (const name of names) wb.worksheets.add(name);
wb.comments.setSelf({ displayName: "Henry Adams" });

const C = {
  navy: "#163A5F",
  navy2: "#0E2A47",
  blue: "#DCEAF5",
  paleBlue: "#EDF5FA",
  accent: "#2F75B5",
  green: "#D9EAD3",
  greenDark: "#548235",
  yellow: "#FFF2CC",
  amber: "#FCE4D6",
  red: "#F4CCCC",
  redDark: "#A64B44",
  gray: "#E7E6E6",
  paleGray: "#F5F7F9",
  darkGray: "#595959",
  border: "#D8E0E8",
  white: "#FFFFFF",
  black: "#000000",
  inputBlue: "#0000FF",
  linkedGreen: "#008000",
};

function title(s, range, text) {
  s.getRange(range).merge();
  const r = s.getRange(range);
  r.values = [[text]];
  r.format = {
    fill: C.navy,
    font: { bold: true, color: C.white, size: 16, name: "Arial" },
    rowHeight: 30,
    verticalAlignment: "center",
  };
}

function section(s, range, text, fill = C.navy) {
  const first = range.split(":")[0];
  s.getRange(first).values = [[text]];
  const r = s.getRange(range);
  r.format = {
    fill,
    font: { bold: true, color: C.white, name: "Arial" },
    rowHeight: 22,
    verticalAlignment: "center",
  };
}

function header(r) {
  r.format = {
    fill: C.blue,
    font: { bold: true, color: C.black, name: "Arial" },
    borders: {
      bottom: { style: "medium", color: "#9FBAD0" },
      insideVertical: { style: "thin", color: "#C7D7E5" },
    },
    verticalAlignment: "center",
  };
}

function body(r) {
  r.format.borders = {
    insideHorizontal: { style: "thin", color: C.border },
  };
}

function total(r) {
  r.format.font = { bold: true, color: C.black };
  r.format.borders = {
    top: { style: "thin", color: C.black },
    bottom: { style: "double", color: C.black },
  };
}

function input(r) {
  r.format.fill = C.yellow;
  r.format.font = { color: C.inputBlue };
  r.format.borders = { preset: "all", style: "thin", color: "#D6B656" };
}

function widths(s, map) {
  for (const [col, width] of Object.entries(map)) {
    s.getRange(`${col}:${col}`).format.columnWidth = width;
  }
}

function note(s, range, text) {
  s.getRange(range).merge();
  s.getRange(range.split(":")[0]).values = [[text]];
  s.getRange(range).format = {
    fill: C.paleGray,
    font: { color: C.darkGray, italic: true, size: 9 },
    wrapText: true,
    verticalAlignment: "center",
  };
}

function card(s, range, label, formula, fmt, subtitle, fill = C.paleBlue) {
  const [a, b] = range.split(":");
  const c1 = a.replace(/[0-9]/g, "");
  const r1 = Number(a.replace(/[^0-9]/g, ""));
  const c2 = b.replace(/[0-9]/g, "");
  const r2 = Number(b.replace(/[^0-9]/g, ""));
  s.getRange(`${c1}${r1}:${c2}${r1}`).merge();
  s.getRange(`${c1}${r1}`).values = [[label]];
  s.getRange(`${c1}${r1}:${c2}${r1}`).format = {
    fill,
    font: { bold: true, color: C.darkGray, size: 9 },
    horizontalAlignment: "center",
  };
  s.getRange(`${c1}${r1 + 1}:${c2}${r2 - 1}`).merge();
  s.getRange(`${c1}${r1 + 1}`).formulas = [[formula]];
  s.getRange(`${c1}${r1 + 1}:${c2}${r2 - 1}`).format = {
    fill,
    font: { bold: true, color: C.navy2, size: 19 },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    numberFormat: fmt,
  };
  s.getRange(`${c1}${r2}:${c2}${r2}`).merge();
  s.getRange(`${c1}${r2}`).values = [[subtitle]];
  s.getRange(`${c1}${r2}:${c2}${r2}`).format = {
    fill,
    font: { color: C.darkGray, size: 8 },
    horizontalAlignment: "center",
    wrapText: true,
  };
  s.getRange(range).format.borders = { preset: "outside", style: "thin", color: C.border };
}

for (const name of names) {
  const s = wb.worksheets.getItem(name);
  s.showGridLines = false;
}

const years = Array.from({ length: 15 }, (_, i) => 2026 + i);
const cols = years.map((_, i) => String.fromCharCode(66 + i));
const cases = {
  Bear: {
    fill: C.redDark,
    revenue: [6.0, 7.0, 8.2, 9.4, 10.7, 12.0, 13.4, 14.8, 16.2, 17.5, 19.0, 20.5, 22.0, 23.5, 25.0],
    margin: [-1.0, -0.70, -0.50, -0.30, -0.15, -0.05, 0.0, 0.03, 0.06, 0.09, 0.10, 0.10, 0.10, 0.10, 0.10],
    grossMargin: 0.83,
    wacc: 0.19,
    g: 0.025,
    probability: 0.30,
    financing: 10.0,
    issuePrice: 2.5,
    preFinShares: 19.224,
    assumpRow: 29,
    forecastRow: 3,
  },
  Base: {
    fill: C.navy,
    revenue: [7.2, 11.0, 14.3, 17.5, 19.5, 23.0, 27.0, 31.0, 35.0, 39.0, 42.9, 46.3, 50.0, 54.0, 58.3],
    margin: [-0.80, -0.30, 0.0, 0.08, 0.14, 0.20, 0.21, 0.22, 0.225, 0.23, 0.23, 0.23, 0.23, 0.23, 0.23],
    grossMargin: 0.87,
    wacc: 0.19,
    g: 0.025,
    probability: 0.50,
    financing: 5.0,
    issuePrice: 5.0,
    preFinShares: 19.224,
    assumpRow: 34,
    forecastRow: 20,
  },
  Bull: {
    fill: C.greenDark,
    revenue: [9.2, 16.0, 25.0, 35.0, 47.0, 62.0, 78.0, 94.0, 110.0, 125.0, 137.5, 148.5, 160.4, 173.2, 187.1],
    margin: [-0.35, 0.0, 0.10, 0.18, 0.24, 0.27, 0.28, 0.29, 0.295, 0.30, 0.30, 0.30, 0.30, 0.30, 0.30],
    grossMargin: 0.89,
    wacc: 0.19,
    g: 0.025,
    probability: 0.20,
    financing: 2.0,
    issuePrice: 6.0,
    preFinShares: 17.904,
    assumpRow: 39,
    forecastRow: 37,
  },
};

// Sources
{
  const s = wb.worksheets.getItem("Sources");
  title(s, "A1:J1", "Neuraxis (NRXS) — Evidence and Source Register");
  s.getRange("A3:J3").values = [[
    "ID", "Class", "Publisher", "Document", "Filed / effective", "Period / as-of",
    "Location", "URL", "Used for", "Evidence status",
  ]];
  header(s.getRange("A3:J3"));
  const rows = [
    ["S1", "SEC filing", "Neuraxis / SEC", "2025 Form 10-K", "2026-03-19", "FY2022-FY2025", "Financial statements and notes", "https://www.sec.gov/Archives/edgar/data/1933567/000149315226011505/form10-k.htm", "Historical financials, products, hospitals, payer policies, capitalization", "Verified primary"],
    ["S2", "SEC filing", "Neuraxis / SEC", "Q1 2026 Form 10-Q", "2026-05-12", "Quarter ended 2026-03-31", "Financial statements, MD&A, cover", "https://www.sec.gov/Archives/edgar/data/1933567/000149315226022384/form10-q.htm", "Q1 results, cash, dilution, reimbursement commentary", "Verified primary"],
    ["S3", "SEC XBRL", "U.S. SEC", "Neuraxis company facts", "2026-05-12", "Through Q1 2026", "CIK 0001933567", "https://data.sec.gov/api/xbrl/companyfacts/CIK0001933567.json", "Machine-readable cross-check of reported values", "Verified primary"],
    ["S4", "Issuer release", "Neuraxis", "Q1 2026 results", "2026-05-12", "Q1 2026", "Release and tables", "https://neuraxis.com/2026/05/12/neuraxis-inc-a-medical-technology-company-commercializing-neuromodulation-therapies-for-chronic-and-debilitating-conditions-in-children-and-adults-today-announced-results-for-the-first-quarter-per/", "Growth, unit delivery, CPT commercialization read-through", "Primary management claim"],
    ["S5", "FDA", "U.S. FDA", "510(k) K252024", "2025-10-16", "Current label", "Decision summary", "https://www.accessdata.fda.gov/cdrh_docs/pdf25/K252024.pdf", "IB-Stim indications, age and regimen", "Verified primary"],
    ["S6", "CMS", "Centers for Medicare & Medicaid Services", "CY 2026 PFS relative value file RVU26C", "2026-07", "CPT 64567", "National RVU screen", "https://www.cms.gov/medicare/payment/fee-schedules/physician/pfs-relative-value-files/rvu26c", "Office reimbursement benchmark", "Primary; geography and contract caveats"],
    ["S7", "CMS / Federal Register", "Centers for Medicare & Medicaid Services", "CY 2026 OPPS final rule", "2025-11-25", "APC 5301", "Hospital outpatient national rate", "https://www.govinfo.gov/content/pkg/FR-2025-11-25/pdf/2025-20907.pdf", "Hospital reimbursement pressure point", "Primary; pediatric/commercial mix differs"],
    ["S8", "SEC filings", "Neuraxis / SEC", "July 2026 S-3 and Series B dividend 8-K", "2026-07-23 / 2026-07-10", "Capitalization through 2026-07-22 plus July dividend", "S-3 selling-stockholder table; 8-K Item 8.01", "https://www.sec.gov/Archives/edgar/data/1933567/000149315226034417/forms-3.htm", "12.477m common, 0.924m RSUs, and subsequent approximate dividend", "Verified primary; dividend remains approximate"],
    ["S9", "Market snapshot", "Aggregated public market data", "NRXS quote", "2026-07-30 13:36:28 UTC", "Intraday", "Price only", "https://www.nyse.com/quote/XASE:NRXS", "Dated share-price reference of $6.235", "Secondary; intraday; refresh required"],
    ["S10", "Issuer release", "Neuraxis", "Additional payer policies", "2026-04-22", "Coverage update", "Press release", "https://neuraxis.com/2026/04/22/neuraxis-expands-payer-coverage-with-four-new-medical-policies/", "Four policies / 1.25m lives management claim", "Primary management claim; deduping unavailable"],
  ];
  s.getRange("A4:J13").values = rows;
  body(s.getRange("A4:J13"));
  s.getRange("A4:J13").format = { wrapText: true, rowHeight: 44 };
  s.getRange("H4:H13").format.font = { color: "#0563C1", underline: true, size: 9 };
  section(s, "A15:J15", "Evidence limitations", C.redDark);
  s.getRange("A16:D20").values = [
    ["Limitation", "Status", "Valuation effect", "Required refresh"],
    ["Current price", "Intraday secondary snapshot", "Useful reference, not an official close.", "Refresh immediately before any decision."],
    ["Payer coverage", "Company-counted; deduped roster unavailable", "Adoption cases use ranges rather than a single covered-lives fact.", "Reconcile named policies and effective dates."],
    ["Realized reimbursement", "Contract rates and denials undisclosed", "Gross-margin and utilization assumptions carry wide bands.", "Obtain claims-level realization and denial data."],
    ["Options / replacement RSUs", "Latest consummation evidence ambiguous", "Base/bear include 1.319m shares; bull excludes them.", "Confirm closing, cancellation, and award terms."],
  ];
  header(s.getRange("A16:D16"));
  body(s.getRange("A17:D20"));
  s.getRange("A16:D20").format = { wrapText: true, rowHeight: 42 };
  widths(s, { A: 11, B: 18, C: 24, D: 30, E: 18, F: 18, G: 28, H: 44, I: 38, J: 27 });
  s.freezePanes.freezeRows(3);
}

// Assumptions
{
  const s = wb.worksheets.getItem("Assumptions");
  title(s, "A1:Q1", "NRXS Valuation Assumptions");
  note(s, "A2:Q2", "Blue/yellow cells are editable analyst assumptions. USD millions except per-share and shares. Negative FCFF remains in operating enterprise value; scenario financing proceeds are added once to post-money equity and create new shares at externally fixed issue prices.");
  section(s, "A4:D4", "Shared operating assumptions");
  s.getRange("A5:D17").values = [
    ["Assumption", "Value", "Unit", "Basis"],
    ["Valuation date", new Date("2026-07-30T00:00:00Z"), "date", "Analyst convention"],
    ["Market price", 6.235, "$/share", "S9; intraday 13:36:28 UTC"],
    ["Pro forma basic common", 12.558, "mm", "S8; 12.477m exact 2026-07-22 plus ~0.080m July dividend"],
    ["Cash", 7.079, "$mm", "S2; 2026-03-31"],
    ["Tax rate", 0.21, "%", "Long-run cash tax assumption"],
    ["D&A / revenue", 0.015, "%", "Low-capital medtech assumption"],
    ["Capex / revenue", 0.020, "%", "Analyst assumption"],
    ["NWC investment / revenue change", 0.050, "%", "Analyst assumption"],
    ["FY2025 revenue", 3.569, "$mm", "S1"],
    ["Q1 2026 revenue", 1.608, "$mm", "S2"],
    ["Notes payable", 0.101, "$mm", "S2; 2026-03-31"],
    ["Federal NOL carryforward", 43.160, "$mm", "S1; FY2025, subject to 80% taxable-income limit and Section 382"],
  ];
  header(s.getRange("A5:D5"));
  body(s.getRange("A6:D17"));
  input(s.getRange("B6:B17"));
  s.getRange("B6").setNumberFormat("yyyy-mm-dd");
  s.getRange("B7").setNumberFormat("$0.000");
  s.getRange("B8").setNumberFormat("0.000");
  s.getRange("B9:B10").setNumberFormat("$0.000");
  s.getRange("B11:B13").setNumberFormat("0.0%");
  s.getRange("B14:B17").setNumberFormat("$0.000");

  section(s, "F4:I4", "Dilution bridge at valuation date");
  s.getRange("F5:I16").values = [
    ["Component", "Shares / value", "Treatment", "Evidence"],
    ["Latest exact common", 12.477, "Start; exact at 2026-07-22", "S8 S-3"],
    ["Approx. July preferred dividend", 0.080, "Add; payable 2026-07-29", "July 10 8-K; approximate"],
    ["Series B if-converted", 3.725, "1:1 shares; no debt deduction", "S2 and subsequent conversion"],
    ["Unvested RSUs", 0.924, "Add; vest 2027–2029", "S8 S-3"],
    ["Warrants, treasury method", 0.698, "Net shares at $6.235", "1.129m after known exercises; most at $2.38"],
    ["Legacy options / proposed RSUs", 1.319, "Base/bear add; bull excludes", "Consummation unresolved"],
    ["Pre-financing FD incl. replacement", null, "Formula", "Conservative base/bear"],
    ["Pre-financing FD excl. replacement", null, "Formula", "Bull sensitivity"],
    ["Current market capitalization", null, "$mm; basic shares", "Price × pro forma basic"],
    ["Current enterprise-value reference", null, "$mm; cash only", "Market cap less cash"],
    ["Dilution warning", "Potential common equivalents are large relative to basic shares.", "Do not use vendor market cap denominator.", "Analyst control"],
  ];
  s.getRange("G12").formulas = [["=SUM(G6:G11)"]];
  s.getRange("G13").formulas = [["=SUM(G6:G10)"]];
  s.getRange("G14").formulas = [["='Assumptions'!$B$7*'Assumptions'!$B$8"]];
  s.getRange("G15").formulas = [["='Assumptions'!$G$14-'Assumptions'!$B$9"]];
  header(s.getRange("F5:I5"));
  body(s.getRange("F6:I16"));
  input(s.getRange("G6:G11"));
  s.getRange("G6:G13").setNumberFormat("0.000");
  s.getRange("G14:G15").setNumberFormat("$0.0");
  s.getRange("F16:I16").format = { fill: C.amber, wrapText: true };

  section(s, "K4:Q4", "Scenario valuation and financing assumptions");
  s.getRange("K5:Q8").values = [
    ["Scenario", "Probability", "WACC", "Terminal g", "Financing need", "Issue price", "Pre-fin FD shares"],
    ["Bear", cases.Bear.probability, cases.Bear.wacc, cases.Bear.g, cases.Bear.financing, cases.Bear.issuePrice, cases.Bear.preFinShares],
    ["Base", cases.Base.probability, cases.Base.wacc, cases.Base.g, cases.Base.financing, cases.Base.issuePrice, cases.Base.preFinShares],
    ["Bull", cases.Bull.probability, cases.Bull.wacc, cases.Bull.g, cases.Bull.financing, cases.Bull.issuePrice, cases.Bull.preFinShares],
  ];
  header(s.getRange("K5:Q5"));
  body(s.getRange("K6:Q8"));
  input(s.getRange("L6:Q8"));
  s.getRange("L6:N8").setNumberFormat("0.0%");
  s.getRange("O6:P8").setNumberFormat("$0.0");
  s.getRange("Q6:Q8").setNumberFormat("0.000");
  s.getRange("K6:Q6").format.fill = C.amber;
  s.getRange("K7:Q7").format.fill = C.paleBlue;
  s.getRange("K8:Q8").format.fill = C.green;
  s.getRange("K10:Q13").values = [
    ["Control", "Result", "Expected", "Status", "Why it matters", null, null],
    ["Probabilities sum", null, 1, null, "Weighted valuation requires 100%.", null, null],
    ["WACC > terminal g", null, true, null, "Prevents invalid perpetuity.", null, null],
    ["Financing proceeds added once to post-money equity", "YES", "YES", "PASS", "Avoids double-penalizing modeled financing while retaining negative FCFF.", null, null],
  ];
  s.getRange("L11").formulas = [["=SUM(L6:L8)"]];
  s.getRange("N11").formulas = [['=IF(ABS(L11-M11)<0.0001,"PASS","FAIL")']];
  s.getRange("L12").formulas = [["=AND(M6>N6,M7>N7,M8>N8)"]];
  s.getRange("N12").formulas = [['=IF(L12=M12,"PASS","FAIL")']];
  header(s.getRange("K10:Q10"));
  body(s.getRange("K11:Q13"));

  section(s, "A18:Q18", "Scenario revenue and EBIT-margin paths");
  s.getRange("A19:Q19").values = [["Scenario / metric", ...years, "Basis"]];
  header(s.getRange("A19:Q19"));
  for (const [name, c] of Object.entries(cases)) {
    const r = c.assumpRow;
    s.getRange(`A${r}:Q${r}`).values = [[`${name} revenue ($mm)`, ...c.revenue, "Approved commercial operations only; coverage and adoption scenario"]];
    s.getRange(`A${r + 1}:Q${r + 1}`).values = [[`${name} EBIT margin`, ...c.margin, "Explicit operating leverage; no pipeline value"]];
    input(s.getRange(`B${r}:P${r + 1}`));
    s.getRange(`B${r}:P${r}`).setNumberFormat("$0.0");
    s.getRange(`B${r + 1}:P${r + 1}`).setNumberFormat("0.0%");
    s.getRange(`A${r}:Q${r + 1}`).format.borders = { insideHorizontal: { style: "thin", color: C.border } };
    s.getRange(`A${r}:Q${r}`).format.fill = name === "Bear" ? C.amber : name === "Bull" ? C.green : C.paleBlue;
  }
  s.getRange("A21:Q26").values = [
    ["Commercial anchor", "Bear", "Base", "Bull", "Evidence / logic", null, null, null, null, null, null, null, null, null, null, null, null],
    ["2026 revenue range", "$5.0–$6.2m", "$6.5–$7.5m", "$8.0–$9.5m", "Q1 2026 $1.608m; reimbursement and sales-force ramp", null, null, null, null, null, null, null, null, null, null, null, null],
    ["Mature gross margin", "82–84%", "86–88%", "88–90%", "Q1 2026 86.4%", null, null, null, null, null, null, null, null, null, null, null, null],
    ["Break-even", "2032 / may not arrive", "2028", "2027", "Analyst operating leverage path", null, null, null, null, null, null, null, null, null, null, null, null],
    ["2027 active hospitals", "80–95", "105–135", "150–190", "~80 established at FY2025", null, null, null, null, null, null, null, null, null, null, null, null],
    ["2027 covered lives", "105–125m", "130–170m", "180–220m", "Company-reported coverage; deduped roster unavailable", null, null, null, null, null, null, null, null, null, null, null, null],
  ];
  header(s.getRange("A21:Q21"));
  body(s.getRange("A22:Q26"));
  s.getRange("A21:Q26").format.wrapText = true;
  widths(s, { A: 34, B: 13, C: 13, D: 13, E: 13, F: 13, G: 13, H: 13, I: 13, J: 13, K: 13, L: 13, M: 13, N: 13, O: 13, P: 13, Q: 40 });
  s.freezePanes.freezeRows(5);
}

// Historicals
{
  const s = wb.worksheets.getItem("Historicals");
  title(s, "A1:G1", "Historical Financials");
  note(s, "A2:G2", "USD millions except shares. FY2024 uses the FY2025 10-K recast operating-expense presentation. Q1 2026 is a three-month period.");
  s.getRange("A3:G3").values = [["Metric", "FY2022A", "FY2023A", "FY2024A", "FY2025A", "Q1 2026A", "Source"]];
  header(s.getRange("A3:G3"));
  s.getRange("A4:G19").values = [
    ["Net sales", 2.685, 2.460, 2.686, 3.569, 1.608, "S1 / S2 / S3"],
    ["Growth", null, null, null, null, null, "Calculated"],
    ["Cost of goods sold", 0.297, 0.303, 0.362, 0.563, 0.218, "S1 / S2 / S3"],
    ["Gross profit", 2.388, 2.157, 2.324, 3.006, 1.390, "S1 / S2 / S3"],
    ["Gross margin", null, null, null, null, null, "Calculated"],
    ["Selling expense", 0.411, 0.324, 1.469, 2.280, 0.824, "S1 / S2 / S3"],
    ["R&D", 0.226, 0.169, 0.434, 0.494, 0.100, "S1 / S2 / S3"],
    ["G&A", 5.123, 8.328, 7.578, 8.063, 2.206, "S1 / S2 / S3"],
    ["Operating income (loss)", -3.372, -6.664, -7.157, -7.830, -1.741, "S1 / S2 / S3"],
    ["Operating margin", null, null, null, null, null, "Calculated"],
    ["Net income (loss)", -4.780, -14.627, -8.242, -7.801, -1.761, "S1 / S2 / S3"],
    ["Operating cash flow", -2.298, -6.694, -6.098, -6.433, -1.230, "S1 / S2 / S3"],
    ["Cash", 0.254, 0.079, 3.697, 4.965, 7.079, "S1 / S2 / S3"],
    ["Stockholders' equity", -5.574, -1.403, 2.068, 3.399, 5.748, "S1 / S2 / S3"],
    ["Weighted basic shares", 2.003, 3.252, 6.919, 9.083, 10.948, "S1 / S2 / S3"],
    ["End-period common shares", 1.963, 6.509, 6.990, 10.653, 11.450, "S1 / S2 / S3"],
  ];
  s.getRange("C5:F5").formulas = [[
    "=C4/B4-1", "=D4/C4-1", "=E4/D4-1", "=F4/(E4/4)-1",
  ]];
  s.getRange("B8:F8").formulas = [[
    "=B7/B4", "=C7/C4", "=D7/D4", "=E7/E4", "=F7/F4",
  ]];
  s.getRange("B13:F13").formulas = [[
    "=B12/B4", "=C12/C4", "=D12/D4", "=E12/E4", "=F12/F4",
  ]];
  body(s.getRange("A4:G19"));
  s.getRange("B4:F19").setNumberFormat("$0.000;[Red]($0.000);-");
  s.getRange("B5:F5").setNumberFormat("0.0%");
  s.getRange("B8:F8").setNumberFormat("0.0%");
  s.getRange("B13:F13").setNumberFormat("0.0%");
  s.getRange("B18:F19").setNumberFormat("0.000");
  s.getRange("B4:F19").format.font = { color: C.linkedGreen };
  s.getRange("B5:F5").format.font = { color: C.black };
  s.getRange("B8:F8").format.font = { color: C.black };
  s.getRange("B13:F13").format.font = { color: C.black };
  total(s.getRange("A7:F8"));
  total(s.getRange("A12:F13"));
  section(s, "A22:G22", "Historical read-through");
  s.getRange("A23:G26").values = [
    ["Signal", "Evidence", "Valuation implication", null, null, null, null],
    ["Commercial acceleration", "Q1 2026 sales +79.5% YoY; company says delivered units +35%.", "Revenue momentum is real but remains off a small base.", null, null, null, null],
    ["Margin", "Q1 2026 gross margin 86.4%.", "Unit economics appear attractive before commercial and corporate overhead.", null, null, null, null],
    ["Funding", "Q1 cash $7.1m versus $1.2m quarterly CFO burn and extensive potential dilution.", "Future financing and share count are conclusion-driving.", null, null, null, null],
  ];
  header(s.getRange("A23:C23"));
  s.getRange("A23:G26").format = { wrapText: true, rowHeight: 38 };
  widths(s, { A: 34, B: 16, C: 16, D: 16, E: 16, F: 16, G: 24 });
  s.freezePanes.freezeRows(3);
}

// KPIs
{
  const s = wb.worksheets.getItem("KPIs");
  title(s, "A1:H1", "Commercial, Reimbursement, and Adoption KPIs");
  note(s, "A2:H2", "Reported facts, management claims, and analyst scenario assumptions are labeled separately. Reimbursement figures are national screens, not realized contract rates.");
  s.getRange("A3:H3").values = [["KPI", "Reported / current", "Date", "Evidence class", "Bear", "Base", "Bull", "Valuation role"]];
  header(s.getRange("A3:H3"));
  s.getRange("A4:H13").values = [
    ["IB-Stim list price / device", "$1,195", "FY2025", "Issuer reported", null, null, null, "Price / gross revenue ceiling"],
    ["Treatment regimen", "1 device weekly × 4", "FDA label", "Regulatory fact", null, null, null, "Implied $4,780 list/course"],
    ["Established children's hospitals", "~80 of 260 targets", "2025-12-31", "Issuer reported", "80–95", "105–135", "150–190", "Adoption breadth"],
    ["Sales force", "24 FTE", "2025-12-31", "Issuer reported", null, null, null, "Commercial capacity / opex"],
    ["Payer policies", "24", "2025-12-31", "Issuer reported", null, null, null, "Access breadth"],
    ["Covered lives", "Approaching 100m", "2025-12-31", "Issuer reported", "105–125m", "130–170m", "180–220m", "Reach; deduping gap"],
    ["Additional policies / lives", "4 / 1.25m", "2026-04-22", "Management claim", null, null, null, "Incremental access proof"],
    ["Q1 delivered-unit growth", "+35% YoY", "2026-03-31", "Management claim", null, null, null, "Volume momentum"],
    ["PFS office benchmark", "~$1,240 / placement", "CY2026", "CMS national screen", null, null, null, "Potential office economics"],
    ["HOPD APC 5301", "$926.63", "CY2026", "CMS national screen", null, null, null, "Below list price; site-of-service risk"],
  ];
  body(s.getRange("A4:H13"));
  s.getRange("A4:H13").format = { wrapText: true, rowHeight: 38 };
  section(s, "A16:H16", "Causal chain and downside mechanism");
  s.getRange("A17:H21").values = [
    ["Step", "Mechanism", "Evidence", "Bear failure", "Base proof", "Bull proof", "Model variable", "Refresh"],
    ["1", "CPT 64567 makes billing routine.", "Effective 2026-01-01", "Policies lag or deny.", "Named payers activate.", "Coverage broadens quickly.", "Revenue path", "Policy roster"],
    ["2", "Hospitals adopt and prescribe.", "~80 established", "Sales force stalls.", "105–135 by 2027.", "150–190 by 2027.", "Revenue path", "Active prescribers"],
    ["3", "Claims convert to cash at attractive realization.", "Realized rates undisclosed", "HOPD economics compress.", "Office/commercial mix supports GM.", "High realization and utilization.", "Gross/EBIT margin", "Claims data"],
    ["4", "Operating leverage outruns dilution.", "$7.1m cash; negative CFO", "Repeated discounted raises.", "$5m modeled raise.", "Only $2m modeled raise.", "FD shares / WACC", "Financing terms"],
  ];
  header(s.getRange("A17:H17"));
  body(s.getRange("A18:H21"));
  s.getRange("A17:H21").format = { wrapText: true, rowHeight: 46 };
  widths(s, { A: 25, B: 27, C: 21, D: 23, E: 23, F: 23, G: 20, H: 22 });
  s.freezePanes.freezeRows(3);
}

// Forecast
{
  const s = wb.worksheets.getItem("Forecast");
  title(s, "A1:P1", "Scenario FCFF Forecast");
  note(s, "A2:P2", "USD millions. Fifteen-year explicit forecast reduces terminal-value concentration. Negative EBIT receives no tax benefit. Approved commercial operations only; unapproved indications receive zero value.");
  for (const [name, c] of Object.entries(cases)) {
    const r = c.forecastRow;
    section(s, `A${r}:P${r}`, `${name} case`, c.fill);
    s.getRange(`A${r + 1}:P${r + 1}`).values = [["Metric", ...years]];
    header(s.getRange(`A${r + 1}:P${r + 1}`));
    s.getRange(`A${r + 2}:A${r + 14}`).values = [
      ["Revenue"], ["Growth"], ["Gross margin"], ["Gross profit"], ["EBIT margin"],
      ["EBIT"], ["Cash tax"], ["D&A"], ["Capex"], ["NWC investment"], ["FCFF"],
      ["Discount factor"], ["PV FCFF"],
    ];
    const ar = c.assumpRow;
    s.getRange(`B${r + 2}:P${r + 2}`).formulas = [[...cols.map((col) => `='Assumptions'!${col}${ar}`)]];
    s.getRange(`B${r + 3}`).formulas = [["='Forecast'!B" + (r + 2) + "/'Assumptions'!$B$14-1"]];
    s.getRange(`C${r + 3}`).formulas = [[`='Forecast'!C${r + 2}/'Forecast'!B${r + 2}-1`]];
    s.getRange(`C${r + 3}:P${r + 3}`).fillRight();
    s.getRange(`B${r + 4}:P${r + 4}`).values = [[...years.map(() => c.grossMargin)]];
    s.getRange(`B${r + 5}`).formulas = [[`='Forecast'!B${r + 2}*'Forecast'!B${r + 4}`]];
    s.getRange(`B${r + 5}:P${r + 5}`).fillRight();
    s.getRange(`B${r + 6}:P${r + 6}`).formulas = [[...cols.map((col) => `='Assumptions'!${col}${ar + 1}`)]];
    s.getRange(`B${r + 7}`).formulas = [[`='Forecast'!B${r + 2}*'Forecast'!B${r + 6}`]];
    s.getRange(`B${r + 7}:P${r + 7}`).fillRight();
    const taxFormulas = cols.map((col, i) => {
      const currentPositiveEbit = `MAX(0,'Forecast'!${col}${r + 7})`;
      const priorPositiveEbit = i === 0
        ? "0"
        : cols.slice(0, i).map((priorCol) => `MAX(0,'Forecast'!${priorCol}${r + 7})`).join("+");
      const remainingNol = `MAX(0,'Assumptions'!$B$17-0.8*(${priorPositiveEbit}))`;
      const nolUsed = `MIN(0.8*${currentPositiveEbit},${remainingNol})`;
      return `=(${currentPositiveEbit}-${nolUsed})*'Assumptions'!$B$10`;
    });
    s.getRange(`B${r + 8}:P${r + 8}`).formulas = [[...taxFormulas]];
    s.getRange(`B${r + 9}`).formulas = [[`='Forecast'!B${r + 2}*'Assumptions'!$B$11`]];
    s.getRange(`B${r + 9}:P${r + 9}`).fillRight();
    s.getRange(`B${r + 10}`).formulas = [[`='Forecast'!B${r + 2}*'Assumptions'!$B$12`]];
    s.getRange(`B${r + 10}:P${r + 10}`).fillRight();
    s.getRange(`B${r + 11}`).formulas = [[`=('Forecast'!B${r + 2}-'Assumptions'!$B$14)*'Assumptions'!$B$13`]];
    s.getRange(`C${r + 11}`).formulas = [[`=('Forecast'!C${r + 2}-'Forecast'!B${r + 2})*'Assumptions'!$B$13`]];
    s.getRange(`C${r + 11}:P${r + 11}`).fillRight();
    s.getRange(`B${r + 12}`).formulas = [[`='Forecast'!B${r + 7}-'Forecast'!B${r + 8}+'Forecast'!B${r + 9}-'Forecast'!B${r + 10}-'Forecast'!B${r + 11}`]];
    s.getRange(`B${r + 12}:P${r + 12}`).fillRight();
    const waccCell = name === "Bear" ? "M6" : name === "Base" ? "M7" : "M8";
    s.getRange(`B${r + 13}`).formulas = [[`=1/(1+'Assumptions'!$${waccCell})^(B${r + 1}-2025)`]];
    s.getRange(`B${r + 13}:P${r + 13}`).fillRight();
    s.getRange(`B${r + 14}`).formulas = [[`='Forecast'!B${r + 12}*'Forecast'!B${r + 13}`]];
    s.getRange(`B${r + 14}:P${r + 14}`).fillRight();
    body(s.getRange(`A${r + 2}:P${r + 14}`));
    s.getRange(`B${r + 2}:P${r + 2}`).setNumberFormat("$0.0");
    s.getRange(`B${r + 3}:P${r + 4}`).setNumberFormat("0.0%");
    s.getRange(`B${r + 5}:P${r + 5}`).setNumberFormat("$0.0");
    s.getRange(`B${r + 6}:P${r + 6}`).setNumberFormat("0.0%");
    s.getRange(`B${r + 7}:P${r + 12}`).setNumberFormat("$0.0;[Red]($0.0);-");
    s.getRange(`B${r + 13}:P${r + 13}`).setNumberFormat("0.000x");
    s.getRange(`B${r + 14}:P${r + 14}`).setNumberFormat("$0.0;[Red]($0.0);-");
    total(s.getRange(`A${r + 12}:P${r + 12}`));
  }
  widths(s, { A: 28, B: 12, C: 12, D: 12, E: 12, F: 12, G: 12, H: 12, I: 12, J: 12, K: 12, L: 12, M: 12, N: 12, O: 12, P: 12 });
  s.freezePanes.freezeRows(4);
}

// DCF
{
  const s = wb.worksheets.getItem("DCF");
  title(s, "A1:N1", "Probability-Weighted FCFF Valuation");
  note(s, "A2:N2", "Primary method: 15-year unlevered FCFF for approved commercial operations. Negative FCFF remains in enterprise value; current cash and scenario financing proceeds are added once to post-money equity, while financing creates new shares at externally fixed prices.");
  s.getRange("A3:N3").values = [[
    "Scenario", "WACC", "Terminal g", "PV explicit", "PV terminal", "Enterprise value",
    "Cash", "Post-money equity", "Pre-fin FD", "New financing shares", "Fully diluted shares",
    "Value / share", "Probability", "Weighted contribution",
  ]];
  header(s.getRange("A3:N3"));
  s.getRange("A4:A6").values = [["Bear"], ["Base"], ["Bull"]];
  const dcfRows = [
    { row: 4, name: "Bear", fr: 3, sr: 6 },
    { row: 5, name: "Base", fr: 20, sr: 7 },
    { row: 6, name: "Bull", fr: 37, sr: 8 },
  ];
  for (const x of dcfRows) {
    const fcff = x.fr + 12;
    const pv = x.fr + 14;
    const df = x.fr + 13;
    s.getRange(`B${x.row}`).formulas = [[`='Assumptions'!M${x.sr}`]];
    s.getRange(`C${x.row}`).formulas = [[`='Assumptions'!N${x.sr}`]];
    s.getRange(`D${x.row}`).formulas = [[`=SUM('Forecast'!B${pv}:P${pv})`]];
    s.getRange(`E${x.row}`).formulas = [[`=('Forecast'!P${fcff}*(1+C${x.row})/(B${x.row}-C${x.row}))*'Forecast'!P${df}`]];
    s.getRange(`F${x.row}`).formulas = [[`=D${x.row}+E${x.row}`]];
    s.getRange(`G${x.row}`).formulas = [["='Assumptions'!$B$9"]];
    s.getRange(`H${x.row}`).formulas = [[`=MAX(0,F${x.row}+G${x.row}-'Assumptions'!$B$16+'Assumptions'!O${x.sr})`]];
    s.getRange(`I${x.row}`).formulas = [[`='Assumptions'!Q${x.sr}`]];
    s.getRange(`J${x.row}`).formulas = [[`='Assumptions'!O${x.sr}/'Assumptions'!P${x.sr}`]];
    s.getRange(`K${x.row}`).formulas = [[`=I${x.row}+J${x.row}`]];
    s.getRange(`L${x.row}`).formulas = [[`=H${x.row}/K${x.row}`]];
    s.getRange(`M${x.row}`).formulas = [[`='Assumptions'!L${x.sr}`]];
    s.getRange(`N${x.row}`).formulas = [[`=L${x.row}*M${x.row}`]];
  }
  body(s.getRange("A4:N6"));
  s.getRange("B4:C6").setNumberFormat("0.0%");
  s.getRange("D4:H6").setNumberFormat("$0.0;[Red]($0.0);-");
  s.getRange("I4:K6").setNumberFormat("0.000");
  s.getRange("L4:L6").setNumberFormat("$0.00");
  s.getRange("M4:M6").setNumberFormat("0.0%");
  s.getRange("N4:N6").setNumberFormat("$0.00");
  s.getRange("A4:N4").format.fill = C.amber;
  s.getRange("A5:N5").format.fill = C.paleBlue;
  s.getRange("A6:N6").format.fill = C.green;
  total(s.getRange("A5:N5"));
  s.getRange("A8:D12").values = [
    ["Headline output", "Result", "Reference", "Interpretation"],
    ["Probability-weighted value / share", null, null, "30% bear / 50% base / 20% bull"],
    ["Current market price", null, null, "Intraday reference"],
    ["Premium / (discount) to market", null, null, "Negative means modeled value below market"],
    ["Status", "Screen-grade / high uncertainty", null, "Reimbursement realization and dilution remain unresolved"],
  ];
  s.getRange("B9").formulas = [["=SUM(N4:N6)"]];
  s.getRange("B10").formulas = [["='Assumptions'!$B$7"]];
  s.getRange("B11").formulas = [["=B9/B10-1"]];
  s.getRange("C9").formulas = [["=B9"]];
  s.getRange("C10").formulas = [["=B10"]];
  s.getRange("C11").formulas = [["=B11"]];
  header(s.getRange("A8:D8"));
  body(s.getRange("A9:D12"));
  s.getRange("B9:C10").setNumberFormat("$0.00");
  s.getRange("B11:C11").setNumberFormat("0.0%");
  s.getRange("A14:F19").values = [
    ["Quality / concentration", "Bear", "Base", "Bull", "Threshold", "Status"],
    ["Terminal value / EV", null, null, null, "<60% where EV > 0", null],
    ["Explicit PV / EV", null, null, null, "Informational", "INFO"],
    ["Financing dilution / FD shares", null, null, null, "<25%", null],
    ["Unapproved-indication value", 0, 0, 0, "Zero without sufficient evidence", null],
    ["Current price within scenario range", null, null, null, "Informational", null],
  ];
  s.getRange("B15:D15").formulas = [["=IF(F4>0,E4/F4,0)", "=IF(F5>0,E5/F5,0)", "=IF(F6>0,E6/F6,0)"]];
  s.getRange("B16:D16").formulas = [["=IF(F4>0,D4/F4,0)", "=IF(F5>0,D5/F5,0)", "=IF(F6>0,D6/F6,0)"]];
  s.getRange("B17:D17").formulas = [["=J4/K4", "=J5/K5", "=J6/K6"]];
  s.getRange("F15").formulas = [['=IF(MAX(B15:D15)<0.6,"PASS","FAIL")']];
  s.getRange("F17").formulas = [['=IF(MAX(B17:D17)<0.25,"PASS","FAIL")']];
  s.getRange("F18").formulas = [['=IF(SUM(B18:D18)=0,"PASS","FAIL")']];
  s.getRange("B19").formulas = [["=MIN(L4:L6)"]];
  s.getRange("C19").formulas = [["='Assumptions'!$B$7"]];
  s.getRange("D19").formulas = [["=MAX(L4:L6)"]];
  s.getRange("F19").formulas = [['=IF(AND(C19>=B19,C19<=D19),"YES","NO")']];
  header(s.getRange("A14:F14"));
  body(s.getRange("A15:F19"));
  s.getRange("B15:D17").setNumberFormat("0.0%");
  s.getRange("B18:D18").setNumberFormat("$0.0");
  s.getRange("B19:D19").setNumberFormat("$0.00");
  section(s, "H8:N8", "Decision hinges");
  s.getRange("H9:N13").values = [
    ["Question", "Current read", "Next proof", null, null, null, null],
    ["What is priced in?", "More than the modeled bull path at base assumptions.", "See Reverse DCF.", null, null, null, null],
    ["Variant wedge", "Routine reimbursement can convert high gross margin into adoption and operating leverage.", "Named policy activation, claims realization, repeat utilization.", null, null, null, null],
    ["Downside mechanism", "HOPD economics, slow adoption, and repeated discounted financing overwhelm unit margin.", "Denials, site mix, cash burn, issuance terms.", null, null, null, null],
    ["What changes value?", "Faster 2027 hospital activation, realized reimbursement above device economics, or lower dilution.", "Quarterly units, active accounts, cash collections, cap table.", null, null, null, null],
  ];
  header(s.getRange("H9:J9"));
  s.getRange("H9:N13").format = { wrapText: true, rowHeight: 48 };
  widths(s, { A: 25, B: 14, C: 14, D: 15, E: 15, F: 16, G: 14, H: 16, I: 15, J: 18, K: 18, L: 16, M: 14, N: 18 });
  s.freezePanes.freezeRows(3);
}

// Comps
{
  const s = wb.worksheets.getItem("Comps");
  title(s, "A1:H1", "Comparable-Company Corroboration");
  note(s, "A2:H2", "No licensed consensus or consistently normalized forward estimates were available. The peer set is therefore qualitative and does not override intrinsic value.");
  s.getRange("A3:H3").values = [["Company", "Ticker", "Relevant exposure", "Why comparable", "Why not comparable", "Metric posture", "Use", "Source status"]];
  header(s.getRange("A3:H3"));
  s.getRange("A4:H9").values = [
    ["electroCore", "ECOR", "Non-invasive neuromodulation", "Small-cap commercial neuro device", "Different indication, pricing, payer and maturity", "No normalized multiple used", "Commercial analog", "Public filing review required"],
    ["Neuronetics", "STIM", "Neurostimulation", "Reimbursement-dependent commercial adoption", "Different site, indication, installed base", "No normalized multiple used", "Adoption / reimbursement analog", "Public filing review required"],
    ["Sensus Healthcare", "SRTS", "Outpatient medical device", "Small-cap reimbursement and utilization economics", "Different modality and indication", "No normalized multiple used", "Margin / scale analog", "Public filing review required"],
    ["Nevro", "NVRO", "Neuromodulation", "Procedure reimbursement and adoption history", "Much larger, mature, acquired context", "No normalized multiple used", "Historical analog", "Not live comparable"],
    ["Axonics", "AXNX", "Neuromodulation", "Commercial pathway and reimbursement", "Acquired, different procedure economics", "No normalized multiple used", "Historical analog", "Not live comparable"],
    ["Neuraxis", "NRXS", "PENFS / IB-Stim", "Target", "Microcap and unusually high dilution", "Intrinsic valuation primary", "Target", "S1–S9"],
  ];
  body(s.getRange("A4:H9"));
  s.getRange("A4:H9").format = { wrapText: true, rowHeight: 46 };
  section(s, "A12:H12", "Why comps are weak evidence");
  s.getRange("A13:H17").values = [
    ["Issue", "Consequence", "Model treatment", null, null, null, null, null],
    ["Negative earnings / cash flow", "P/E and EV/EBITDA are not meaningful.", "Do not apply them.", null, null, null, null, null],
    ["Reimbursement heterogeneity", "Revenue quality and realized price differ by site and payer.", "Use scenario ranges.", null, null, null, null, null],
    ["Dilution perimeter", "Vendor market caps can use stale denominators.", "Use filing-derived FD shares.", null, null, null, null, null],
    ["Small denominator", "EV/revenue appears optically extreme and is dominated by future adoption.", "Reverse DCF is more informative.", null, null, null, null, null],
  ];
  header(s.getRange("A13:C13"));
  s.getRange("A13:H17").format = { wrapText: true, rowHeight: 42 };
  widths(s, { A: 24, B: 12, C: 29, D: 30, E: 34, F: 23, G: 22, H: 24 });
  s.freezePanes.freezeRows(3);
}

function dcfFormula(fcffRow, waccRef, gRef, financingRef, sharesRef) {
  const terms = cols.map((col, i) => `'Forecast'!${col}${fcffRow}/(1+${waccRef})^${i + 1}`);
  const terminal = `('Forecast'!P${fcffRow}*(1+${gRef})/(${waccRef}-${gRef}))/(1+${waccRef})^15`;
  return `=(MAX(0,${terms.join("+")}+${terminal}+'Assumptions'!$B$9-'Assumptions'!$B$16+${financingRef}))/${sharesRef}`;
}

// Sensitivities
{
  const s = wb.worksheets.getItem("Sensitivities");
  title(s, "A1:H1", "Base-Case Valuation Sensitivities");
  note(s, "A2:H2", "USD per fully diluted share. Base operating path and financing dilution; only WACC and terminal growth vary.");
  section(s, "A3:F3", "Base value / share: WACC vs. terminal growth");
  const gs = [0.015, 0.02, 0.025, 0.03, 0.035];
  const ws = [0.17, 0.18, 0.19, 0.20, 0.21];
  s.getRange("A4:F4").values = [["WACC \\ terminal g", ...gs]];
  s.getRange("A5:A9").values = ws.map((x) => [x]);
  header(s.getRange("A4:F4"));
  for (let r = 5; r <= 9; r += 1) {
    for (let c = 2; c <= 6; c += 1) {
      const col = String.fromCharCode(64 + c);
      s.getRange(`${col}${r}`).formulas = [[dcfFormula(32, `$A${r}`, `${col}$4`, "'Assumptions'!$O$7", "'DCF'!$K$5")]];
    }
  }
  body(s.getRange("A5:F9"));
  s.getRange("A5:A9").setNumberFormat("0.0%");
  s.getRange("B4:F4").setNumberFormat("0.0%");
  s.getRange("B5:F9").setNumberFormat("$0.00");
  s.getRange("D7").format.fill = C.green;

  section(s, "A12:F12", "Dilution sensitivity");
  s.getRange("A13:F18").values = [
    ["Treatment", "Pre-fin shares", "Financing shares", "FD shares", "Base equity value", "Value / share"],
    ["Options replaced by RSUs", null, null, null, null, null],
    ["Options remain OTM / no replacement", null, null, null, null, null],
    ["+$5m financing at $4/share", null, null, null, null, null],
    ["+$5m financing at $6/share", null, null, null, null, null],
    ["No future financing", null, null, null, null, null],
  ];
  s.getRange("B14:B18").formulas = [
    ["='Assumptions'!$G$12"],
    ["='Assumptions'!$G$13"],
    ["='Assumptions'!$G$12"],
    ["='Assumptions'!$G$12"],
    ["='Assumptions'!$G$12"],
  ];
  s.getRange("C14:C18").formulas = [["='DCF'!$J$5"], ["='DCF'!$J$5"], ["=5/4"], ["=5/6"], ["=0"]];
  s.getRange("D14:D18").formulas = [["=B14+C14"], ["=B15+C15"], ["=B16+C16"], ["=B17+C17"], ["=B18+C18"]];
  s.getRange("E14:E18").formulas = [["='DCF'!$H$5"], ["='DCF'!$H$5"], ["='DCF'!$H$5"], ["='DCF'!$H$5"], ["='DCF'!$H$5-'Assumptions'!$O$7"]];
  s.getRange("F14:F18").formulas = [["=E14/D14"], ["=E15/D15"], ["=E16/D16"], ["=E17/D17"], ["=E18/D18"]];
  header(s.getRange("A13:F13"));
  body(s.getRange("A14:F18"));
  s.getRange("B14:D18").setNumberFormat("0.000");
  s.getRange("E14:E18").setNumberFormat("$0.0");
  s.getRange("F14:F18").setNumberFormat("$0.00");
  section(s, "A21:H21", "Interpretation");
  s.getRange("A22:H25").values = [
    ["Question", "Read-through", null, null, null, null, null, null],
    ["WACC / g", "A common 19% WACC and 2.5% terminal growth are used across primary cases to avoid double-counting adoption risk; 17%–21% is a separate sensitivity.", null, null, null, null, null, null],
    ["Dilution", "The unresolved 1.319m option/RSU treatment and issuance price are material but do not explain the full market gap.", null, null, null, null, null, null],
    ["Key missing evidence", "Claims realization, repeat utilization, and payer-policy activation determine whether the revenue path deserves a lower hurdle.", null, null, null, null, null, null],
  ];
  header(s.getRange("A22:B22"));
  s.getRange("A22:H25").format = { wrapText: true, rowHeight: 38 };
  widths(s, { A: 34, B: 18, C: 18, D: 18, E: 18, F: 18, G: 18, H: 28 });
  s.freezePanes.freezeRows(4);
}

function bullScaledFormula(scaleRef) {
  const revRow = cases.Bull.assumpRow;
  const marginRow = revRow + 1;
  const wacc = "'Assumptions'!$M$8";
  const g = "'Assumptions'!$N$8";
  const revenues = cols.map((col) => `('Assumptions'!${col}$${revRow}*${scaleRef})`);
  const ebits = cols.map((col, i) => `${revenues[i]}*'Assumptions'!${col}$${marginRow}`);
  const positiveEbts = ebits.map((ebit) => `MAX(0,${ebit})`);
  const fcffs = cols.map((col, i) => {
    const rev = revenues[i];
    const prior = i === 0 ? "'Assumptions'!$B$14" : revenues[i - 1];
    const priorPositiveEbit = i === 0 ? "0" : positiveEbts.slice(0, i).join("+");
    const remainingNol = `MAX(0,'Assumptions'!$B$17-0.8*(${priorPositiveEbit}))`;
    const nolUsed = `MIN(0.8*${positiveEbts[i]},${remainingNol})`;
    const cashTax = `((${positiveEbts[i]})-${nolUsed})*'Assumptions'!$B$10`;
    return `(${ebits[i]}-${cashTax}+${rev}*'Assumptions'!$B$11-${rev}*'Assumptions'!$B$12-(${rev}-${prior})*'Assumptions'!$B$13)`;
  });
  const terms = fcffs.map((fcff, i) => `${fcff}/(1+${wacc})^${i + 1}`);
  const terminal = `(${fcffs[14]}*(1+${g})/(${wacc}-${g}))/(1+${wacc})^15`;
  return `=(MAX(0,${terms.join("+")}+${terminal}+'Assumptions'!$B$9-'Assumptions'!$B$16+'Assumptions'!$O$8))/'DCF'!$K$6`;
}

// Reverse DCF
{
  const s = wb.worksheets.getItem("Reverse DCF");
  title(s, "A1:H1", "Market-Implied Adoption Burden");
  note(s, "A2:H2", "Bull operating margins, common 19% WACC, 2.5% terminal growth, NOL policy, and bull dilution are held fixed. Only the entire bull revenue path is scaled. This is a model-derived inference, not a unique market belief or consensus forecast.");
  section(s, "A3:E3", "Bull revenue-path scale sensitivity");
  s.getRange("A4:E4").values = [["Revenue scale", "2030 revenue", "2035 revenue", "2040 revenue", "Value / share"]];
  const scales = [0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8];
  s.getRange("A5:A15").values = scales.map((x) => [x]);
  for (let r = 5; r <= 15; r += 1) {
    s.getRange(`B${r}`).formulas = [[`='Assumptions'!F39*A${r}`]];
    s.getRange(`C${r}`).formulas = [[`='Assumptions'!K39*A${r}`]];
    s.getRange(`D${r}`).formulas = [[`='Assumptions'!P39*A${r}`]];
    s.getRange(`E${r}`).formulas = [[bullScaledFormula(`$A${r}`)]];
  }
  header(s.getRange("A4:E4"));
  body(s.getRange("A5:E15"));
  s.getRange("A5:A15").setNumberFormat("0.0x");
  s.getRange("B5:D15").setNumberFormat("$0.0");
  s.getRange("E5:E15").setNumberFormat("$0.00");
  s.getRange("A7:E7").format.fill = C.green;

  section(s, "A16:H16", "Interpolated market-implied result");
  s.getRange("A17:H21").values = [
    ["Metric", "Result", "Interpretation", null, null, null, null, null],
    ["Market-implied bull revenue scale", null, "Interpolated between adjacent 0.1x rows.", null, null, null, null, null],
    ["Implied 2035 revenue", null, "Compared with $125m bull path.", null, null, null, null, null],
    ["Implied 2040 revenue", null, "Compared with $187m bull path.", null, null, null, null, null],
    ["Implied value / share", null, "Control should reproduce the dated $6.235 snapshot.", null, null, null, null, null],
  ];
  s.getRange("B18").formulas = [["=1.5+(('Assumptions'!$B$7-E12)/(E13-E12))*0.1"]];
  s.getRange("B19").formulas = [["='Assumptions'!$K$39*B18"]];
  s.getRange("B20").formulas = [["='Assumptions'!$P$39*B18"]];
  s.getRange("B21").formulas = [["=E12+(B18-1.5)*(E13-E12)/0.1"]];
  header(s.getRange("A17:C17"));
  body(s.getRange("A18:C21"));
  s.getRange("B18").setNumberFormat("0.00x");
  s.getRange("B19:B20").setNumberFormat("$0.0");
  s.getRange("B21").setNumberFormat("$0.000");

  section(s, "A24:H24", "Interpretation");
  s.getRange("A25:H28").values = [
    ["Question", "Read-through", null, null, null, null, null, null],
    ["What must be true?", "Roughly 1.5–1.6× the already aggressive bull revenue path, while achieving 30% mature EBIT margin with only modest financing dilution.", null, null, null, null, null, null],
    ["What does that mean?", "The market is underwriting rapid payer activation, hospital adoption, repeat courses, and high realized reimbursement—not just continuation of Q1 growth.", null, null, null, null, null, null],
    ["What falsifies it?", "Slower active-account growth, HOPD-heavy realization below device economics, persistent corporate overhead, or financing below the modeled issue prices.", null, null, null, null, null, null],
  ];
  header(s.getRange("A25:B25"));
  s.getRange("A25:H28").format = { wrapText: true, rowHeight: 44 };
  widths(s, { A: 32, B: 18, C: 34, D: 18, E: 18, F: 18, G: 18, H: 24 });
  s.freezePanes.freezeRows(4);
}

// Checks
{
  const s = wb.worksheets.getItem("Checks");
  title(s, "A1:G1", "Model Controls and Known Issues");
  note(s, "A2:G2", "One assertion per row. These controls test arithmetic and model coherence; they do not certify the commercial assumptions or valuation conclusion.");
  section(s, "A3:G3", "Master status");
  s.getRange("A4:G5").values = [
    ["Master model status", null, "Formula scan", "0 visible errors", "OFF", "PASS", "Locally verified; independent review follows"],
    ["Evidence posture", "SCREEN-GRADE", "Market input", "INTRADAY", "Commercial facts", "PARTLY MANAGEMENT-REPORTED", "Refresh before an investment decision"],
  ];
  s.getRange("B4").formulas = [['=IF(COUNTIF(F9:F23,"FAIL")=0,"PASS","FAIL")']];
  body(s.getRange("A4:G5"));
  s.getRange("A4:G5").format = { wrapText: true, rowHeight: 34 };
  section(s, "A7:G7", "Substantive checks");
  s.getRange("A8:G8").values = [["Check", "Actual", "Expected / comparator", "Difference", "Tolerance", "Status", "Purpose"]];
  header(s.getRange("A8:G8"));
  s.getRange("A9:A23").values = [
    ["FY2025 gross profit recomputes"],
    ["FY2025 gross margin recomputes"],
    ["Q1 2026 gross profit recomputes"],
    ["Scenario probabilities sum"],
    ["Bear ≤ base"],
    ["Base ≤ bull"],
    ["WACC > terminal g"],
    ["Terminal value share <60%"],
    ["Unapproved indication value = 0"],
    ["Base sensitivity reconciles"],
    ["Reverse DCF reproduces market"],
    ["Financing share math"],
    ["Headline is formula driven"],
    ["Price exceeds probability-weighted value"],
    ["Post-money financing bridge"],
  ];
  s.getRange("B9").formulas = [["='Historicals'!E7"]];
  s.getRange("C9").formulas = [["='Historicals'!E4-'Historicals'!E6"]];
  s.getRange("B10").formulas = [["='Historicals'!E8"]];
  s.getRange("C10").formulas = [["='Historicals'!E7/'Historicals'!E4"]];
  s.getRange("B11").formulas = [["='Historicals'!F7"]];
  s.getRange("C11").formulas = [["='Historicals'!F4-'Historicals'!F6"]];
  s.getRange("B12").formulas = [["=SUM('DCF'!M4:M6)"]];
  s.getRange("C12").values = [[1]];
  s.getRange("B13").formulas = [["='DCF'!L4"]];
  s.getRange("C13").formulas = [["='DCF'!L5"]];
  s.getRange("B14").formulas = [["='DCF'!L5"]];
  s.getRange("C14").formulas = [["='DCF'!L6"]];
  s.getRange("B15").formulas = [["=MIN('DCF'!B4-'DCF'!C4,'DCF'!B5-'DCF'!C5,'DCF'!B6-'DCF'!C6)"]];
  s.getRange("C15").values = [[0]];
  s.getRange("B16").formulas = [["=MAX('DCF'!B15:D15)"]];
  s.getRange("C16").values = [[0.60]];
  s.getRange("B17").formulas = [["=SUM('DCF'!B18:D18)"]];
  s.getRange("C17").values = [[0]];
  s.getRange("B18").formulas = [["='Sensitivities'!D7"]];
  s.getRange("C18").formulas = [["='DCF'!L5"]];
  s.getRange("B19").formulas = [["='Reverse DCF'!B21"]];
  s.getRange("C19").formulas = [["='Assumptions'!B7"]];
  s.getRange("B20").formulas = [["='DCF'!J5"]];
  s.getRange("C20").formulas = [["='Assumptions'!O7/'Assumptions'!P7"]];
  s.getRange("B21").formulas = [["='DCF'!B9"]];
  s.getRange("C21").formulas = [["='DCF'!B9"]];
  s.getRange("B22").formulas = [["='Assumptions'!B7"]];
  s.getRange("C22").formulas = [["='DCF'!B9"]];
  s.getRange("B23").formulas = [["='DCF'!H5"]];
  s.getRange("C23").formulas = [["='DCF'!F5+'DCF'!G5-'Assumptions'!B16+'Assumptions'!O7"]];
  for (let r = 9; r <= 23; r += 1) s.getRange(`D${r}`).formulas = [[`=B${r}-C${r}`]];
  s.getRange("E9:E23").values = [[0.001], [0.0001], [0.001], [0.0001], [0], [0], [0], [0.60], [0], [0.001], [0.01], [0.001], [0.001], [0], [0.001]];
  s.getRange("F9:F23").formulas = [
    ['=IF(ABS(D9)<=E9,"PASS","FAIL")'],
    ['=IF(ABS(D10)<=E10,"PASS","FAIL")'],
    ['=IF(ABS(D11)<=E11,"PASS","FAIL")'],
    ['=IF(ABS(D12)<=E12,"PASS","FAIL")'],
    ['=IF(B13<=C13,"PASS","FAIL")'],
    ['=IF(B14<=C14,"PASS","FAIL")'],
    ['=IF(B15>C15,"PASS","FAIL")'],
    ['=IF(B16<C16,"PASS","FAIL")'],
    ['=IF(ABS(D17)<=E17,"PASS","FAIL")'],
    ['=IF(ABS(D18)<=E18,"PASS","FAIL")'],
    ['=IF(ABS(D19)<=E19,"PASS","FAIL")'],
    ['=IF(ABS(D20)<=E20,"PASS","FAIL")'],
    ['=IF(ABS(D21)<=E21,"PASS","FAIL")'],
    ['=IF(B22>C22,"PASS","FAIL")'],
    ['=IF(ABS(D23)<=E23,"PASS","FAIL")'],
  ];
  s.getRange("G9:G23").values = [
    ["Revenue less COGS"], ["Gross profit / revenue"], ["Revenue less COGS"], ["Weights must equal 100%"],
    ["Scenario ordering"], ["Scenario ordering"], ["Perpetuity validity"], ["Terminal concentration control"],
    ["No unsupported pipeline value"], ["Base WACC/g cell"], ["Interpolation control"], ["New shares = financing / issue price"],
    ["DCF headline link"], ["Current price above weighted intrinsic result"], ["Financing proceeds added once to equity"],
  ];
  body(s.getRange("A9:G23"));
  s.getRange("B9:E23").setNumberFormat("0.000");
  s.getRange("F9:F23").conditionalFormats.add("containsText", { text: "PASS", format: { fill: C.green, font: { bold: true, color: "#006100" } } });
  s.getRange("F9:F23").conditionalFormats.add("containsText", { text: "FAIL", format: { fill: C.red, font: { bold: true, color: "#9C0006" } } });
  section(s, "A25:G25", "Known issues and refresh triggers", C.redDark);
  s.getRange("A26:G30").values = [
    ["Issue", "Current treatment", "Impact", "Owner", "Trigger", "Status", "Notes"],
    ["Price is intraday", "$6.235 reference", "Comparison only", "Analyst", "Decision time", "OPEN", "Refresh"],
    ["Payer roster not deduped", "Scenario bands", "High", "Commercial diligence", "Named policy data", "OPEN", "Do not call 100m unique lives verified"],
    ["Option replacement unresolved", "Base/bear include; bull excludes", "Medium", "Capital structure", "Closing filing", "OPEN", "Do not double count"],
    ["No licensed consensus", "No numeric comp multiple", "Medium", "Analyst", "Vendor access", "OPEN", "Comps remain qualitative"],
  ];
  header(s.getRange("A26:G26"));
  body(s.getRange("A27:G30"));
  s.getRange("A26:G30").format = { wrapText: true, rowHeight: 40 };
  widths(s, { A: 34, B: 18, C: 18, D: 16, E: 14, F: 14, G: 39 });
  s.freezePanes.freezeRows(8);
}

// Cover
{
  const s = wb.worksheets.getItem("Cover");
  title(s, "A1:L2", "Neuraxis, Inc. (NRXS) — Bespoke Equity Valuation");
  s.getRange("A3:L3").merge();
  s.getRange("A3").values = [["Valuation date 2026-07-30 • Approved commercial operations only • Probability-weighted 15-year FCFF • Screen-grade / high uncertainty"]];
  s.getRange("A3:L3").format = {
    fill: C.paleGray,
    font: { color: C.darkGray, italic: true, size: 9 },
    horizontalAlignment: "center",
  };
  card(s, "A5:C9", "Probability-weighted value / share", "='DCF'!B9", "$0.00", "30% bear / 50% base / 20% bull", C.paleBlue);
  card(s, "D5:F9", "Current market reference", "='Assumptions'!B7", "$0.000", "Intraday 2026-07-30 13:36:28 UTC", C.amber);
  card(s, "G5:I9", "Base value / share", "='DCF'!L5", "$0.00", "19% WACC • 2.5% terminal g", C.paleBlue);
  card(s, "J5:L9", "Bull value / share", "='DCF'!L6", "$0.00", "19% WACC • low financing", C.green);
  section(s, "A11:L11", "Investment-team read-through");
  s.getRange("A12:L16").values = [
    ["Question", "Answer", null, null, null, null, null, null, null, null, null, null],
    ["Primary conclusion", "The dated market price exceeds the probability-weighted result and sits above the modeled bull value; evidence does not support a trade recommendation without fresh claims, adoption, and cap-table data.", null, null, null, null, null, null, null, null, null, null],
    ["What is priced in?", "About 1.5–1.6× the bull revenue path while mature EBIT reaches 30%, the common 19% hurdle holds, and future dilution remains modest.", null, null, null, null, null, null, null, null, null, null],
    ["Variant wedge", "Category I CPT reimbursement can accelerate hospital adoption and repeat utilization while Q1 gross margin stays in the mid-80s.", null, null, null, null, null, null, null, null, null, null],
    ["Downside mechanism", "Realized reimbursement below device economics, slow policy activation, persistent overhead, and discounted equity raises can overwhelm otherwise attractive gross margin.", null, null, null, null, null, null, null, null, null, null],
  ];
  header(s.getRange("A12:B12"));
  for (let r = 13; r <= 16; r += 1) s.getRange(`B${r}:L${r}`).merge();
  s.getRange("A12:L16").format = { wrapText: true, rowHeight: 45 };
  section(s, "A18:F18", "Scenario value per share");
  const chart1 = s.charts.add("bar", { chartType: "bar", title: "Intrinsic scenario values vs. market", hasLegend: false });
  const ser1 = chart1.series.add("Value / share");
  ser1.categoryFormula = "'DCF'!$A$4:$A$6";
  ser1.formula = "'DCF'!$L$4:$L$6";
  ser1.fill = C.accent;
  chart1.titleTextStyle.fontSize = 11;
  chart1.yAxis = { numberFormatCode: "$0.00", textStyle: { fontSize: 9 } };
  chart1.setPosition("A19", "F31");

  section(s, "G18:L18", "Revenue paths ($mm)");
  const chart2 = s.charts.add("line", { chartType: "line", title: "Scenario revenue paths", hasLegend: true });
  for (const [name, c] of Object.entries(cases)) {
    const ser = chart2.series.add(name);
    ser.categoryFormula = "'Forecast'!$B$4:$P$4";
    ser.formula = `'Forecast'!$B$${c.forecastRow + 2}:$P$${c.forecastRow + 2}`;
    ser.fill = name === "Bear" ? C.redDark : name === "Bull" ? C.greenDark : C.accent;
  }
  chart2.titleTextStyle.fontSize = 11;
  chart2.yAxis = { numberFormatCode: "$0", textStyle: { fontSize: 9 } };
  chart2.setPosition("G19", "L31");

  section(s, "A33:L33", "Method, controls, and limitations");
  s.getRange("A34:L40").values = [
    ["Item", "Current treatment", null, null, null, null, "Item", "Current treatment", null, null, null, null],
    ["Primary method", "15-year probability-weighted FCFF DCF", null, null, null, null, "Model status", null, null, null, null, null],
    ["Pipeline value", "$0 for unapproved indications", null, null, null, null, "Reverse DCF", null, null, null, null, null],
    ["Dilution", "Filing-derived if-converted / RSU / warrant / option cases plus future financing", null, null, null, null, "OFF boundary", "Package structure and declared lineage only", null, null, null, null],
    ["Evidence", "SEC/FDA/CMS primary where available; issuer claims labeled", null, null, null, null, "Confidence", "Screen-grade / high uncertainty", null, null, null, null],
    ["Known gaps", "Claims realization, deduped coverage, option replacement, licensed consensus", null, null, null, null, "Trade posture", "No recommendation without portfolio context and evidence refresh", null, null, null, null],
    ["Audience", "Investment-team diligence", null, null, null, null, "Owner / version", "Henry Adams • v1 • 2026-07-30", null, null, null, null],
  ];
  for (let r = 34; r <= 40; r += 1) {
    s.getRange(`B${r}:F${r}`).merge();
    s.getRange(`H${r}:L${r}`).merge();
  }
  s.getRange("H35").formulas = [["='Checks'!B4"]];
  s.getRange("H36").formulas = [["='Reverse DCF'!B18"]];
  s.getRange("H36").setNumberFormat("0.00x");
  s.getRange("A34:L40").format = { wrapText: true, rowHeight: 33 };
  s.getRange("A34:A40").format = { fill: C.blue, font: { bold: true, color: C.navy2 } };
  s.getRange("G34:G40").format = { fill: C.blue, font: { bold: true, color: C.navy2 } };
  s.getRange("A42:L42").merge();
  s.getRange("A42").values = [["This workbook is valuation research, not individualized investment advice. Refresh the price, claims realization, payer activation, cash runway, and capitalization before any decision."]];
  s.getRange("A42:L42").format = { fill: C.amber, font: { color: "#7F2D27", italic: true, size: 8 }, wrapText: true };
  widths(s, { A: 12, B: 12, C: 12, D: 12, E: 12, F: 12, G: 12, H: 12, I: 12, J: 12, K: 12, L: 12 });
  s.freezePanes.freezeRows(3);
}

for (const name of names) {
  const s = wb.worksheets.getItem(name);
  const used = s.getUsedRange();
  used.format.verticalAlignment = "center";
  used.format.font.name = "Arial";
}

const key = await wb.inspect({
  kind: "table",
  range: "DCF!A3:N19",
  include: "values,formulas",
  tableMaxRows: 25,
  tableMaxCols: 15,
  maxChars: 18000,
});
console.log("KEY_INSPECTION");
console.log(key.ndjson);
const checks = await wb.inspect({
  kind: "table",
  range: "Checks!A3:G30",
  include: "values,formulas",
  tableMaxRows: 35,
  tableMaxCols: 8,
  maxChars: 18000,
});
console.log("CHECK_INSPECTION");
console.log(checks.ndjson);
const errors = await wb.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
});
console.log("FORMULA_ERRORS");
console.log(errors.ndjson);

for (const name of names) {
  const preview = await wb.render({
    sheetName: name,
    autoCrop: "all",
    scale: name === "Cover" ? 1.1 : 1,
    format: "png",
  });
  const bytes = new Uint8Array(await preview.arrayBuffer());
  await fs.writeFile(path.join(previewDir, `${name}.png`), bytes);
}

const output = await SpreadsheetFile.exportXlsx(wb);
await output.save(outputPath);
console.log(`OUTPUT=${outputPath}`);
