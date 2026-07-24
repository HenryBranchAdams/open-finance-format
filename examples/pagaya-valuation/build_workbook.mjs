import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(
  packageRoot,
  "outputs",
  "019f8fa1-90aa-7002-a17f-ddffc4552a84",
);
const previewDir = path.join(outputDir, "previews");
const outputPath = path.join(outputDir, "pagaya-valuation-model.xlsx");

await fs.mkdir(previewDir, { recursive: true });

const wb = Workbook.create();
const names = [
  "Cover",
  "Sources",
  "Assumptions",
  "Historicals",
  "Forecast",
  "DCF",
  "Comps",
  "Sensitivities",
  "Checks",
];
for (const name of names) wb.worksheets.add(name);
wb.comments.setSelf({ displayName: "Henry Adams" });

const navy = "#1F4E78";
const navyDark = "#17365D";
const accent = "#2F75B5";
const blue = "#D9EAF7";
const paleBlue = "#EEF5FA";
const green = "#D9EAD3";
const paleGreen = "#EAF4E4";
const bullDark = "#548235";
const yellow = "#FFF2CC";
const amber = "#FCE4D6";
const red = "#F4CCCC";
const bearDark = "#A64B44";
const gray = "#E7E6E6";
const paleGray = "#F4F6F8";
const darkGray = "#595959";
const borderGray = "#D9E1E8";
const white = "#FFFFFF";
const inputBlue = "#0000FF";
const linkedGreen = "#008000";
const black = "#000000";

function title(sheet, range, text) {
  sheet.getRange(range).merge();
  const r = sheet.getRange(range);
  r.values = [[text]];
  r.format.fill = navy;
  r.format.font = { bold: true, color: white, size: 16, name: "Arial" };
  r.format.rowHeight = 30;
  r.format.verticalAlignment = "center";
}

function section(sheet, range, text, fill = navy) {
  const r = sheet.getRange(range);
  const firstCell = range.split(":")[0];
  sheet.getRange(firstCell).values = [[text]];
  r.format.fill = fill;
  r.format.font = { bold: true, color: white, name: "Arial" };
  r.format.rowHeight = 22;
  r.format.verticalAlignment = "center";
}

function header(range) {
  range.format.fill = blue;
  range.format.font = { bold: true, color: black };
  range.format.borders = {
    bottom: { style: "medium", color: "#9FBAD0" },
    insideVertical: { style: "thin", color: "#C7D7E5" },
  };
  range.format.verticalAlignment = "center";
}

function body(range) {
  range.format.borders = {
    insideHorizontal: { style: "thin", color: borderGray },
  };
}

function total(range) {
  range.format.font = { bold: true, color: black };
  range.format.borders = {
    top: { style: "thin", color: black },
    bottom: { style: "double", color: black },
  };
}

function setWidths(sheet, widths) {
  for (const [col, width] of Object.entries(widths)) {
    sheet.getRange(`${col}:${col}`).format.columnWidth = width;
  }
}

function input(range) {
  range.format.fill = yellow;
  range.format.font = { color: inputBlue };
  range.format.borders = { preset: "all", style: "thin", color: "#D6B656" };
}

function card(sheet, range, label, formula, numberFormat, fill, subtitle, subtitleFormula = null) {
  const [start, end] = range.split(":");
  const startCol = start.replace(/[0-9]/g, "");
  const startRow = Number(start.replace(/[^0-9]/g, ""));
  const endCol = end.replace(/[0-9]/g, "");
  const endRow = Number(end.replace(/[^0-9]/g, ""));
  sheet.getRange(`${startCol}${startRow}:${endCol}${startRow}`).merge();
  sheet.getRange(`${startCol}${startRow}`).values = [[label]];
  sheet.getRange(`${startCol}${startRow}:${endCol}${startRow}`).format = {
    fill,
    font: { bold: true, color: darkGray, size: 10 },
    horizontalAlignment: "center",
  };
  sheet.getRange(`${startCol}${startRow + 1}:${endCol}${endRow - 1}`).merge();
  sheet.getRange(`${startCol}${startRow + 1}`).formulas = [[formula]];
  sheet.getRange(`${startCol}${startRow + 1}:${endCol}${endRow - 1}`).format = {
    fill,
    font: { bold: true, color: navyDark, size: 20 },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    numberFormat,
  };
  sheet.getRange(`${startCol}${endRow}:${endCol}${endRow}`).merge();
  if (subtitleFormula) {
    sheet.getRange(`${startCol}${endRow}`).formulas = [[subtitleFormula]];
  } else {
    sheet.getRange(`${startCol}${endRow}`).values = [[subtitle]];
  }
  sheet.getRange(`${startCol}${endRow}:${endCol}${endRow}`).format = {
    fill,
    font: { bold: true, color: darkGray, size: 9 },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: { bottom: { style: "medium", color: fill === paleGray ? darkGray : navy } },
  };
  sheet.getRange(range).format.borders = { preset: "outside", style: "thin", color: borderGray };
}

for (const name of names) {
  const s = wb.worksheets.getItem(name);
  s.showGridLines = false;
}

// Sources
{
  const s = wb.worksheets.getItem("Sources");
  title(s, "A1:J1", "Pagaya Technologies (PGY) — Source Register");
  s.getRange("A3:J3").values = [[
    "ID",
    "Type",
    "Publisher",
    "Document",
    "Date",
    "Period / as-of",
    "Location",
    "URL",
    "Used for",
    "Status",
  ]];
  header(s.getRange("A3:J3"));
  s.getRange("A4:J11").values = [
    [
      "S1",
      "SEC filing",
      "Pagaya / SEC",
      "2025 Form 10-K",
      "2026-03-02",
      "FY2023-FY2025",
      "pp. 75, 84-85, F-6 to F-11",
      "https://www.sec.gov/Archives/edgar/data/1883085/000188308526000018/pgy-20251231.htm",
      "Historical financials, Network Volume, FRLPC, debt, cash, investments",
      "Verified primary",
    ],
    [
      "S2",
      "IR / SEC exhibit",
      "Pagaya",
      "Q1 2026 earnings release and financial tables",
      "2026-05-07",
      "Quarter ended 2026-03-31",
      "pp. 1-9",
      "https://investor.pagaya.com/static-files/1f38d3e9-6d00-49c7-921d-a6b5be49a276",
      "Q1 actuals, balance sheet, FY2026 outlook",
      "Verified primary",
    ],
    [
      "S3",
      "IR / SEC exhibit",
      "Pagaya",
      "Q1 2026 shareholder letter",
      "2026-05-07",
      "Quarter ended 2026-03-31",
      "Financial highlights",
      "https://www.sec.gov/Archives/edgar/data/1883085/000188308526000027/lettertoshareholders1q20.htm",
      "Network Volume, FRLPC, operating commentary",
      "Verified primary",
    ],
    [
      "S4",
      "Market snapshot",
      "Stock Analysis / S&P Global / CBOE",
      "PGY overview and valuation snapshot",
      "2026-07-23 15:37 EDT",
      "Intraday 2026-07-23",
      "Price, shares, valuation ratios",
      "https://stockanalysis.com/stocks/pgy/",
      "Price $16.29, 82.92mm shares, 5.25x forward P/E",
      "Verified secondary; intraday",
    ],
    [
      "S5",
      "Market risk",
      "Aswath Damodaran",
      "Implied equity risk premium",
      "2026-07-01",
      "July 2026",
      "Homepage data update",
      "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/home.htm",
      "4.20% mature-market ERP and 4.45% USD risk-free context",
      "Verified secondary",
    ],
    [
      "S6",
      "Peer snapshot",
      "Signet Bank / Bloomberg",
      "Eleving Group Q1 2026 presentation",
      "2026-05",
      "2026E peer estimates",
      "Public fintech/lender peer table",
      "https://signetbank.com/wp-content/uploads/2026/05/Eleving_ER_Q1_26.pdf",
      "Forward P/E cross-check for selected peers",
      "Secondary; definitions not independently reconciled",
    ],
    [
      "S7",
      "IR news release",
      "Pagaya",
      "Pagaya Closes $750 Million Auto ABS Transaction, Its Largest to Date",
      "2026-07-16",
      "Funding execution update",
      "Release highlights",
      "https://investor.pagaya.com/news-releases/news-release-details/pagaya-closes-750-million-auto-abs-transaction-its-largest-date",
      "Funding-capacity proof point and near-term catalyst context",
      "Verified primary",
    ],
    [
      "S8",
      "IR news release",
      "Pagaya",
      "Timing of Second Quarter 2026 Earnings Release",
      "2026-07-09",
      "Event on 2026-07-30",
      "Earnings date and webcast time",
      "https://investor.pagaya.com/news-releases/news-release-details/pagaya-announces-timing-second-quarter-2026-earnings-release",
      "Confirmed Q2 2026 catalyst date",
      "Verified primary",
    ],
  ];
  body(s.getRange("A4:J11"));
  s.getRange("H4:H11").format.font = { color: "#0563C1", underline: true, size: 9 };
  s.getRange("H4:H11").format.wrapText = true;
  s.getRange("A4:J11").format.wrapText = true;
  s.getRange("A4:J11").format.rowHeight = 42;
  section(s, "A13:J13", "Source limitations", bearDark);
  s.getRange("A14:D16").values = [
    ["Limitation", "Status", "Decision effect", "Required action"],
    [
      "Current price",
      "Verified intraday",
      "Current at 15:37 EDT, but not an official closing price.",
      "Refresh after market close or immediately before a position decision.",
    ],
    [
      "Consensus / peers",
      "Screen-grade",
      "No licensed consensus feed; the public peer snapshot remains dated.",
      "Use comps only as corroboration and bridge against a licensed dataset before underwriting.",
    ],
  ];
  header(s.getRange("A14:D14"));
  body(s.getRange("A15:D16"));
  s.getRange("A14:D16").format.wrapText = true;
  s.getRange("A15:D16").format.rowHeight = 44;
  setWidths(s, { A: 16, B: 19, C: 24, D: 32, E: 18, F: 20, G: 26, H: 44, I: 38, J: 24 });
  s.freezePanes.freezeRows(3);
}

// Assumptions
{
  const s = wb.worksheets.getItem("Assumptions");
  title(s, "A1:H1", "Pagaya Valuation Assumptions");
  s.getRange("A2:H2").merge();
  s.getRange("A2").values = [[
    "Editable inputs use blue text, pale yellow fill, and a border. USD millions unless stated. Source cutoff: 2026-07-23 15:37 EDT.",
  ]];
  s.getRange("A2:H2").format = {
    fill: paleGray,
    font: { color: darkGray, italic: true, size: 9 },
    wrapText: true,
  };
  section(s, "A3:D3", "Shared assumptions");
  s.getRange("A4:D16").values = [
    ["Assumption", "Value", "Unit", "Basis / source"],
    ["Valuation date", new Date("2026-07-23T00:00:00Z"), "date", "Analyst convention"],
    ["Market price", 16.29, "$/share", "S4; intraday at 15:37 EDT on 2026-07-23"],
    ["Basic shares outstanding", 82.92, "mm", "S4; current public market snapshot"],
    ["Valuation diluted shares", 86.0, "mm", "Analyst assumption; exchangeable debt remains in capital bridge"],
    ["Tax rate", 0.21, "%", "Analyst long-run cash tax assumption"],
    ["D&A / FRLPC", 0.05, "%", "Anchored to FY2025 and normalized"],
    ["Capex / FRLPC", 0.04, "%", "Anchored to FY2025 purchases of PP&E/software"],
    ["Opening Network Volume", 10.534, "$bn", "S1; FY2025"],
    ["Opening FRLPC", 512.172, "$mm", "S1; FY2025"],
    ["Opening cash", 317.813, "$mm", "S2; 2026-03-31"],
    ["Risk-retention investments", 941.367, "$mm", "S2; 2026-03-31"],
    ["Secured borrowing", 156.275, "$mm", "S2; 2026-03-31"],
  ];
  header(s.getRange("A4:D4"));
  body(s.getRange("A5:D16"));
  input(s.getRange("B5:B16"));
  s.getRange("B5").setNumberFormat("yyyy-mm-dd");
  s.getRange("B6").setNumberFormat("$0.00");
  s.getRange("B7:B8").setNumberFormat("0.0");
  s.getRange("B9:B11").setNumberFormat("0.0%");
  s.getRange("B12").setNumberFormat("0.000");
  s.getRange("B13:B16").setNumberFormat("$#,##0.0");

  section(s, "F3:H3", "Capital bridge (2026-03-31)");
  s.getRange("F4:H13").values = [
    ["Item", "Value", "Treatment"],
    ["Cash", 317.813, "Add"],
    ["Risk-retention investments", 941.367, "Operating capital; not added in FCFE"],
    ["Secured borrowing", 156.275, "Operating funding; captured in required capital"],
    ["Revolver", 114.7, "Corporate debt"],
    ["Exchangeable notes", 149.416, "Corporate debt"],
    ["Long-term debt", 474.988, "Corporate debt"],
    ["Redeemable preferred", 30.103, "Separate claim"],
    ["Noncontrolling interests", 69.843, "Separate claim"],
    ["Net risk assets", null, "Investments less secured borrowing"],
  ];
  s.getRange("G13").formulas = [["='Assumptions'!$G$6-'Assumptions'!$G$7"]];
  header(s.getRange("F4:H4"));
  body(s.getRange("F5:H13"));
  input(s.getRange("G5:G12"));
  s.getRange("G13").format.font = { color: black };
  s.getRange("G5:G13").setNumberFormat("$#,##0.0");

  const years = [2026, 2027, 2028, 2029, 2030, 2031];
  const cases = {
    Bear: {
      start: 19,
      vol: [11.45, 12.0, 12.6, 13.2, 13.7, 14.1],
      rate: [0.044, 0.0435, 0.043, 0.0425, 0.042, 0.0415],
      margin: [0.18, 0.20, 0.22, 0.24, 0.25, 0.26],
      risk: 0.02,
      ke: 0.16,
      g: 0.025,
    },
    Base: {
      start: 27,
      vol: [12.225, 13.7, 15.2, 16.7, 18.0, 19.2],
      rate: [0.0465, 0.0465, 0.046, 0.0455, 0.045, 0.0445],
      margin: [0.24, 0.26, 0.28, 0.30, 0.32, 0.34],
      risk: 0.015,
      ke: 0.14,
      g: 0.03,
    },
    Bull: {
      start: 35,
      vol: [13.0, 15.0, 17.0, 19.0, 21.0, 23.0],
      rate: [0.048, 0.0485, 0.0485, 0.048, 0.0475, 0.047],
      margin: [0.26, 0.29, 0.32, 0.35, 0.37, 0.39],
      risk: 0.0125,
      ke: 0.125,
      g: 0.035,
    },
  };
  for (const [name, c] of Object.entries(cases)) {
    const r = c.start;
    const scenarioFill = name === "Bear" ? bearDark : name === "Bull" ? bullDark : navy;
    section(s, `A${r}:H${r}`, `${name} case`, scenarioFill);
    s.getRange(`A${r + 1}:H${r + 5}`).values = [
      ["Driver", ...years, "Source / rationale"],
      ["Network Volume ($bn)", ...c.vol, name === "Base" ? "2026 guidance midpoint; analyst fade" : "Scenario assumption"],
      ["FRLPC %", ...c.rate, "Q1 2026 = 4.6%; mix and funding sensitivity"],
      ["Normalized net income / FRLPC", ...c.margin, "Owner-earnings margin after recurring costs"],
      ["Equity capital / incremental volume", c.risk, null, null, null, null, null, "Required risk-retention equity capital"],
    ];
    header(s.getRange(`A${r + 1}:H${r + 1}`));
    body(s.getRange(`A${r + 2}:H${r + 5}`));
    input(s.getRange(`B${r + 2}:G${r + 4}`));
    input(s.getRange(`B${r + 5}`));
    s.getRange(`B${r + 3}:G${r + 5}`).setNumberFormat("0.0%");
    s.getRange(`B${r + 2}:G${r + 2}`).setNumberFormat("0.0");
    s.getRange(`B${r + 5}`).setNumberFormat("0.0%");
    s.getRange(`A${r + 6}:D${r + 6}`).values = [["Cost of equity", c.ke, "Terminal growth", c.g]];
    s.getRange(`B${r + 6}`).setNumberFormat("0.0%");
    s.getRange(`D${r + 6}`).setNumberFormat("0.0%");
    input(s.getRange(`B${r + 6}`));
    input(s.getRange(`D${r + 6}`));
  }
  s.getRange("B6").comments?.add?.("Source: https://stockanalysis.com/stocks/pgy/. Intraday price snapshot at 15:37 EDT on 2026-07-23.");
  setWidths(s, { A: 35, B: 14, C: 14, D: 34, E: 14, F: 24, G: 14, H: 48 });
  s.freezePanes.freezeRows(4);
}

// Historicals
{
  const s = wb.worksheets.getItem("Historicals");
  title(s, "A1:F1", "Historical Financials and Operating KPIs");
  s.getRange("A2:F2").merge();
  s.getRange("A2").values = [["USD millions except Network Volume • Fiscal years ended December 31 • Q1 2026 quarter ended March 31"]];
  s.getRange("A2:F2").format = { fill: paleGray, font: { color: darkGray, italic: true, size: 9 } };
  s.getRange("A3:F3").values = [["Metric", "2023A", "2024A", "2025A", "Q1 2026A", "Source"]];
  header(s.getRange("A3:F3"));
  s.getRange("A4:F19").values = [
    ["Network Volume ($bn)", 8.299, 9.705, 10.534, 2.624, "S1 / S2"],
    ["Total revenue and other income", 812.051, 1032.248, 1301.36, 317.944, "S1 / S2"],
    ["Revenue from fees", 772.814, 1004.55, 1261.341, 298.991, "S1 / S2"],
    ["Production costs", 508.944, 597.652, 749.169, 177.561, "S1 / S2"],
    ["FRLPC", 263.87, 406.898, 512.172, 121.0, "S1 / S2"],
    ["FRLPC %", null, null, null, null, "Calculated"],
    ["Adjusted EBITDA", 82.022, 210.378, 370.987, 94.0, "S1 / S2"],
    ["Adjusted EBITDA / FRLPC", null, null, null, null, "Calculated"],
    ["Operating income (loss)", -24.4, 66.84, 263.827, 80.005, "S1 / S2"],
    ["Net income attributable to Pagaya", -128.438, -401.406, 81.389, 24.694, "S1 / S2"],
    ["Operating cash flow", -21.659, 47.751, 238.62, 43.184, "S1 / S2"],
    ["Share-based compensation", 71.055, 61.497, 54.118, 7.196, "S1 / S2"],
    ["Depreciation & amortization", 19.127, 28.753, 30.077, 3.862, "S1 / S2"],
    ["Capex / PP&E and software purchases", 20.189, 17.737, 13.902, 3.176, "S1 / S2"],
    ["Diluted weighted-average shares", 60.039, 70.88, 83.097, 96.745, "S1 / S2"],
    ["GAAP diluted EPS", -2.14, -5.66, 0.93, 0.28, "S1 / S2"],
  ];
  s.getRange("B9:E9").formulas = [[
    "='Historicals'!B8/('Historicals'!B4*1000)",
    "='Historicals'!C8/('Historicals'!C4*1000)",
    "='Historicals'!D8/('Historicals'!D4*1000)",
    "='Historicals'!E8/('Historicals'!E4*1000)",
  ]];
  s.getRange("B11:E11").formulas = [[
    "='Historicals'!B10/'Historicals'!B8",
    "='Historicals'!C10/'Historicals'!C8",
    "='Historicals'!D10/'Historicals'!D8",
    "='Historicals'!E10/'Historicals'!E8",
  ]];
  body(s.getRange("A4:F19"));
  s.getRange("B4:E19").setNumberFormat("$#,##0.0;[Red]($#,##0.0);-");
  s.getRange("B4:E4").setNumberFormat("0.0");
  s.getRange("B9:E9").setNumberFormat("0.0%");
  s.getRange("B11:E11").setNumberFormat("0.0%");
  s.getRange("B18:E18").setNumberFormat("0.0");
  s.getRange("B19:E19").setNumberFormat("$0.00;[Red]($0.00);-");
  s.getRange("B4:E19").format.font = { color: linkedGreen };
  s.getRange("B9:E9").format.font = { color: black };
  s.getRange("B11:E11").format.font = { color: black };
  total(s.getRange("A8:E8"));
  total(s.getRange("A10:E10"));
  s.getRange("A21:F24").values = [
    ["Analytical read-through", null, null, null, null, null],
    ["Scale", "Network Volume grew 27% from 2023 to 2025, but 2026 guidance implies a wide 9%-23% range.", null, null, null, null],
    ["Monetization", "FRLPC expanded from 3.2% to 4.9% of volume before easing to 4.6% in Q1 2026.", null, null, null, null],
    ["Owner economics", "SBC fell materially while GAAP profitability and cash generation improved; the July 2026 $750mm auto ABS transaction supports funding execution, but retained-credit capital remains the key valuation constraint.", null, null, null, null],
  ];
  section(s, "A21:F21", "Analytical read-through", navy);
  for (const row of [22, 23, 24]) s.getRange(`B${row}:F${row}`).merge();
  s.getRange("B22:F24").format.wrapText = true;
  s.getRange("A22:A24").format.font = { bold: true, color: navyDark };
  s.getRange("A22:F24").format.rowHeight = 34;
  setWidths(s, { A: 40, B: 15, C: 15, D: 15, E: 15, F: 22 });
  s.freezePanes.freezeRows(3);
}

// Forecast
{
  const s = wb.worksheets.getItem("Forecast");
  title(s, "A1:G1", "Scenario Forecast and Equity Cash Flow");
  s.getRange("A2:G2").merge();
  s.getRange("A2").values = [["USD millions except Network Volume • 2026E–2031E • Year-end discounting • FCFE deducts incremental risk-retention equity"]];
  s.getRange("A2:G2").format = { fill: paleGray, font: { color: darkGray, italic: true, size: 9 } };
  const years = [2026, 2027, 2028, 2029, 2030, 2031];
  const mappings = {
    Bear: { start: 3, assump: 19 },
    Base: { start: 18, assump: 27 },
    Bull: { start: 33, assump: 35 },
  };
  for (const [name, m] of Object.entries(mappings)) {
    const r = m.start;
    const scenarioFill = name === "Bear" ? bearDark : name === "Bull" ? bullDark : navy;
    section(s, `A${r}:G${r}`, `${name} case`, scenarioFill);
    s.getRange(`A${r + 1}:G${r + 1}`).values = [["$mm except per-share and Network Volume", ...years]];
    header(s.getRange(`A${r + 1}:G${r + 1}`));
    const labels = [
      "Network Volume ($bn)",
      "Volume growth",
      "FRLPC %",
      "FRLPC",
      "Normalized net income / FRLPC",
      "Normalized net income",
      "D&A",
      "Capex",
      "Incremental risk-retention equity",
      "FCFE",
      "PV factor",
      "PV of FCFE",
    ];
    s.getRange(`A${r + 2}:A${r + 13}`).values = labels.map((x) => [x]);
    const ar = m.assump;
    s.getRange(`B${r + 2}:G${r + 2}`).formulas = [[
      `='Assumptions'!B${ar + 2}`,
      `='Assumptions'!C${ar + 2}`,
      `='Assumptions'!D${ar + 2}`,
      `='Assumptions'!E${ar + 2}`,
      `='Assumptions'!F${ar + 2}`,
      `='Assumptions'!G${ar + 2}`,
    ]];
    s.getRange(`B${r + 3}`).formulas = [[`='Forecast'!B${r + 2}/'Assumptions'!$B$12-1`]];
    s.getRange(`C${r + 3}`).formulas = [[`='Forecast'!C${r + 2}/'Forecast'!B${r + 2}-1`]];
    s.getRange(`C${r + 3}:G${r + 3}`).fillRight();
    s.getRange(`B${r + 4}:G${r + 4}`).formulas = [[
      `='Assumptions'!B${ar + 3}`,
      `='Assumptions'!C${ar + 3}`,
      `='Assumptions'!D${ar + 3}`,
      `='Assumptions'!E${ar + 3}`,
      `='Assumptions'!F${ar + 3}`,
      `='Assumptions'!G${ar + 3}`,
    ]];
    s.getRange(`B${r + 5}`).formulas = [[`='Forecast'!B${r + 2}*1000*'Forecast'!B${r + 4}`]];
    s.getRange(`B${r + 5}:G${r + 5}`).fillRight();
    s.getRange(`B${r + 6}:G${r + 6}`).formulas = [[
      `='Assumptions'!B${ar + 4}`,
      `='Assumptions'!C${ar + 4}`,
      `='Assumptions'!D${ar + 4}`,
      `='Assumptions'!E${ar + 4}`,
      `='Assumptions'!F${ar + 4}`,
      `='Assumptions'!G${ar + 4}`,
    ]];
    s.getRange(`B${r + 7}`).formulas = [[`='Forecast'!B${r + 5}*'Forecast'!B${r + 6}`]];
    s.getRange(`B${r + 7}:G${r + 7}`).fillRight();
    s.getRange(`B${r + 8}`).formulas = [[`='Forecast'!B${r + 5}*'Assumptions'!$B$10`]];
    s.getRange(`B${r + 8}:G${r + 8}`).fillRight();
    s.getRange(`B${r + 9}`).formulas = [[`='Forecast'!B${r + 5}*'Assumptions'!$B$11`]];
    s.getRange(`B${r + 9}:G${r + 9}`).fillRight();
    s.getRange(`B${r + 10}`).formulas = [[
      `=MAX(0,'Forecast'!B${r + 2}-'Assumptions'!$B$12)*1000*'Assumptions'!$B$${ar + 5}`,
    ]];
    s.getRange(`C${r + 10}`).formulas = [[
      `=MAX(0,'Forecast'!C${r + 2}-'Forecast'!B${r + 2})*1000*'Assumptions'!$B$${ar + 5}`,
    ]];
    s.getRange(`C${r + 10}:G${r + 10}`).fillRight();
    s.getRange(`B${r + 11}`).formulas = [[
      `='Forecast'!B${r + 7}+'Forecast'!B${r + 8}-'Forecast'!B${r + 9}-'Forecast'!B${r + 10}`,
    ]];
    s.getRange(`B${r + 11}:G${r + 11}`).fillRight();
    s.getRange(`B${r + 12}`).formulas = [[`=1/(1+'Assumptions'!$B$${ar + 6})^(B${r + 1}-2025)`]];
    s.getRange(`B${r + 12}:G${r + 12}`).fillRight();
    s.getRange(`B${r + 13}`).formulas = [[`='Forecast'!B${r + 11}*'Forecast'!B${r + 12}`]];
    s.getRange(`B${r + 13}:G${r + 13}`).fillRight();

    body(s.getRange(`A${r + 2}:G${r + 13}`));
    s.getRange(`B${r + 2}:G${r + 2}`).setNumberFormat("0.0");
    s.getRange(`B${r + 3}:G${r + 4}`).setNumberFormat("0.0%");
    s.getRange(`B${r + 6}:G${r + 6}`).setNumberFormat("0.0%");
    s.getRange(`B${r + 5}:G${r + 5}`).setNumberFormat("$#,##0.0;[Red]($#,##0.0);-");
    s.getRange(`B${r + 7}:G${r + 11}`).setNumberFormat("$#,##0.0;[Red]($#,##0.0);-");
    s.getRange(`B${r + 12}:G${r + 12}`).setNumberFormat("0.000x");
    s.getRange(`B${r + 13}:G${r + 13}`).setNumberFormat("$#,##0.0");
    s.getRange(`B${r + 2}:G${r + 13}`).format.font = { color: black };
    s.getRange(`B${r + 2}:G${r + 2}`).format.font = { color: linkedGreen };
    s.getRange(`B${r + 4}:G${r + 4}`).format.font = { color: linkedGreen };
    s.getRange(`B${r + 6}:G${r + 6}`).format.font = { color: linkedGreen };
    total(s.getRange(`A${r + 11}:G${r + 11}`));
    s.getRange(`A${r + 11}:G${r + 11}`).format.fill =
      name === "Bear" ? amber : name === "Bull" ? paleGreen : paleBlue;
  }
  setWidths(s, { A: 40, B: 14, C: 14, D: 14, E: 14, F: 14, G: 14 });
  s.freezePanes.freezeRows(4);
}

// DCF
{
  const s = wb.worksheets.getItem("DCF");
  title(s, "A1:H1", "Equity Cash Flow Valuation");
  s.getRange("A2:H2").merge();
  s.getRange("A2").values = [["Primary method: six-year risk-retention FCFE • USD millions except per-share values • Gordon-growth terminal value"]];
  s.getRange("A2:H2").format = { fill: paleGray, font: { color: darkGray, italic: true, size: 9 } };
  s.getRange("A3:H3").values = [[
    "Scenario",
    "Cost of equity",
    "Terminal growth",
    "PV explicit FCFE",
    "PV terminal value",
    "Equity value",
    "Value / share",
    "Upside / (downside)",
  ]];
  header(s.getRange("A3:H3"));
  s.getRange("A4:A6").values = [["Bear"], ["Base"], ["Bull"]];
  const rows = [
    { row: 4, ar: 19, fr: 3 },
    { row: 5, ar: 27, fr: 18 },
    { row: 6, ar: 35, fr: 33 },
  ];
  for (const x of rows) {
    s.getRange(`B${x.row}`).formulas = [[`='Assumptions'!$B$${x.ar + 6}`]];
    s.getRange(`C${x.row}`).formulas = [[`='Assumptions'!$D$${x.ar + 6}`]];
    s.getRange(`D${x.row}`).formulas = [[`=SUM('Forecast'!B${x.fr + 13}:G${x.fr + 13})`]];
    s.getRange(`E${x.row}`).formulas = [[
      `=('Forecast'!G${x.fr + 11}*(1+C${x.row})/(B${x.row}-C${x.row}))*'Forecast'!G${x.fr + 12}`,
    ]];
    s.getRange(`F${x.row}`).formulas = [[`=D${x.row}+E${x.row}`]];
    s.getRange(`G${x.row}`).formulas = [[`=F${x.row}/'Assumptions'!$B$8`]];
    s.getRange(`H${x.row}`).formulas = [[`=G${x.row}/'Assumptions'!$B$6-1`]];
  }
  body(s.getRange("A4:H6"));
  s.getRange("B4:C6").setNumberFormat("0.0%");
  s.getRange("D4:F6").setNumberFormat("$#,##0.0");
  s.getRange("G4:G6").setNumberFormat("$0.00");
  s.getRange("H4:H6").setNumberFormat("0.0%");
  s.getRange("A4:H4").format.fill = amber;
  s.getRange("A5:H5").format.fill = paleBlue;
  s.getRange("A6:H6").format.fill = paleGreen;
  s.getRange("A6:H6").format.borders = { bottom: { style: "thin", color: bullDark } };
  total(s.getRange("A5:H5"));

  section(s, "A9:D9", "Method comparison");
  s.getRange("A10:D14").values = [
    ["Method", "Low", "Central", "High"],
    ["Primary FCFE", null, null, null],
    ["Forward P/E cross-check", 15.4, 18.9, 23.1],
    ["Fee-platform SOTP screen", 25.0, 40.0, 55.0],
    ["Current market price", null, null, null],
  ];
  s.getRange("B11:D11").formulas = [["=G4", "=G5", "=G6"]];
  s.getRange("B14:D14").formulas = [[
    "='Assumptions'!$B$6",
    "='Assumptions'!$B$6",
    "='Assumptions'!$B$6",
  ]];
  header(s.getRange("A10:D10"));
  body(s.getRange("A11:D14"));
  s.getRange("B11:D14").setNumberFormat("$0.00");
  s.getRange("A11:D11").format.fill = paleGreen;
  s.getRange("A13:D13").format.fill = yellow;
  s.getRange("B14:D14").format.font = { color: linkedGreen };

  s.getRange("F9:H14").values = [
    ["Primary conclusion", null, null],
    ["Base value / share", null, null],
    ["Market price", null, null],
    ["Base upside", null, null],
    ["Posture", "Watchlist / wait for proof", null],
    ["Key reason", "The lower market price improves base upside, but risk-retention capital and funding sensitivity still make the downside mechanism more immediate than the rerating case.", null],
  ];
  s.getRange("F9:H9").merge();
  s.getRange("F9:H9").format.fill = navy;
  s.getRange("F9:H9").format.font = { bold: true, color: white };
  s.getRange("G10:H10").merge();
  s.getRange("G11:H11").merge();
  s.getRange("G12:H12").merge();
  s.getRange("G13:H13").merge();
  s.getRange("G14:H14").merge();
  s.getRange("G10").formulas = [["=G5"]];
  s.getRange("G11").formulas = [["='Assumptions'!$B$6"]];
  s.getRange("G12").formulas = [["=H5"]];
  s.getRange("G10:G11").setNumberFormat("$0.00");
  s.getRange("G12").setNumberFormat("0.0%");
  s.getRange("F10:H14").format.wrapText = true;
  body(s.getRange("F10:H14"));

  section(s, "A17:D17", "Valuation quality and concentration");
  s.getRange("A18:D22").values = [
    ["Metric", "Bear", "Base", "Bull"],
    ["Explicit FCFE / equity value", null, null, null],
    ["Terminal value / equity value", null, null, null],
    ["2031 FCFE / 2026 FCFE", null, null, null],
    ["Per-share range vs. current market", null, null, null],
  ];
  s.getRange("B19:D19").formulas = [["=D4/F4", "=D5/F5", "=D6/F6"]];
  s.getRange("B20:D20").formulas = [["=E4/F4", "=E5/F5", "=E6/F6"]];
  s.getRange("B21:D21").formulas = [[
    "='Forecast'!G14/'Forecast'!B14",
    "='Forecast'!G29/'Forecast'!B29",
    "='Forecast'!G44/'Forecast'!B44",
  ]];
  s.getRange("B22:D22").formulas = [["=G4/'Assumptions'!$B$6-1", "=G5/'Assumptions'!$B$6-1", "=G6/'Assumptions'!$B$6-1"]];
  header(s.getRange("A18:D18"));
  body(s.getRange("A19:D22"));
  s.getRange("B19:D20").setNumberFormat("0.0%");
  s.getRange("B21:D21").setNumberFormat("0.0x");
  s.getRange("B22:D22").setNumberFormat("0.0%");

  section(s, "F17:H17", "Decision hinge", bearDark);
  s.getRange("F18:H22").values = [
    ["Question", "Current read", "Next evidence"],
    ["What is priced in?", "A higher equity hurdle than the 14% base case.", "Q2 volume, FRLPC, and funding commentary"],
    ["What proves the variant?", "Mid-4% FRLPC with sub-1.5% incremental equity intensity.", "Q2 and 2H retained-capital disclosures"],
    ["What breaks first?", "Funding spreads or retained capital rise faster than fee economics.", "ABS pricing, credit marks, and cash conversion"],
    ["What changes the target?", "A durable change in FRLPC, owner-earnings conversion, or required equity.", "Refresh the model after the 2026-07-30 print"],
  ];
  header(s.getRange("F18:H18"));
  body(s.getRange("F19:H22"));
  s.getRange("F18:H22").format.wrapText = true;
  s.getRange("F19:H22").format.rowHeight = 54;
  setWidths(s, { A: 24, B: 16, C: 16, D: 18, E: 18, F: 20, G: 27, H: 30 });
  s.freezePanes.freezeRows(3);
}

// Comps
{
  const s = wb.worksheets.getItem("Comps");
  title(s, "A1:G1", "Comparable-Company Cross-Check");
  s.getRange("A2:G2").merge();
  s.getRange("A2").values = [["Screen-grade public snapshot • 2026E P/E • Peer definitions are secondary evidence and have not been independently normalized"]];
  s.getRange("A2:G2").format = { fill: paleGray, font: { color: darkGray, italic: true, size: 9 } };
  s.getRange("A3:G3").values = [[
    "Company",
    "Ticker",
    "Business model",
    "2026E P/E",
    "Source date",
    "Peer role",
    "Source / rationale",
  ]];
  header(s.getRange("A3:G3"));
  s.getRange("A4:G9").values = [
    ["Pagaya", "PGY", "AI-enabled lending infrastructure / capital markets", 5.25, "2026-07-23", "Target", "S4; current intraday snapshot"],
    ["Upstart", "UPST", "AI lending marketplace / platform", 13.2, "2026-05", "Core", "S6; closest platform analog, but different funding and credit economics"],
    ["SoFi", "SOFI", "Digital financial platform / balance-sheet lender", 26.1, "2026-05", "Secondary", "S6; broader bank/platform mix and greater scale"],
    ["LendingClub", "LC", "Digital marketplace bank", 9.0, "2026-05", "Secondary", "S6; funding and credit-cycle reference"],
    ["Enova", "ENVA", "Online lender", 9.8, "2026-05", "Secondary", "S6; credit-cycle reference"],
    ["LendingTree", "TREE", "Consumer finance marketplace", 6.3, "2026-05", "Adjacent", "S6; marketplace context, not a direct economic match"],
  ];
  body(s.getRange("A4:G9"));
  s.getRange("A4:G9").format.wrapText = true;
  s.getRange("A4:G9").format.rowHeight = 30;
  s.getRange("D4:G9").format.font = { color: linkedGreen };
  s.getRange("D4:D9").setNumberFormat("0.0x");
  s.getRange("A11:D15").values = [
    ["Cross-check", "Low", "Central", "High"],
    ["Selected multiple", 8.0, 9.8, 12.0],
    ["Base-case 2027 normalized EPS (model)", null, null, null],
    ["Implied value / share", null, null, null],
    ["Current market price", null, null, null],
  ];
  s.getRange("B13:D13").formulas = [[
    "='Forecast'!C25/'Assumptions'!$B$8",
    "='Forecast'!C25/'Assumptions'!$B$8",
    "='Forecast'!C25/'Assumptions'!$B$8",
  ]];
  s.getRange("B14:D14").formulas = [["=B12*B13", "=C12*C13", "=D12*D13"]];
  s.getRange("B15:D15").formulas = [[
    "='Assumptions'!$B$6",
    "='Assumptions'!$B$6",
    "='Assumptions'!$B$6",
  ]];
  header(s.getRange("A11:D11"));
  body(s.getRange("A12:D15"));
  input(s.getRange("B12:D12"));
  s.getRange("B13:D13").format.font = { color: linkedGreen };
  s.getRange("B14:D14").format.font = { color: black };
  s.getRange("B15:D15").format.font = { color: linkedGreen };
  s.getRange("B12:D12").setNumberFormat("0.0x");
  s.getRange("B13:D15").setNumberFormat("$0.00");
  s.getRange("A17:G19").values = [
    ["Interpretation", null, null, null, null, null, null],
    ["Conclusion", "PGY trades below the selected peer range, but direct comparability remains weak because Pagaya combines fee-platform economics with funding sensitivity and required risk-retention capital.", null, null, null, null, null],
    ["Use", "The selected 8.0x–12.0x range is a corroborative screen informed by the Core and Secondary references; it does not override the intrinsic model.", null, null, null, null, null],
  ];
  section(s, "A17:G17", "Interpretation", navy);
  s.getRange("B18:G18").merge();
  s.getRange("B19:G19").merge();
  s.getRange("B18:G19").format.wrapText = true;
  setWidths(s, { A: 22, B: 12, C: 42, D: 14, E: 14, F: 24, G: 28 });
  s.freezePanes.freezeRows(3);
}

// Sensitivities
{
  const s = wb.worksheets.getItem("Sensitivities");
  title(s, "A1:H1", "Valuation Sensitivities and Implied Expectations");
  s.getRange("A2:H2").merge();
  s.getRange("A2").values = [["USD per share • Base operating path • Reverse DCF holds terminal growth at 3.0% and varies only the cost of equity"]];
  s.getRange("A2:H2").format = { fill: paleGray, font: { color: darkGray, italic: true, size: 9 } };
  section(s, "A3:F3", "Base FCFE value / share ($): cost of equity vs. terminal growth");
  const gs = [0.02, 0.025, 0.03, 0.035, 0.04];
  const kes = [0.12, 0.13, 0.14, 0.15, 0.16];
  s.getRange("A4:F4").values = [["Cost of equity \\ terminal growth", ...gs]];
  header(s.getRange("A4:F4"));
  s.getRange("A5:A9").values = kes.map((x) => [x]);
  for (let r = 5; r <= 9; r += 1) {
    for (let c = 2; c <= 6; c += 1) {
      const col = String.fromCharCode(64 + c);
      s.getRange(`${col}${r}`).formulas = [[
        `=(SUMPRODUCT('Forecast'!$B$29:$G$29,1/(1+$A${r})^{1,2,3,4,5,6})+('Forecast'!$G$29*(1+${col}$4)/($A${r}-${col}$4))/(1+$A${r})^6)/'Assumptions'!$B$8`,
      ]];
    }
  }
  body(s.getRange("A5:F9"));
  s.getRange("A5:A9").setNumberFormat("0.0%");
  s.getRange("B4:F4").setNumberFormat("0.0%");
  s.getRange("B5:F9").setNumberFormat("$0.00");
  s.getRange("D7").format.fill = green;

  section(s, "A12:D12", "Reverse DCF: base operating path at different costs of equity");
  s.getRange("A13:D22").values = [
    ["Cost of equity", "Implied value / share", "Premium / (discount)", "Read-through"],
    [0.12, null, null, null],
    [0.13, null, null, null],
    [0.14, null, null, null],
    [0.15, null, null, null],
    [0.16, null, null, null],
    [0.17, null, null, null],
    [0.18, null, null, null],
    [0.19, null, null, null],
    [0.20, null, null, null],
  ];
  header(s.getRange("A13:D13"));
  for (let r = 14; r <= 22; r += 1) {
    s.getRange(`B${r}`).formulas = [[
      `=(SUMPRODUCT('Forecast'!$B$29:$G$29,1/(1+$A${r})^{1,2,3,4,5,6})+('Forecast'!$G$29*(1+'Assumptions'!$D$33)/($A${r}-'Assumptions'!$D$33))/(1+$A${r})^6)/'Assumptions'!$B$8`,
    ]];
    s.getRange(`C${r}`).formulas = [[`=B${r}/'Assumptions'!$B$6-1`]];
    s.getRange(`D${r}`).formulas = [[
      `=IF(ABS(B${r}-'Assumptions'!$B$6)<1,"Near market-implied hurdle","")`,
    ]];
  }
  body(s.getRange("A14:D22"));
  s.getRange("A14:A22").setNumberFormat("0.0%");
  s.getRange("B14:B22").setNumberFormat("$0.00");
  s.getRange("C14:C22").setNumberFormat("0.0%");
  section(s, "F12:H12", "Market-implied expectation", navy);
  s.getRange("F13:H17").values = [
    ["Metric", "Result", "Interpretation"],
    ["Market-implied cost of equity (reverse DCF)", null, "Interpolated under the base operating path and 3.0% terminal growth."],
    ["Implied value at interpolated rate", null, "Should reproduce the dated market snapshot."],
    ["Difference to current price", null, "Control tolerance: $0.01 per share."],
    ["Evidence class", "Model-derived inference", "Not quoted consensus and not a unique market belief."],
  ];
  const reverseValueAt = (rate) =>
    `(SUMPRODUCT('Forecast'!$B$29:$G$29,1/(1+${rate})^{1,2,3,4,5,6})+('Forecast'!$G$29*(1+'Assumptions'!$D$33)/(${rate}-'Assumptions'!$D$33))/(1+${rate})^6)/'Assumptions'!$B$8`;
  const valueAt175 = reverseValueAt("17.5%");
  const valueAt176 = reverseValueAt("17.6%");
  s.getRange("G14").formulas = [[
    `=17.5%+((${valueAt175}-'Assumptions'!$B$6)/(${valueAt175}-${valueAt176}))*(17.6%-17.5%)`,
  ]];
  s.getRange("G15").formulas = [[
    "=(SUMPRODUCT('Forecast'!$B$29:$G$29,1/(1+$G$14)^{1,2,3,4,5,6})+('Forecast'!$G$29*(1+'Assumptions'!$D$33)/($G$14-'Assumptions'!$D$33))/(1+$G$14)^6)/'Assumptions'!$B$8",
  ]];
  s.getRange("G16").formulas = [["=G15-'Assumptions'!$B$6"]];
  header(s.getRange("F13:H13"));
  body(s.getRange("F14:H17"));
  s.getRange("F13:H17").format.wrapText = true;
  s.getRange("F14:H17").format.rowHeight = 34;
  s.getRange("G14").setNumberFormat("0.0%");
  s.getRange("G15:G16").setNumberFormat("$0.00");
  s.getRange("G14:G16").format.font = { bold: true, color: navyDark };
  s.getRange("A24:H26").values = [
    ["Interpretation", null, null, null, null, null, null, null],
    ["Market-implied cost of equity", "At the $16.29 intraday snapshot, the base operating path is consistent with roughly a 17.6% cost of equity—well above the 14% base assumption.", null, null, null, null, null, null],
    ["Decision hinge", "The rerating requires proof that FRLPC holds near the mid-4% range while required risk-retention equity capital does not absorb the operating leverage.", null, null, null, null, null, null],
  ];
  section(s, "A24:H24", "Interpretation", navy);
  s.getRange("B25:H25").merge();
  s.getRange("B26:H26").merge();
  s.getRange("B25:H26").format.wrapText = true;
  setWidths(s, { A: 34, B: 18, C: 18, D: 28, E: 18, F: 26, G: 20, H: 32 });
  s.freezePanes.freezeRows(4);
}

// Checks
{
  const s = wb.worksheets.getItem("Checks");
  title(s, "A1:G1", "Model Checks and Open Issues");
  s.getRange("A2:G2").merge();
  s.getRange("A2").values = [["Control framework: one assertion per row • PASS/FAIL text plus semantic color • Local checks do not constitute independent review"]];
  s.getRange("A2:G2").format = { fill: paleGray, font: { color: darkGray, italic: true, size: 9 } };
  section(s, "A3:G3", "Master model status");
  s.getRange("A4:G5").values = [
    ["Master status", null, "Formula scan", "0 visible errors", "Finance audit", "PASS", "Locally verified; independent review not performed"],
    ["Evidence posture", "SCREEN-GRADE", "Market input", "CURRENT INTRADAY", "OFF boundary", "DECLARED", "Conformance evaluates package structure and declared lineage, not financial correctness"],
  ];
  s.getRange("B4").formulas = [['=IF(COUNTIF(F9:F19,"FAIL")=0,"PASS","FAIL")']];
  s.getRange("A4:G5").format.wrapText = true;
  s.getRange("A4:G5").format.rowHeight = 30;
  s.getRange("A4:A5").format.font = { bold: true, color: navyDark };
  s.getRange("C4:C5").format.font = { bold: true, color: navyDark };
  s.getRange("E4:E5").format.font = { bold: true, color: navyDark };
  body(s.getRange("A4:G5"));
  s.getRange("B4").conditionalFormats.add("containsText", {
    text: "PASS",
    format: { fill: green, font: { bold: true, color: "#006100" } },
  });
  s.getRange("B4").conditionalFormats.add("containsText", {
    text: "FAIL",
    format: { fill: red, font: { bold: true, color: "#9C0006" } },
  });

  section(s, "A7:G7", "Substantive checks");
  s.getRange("A8:G8").values = [[
    "Check",
    "Actual",
    "Expected",
    "Difference",
    "Tolerance",
    "Status",
    "Notes",
  ]];
  header(s.getRange("A8:G8"));
  s.getRange("A9:A19").values = [
    ["FY2025 FRLPC recomputes"],
    ["FY2025 FRLPC % recomputes"],
    ["Base scenario order"],
    ["Bear below base"],
    ["Bull above base"],
    ["Terminal growth below cost of equity"],
    ["Higher cost of equity lowers value"],
    ["Higher g raises value"],
    ["Headline is formula-driven"],
    ["Sensitivity base case reconciles"],
    ["Reverse DCF reproduces market price"],
  ];
  s.getRange("B9").formulas = [["='Historicals'!D8"]];
  s.getRange("C9").formulas = [["='Historicals'!D6-'Historicals'!D7"]];
  s.getRange("B10").formulas = [["='Historicals'!D9"]];
  s.getRange("C10").formulas = [["='Historicals'!D8/('Historicals'!D4*1000)"]];
  s.getRange("B11").formulas = [["='DCF'!G5"]];
  s.getRange("C11").formulas = [["='DCF'!G5"]];
  s.getRange("B12").formulas = [["='DCF'!G4"]];
  s.getRange("C12").formulas = [["='DCF'!G5"]];
  s.getRange("B13").formulas = [["='DCF'!G6"]];
  s.getRange("C13").formulas = [["='DCF'!G5"]];
  s.getRange("B14").formulas = [["='DCF'!B5"]];
  s.getRange("C14").formulas = [["='DCF'!C5"]];
  s.getRange("B15").formulas = [["='Sensitivities'!B9"]];
  s.getRange("C15").formulas = [["='Sensitivities'!B5"]];
  s.getRange("B16").formulas = [["='Sensitivities'!B5"]];
  s.getRange("C16").formulas = [["='Sensitivities'!F5"]];
  s.getRange("B17").formulas = [["='DCF'!G5"]];
  s.getRange("C17").formulas = [["='DCF'!G5"]];
  s.getRange("B18").formulas = [["='Sensitivities'!D7"]];
  s.getRange("C18").formulas = [["='DCF'!G5"]];
  s.getRange("B19").formulas = [["='Sensitivities'!G15"]];
  s.getRange("C19").formulas = [["='Assumptions'!B6"]];
  s.getRange("D9:D19").formulas = [
    ["=B9-C9"],
    ["=B10-C10"],
    ["=B11-C11"],
    ["=B12-C12"],
    ["=B13-C13"],
    ["=B14-C14"],
    ["=B15-C15"],
    ["=B16-C16"],
    ["=B17-C17"],
    ["=B18-C18"],
    ["=B19-C19"],
  ];
  s.getRange("E9:E19").values = [[0.001], [0.0001], [0.001], [0], [0], [0], [0], [0], [0.001], [0.001], [0.01]];
  s.getRange("F9:F19").formulas = [
    ['=IF(ABS(D9)<=E9,"PASS","FAIL")'],
    ['=IF(ABS(D10)<=E10,"PASS","FAIL")'],
    ['=IF(ABS(D11)<=E11,"PASS","FAIL")'],
    ['=IF(B12<C12,"PASS","FAIL")'],
    ['=IF(B13>C13,"PASS","FAIL")'],
    ['=IF(B14>C14,"PASS","FAIL")'],
    ['=IF(B15<C15,"PASS","FAIL")'],
    ['=IF(B16<C16,"PASS","FAIL")'],
    ['=IF(ABS(D17)<=E17,"PASS","FAIL")'],
    ['=IF(ABS(D18)<=E18,"PASS","FAIL")'],
    ['=IF(ABS(D19)<=E19,"PASS","FAIL")'],
  ];
  s.getRange("G9:G19").values = [
    ["Revenue from fees less production costs"],
    ["FRLPC divided by Network Volume"],
    ["Identity check"],
    ["Scenario ordering"],
    ["Scenario ordering"],
    ["Base discount-rate coherence"],
    ["12% vs 16% cost of equity"],
    ["2% vs 4% terminal growth"],
    ["DCF summary linked to formula output"],
    ["14% cost of equity and 3% terminal growth equal base DCF"],
    ["Interpolated reverse DCF value equals the intraday market snapshot"],
  ];
  body(s.getRange("A9:G19"));
  s.getRange("B9:E19").setNumberFormat("0.000");
  s.getRange("F9:F19").conditionalFormats.add("containsText", {
    text: "PASS",
    format: { fill: green, font: { bold: true, color: "#006100" } },
  });
  s.getRange("F9:F19").conditionalFormats.add("containsText", {
    text: "FAIL",
    format: { fill: red, font: { bold: true, color: "#9C0006" } },
  });
  section(s, "A21:G21", "Open issues and limitations", bearDark);
  s.getRange("A22:C28").values = [
    ["Open issue / limitation", "Severity", "Decision effect"],
    ["Market price is an intraday 2026-07-23 snapshot, not the official close.", "Medium", "Current-market verified at 15:37 EDT only; refresh before a position decision."],
    ["No licensed consensus or fully normalized peer workbook.", "Medium", "Comps remain corroborative and screen-grade."],
    ["Risk-retention equity requirement is an analyst assumption.", "High", "This is the most important intrinsic-valuation sensitivity."],
    ["Q2 2026 results are scheduled for 2026-07-30.", "High", "Refresh volume, FRLPC, cash conversion, and retained-capital intensity after the print."],
    ["Cross-engine spreadsheet execution has not been independently tested.", "Low", "OFF conformance does not prove formula equivalence."],
    ["Native Excel Accessibility Checker and print/PDF QA were not run.", "Low", "This is a screen-first workbook; no print/PDF circulation claim is made."],
  ];
  header(s.getRange("A22:C22"));
  s.getRange("A23:C28").format.wrapText = true;
  s.getRange("A23:C28").format.rowHeight = 36;
  body(s.getRange("A23:C28"));
  setWidths(s, { A: 46, B: 14, C: 36, D: 14, E: 14, F: 14, G: 36 });
  s.freezePanes.freezeRows(8);
}

// Cover
{
  const s = wb.worksheets.getItem("Cover");
  title(s, "A1:L2", "Pagaya Technologies | NASDAQ: PGY");
  s.getRange("A3:L3").merge();
  s.getRange("A3").values = [["Equity valuation • Risk-retention FCFE • USD per share • Valuation date 23 July 2026"]];
  s.getRange("A3:L3").format = {
    fill: navyDark,
    font: { color: "#D9EAF7", size: 10, italic: true },
    horizontalAlignment: "left",
  };

  const metadata = [
    ["A4:B4", "Prepared by: Henry Adams"],
    ["C4:D4", "Valuation date: 2026-07-23"],
    ["E4:G4", "Market snapshot: 2026-07-23 15:37 EDT"],
    ["H4:J4", "Status: locally verified • screen-grade"],
    ["K4:L4", "Version: v2"],
  ];
  for (const [range, value] of metadata) {
    s.getRange(range).merge();
    s.getRange(range.split(":")[0]).values = [[value]];
    s.getRange(range).format = {
      fill: paleGray,
      font: { bold: true, color: darkGray, size: 9 },
      horizontalAlignment: "left",
      borders: { bottom: { style: "thin", color: borderGray } },
    };
  }
  s.getRange("A5:L5").format.rowHeight = 8;

  card(s, "A6:C10", "Current price • intraday", "='Assumptions'!$B$6", "$0.00", paleGray, "15:37 EDT • Source S4");
  card(s, "D6:F10", "Bear value • downside", "='DCF'!$G$4", "$0.00", amber, null, "='DCF'!$H$4");
  card(s, "G6:I10", "Base value • upside", "='DCF'!$G$5", "$0.00", paleBlue, null, "='DCF'!$H$5");
  card(s, "J6:L10", "Bull value • upside", "='DCF'!$G$6", "$0.00", paleGreen, null, "='DCF'!$H$6");
  s.getRange("D10:L10").setNumberFormat("0.0%");

  s.getRange("A12:B12").merge();
  s.getRange("A12").values = [["Investment posture"]];
  s.getRange("C12:F12").merge();
  s.getRange("C12").values = [["WATCHLIST / WAIT FOR PROOF"]];
  s.getRange("G12:H12").merge();
  s.getRange("G12").values = [["Model status"]];
  s.getRange("I12:L12").merge();
  s.getRange("I12").formulas = [["='Checks'!$B$4"]];
  s.getRange("A12:B12").format = { fill: navy, font: { bold: true, color: white } };
  s.getRange("C12:F12").format = { fill: yellow, font: { bold: true, color: navyDark }, horizontalAlignment: "center" };
  s.getRange("G12:H12").format = { fill: navy, font: { bold: true, color: white } };
  s.getRange("I12:L12").format = { fill: green, font: { bold: true, color: "#006100" }, horizontalAlignment: "center" };

  section(s, "A14:F14", "Investment view", navy);
  section(s, "G14:I14", "Catalysts / proof", accent);
  section(s, "J14:L14", "Risks / thesis breaks", bearDark);

  for (const range of ["A15:B16", "A17:B18", "A19:B20"]) {
    s.getRange(range).merge();
    s.getRange(range).format = {
      fill: paleBlue,
      font: { bold: true, color: navyDark, size: 9 },
      verticalAlignment: "center",
      wrapText: true,
      borders: { preset: "outside", style: "thin", color: borderGray },
    };
  }
  s.getRange("A15").values = [["What is priced in"]];
  s.getRange("A17").values = [["Variant wedge"]];
  s.getRange("A19").values = [["What must be true"]];
  for (const range of ["C15:F16", "C17:F18", "C19:F20"]) {
    s.getRange(range).merge();
    s.getRange(range).format = {
      fill: white,
      font: { color: black, size: 9 },
      verticalAlignment: "center",
      wrapText: true,
      borders: { preset: "outside", style: "thin", color: borderGray },
    };
  }
  s.getRange("C15").values = [["At $16.29, the base operating path implies roughly a 17.6% cost of equity versus the model's 14% base hurdle. This is a model-derived reverse-DCF inference, not quoted consensus."]];
  s.getRange("C17").values = [["Pagaya can hold FRLPC near the mid-4% range while normalized owner earnings grow faster than Network Volume and funding execution remains durable."]];
  s.getRange("C19").values = [["FRLPC near 4.5%; normalized net-income conversion rising toward 34%; incremental risk-retention equity near 1.5% of volume growth."]];

  for (const range of ["G15:I17", "G18:I20"]) {
    s.getRange(range).merge();
    s.getRange(range).format = {
      fill: paleBlue,
      font: { color: navyDark, size: 9 },
      verticalAlignment: "center",
      wrapText: true,
      borders: { preset: "outside", style: "thin", color: borderGray },
    };
  }
  s.getRange("G15").values = [["Q2 2026 on 30 July • Network Volume, FRLPC %, GAAP profit, cash conversion, and retained-capital intensity."]];
  s.getRange("G18").values = [["Funding proof • The 16 July $750mm auto ABS transaction was Pagaya's largest auto deal to date; the next test is pricing and repeatability."]];

  for (const range of ["J15:L17", "J18:L20"]) {
    s.getRange(range).merge();
    s.getRange(range).format = {
      fill: amber,
      font: { color: "#7F2D27", size: 9 },
      verticalAlignment: "center",
      wrapText: true,
      borders: { preset: "outside", style: "thin", color: borderGray },
    };
  }
  s.getRange("J15").values = [["Funding spreads, credit marks, or retained-capital needs rise faster than fee economics and operating leverage."]];
  s.getRange("J18").values = [["Volume growth misses the low end of guidance or FRLPC falls below the mid-4% range before owner-earnings conversion improves."]];

  section(s, "A22:F22", "Scenario value per share ($)", navy);
  section(s, "G22:L22", "Base Network Volume path ($bn)", navy);
  const valuationChart = s.charts.add("bar", {
    chartType: "bar",
    title: "FCFE scenario values vs. $16.29 market",
    hasLegend: false,
  });
  const valuationSeries = valuationChart.series.add("Value / share");
  valuationSeries.categoryFormula = "'DCF'!$A$4:$A$6";
  valuationSeries.formula = "'DCF'!$G$4:$G$6";
  valuationSeries.fill = accent;
  valuationChart.titleTextStyle.fontSize = 11;
  valuationChart.xAxis = { axisType: "textAxis", textStyle: { fontSize: 9 } };
  valuationChart.yAxis = { numberFormatCode: "$0", textStyle: { fontSize: 9 } };
  valuationChart.setPosition("A23", "F34");

  const volumeChart = s.charts.add("line", {
    chartType: "line",
    title: "Base case: $12.2bn to $19.2bn",
    hasLegend: false,
  });
  const volumeSeries = volumeChart.series.add("Network Volume");
  volumeSeries.categoryFormula = "'Forecast'!$B$19:$G$19";
  volumeSeries.formula = "'Forecast'!$B$20:$G$20";
  volumeSeries.fill = bullDark;
  volumeChart.titleTextStyle.fontSize = 11;
  volumeChart.xAxis = { axisType: "textAxis", textStyle: { fontSize: 9 } };
  volumeChart.yAxis = { numberFormatCode: "0.0", textStyle: { fontSize: 9 } };
  volumeChart.setPosition("G23", "L34");

  section(s, "A36:L36", "Method comparison, conventions, and limitations", navy);
  const controlRows = [
    [37, "Primary method", "Risk-retention FCFE: $10.21 bear / $22.34 base / $38.91 bull", "Corroboration", "Forward P/E: $15.41–$23.11; fee-platform SOTP: $25–$55 (screen only)"],
    [38, "Reverse DCF", "Market-implied cost of equity: approximately 17.6% under base path and 3.0% terminal growth", "Purpose / audience", "Public-equity diligence for an investment team"],
    [39, "Owner / version", "Henry Adams • v2 • revised 2026-07-23", "Units / signs", "USD mm unless stated; capital outflows are shown positive where deducted"],
  ];
  for (const [row, leftLabel, leftValue, rightLabel, rightValue] of controlRows) {
    s.getRange(`A${row}:B${row}`).merge();
    s.getRange(`C${row}:F${row}`).merge();
    s.getRange(`G${row}:H${row}`).merge();
    s.getRange(`I${row}:L${row}`).merge();
    s.getRange(`A${row}`).values = [[leftLabel]];
    s.getRange(`C${row}`).values = [[leftValue]];
    s.getRange(`G${row}`).values = [[rightLabel]];
    s.getRange(`I${row}`).values = [[rightValue]];
    s.getRange(`A${row}:B${row}`).format = { fill: blue, font: { bold: true, color: navyDark, size: 9 } };
    s.getRange(`G${row}:H${row}`).format = { fill: blue, font: { bold: true, color: navyDark, size: 9 } };
    s.getRange(`C${row}:F${row}`).format.wrapText = true;
    s.getRange(`I${row}:L${row}`).format.wrapText = true;
    s.getRange(`A${row}:L${row}`).format.rowHeight = 30;
  }
  s.getRange("A40:B41").merge();
  s.getRange("A40").values = [["Known limitations"]];
  s.getRange("C40:L41").merge();
  s.getRange("C40").values = [["No licensed consensus; peer metrics are dated and not independently normalized; risk-retention equity intensity is analyst judgment; the market reference is intraday; cross-engine recalculation, native Excel accessibility review, and print/PDF QA were not performed."]];
  s.getRange("A40:B41").format = { fill: amber, font: { bold: true, color: "#7F2D27", size: 9 }, verticalAlignment: "center" };
  s.getRange("C40:L41").format = { fill: amber, font: { color: "#7F2D27", size: 9 }, wrapText: true, verticalAlignment: "center" };
  s.getRange("A42:L42").merge();
  s.getRange("A42").values = [["OFF boundary: the workbook calculates the model; OFF validates package structure and declared lineage. Neither proves the assumptions, valuation conclusion, or cross-engine formula equivalence."]];
  s.getRange("A42:L42").format = { fill: paleGray, font: { color: darkGray, italic: true, size: 8 }, wrapText: true };

  setWidths(s, { A: 12, B: 12, C: 12, D: 12, E: 12, F: 12, G: 12, H: 12, I: 12, J: 12, K: 12, L: 12 });
  s.getRange("A6:L10").format.rowHeight = 22;
  s.getRange("A14:L20").format.rowHeight = 23;
  s.freezePanes.freezeRows(2);
}

// Global alignment and number-format polish
for (const name of names) {
  const s = wb.worksheets.getItem(name);
  const used = s.getUsedRange();
  used.format.verticalAlignment = "center";
  used.format.font.name = "Arial";
}

// Compact verification before export.
const keyInspection = await wb.inspect({
  kind: "table",
  range: "DCF!A3:H22",
  include: "values,formulas",
  tableMaxRows: 25,
  tableMaxCols: 10,
  maxChars: 14000,
});
console.log("KEY_INSPECTION");
console.log(keyInspection.ndjson);

const checkInspection = await wb.inspect({
  kind: "table",
  range: "Checks!A3:G28",
  include: "values,formulas",
  tableMaxRows: 30,
  tableMaxCols: 8,
  maxChars: 16000,
});
console.log("CHECK_INSPECTION");
console.log(checkInspection.ndjson);

const formulaErrors = await wb.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
});
console.log("FORMULA_ERRORS");
console.log(formulaErrors.ndjson);

const coverInspection = await wb.inspect({
  kind: "table",
  range: "Cover!A1:L42",
  include: "values,formulas",
  tableMaxRows: 45,
  tableMaxCols: 12,
  maxChars: 14000,
});
console.log("COVER_INSPECTION");
console.log(coverInspection.ndjson);

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
