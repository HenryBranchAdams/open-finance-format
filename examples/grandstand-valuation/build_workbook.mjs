import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "/Users/henryadams/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(packageRoot, "outputs", "20260728-grsd-multimethod");
const outputPath = path.join(outputDir, "grandstand-multi-method-valuation-model.xlsx");
await fs.mkdir(outputDir, { recursive: true });

const wb = Workbook.create();
const names = ["Cover", "Sources", "Assumptions", "Historicals", "Forecast", "DCF", "APV", "Market Methods", "Valuation", "Sensitivities", "Checks"];
for (const name of names) wb.worksheets.add(name);
wb.comments.setSelf({ displayName: "Henry Adams" });

const navy = "#1F4E78", navyDark = "#17365D", blue = "#D9EAF7", paleBlue = "#EEF5FA";
const green = "#D9EAD3", yellow = "#FFF2CC", amber = "#FCE4D6", red = "#F4CCCC";
const paleGray = "#F4F6F8", darkGray = "#595959", white = "#FFFFFF", black = "#000000";
const borderGray = "#D9E1E8", inputBlue = "#0000FF";
const money = '#,##0.0;[Red](#,##0.0);–';
const percent = '0.0%;[Red](0.0%);–';
const multiple = '0.0x;[Red](0.0x);–';
const share = '$0.00;[Red]($0.00);–';
const count = '#,##0.0;[Red](#,##0.0);–';

function title(s, range, text) {
  s.getRange(range).merge();
  s.getRange(range.split(":")[0]).values = [[text]];
  s.getRange(range).format = { fill: navy, font: { bold: true, color: white, size: 16, name: "Arial" }, rowHeight: 30, verticalAlignment: "center" };
}
function section(s, range, text, fill = navy) {
  s.getRange(range.split(":")[0]).values = [[text]];
  s.getRange(range).format = { fill, font: { bold: true, color: white, name: "Arial" }, rowHeight: 21, verticalAlignment: "center" };
}
function header(r) {
  r.format = { fill: blue, font: { bold: true, color: black, name: "Arial" }, verticalAlignment: "center", wrapText: true,
    borders: { bottom: { style: "medium", color: "#9FBAD0" }, insideVertical: { style: "thin", color: "#C7D7E5" } } };
}
function total(r) { r.format = { font: { bold: true, color: black }, borders: { top: { style: "thin", color: black }, bottom: { style: "double", color: black } } }; }
function input(r) { r.format = { fill: yellow, font: { color: inputBlue }, borders: { preset: "all", style: "thin", color: "#D6B656" } }; }
function widths(s, values) { for (const [col, width] of Object.entries(values)) s.getRange(`${col}:${col}`).format.columnWidth = width; }
function note(s, range, text) {
  s.getRange(range).merge();
  s.getRange(range.split(":")[0]).values = [[text]];
  s.getRange(range).format = { fill: paleGray, font: { color: darkGray, italic: true, size: 9 }, wrapText: true, verticalAlignment: "top" };
}
function card(s, range, label, formula, fmt, fill, sub) {
  const [start, end] = range.split(":");
  const sc = start.replace(/[0-9]/g, ""), sr = Number(start.replace(/[^0-9]/g, ""));
  const ec = end.replace(/[0-9]/g, ""), er = Number(end.replace(/[^0-9]/g, ""));
  s.getRange(`${sc}${sr}:${ec}${sr}`).merge(); s.getRange(`${sc}${sr}`).values = [[label]];
  s.getRange(`${sc}${sr}:${ec}${sr}`).format = { fill, font: { bold: true, color: darkGray, size: 10 }, horizontalAlignment: "center" };
  s.getRange(`${sc}${sr + 1}:${ec}${er - 1}`).merge(); s.getRange(`${sc}${sr + 1}`).formulas = [[formula]];
  s.getRange(`${sc}${sr + 1}:${ec}${er - 1}`).format = { fill, font: { bold: true, color: navyDark, size: 19 }, horizontalAlignment: "center", verticalAlignment: "center", numberFormat: fmt };
  s.getRange(`${sc}${er}:${ec}${er}`).merge(); s.getRange(`${sc}${er}`).values = [[sub]];
  s.getRange(`${sc}${er}:${ec}${er}`).format = { fill, font: { color: darkGray, size: 8, bold: true }, horizontalAlignment: "center", wrapText: true, borders: { bottom: { style: "medium", color: navy } } };
  s.getRange(range).format.borders = { preset: "outside", style: "thin", color: borderGray };
}
for (const name of names) wb.worksheets.getItem(name).showGridLines = false;

// Sources
{
  const s = wb.worksheets.getItem("Sources");
  title(s, "A1:J1", "Grandstand Limited (GRSD) — Source Register");
  s.getRange("A3:J3").values = [["ID", "Type", "Publisher", "Document", "Date", "Period / as-of", "Location", "URL", "Used for", "Status"]]; header(s.getRange("A3:J3"));
  s.getRange("A4:J10").values = [
    ["S1", "SEC filing", "Grandstand / SEC", "2025 Form 20-F (then Gambling.com Group)", "2026-03-19", "FY2023–FY2025", "F-3 to F-6; MD&A pp. 54–65", "https://www.sec.gov/Archives/edgar/data/1839799/000183979926000048/gamb-20251231.htm", "Audited historicals, cash flow, debt, shares", "Verified primary"],
    ["S2", "SEC filing", "Grandstand / SEC", "Q1 2026 Form 6-K and interim financials", "2026-05-14", "Quarter ended 2026-03-31", "pp. 2–5, 36–58", "https://www.sec.gov/Archives/edgar/data/1839799/000183979926000101/q12026quarterlyfinancials.htm", "Latest balance sheet, Q1 actuals, deferred consideration", "Verified primary"],
    ["S3", "SEC exhibit", "Grandstand / SEC", "Q1 2026 earnings release", "2026-05-14", "FY2026 guidance", "Outlook and restructuring sections", "https://www.sec.gov/Archives/edgar/data/1839799/000183979926000099/gamb-q12026xpressrelease.htm", "Revenue / EBITDA guidance; restructuring target", "Verified primary"],
    ["S4", "Company IR", "Grandstand", "Investor-relations center", "2026-07-22", "As of 2026-07-28", "IR services and news", "https://grandstand.com/investors/ir-services", "GRSD ticker, entity and business-line confirmation", "Verified primary"],
    ["S5", "Market snapshot", "StockAnalysis", "GRSD quote page", "2026-07-27", "2026-07-27 close", "Stock snapshot", "https://stockanalysis.com/stocks/grsd/", "Frozen close $1.95; market-relative diagnostics", "Verified secondary; closing snapshot"],
    ["S6", "Market risk", "Federal Reserve", "H.15 Selected Interest Rates", "2026-07-22", "2026-07-22", "10-year Treasury constant maturity", "https://www.federalreserve.gov/releases/h15/", "USD risk-free-rate reference", "Verified primary"],
    ["S7", "Market risk", "Aswath Damodaran", "Implied Equity Risk Premium", "2026-07-01", "July 2026", "Homepage update", "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/home.htm", "4.18% implied US equity risk premium", "Verified secondary"],
  ];
  s.getRange("A4:J10").format.wrapText = true; s.getRange("A4:J10").format.verticalAlignment = "top"; s.getRange("A4:J10").format.rowHeight = 44;
  widths(s, { A: 9, B: 15, C: 20, D: 32, E: 13, F: 17, G: 24, H: 52, I: 34, J: 22 }); s.freezePanes.freezeRows(3);
}

// Assumptions
{
  const s = wb.worksheets.getItem("Assumptions");
  title(s, "A1:F1", "Grandstand Limited (GRSD) — Assumption Register");
  s.getRange("A3:F3").values = [["Assumption", "Base", "Units", "Type", "Basis / source", "Sensitivity / limitation"]]; header(s.getRange("A3:F3"));
  s.getRange("A4:F40").values = [
    ["Valuation date", 46231, "date", "Sourced", "28-Jul-2026; close frozen at 27-Jul", "Operating source cutoff remains Q1 2026"],
    ["Frozen market price", 1.95, "$/share", "Sourced secondary", "S5; 27-Jul-2026 close", "Refresh before decision use"],
    ["Basic shares outstanding", 35.225096, "mm", "Sourced", "S2; Q1 2026 basic weighted average", "Earnout shares can dilute equity"],
    ["Diluted shares / model denominator", 42.426533, "mm", "Sourced", "S2; Q1 2026 if dilutive", "Conservative denominator"],
    ["Cash", 8.412, "$mm", "Sourced", "S2; 31-Mar-2026", "May be stale after settlements"],
    ["Borrowings + accrued interest", 116.504, "$mm", "Sourced", "S2; current plus non-current", "Debt-like claim"],
    ["Deferred consideration", 36.684, "$mm", "Sourced", "S2; OddsJam 31-Mar-2026", "Debt-like; later settlements not fully modelled"],
    ["Lease liabilities", 4.402, "$mm", "Sourced", "S2; current plus non-current", "Debt-like claim"],
    ["Risk-free rate", 0.0455, "%", "Sourced", "S6; 22-Jul-2026 10-year Treasury", "Use USD rate"],
    ["Equity risk premium", 0.0418, "%", "Sourced secondary", "S7; July 2026 implied ERP", "Not company-specific"],
    ["Levered beta", 1.50, "x", "Analyst assumption", "Small-cap, highly volatile equity", "No licensed beta source"],
    ["Specific / size premium", 0.0480, "%", "Analyst assumption", "Micro-cap, leverage and execution risk", "Principal valuation judgment"],
    ["Cost of equity", null, "%", "Formula", "Rf + beta × ERP + specific premium", "Calculated"],
    ["Pre-tax cost of debt", 0.0900, "%", "Analyst assumption", "Rounded borrowing cost", "Refinancing risk is material"],
    ["Tax rate", 0.2500, "%", "Analyst assumption", "Normalized cash tax", "Statutory tax is volatile"],
    ["Debt weight", 0.3000, "%", "Analyst assumption", "Target capital structure", "Not current book mix"],
    ["WACC", null, "%", "Formula", "Cost of equity / after-tax debt cost", "11–15% tested"],
    ["Terminal growth", 0.0250, "%", "Analyst assumption", "Long-run USD nominal growth", "2.0–3.0% tested"],
    ["Cash tax / FCFF rate", 0.2500, "%", "Analyst assumption", "Normalized cash rate", "Not statutory forecast"],
    ["Exit EBITDA multiple — low", 5.0, "x", "Analyst assumption", "Market-based terminal stress", "Not a peer median"],
    ["Exit EBITDA multiple — mid", 6.0, "x", "Analyst assumption", "Market-based terminal stress", "Not a peer median"],
    ["Exit EBITDA multiple — high", 7.0, "x", "Analyst assumption", "Market-based terminal stress", "Not a peer median"],
    ["EV / revenue multiple — low", 1.0, "x", "Analyst assumption", "Scale / mix stress", "No normalized peer set"],
    ["EV / revenue multiple — mid", 1.5, "x", "Analyst assumption", "Scale / mix stress", "No normalized peer set"],
    ["EV / revenue multiple — high", 2.0, "x", "Analyst assumption", "Scale / mix stress", "No normalized peer set"],
    ["EV / EBITDA multiple — low", 4.0, "x", "Analyst assumption", "Profitability stress", "No normalized peer set"],
    ["EV / EBITDA multiple — mid", 5.0, "x", "Analyst assumption", "Profitability stress", "No normalized peer set"],
    ["EV / EBITDA multiple — high", 6.0, "x", "Analyst assumption", "Profitability stress", "No normalized peer set"],
    ["APV unlevered beta", null, "x", "Formula", "Levered beta unlevered at target D/E", "Uses target capital structure"],
    ["APV unlevered cost", null, "%", "Formula", "Rf + unlevered beta × ERP + specific premium", "Tax shield valued separately"],
    ["APV debt amortization — 2026", 0.10, "%", "Analyst assumption", "Illustrative schedule", "No contractual schedule available"],
    ["APV debt amortization — 2027", 0.15, "%", "Analyst assumption", "Illustrative schedule", "No contractual schedule available"],
    ["APV debt amortization — 2028", 0.20, "%", "Analyst assumption", "Illustrative schedule", "No contractual schedule available"],
    ["APV debt amortization — 2029", 0.20, "%", "Analyst assumption", "Illustrative schedule", "No contractual schedule available"],
    ["APV debt amortization — 2030", 0.20, "%", "Analyst assumption", "Illustrative schedule", "No contractual schedule available"],
    ["APV debt amortization — 2031", 0.15, "%", "Analyst assumption", "Illustrative schedule", "No contractual schedule available"],
    ["APV tax-shield rate", null, "%", "Formula", "Normalized cash-tax rate", "Applied only to modeled cash interest"],
  ];
  s.getRange("B4").format.numberFormat = "dd-mmm-yyyy";
  s.getRange("B5").format.numberFormat = share; s.getRange("B6:B7").format.numberFormat = count; s.getRange("B8:B11").format.numberFormat = money;
  s.getRange("B12:B13").format.numberFormat = percent; s.getRange("B14").format.numberFormat = multiple; s.getRange("B15:B22").format.numberFormat = percent;
  s.getRange("B23:B31").format.numberFormat = multiple; s.getRange("B32").format.numberFormat = multiple; s.getRange("B33:B40").format.numberFormat = percent;
  s.getRange("B16").formulas = [["=B12+B14*B13+B15"]];
  s.getRange("B20").formulas = [["=B16*(1-B19)+B17*(1-B18)*B19"]];
  s.getRange("B32").formulas = [["=B14/(1+(1-B18)*B19/(1-B19))"]];
  s.getRange("B33").formulas = [["=B12+B32*B13+B15"]];
  s.getRange("B40").formulas = [["=B22"]];
  input(s.getRange("B14:B15")); input(s.getRange("B17:B19")); input(s.getRange("B21:B31")); input(s.getRange("B34:B39"));
  wb.comments.addThread({ cell: s.getRange("B5") }, "Source: S5, StockAnalysis GRSD close on 27-Jul-2026.");
  wb.comments.addThread({ cell: s.getRange("B8") }, "Source: S2, Q1 2026 interim financial statements; balance-sheet data are as of 31-Mar-2026.");
  wb.comments.addThread({ cell: s.getRange("B12") }, "Source: S6, Federal Reserve H.15, 22-Jul-2026.");
  wb.comments.addThread({ cell: s.getRange("B13") }, "Source: S7, Damodaran July 2026 implied ERP update.");
  note(s, "A42:F44", "Yellow / blue cells are editable analyst assumptions. Sourced facts, formulas and market-method stresses remain separate. Exit and trading multiples are analyst ranges, not observed peer medians. APV debt amortization is illustrative because the evidence set lacks a complete contractual schedule.");
  widths(s, { A: 34, B: 15, C: 14, D: 20, E: 43, F: 39 }); s.freezePanes.freezeRows(3);
}

// Historicals
{
  const s = wb.worksheets.getItem("Historicals");
  title(s, "A1:F1", "Grandstand Limited — Historical Financials and Operating Drivers");
  s.getRange("A3:F3").values = [["USD millions, except per-share data", "FY2023A", "FY2024A", "FY2025A", "Q1 2025A", "Q1 2026A"]]; header(s.getRange("A3:F3"));
  s.getRange("A4:F20").values = [
    ["Revenue", 108.652, 127.182, 165.447, 40.635, 40.440], ["Growth", null, null, null, null, null],
    ["Cost of sales", -9.112, -7.536, -15.261, -2.246, -6.088], ["Gross profit", 99.540, 119.646, 150.186, 38.389, 34.352],
    ["Sales & marketing", -35.331, -41.897, -63.003, -15.163, -16.190], ["Technology", -10.287, -13.949, -24.789, -5.193, -6.658],
    ["G&A", -24.291, -27.645, -32.169, -7.675, -8.156], ["Other / impairment / contingent FV", -7.853, -0.480, -62.013, -0.329, -0.082],
    ["Operating profit", 21.778, 35.675, -31.788, 10.029, 3.266], ["Adjusted EBITDA (management)", 36.715, 48.691, 58.010, 15.864, 9.001],
    ["Cash flow from operations", 17.910, 37.638, 19.104, 8.092, 0.914], ["Free cash flow (management)", 23.000, 41.582, 32.938, 6.954, 1.688],
    ["Cash", null, 13.729, 15.814, null, 8.412], ["Borrowings + accrued interest", null, 22.931, 118.636, null, 116.504],
    ["New depositing customers (000s)", null, null, null, 138, 140], ["Diluted weighted-average shares (mm)", 38.542, 36.337, 35.478, 36.220, 42.427],
    ["Source ID", "S1", "S1", "S1", "S2", "S2"],
  ];
  s.getRange("C5").formulas = [["=C4/B4-1"]]; s.getRange("D5").formulas = [["=D4/C4-1"]]; s.getRange("F5").formulas = [["=F4/E4-1"]];
  s.getRange("B4:F19").format.numberFormat = money; s.getRange("B5:F5").format.numberFormat = percent; total(s.getRange("A14:F14"));
  note(s, "A23:F25", "FY2025 operating profit is distorted by impairment and contingent-consideration fair-value movements. The valuation forecast starts from management’s FY2026 guidance but constructs FCFF from normalized operating assumptions; management free cash flow is not used as a substitute.");
  widths(s, { A: 39, B: 14, C: 14, D: 14, E: 14, F: 14 }); s.freezePanes.freezeRows(3);
}

// Forecast
{
  const s = wb.worksheets.getItem("Forecast");
  title(s, "A1:H1", "Grandstand Limited — Base-Case FCFF Forecast");
  s.getRange("A3:H3").values = [["USD millions, except ratios", "FY2025A", "FY2026E", "FY2027E", "FY2028E", "FY2029E", "FY2030E", "FY2031E"]]; header(s.getRange("A3:H3"));
  s.getRange("A4:H22").values = [
    ["Revenue", 165.447, 167.5, null, null, null, null, null], ["Revenue growth", null, null, 0.10, 0.08, 0.07, 0.06, 0.05],
    ["Normalized EBITDA margin", 0.3506, 0.275, 0.290, 0.300, 0.310, 0.320, 0.325], ["Normalized EBITDA", null, null, null, null, null, null, null],
    ["D&A as % revenue", 0.0872, 0.085, 0.082, 0.078, 0.075, 0.072, 0.070], ["D&A", null, null, null, null, null, null, null],
    ["EBIT", null, null, null, null, null, null, null], ["Cash tax rate", null, null, null, null, null, null, null],
    ["Cash taxes", null, null, null, null, null, null, null], ["NOPAT", null, null, null, null, null, null, null],
    ["Capex as % revenue", 0.040, 0.040, 0.037, 0.035, 0.033, 0.032, 0.030], ["Capex", null, null, null, null, null, null, null],
    ["Change in operating working capital", 0, 1.675, 1.842, 1.990, 2.129, 2.257, 2.370], ["FCFF", null, null, null, null, null, null, null],
    ["Source / formula note", "S1", "S3 midpoint", "Analyst", "Analyst", "Analyst", "Analyst", "Analyst"],
    ["Scenario driver — 2026 revenue", null, null, null, null, null, null, null],
    ["Bear / base / bull revenue", null, "$165.0m / $167.5m / $170.0m", "Common growth path after 2026", "", "", "", ""],
    ["Bear / base / bull EBITDA margin", null, "26.0% / 27.5% / 29.0%", "Linear path to 2031 terminal margin", "", "", "", ""],
    ["What must be true", null, "Traffic diversification, restructuring savings, and data-services growth must offset search and regulatory pressure.", "", "", "", "", ""],
  ];
  s.getRange("C5").formulas = [["=C4/B4-1"]]; s.getRange("D4:H4").formulas = [["=C4*(1+D5)", "=D4*(1+E5)", "=E4*(1+F5)", "=F4*(1+G5)", "=G4*(1+H5)"]];
  s.getRange("B7:H7").formulas = [["=B4*B6", "=C4*C6", "=D4*D6", "=E4*E6", "=F4*F6", "=G4*G6", "=H4*H6"]];
  s.getRange("B9:H9").formulas = [["=B4*B8", "=C4*C8", "=D4*D8", "=E4*E8", "=F4*F8", "=G4*G8", "=H4*H8"]];
  s.getRange("B10:H10").formulas = [["=B7-B9", "=C7-C9", "=D7-D9", "=E7-E9", "=F7-F9", "=G7-G9", "=H7-H9"]];
  s.getRange("C11:H11").formulas = [["='Assumptions'!B22", "='Assumptions'!B22", "='Assumptions'!B22", "='Assumptions'!B22", "='Assumptions'!B22", "='Assumptions'!B22"]];
  s.getRange("C12:H12").formulas = [["=-MAX(C10,0)*C11", "=-MAX(D10,0)*D11", "=-MAX(E10,0)*E11", "=-MAX(F10,0)*F11", "=-MAX(G10,0)*G11", "=-MAX(H10,0)*H11"]];
  s.getRange("B13:H13").formulas = [["=B10", "=C10+C12", "=D10+D12", "=E10+E12", "=F10+F12", "=G10+G12", "=H10+H12"]];
  s.getRange("B15:H15").formulas = [["=-B4*B14", "=-C4*C14", "=-D4*D14", "=-E4*E14", "=-F4*F14", "=-G4*G14", "=-H4*H14"]];
  s.getRange("B17:H17").formulas = [["=B13+B9+B15-B16", "=C13+C9+C15-C16", "=D13+D9+D15-D16", "=E13+E9+E15-E16", "=F13+F9+F15-F16", "=G13+G9+G15-G16", "=H13+H9+H15-H16"]];
  s.getRange("C20:H20").merge(); s.getRange("C21:H21").merge(); s.getRange("C22:H22").merge();
  s.getRange("B4:H17").format.numberFormat = money; s.getRange("B5:H6").format.numberFormat = percent; s.getRange("B8:H8").format.numberFormat = percent; s.getRange("B11:H11").format.numberFormat = percent; s.getRange("B14:H14").format.numberFormat = percent;
  total(s.getRange("A17:H17")); input(s.getRange("C4:H6")); input(s.getRange("C8:H8")); input(s.getRange("C14:H14")); input(s.getRange("C16:H16"));
  note(s, "A25:H27", "The formula map is revenue → EBITDA → D&A → EBIT → cash taxes → NOPAT → FCFF. Capitalized development is treated as capex. All forecast assumptions remain visible; no management adjusted-EBITDA value is used as a cash-flow substitute.");
  widths(s, { A: 42, B: 14, C: 14, D: 14, E: 14, F: 14, G: 14, H: 14 }); s.freezePanes.freezeRows(3);
}

// Perpetuity-growth and exit-multiple DCF
{
  const s = wb.worksheets.getItem("DCF");
  title(s, "A1:H1", "Grandstand Limited — FCFF DCF Valuation");
  s.getRange("A3:H3").values = [["USD millions, except per-share data", "FY2026E", "FY2027E", "FY2028E", "FY2029E", "FY2030E", "FY2031E", "Terminal"]]; header(s.getRange("A3:H3"));
  s.getRange("A4:H18").values = [["FCFF",null,null,null,null,null,null,null],["Discount period",0.5,1.5,2.5,3.5,4.5,5.5,null],["Discount factor",null,null,null,null,null,null,null],["Present value of FCFF",null,null,null,null,null,null,null],["Terminal growth",null,null,null,null,null,null,null],["Terminal value",null,null,null,null,null,null,null],["PV of terminal value",null,null,null,null,null,null,null],["Enterprise value",null,null,null,null,null,null,null],["Cash",null,null,null,null,null,null,null],["Borrowings + accrued interest",null,null,null,null,null,null,null],["Deferred consideration",null,null,null,null,null,null,null],["Lease liabilities",null,null,null,null,null,null,null],["Equity value",null,null,null,null,null,null,null],["Diluted shares (mm)",null,null,null,null,null,null,null],["Value per share",null,null,null,null,null,null,null]];
  s.getRange("B4:G4").formulas = [["='Forecast'!C17","='Forecast'!D17","='Forecast'!E17","='Forecast'!F17","='Forecast'!G17","='Forecast'!H17"]];
  s.getRange("B6:G6").formulas = [["=1/(1+'Assumptions'!B20)^B5","=1/(1+'Assumptions'!B20)^C5","=1/(1+'Assumptions'!B20)^D5","=1/(1+'Assumptions'!B20)^E5","=1/(1+'Assumptions'!B20)^F5","=1/(1+'Assumptions'!B20)^G5"]];
  s.getRange("B7:G7").formulas = [["=B4*B6","=C4*C6","=D4*D6","=E4*E6","=F4*F6","=G4*G6"]];
  s.getRange("H8:H18").formulas = [["='Assumptions'!B21"],["=G4*(1+H8)/('Assumptions'!B20-H8)"],["=H9*G6"],["=SUM(B7:G7)+H10"],["='Assumptions'!B8"],["=-'Assumptions'!B9"],["=-'Assumptions'!B10"],["=-'Assumptions'!B11"],["=SUM(H11:H15)"],["='Assumptions'!B7"],["=H16/H17"]];
  s.getRange("A21:D21").merge(); s.getRange("A21").values = [["Exit-multiple DCF: market-based terminal value cross-check"]]; s.getRange("A21:D21").format = { fill: navy, font: { bold: true, color: white } };
  s.getRange("A22:D25").values = [["Case","Exit EBITDA multiple","Enterprise value","Value / share"],["Low",null,null,null],["Mid",null,null,null],["High",null,null,null]]; header(s.getRange("A22:D22"));
  s.getRange("B23:B25").formulas = [["='Assumptions'!B23"],["='Assumptions'!B24"],["='Assumptions'!B25"]];
  for (const row of [23,24,25]) {
    s.getRange(`C${row}`).formulas = [[`=SUM(B7:G7)+'Forecast'!H7*B${row}*G6`]];
    s.getRange(`D${row}`).formulas = [[`=(C${row}+'Assumptions'!B8-'Assumptions'!B9-'Assumptions'!B10-'Assumptions'!B11)/'Assumptions'!B7`]];
  }
  s.getRange("A28:D28").merge(); s.getRange("A28").values = [["Reverse DCF / current-price diagnostics"]]; s.getRange("A28:D28").format = { fill: navy, font: { bold: true, color: white } };
  s.getRange("A29:D33").values = [["Current equity value",null,"$mm","Frozen price × diluted shares"],["Implied enterprise value",null,"$mm","Equity value + debt-like claims − cash"],["Implied EV / 2026 revenue",null,"x","Model-derived market diagnostic"],["Implied EV / 2026 normalized EBITDA",null,"x","Model-derived market diagnostic"],["Terminal value / enterprise value",null,"%","Concentration warning"]];
  s.getRange("B29:B33").formulas = [["='Assumptions'!B5*'Assumptions'!B7"],["=B29-'Assumptions'!B8+'Assumptions'!B9+'Assumptions'!B10+'Assumptions'!B11"],["=B30/'Forecast'!C4"],["=B30/'Forecast'!C7"],["=H10/H11"]];
  s.getRange("B4:H17").format.numberFormat = money; s.getRange("B5:G5").format.numberFormat = "0.0"; s.getRange("B6:G6").format.numberFormat = percent; s.getRange("H8").format.numberFormat = percent; s.getRange("H18").format.numberFormat = share;
  s.getRange("B23:B25").format.numberFormat = multiple; s.getRange("C23:C25").format.numberFormat = money; s.getRange("D23:D25").format.numberFormat = share; s.getRange("B31:B32").format.numberFormat = multiple; s.getRange("B33").format.numberFormat = percent;
  total(s.getRange("A16:H18")); note(s, "A36:H38", "The Gordon-growth DCF is primary. The exit-multiple DCF uses the same explicit cash flows but substitutes a market-based terminal value and is therefore corroborative, not an independent operating forecast. Reverse outputs are model-derived implied expectations, not quoted consensus or a unique market belief.");
  widths(s, { A: 43, B: 16, C: 16, D: 17, E: 14, F: 14, G: 14, H: 17 }); s.freezePanes.freezeRows(3);
}

// Adjusted present value
{
  const s = wb.worksheets.getItem("APV");
  title(s, "A1:G1", "Grandstand Limited — Adjusted Present Value (APV)");
  s.getRange("A3:G3").values = [["USD millions, except per-share data","FY2026E","FY2027E","FY2028E","FY2029E","FY2030E","FY2031E"]]; header(s.getRange("A3:G3"));
  s.getRange("A4:G16").values = [["FCFF",null,null,null,null,null,null],["Discount period",0.5,1.5,2.5,3.5,4.5,5.5],["Unlevered discount factor",null,null,null,null,null,null],["PV of FCFF",null,null,null,null,null,null],["Opening debt",null,null,null,null,null,null],["Debt amortization rate",null,null,null,null,null,null],["Debt amortization",null,null,null,null,null,null],["Ending debt",null,null,null,null,null,null],["Cash interest",null,null,null,null,null,null],["Interest tax shield",null,null,null,null,null,null],["Tax-shield discount factor",null,null,null,null,null,null],["PV of tax shield",null,null,null,null,null,null],["Unlevered terminal value",null,null,null,null,null,null]];
  s.getRange("B4:G4").formulas = [["='Forecast'!C17","='Forecast'!D17","='Forecast'!E17","='Forecast'!F17","='Forecast'!G17","='Forecast'!H17"]];
  s.getRange("B6:G6").formulas = [["=1/(1+'Assumptions'!B33)^B5","=1/(1+'Assumptions'!B33)^C5","=1/(1+'Assumptions'!B33)^D5","=1/(1+'Assumptions'!B33)^E5","=1/(1+'Assumptions'!B33)^F5","=1/(1+'Assumptions'!B33)^G5"]];
  s.getRange("B7:G7").formulas = [["=B4*B6","=C4*C6","=D4*D6","=E4*E6","=F4*F6","=G4*G6"]];
  s.getRange("B8:G8").formulas = [["='Assumptions'!B9","=B11","=C11","=D11","=E11","=F11"]];
  s.getRange("B9:G9").formulas = [["='Assumptions'!B34","='Assumptions'!B35","='Assumptions'!B36","='Assumptions'!B37","='Assumptions'!B38","='Assumptions'!B39"]];
  s.getRange("B10:G10").formulas = [["='Assumptions'!B9*B9","='Assumptions'!B9*C9","='Assumptions'!B9*D9","='Assumptions'!B9*E9","='Assumptions'!B9*F9","='Assumptions'!B9*G9"]];
  s.getRange("B11:G11").formulas = [["=B8-B10","=C8-C10","=D8-D10","=E8-E10","=F8-F10","=G8-G10"]];
  s.getRange("B12:G12").formulas = [["=AVERAGE(B8,B11)*'Assumptions'!B17","=AVERAGE(C8,C11)*'Assumptions'!B17","=AVERAGE(D8,D11)*'Assumptions'!B17","=AVERAGE(E8,E11)*'Assumptions'!B17","=AVERAGE(F8,F11)*'Assumptions'!B17","=AVERAGE(G8,G11)*'Assumptions'!B17"]];
  s.getRange("B13:G13").formulas = [["=B12*'Assumptions'!B40","=C12*'Assumptions'!B40","=D12*'Assumptions'!B40","=E12*'Assumptions'!B40","=F12*'Assumptions'!B40","=G12*'Assumptions'!B40"]];
  s.getRange("B14:G14").formulas = [["=1/(1+'Assumptions'!B17)^B5","=1/(1+'Assumptions'!B17)^C5","=1/(1+'Assumptions'!B17)^D5","=1/(1+'Assumptions'!B17)^E5","=1/(1+'Assumptions'!B17)^F5","=1/(1+'Assumptions'!B17)^G5"]];
  s.getRange("B15:G15").formulas = [["=B13*B14","=C13*C14","=D13*D14","=E13*E14","=F13*F14","=G13*G14"]];
  s.getRange("G16").formulas = [["=G4*(1+'Assumptions'!B21)/('Assumptions'!B33-'Assumptions'!B21)"]];
  section(s, "A20:G20", "APV enterprise-to-equity bridge");
  s.getRange("A21:C29").values = [["Unlevered operating value",null,"PV of FCFF + terminal"],["PV of interest tax shields",null,"Explicit debt schedule"],["Enterprise value incl. tax shields",null,"APV"],["Cash",null,"S2"],["Borrowings + accrued interest",null,"S2"],["Deferred consideration",null,"S2"],["Lease liabilities",null,"S2"],["Equity value",null,"APV bridge"],["Value per share",null,"Diluted denominator"]];
  s.getRange("B21:B29").formulas = [["=SUM(B7:G7)+G16*G6"],["=SUM(B15:G15)"],["=B21+B22"],["='Assumptions'!B8"],["=-'Assumptions'!B9"],["=-'Assumptions'!B10"],["=-'Assumptions'!B11"],["=SUM(B23:B27)"],["=B28/'Assumptions'!B7"]];
  section(s, "A32:D32", "APV cost-of-capital sensitivity");
  s.getRange("A33:D36").values = [["Case","Unlevered cost","Value / share","Interpretation"],["High cost",null,null,"Low APV"],["Base",null,null,"Illustrative debt schedule"],["Low cost",null,null,"High APV"]]; header(s.getRange("A33:D33"));
  s.getRange("B34:B36").formulas = [["='Assumptions'!B33+1.5%"],["='Assumptions'!B33"],["='Assumptions'!B33-1.5%"]];
  for (const row of [34,35,36]) s.getRange(`C${row}`).formulas = [[`=(SUMPRODUCT(B4:G4,1/(1+B${row})^B5:G5)+G4*(1+'Assumptions'!B21)/(B${row}-'Assumptions'!B21)/(1+B${row})^G5+B22+'Assumptions'!B8-'Assumptions'!B9-'Assumptions'!B10-'Assumptions'!B11)/'Assumptions'!B7`]];
  s.getRange("B4:G16").format.numberFormat = money; s.getRange("B5:G5").format.numberFormat = "0.0"; s.getRange("B6:G6").format.numberFormat = percent; s.getRange("B9:G9").format.numberFormat = percent; s.getRange("B14:G14").format.numberFormat = percent; s.getRange("B21:B28").format.numberFormat = money; s.getRange("B29").format.numberFormat = share; s.getRange("B34:B36").format.numberFormat = percent; s.getRange("C34:C36").format.numberFormat = share;
  total(s.getRange("A28:C29")); note(s, "A39:G41", "APV separates unlevered operating value from financing tax shields. Its corroborative value is assumption-heavy: the debt amortization schedule is illustrative, and refinancing, covenant and contractual repayment terms were not independently modeled.");
  widths(s, { A: 35, B: 16, C: 16, D: 16, E: 16, F: 16, G: 18 }); s.freezePanes.freezeRows(3);
}

// Market-method analyst stresses
{
  const s = wb.worksheets.getItem("Market Methods");
  title(s, "A1:G1", "Grandstand Limited — Market-Method Stresses");
  s.getRange("A3:G3").values = [["Method","Target metric","Low multiple","Mid multiple","High multiple","Low / Mid / High value per share","Evidence posture"]]; header(s.getRange("A3:G3"));
  s.getRange("A4:G5").values = [["EV / Revenue","FY2026E revenue",null,null,null,null,"Analyst range; no normalized peer median"],["EV / normalized EBITDA","FY2026E normalized EBITDA",null,null,null,null,"Analyst range; no normalized peer median"]];
  s.getRange("B4:B5").formulas = [["='Forecast'!C4"],["='Forecast'!C7"]];
  s.getRange("C4:E4").formulas = [["='Assumptions'!B26","='Assumptions'!B27","='Assumptions'!B28"]]; s.getRange("C5:E5").formulas = [["='Assumptions'!B29","='Assumptions'!B30","='Assumptions'!B31"]];
  s.getRange("F4").formulas = [["=TEXT((B4*C4+'Assumptions'!B8-'Assumptions'!B9-'Assumptions'!B10-'Assumptions'!B11)/'Assumptions'!B7,\"$0.00\")&\" / \"&TEXT((B4*D4+'Assumptions'!B8-'Assumptions'!B9-'Assumptions'!B10-'Assumptions'!B11)/'Assumptions'!B7,\"$0.00\")&\" / \"&TEXT((B4*E4+'Assumptions'!B8-'Assumptions'!B9-'Assumptions'!B10-'Assumptions'!B11)/'Assumptions'!B7,\"$0.00\")"]];
  s.getRange("F5").formulas = [["=TEXT((B5*C5+'Assumptions'!B8-'Assumptions'!B9-'Assumptions'!B10-'Assumptions'!B11)/'Assumptions'!B7,\"$0.00\")&\" / \"&TEXT((B5*D5+'Assumptions'!B8-'Assumptions'!B9-'Assumptions'!B10-'Assumptions'!B11)/'Assumptions'!B7,\"$0.00\")&\" / \"&TEXT((B5*E5+'Assumptions'!B8-'Assumptions'!B9-'Assumptions'!B10-'Assumptions'!B11)/'Assumptions'!B7,\"$0.00\")"]];
  section(s, "A8:F8", "Formula-driven valuation bridges");
  s.getRange("A9:F11").values = [["Method","Low","Mid","High","Metric source","Status"],["EV / Revenue",null,null,null,"FY2026E revenue","Corroborative stress"],["EV / normalized EBITDA",null,null,null,"FY2026E normalized EBITDA","Corroborative stress"]]; header(s.getRange("A9:F9"));
  for (const [row, metricRow, multRow] of [[10,4,4],[11,5,5]]) {
    for (const [col, mcol] of [["B","C"],["C","D"],["D","E"]]) s.getRange(`${col}${row}`).formulas = [[`=($B$${metricRow}*${mcol}$${multRow}+'Assumptions'!B8-'Assumptions'!B9-'Assumptions'!B10-'Assumptions'!B11)/'Assumptions'!B7`]];
  }
  section(s, "A14:D14", "Current-market implied multiples");
  s.getRange("A15:D17").values = [["Implied enterprise value",null,"$mm","Frozen price bridge"],["Implied EV / FY2026E revenue",null,"x","Diagnostic"],["Implied EV / FY2026E normalized EBITDA",null,"x","Diagnostic"]];
  s.getRange("B15:B17").formulas = [["='Assumptions'!B5*'Assumptions'!B7-'Assumptions'!B8+'Assumptions'!B9+'Assumptions'!B10+'Assumptions'!B11"],["=B15/'Forecast'!C4"],["=B15/'Forecast'!C7"]];
  s.getRange("B4:B5").format.numberFormat = money; s.getRange("C4:E5").format.numberFormat = multiple; s.getRange("B10:D11").format.numberFormat = share; s.getRange("B15").format.numberFormat = money; s.getRange("B16:B17").format.numberFormat = multiple;
  note(s, "A20:G22", "These outputs are market-method stresses, not public-comps medians. Licensed market data, normalized peer denominators and inclusion/exclusion evidence were unavailable. SOTP and precedent transactions remain inapplicable until separable business-line economics or a normalized transaction set can be sourced.");
  widths(s, { A: 38, B: 19, C: 16, D: 16, E: 16, F: 34, G: 47 }); s.freezePanes.freezeRows(3);
}

// Scenario DCF and WACC / growth sensitivity
{
  const s = wb.worksheets.getItem("Sensitivities");
  title(s, "A1:H1", "Grandstand Limited — Formula-Driven Scenario and DCF Sensitivities");
  s.getRange("A3:F3").values = [["Operating case","2026 revenue","2026 EBITDA margin","2031 EBITDA margin","WACC","Value / share"]]; header(s.getRange("A3:F3"));
  s.getRange("A4:F6").values = [["Bear",165.0,0.260,0.290,0.145,null],["Base",167.5,0.275,0.325,null,null],["Bull",170.0,0.290,0.370,0.115,null]]; s.getRange("E5").formulas = [["='Assumptions'!B20"]];
  const blocks = [{row:21,input:4},{row:35,input:5},{row:49,input:6}];
  for (const {row,input: ir} of blocks) {
    section(s, `A${row}:G${row}`, `Scenario helper — ${ir === 4 ? "Bear" : ir === 5 ? "Base" : "Bull"}`);
    s.getRange(`A${row+1}:G${row+1}`).values = [["USD millions","FY2026E","FY2027E","FY2028E","FY2029E","FY2030E","FY2031E"]]; header(s.getRange(`A${row+1}:G${row+1}`));
    const rr=row+2, mr=row+3, er=row+4, dar=row+5, ebitr=row+6, nopatr=row+7, capr=row+8, nwcr=row+9, fcfrow=row+10, dfrow=row+11, pvrow=row+12, tvr=row+13;
    s.getRange(`A${rr}:A${tvr}`).values = [["Revenue"],["EBITDA margin"],["EBITDA"],["D&A"],["EBIT"],["NOPAT"],["Capex"],["Change in NWC"],["FCFF"],["Discount factor"],["PV of FCFF"],["Terminal value"]];
    s.getRange(`B${rr}`).formulas = [[`=$B$${ir}`]]; s.getRange(`C${rr}:G${rr}`).formulas = [[`=B${rr}*(1+'Forecast'!D5)`,`=C${rr}*(1+'Forecast'!E5)`,`=D${rr}*(1+'Forecast'!F5)`,`=E${rr}*(1+'Forecast'!G5)`,`=F${rr}*(1+'Forecast'!H5)`]];
    s.getRange(`B${mr}:G${mr}`).formulas = [[
      `='Forecast'!C6+($C$${ir}-'Forecast'!C6)`,
      `='Forecast'!D6+($C$${ir}-'Forecast'!C6)*4/5+($D$${ir}-'Forecast'!H6)*1/5`,
      `='Forecast'!E6+($C$${ir}-'Forecast'!C6)*3/5+($D$${ir}-'Forecast'!H6)*2/5`,
      `='Forecast'!F6+($C$${ir}-'Forecast'!C6)*2/5+($D$${ir}-'Forecast'!H6)*3/5`,
      `='Forecast'!G6+($C$${ir}-'Forecast'!C6)*1/5+($D$${ir}-'Forecast'!H6)*4/5`,
      `='Forecast'!H6+($D$${ir}-'Forecast'!H6)`,
    ]];
    s.getRange(`B${er}:G${er}`).formulas = [[`=B${rr}*B${mr}`,`=C${rr}*C${mr}`,`=D${rr}*D${mr}`,`=E${rr}*E${mr}`,`=F${rr}*F${mr}`,`=G${rr}*G${mr}`]];
    s.getRange(`B${dar}:G${dar}`).formulas = [[`=B${rr}*'Forecast'!C8`,`=C${rr}*'Forecast'!D8`,`=D${rr}*'Forecast'!E8`,`=E${rr}*'Forecast'!F8`,`=F${rr}*'Forecast'!G8`,`=G${rr}*'Forecast'!H8`]];
    s.getRange(`B${ebitr}:G${ebitr}`).formulas = [[`=B${er}-B${dar}`,`=C${er}-C${dar}`,`=D${er}-D${dar}`,`=E${er}-E${dar}`,`=F${er}-F${dar}`,`=G${er}-G${dar}`]];
    s.getRange(`B${nopatr}:G${nopatr}`).formulas = [[`=B${ebitr}*(1-'Assumptions'!B22)`,`=C${ebitr}*(1-'Assumptions'!B22)`,`=D${ebitr}*(1-'Assumptions'!B22)`,`=E${ebitr}*(1-'Assumptions'!B22)`,`=F${ebitr}*(1-'Assumptions'!B22)`,`=G${ebitr}*(1-'Assumptions'!B22)`]];
    s.getRange(`B${capr}:G${capr}`).formulas = [[`=-B${rr}*'Forecast'!C14`,`=-C${rr}*'Forecast'!D14`,`=-D${rr}*'Forecast'!E14`,`=-E${rr}*'Forecast'!F14`,`=-F${rr}*'Forecast'!G14`,`=-G${rr}*'Forecast'!H14`]];
    s.getRange(`B${nwcr}:G${nwcr}`).formulas = [[`='Forecast'!C16*B${rr}/'Forecast'!C4`,`='Forecast'!D16*C${rr}/'Forecast'!D4`,`='Forecast'!E16*D${rr}/'Forecast'!E4`,`='Forecast'!F16*E${rr}/'Forecast'!F4`,`='Forecast'!G16*F${rr}/'Forecast'!G4`,`='Forecast'!H16*G${rr}/'Forecast'!H4`]];
    s.getRange(`B${fcfrow}:G${fcfrow}`).formulas = [[`=B${nopatr}+B${dar}+B${capr}-B${nwcr}`,`=C${nopatr}+C${dar}+C${capr}-C${nwcr}`,`=D${nopatr}+D${dar}+D${capr}-D${nwcr}`,`=E${nopatr}+E${dar}+E${capr}-E${nwcr}`,`=F${nopatr}+F${dar}+F${capr}-F${nwcr}`,`=G${nopatr}+G${dar}+G${capr}-G${nwcr}`]];
    s.getRange(`B${dfrow}:G${dfrow}`).formulas = [[`=1/(1+$E$${ir})^0.5`,`=1/(1+$E$${ir})^1.5`,`=1/(1+$E$${ir})^2.5`,`=1/(1+$E$${ir})^3.5`,`=1/(1+$E$${ir})^4.5`,`=1/(1+$E$${ir})^5.5`]];
    s.getRange(`B${pvrow}:G${pvrow}`).formulas = [[`=B${fcfrow}*B${dfrow}`,`=C${fcfrow}*C${dfrow}`,`=D${fcfrow}*D${dfrow}`,`=E${fcfrow}*E${dfrow}`,`=F${fcfrow}*F${dfrow}`,`=G${fcfrow}*G${dfrow}`]];
    s.getRange(`G${tvr}`).formulas = [[`=G${fcfrow}*(1+'Assumptions'!B21)/($E$${ir}-'Assumptions'!B21)`]];
    s.getRange(`F${ir}`).formulas = [[`=(SUM(B${pvrow}:G${pvrow})+G${tvr}*G${dfrow}+'Assumptions'!B8-'Assumptions'!B9-'Assumptions'!B10-'Assumptions'!B11)/'Assumptions'!B7`]];
    s.getRange(`B${rr}:G${tvr}`).format.numberFormat = money; s.getRange(`B${mr}:G${mr}`).format.numberFormat = percent; s.getRange(`B${dfrow}:G${dfrow}`).format.numberFormat = percent; total(s.getRange(`A${fcfrow}:G${fcfrow}`));
  }
  section(s, "A9:D9", "Base-case value per share sensitivity: WACC (rows) / terminal growth (columns)");
  s.getRange("A10:D15").values = [["WACC \\ g",0.020,0.025,0.030],[0.110,null,null,null],[0.120,null,null,null],[0.130,null,null,null],[0.140,null,null,null],[0.150,null,null,null]]; header(s.getRange("A10:D10"));
  s.getRange("A13").formulas = [["='Assumptions'!B20"]];
  for (const row of [11,12,13,14,15]) for (const col of ["B","C","D"]) s.getRange(`${col}${row}`).formulas = [[`=(SUMPRODUCT('DCF'!B4:G4,1/(1+$A${row})^'DCF'!B5:G5)+'Forecast'!H17*(1+${col}$10)/($A${row}-${col}$10)/(1+$A${row})^'DCF'!G5+'Assumptions'!B8-'Assumptions'!B9-'Assumptions'!B10-'Assumptions'!B11)/'Assumptions'!B7`]];
  s.getRange("B4:E6").format.numberFormat = percent; s.getRange("B4:B6").format.numberFormat = money; s.getRange("F4:F6").format.numberFormat = share; s.getRange("A11:A15").format.numberFormat = percent; s.getRange("B10:D10").format.numberFormat = percent; s.getRange("B11:D15").format.numberFormat = share;
  input(s.getRange("B4:E4")); input(s.getRange("B6:E6")); note(s, "F9:H15", "Bear, base and bull values now recalculate from their displayed 2026 revenue, 2026/2031 margin and WACC inputs. They are not multipliers on the base output.");
  widths(s, { A: 27, B: 16, C: 18, D: 18, E: 14, F: 18, G: 16, H: 26 }); s.freezePanes.freezeRows(3);
}

// Valuation reconciliation and chart
{
  const s = wb.worksheets.getItem("Valuation");
  title(s, "A1:H1", "Grandstand Limited — Multi-Method Valuation Reconciliation");
  s.getRange("A3:H3").values = [["Method","Role","Low","Mid","High","Evidence quality","Use in conclusion","Rationale"]]; header(s.getRange("A3:H3"));
  s.getRange("A4:H8").values = [["Perpetuity-growth FCFF DCF","Primary",null,null,null,"Source-backed forecast; analyst WACC / terminal assumptions","Primary range","Best fit for consolidated forecastable operations"],["Exit-multiple DCF","Corroborative",null,null,null,"Analyst exit-multiple range","Cross-check only","Same explicit FCFF; market-based terminal value"],["Adjusted present value","Corroborative",null,null,null,"Illustrative debt schedule","Cross-check only","Separates operating value and financing tax shields"],["EV / Revenue","Corroborative stress",null,null,null,"Analyst multiple range; no normalized peer median","Stress only","Useful for scale / business-mix framing"],["EV / normalized EBITDA","Corroborative stress",null,null,null,"Analyst multiple range; no normalized peer median","Stress only","Useful for normalized profitability framing"]];
  s.getRange("A4:H8").format.wrapText = true; s.getRange("A4:H8").format.rowHeight = 34;
  s.getRange("C4:E4").formulas = [["='Sensitivities'!F4","='DCF'!H18","='Sensitivities'!F6"]];
  s.getRange("C5:E5").formulas = [["='DCF'!D23","='DCF'!D24","='DCF'!D25"]];
  s.getRange("C6:E6").formulas = [["='APV'!C34","='APV'!C35","='APV'!C36"]];
  s.getRange("C7:E7").formulas = [["='Market Methods'!B10","='Market Methods'!C10","='Market Methods'!D10"]];
  s.getRange("C8:E8").formulas = [["='Market Methods'!B11","='Market Methods'!C11","='Market Methods'!D11"]];
  s.getRange("C4:E8").format.numberFormat = share;
  section(s, "A11:H11", "Method applicability and exclusions");
  s.getRange("A12:H15").values = [["Method","Status","Reason","Evidence needed","","","",""],["SOTP","Inapplicable","One reportable segment; no separable unit economics","Business-line revenue, margins, capex/NWC, corporate-cost allocation and unit benchmarks","","","",""],["Precedent transactions","Inapplicable","No normalized transaction dataset","Dated transactions, perimeter, consideration, earnouts and target metrics","","","",""],["Dividend / residual income / asset NAV","Inapplicable","Distributions, book capital and asset values are not the core economic drivers","Not pursued","","","",""]]; header(s.getRange("A12:H12")); s.getRange("A13:H15").format.wrapText = true;
  s.getRange("A13:H15").format.rowHeight = 54;
  for (const row of [12,13,14,15]) s.getRange(`D${row}:H${row}`).merge();
  section(s, "A18:H18", "Conclusion discipline");
  note(s, "A19:H22", "No mechanical average is calculated. The perpetuity-growth DCF remains the primary valuation range. Exit DCF and APV test terminal-value and financing assumptions; EV/revenue and EV/EBITDA remain analyst stresses until normalized peer evidence is available. A large gap to the market is an underwriting question, not a recommendation.");
  s.getRange("J2:K8").values = [["Method","Midpoint"],["Perpetuity DCF",null],["Exit DCF",null],["APV",null],["EV / Revenue",null],["EV / EBITDA",null],["Current price",null]];
  s.getRange("K3:K8").formulas = [["=D4"],["=D5"],["=D6"],["=D7"],["=D8"],["='Assumptions'!B5"]]; s.getRange("K3:K8").format.numberFormat = share;
  const chart = s.charts.add("bar", s.getRange("J2:K8")); chart.title = "Method midpoints vs. frozen market price ($/share)"; chart.hasLegend = false; chart.yAxis = { numberFormatCode: "$0.00" }; chart.setPosition("J10", "Q25");
  widths(s, { A: 32, B: 22, C: 15, D: 15, E: 15, F: 37, G: 24, H: 48, J: 21, K: 15 }); s.freezePanes.freezeRows(3);
}

// Checks
{
  const s = wb.worksheets.getItem("Checks");
  title(s, "A1:F1", "Grandstand Limited — Model Checks and Issue Log");
  s.getRange("A3:F3").values = [["Check","Expected","Actual","Tolerance","Status","Comment"]]; header(s.getRange("A3:F3"));
  s.getRange("A4:F18").values = [["FY2025 revenue source tie",165.447,null,0.001,null,"20-F"],["FY2025 CFO source tie",19.104,null,0.001,null,"20-F"],["FY2026 guidance midpoint",167.5,null,0.001,null,"Q1 release"],["Base FCFF construction","NOPAT + D&A − capex − NWC",null,0.001,null,"Forecast"],["DCF EV-to-equity bridge","EV + cash − debt-like claims",null,0.001,null,"DCF"],["DCF base sensitivity intersection","Equals primary DCF",null,0.01,null,"13.0% / 2.5%"],["Scenario ordering","Bear < Base < Bull",null,0,null,"Independent scenario helpers"],["Scenario base reconciliation","Base scenario equals primary DCF",null,0.01,null,"Same displayed assumptions"],["Exit DCF ordering","Low < Mid < High",null,0,null,"5x / 6x / 7x"],["APV debt amortization","Ending debt = 0",null,0.001,null,"Rates are percentages of opening debt"],["APV ordering","High cost < Base < Low cost",null,0,null,"Cost sensitivity"],["EV / Revenue ordering","Low < Mid < High",null,0,null,"Analyst stress"],["EV / EBITDA ordering","Low < Mid < High",null,0,null,"Analyst stress"],["Terminal value concentration","< 80% warning threshold",null,0.80,null,"Caveat, not formula error"],["Master model check","All substantive checks PASS",null,0,null,"Warnings remain in issue log"]];
  s.getRange("C4:C17").formulas = [["='Historicals'!D4"],["='Historicals'!D14"],["='Forecast'!C4"],["='Forecast'!C17-('Forecast'!C13+'Forecast'!C9+'Forecast'!C15-'Forecast'!C16)"],["='DCF'!H16-SUM('DCF'!H11:H15)"],["='Sensitivities'!C13-'DCF'!H18"],["=AND('Sensitivities'!F4<'Sensitivities'!F5,'Sensitivities'!F5<'Sensitivities'!F6)"],["='Sensitivities'!F5-'DCF'!H18"],["=AND('DCF'!D23<'DCF'!D24,'DCF'!D24<'DCF'!D25)"],["='APV'!G11"],["=AND('APV'!C34<'APV'!C35,'APV'!C35<'APV'!C36)"],["=AND('Market Methods'!B10<'Market Methods'!C10,'Market Methods'!C10<'Market Methods'!D10)"],["=AND('Market Methods'!B11<'Market Methods'!C11,'Market Methods'!C11<'Market Methods'!D11)"],["='DCF'!H10/'DCF'!H11"]];
  for (const row of [4,5,6]) s.getRange(`E${row}`).formulas = [[`=IF(ABS(C${row}-B${row})<=D${row},\"PASS\",\"FAIL\")`]];
  for (const row of [7,8,9,11,13]) s.getRange(`E${row}`).formulas = [[`=IF(ABS(C${row})<=D${row},\"PASS\",\"FAIL\")`]];
  for (const row of [10,12,14,15,16]) s.getRange(`E${row}`).formulas = [[`=IF(C${row},\"PASS\",\"FAIL\")`]];
  s.getRange("E17").formulas = [["=IF(C17<=D17,\"PASS\",\"WARN\")"]];
  s.getRange("C18").formulas = [["=COUNTIF(E4:E16,\"<>PASS\")"]]; s.getRange("E18").formulas = [["=IF(C18=0,\"PASS\",\"FAIL\")"]];
  s.getRange("C4:D18").format.numberFormat = money; s.getRange("C17:D17").format.numberFormat = percent;
  section(s, "A21:F21", "Open limitations / issue log", amber);
  s.getRange("A22:F26").values = [["Severity","Issue","Decision impact","Owner","Status","Resolution path"],["High","No licensed consensus, normalized peer or beta feed","Market stresses and WACC remain analyst-directed","Analyst","Open","Refresh with licensed market data"],["High","Q2 2026 results not yet reported","Guidance and cash bridge can change","Company / analyst","Open","Refresh after next earnings"],["High","APV debt schedule is illustrative","Financing tax-shield value is not contractual","Analyst","Open","Add debt maturity / amortization schedule"],["Medium","Post-Q1 cash and deferred-consideration changes incomplete","Equity bridge may be stale","Analyst","Open","Update Q2 balance sheet and settlements"]]; header(s.getRange("A22:F22")); s.getRange("A23:F26").format.wrapText = true; s.getRange("A23:F26").format.rowHeight = 38;
  s.getRange("E4:E18").conditionalFormats.add("containsText", { text: "PASS", format: { fill: green, font: { bold: true, color: "#1B5E20" } } });
  s.getRange("E4:E18").conditionalFormats.add("containsText", { text: "FAIL", format: { fill: red, font: { bold: true, color: "#9C0006" } } });
  widths(s, { A: 31, B: 34, C: 18, D: 16, E: 14, F: 45 }); s.freezePanes.freezeRows(3);
}

// Cover after all linked sheets
{
  const s = wb.worksheets.getItem("Cover");
  title(s, "A1:L1", "Grandstand Limited (NASDAQ: GRSD) — Multi-Method Equity Valuation");
  s.getRange("A2:L2").merge(); s.getRange("A2").values = [["Valuation date: 28-Jul-2026 | Market close: 27-Jul-2026 | USD | IFRS | Primary: perpetuity-growth FCFF DCF | Status: screen-grade / review required"]];
  s.getRange("A2:L2").format = { fill: paleBlue, font: { color: navyDark, italic: true, size: 10 }, horizontalAlignment: "center" };
  card(s, "A4:C7", "Primary DCF value / share", "=ROUND('DCF'!H18,2)", share, green, "Perpetuity-growth FCFF DCF");
  card(s, "E4:G7", "Frozen market price", "=ROUND('Assumptions'!B5,2)", share, paleBlue, "27-Jul-2026 close; refresh before use");
  card(s, "I4:L7", "Primary DCF range", "='Sensitivities'!F6-'Sensitivities'!F4", share, yellow, "Bull less bear; independently recalculated cases");
  section(s, "A10:F10", "Valuation conclusion");
  s.getRange("A11:F16").merge(); s.getRange("A11").formulas = [["=\"Primary FCFF DCF indicates \"&TEXT('DCF'!H18,\"$0.00\")&\" per diluted share versus a frozen \"&TEXT('Assumptions'!B5,\"$0.00\")&\" market reference. Exit-multiple DCF and APV test terminal-value and financing assumptions; EV/revenue and EV/EBITDA are analyst stresses, not peer medians. No mechanical method average is used.\""]];
  s.getRange("A11:F16").format = { fill: paleGray, font: { color: darkGray, size: 10 }, wrapText: true, verticalAlignment: "top" };
  section(s, "H10:L10", "Method midpoint comparison");
  s.getRange("H11:L16").values = [["Method","Mid value / share","Role","Evidence","Use"],["Perpetuity DCF",null,"Primary","Source-backed + assumptions","Primary range"],["Exit DCF",null,"Corroborative","Analyst terminal multiple","Cross-check"],["APV",null,"Corroborative","Illustrative debt schedule","Cross-check"],["EV / Revenue",null,"Stress","Analyst multiple","No peer claim"],["EV / EBITDA",null,"Stress","Analyst multiple","No peer claim"]]; header(s.getRange("H11:L11"));
  s.getRange("I12:I16").formulas = [["='Valuation'!D4"],["='Valuation'!D5"],["='Valuation'!D6"],["='Valuation'!D7"],["='Valuation'!D8"]]; s.getRange("I12:I16").format.numberFormat = share;
  section(s, "A19:F19", "What must be true");
  s.getRange("A20:F25").merge(); s.getRange("A20").values = [["• Data-services growth and enterprise mix must offset search disruption and regulatory headwinds.\n• Restructuring savings must convert into cash margins without damaging revenue quality.\n• Debt, deferred consideration and capitalized development must not absorb forecast FCFF.\n• The APV tax shield is only corroborative until a contractual debt schedule is modeled."]]; s.getRange("A20:F25").format = { fill: paleGray, font: { color: darkGray, size: 10 }, wrapText: true, verticalAlignment: "top" };
  section(s, "H19:L19", "Status, exclusions and next proof");
  s.getRange("H20:L25").merge(); s.getRange("H20").values = [["Status: screen-grade. Formula-driven workbook checks must pass, but source freshness and analyst assumptions still limit decision use.\n\nExcluded: SOTP, precedents, dividend and residual-income methods.\n\nNext proof: Q2 results, updated cash/debt/share count, realized savings, normalized peer data and contractual debt terms."]]; s.getRange("H20:L25").format = { fill: paleGray, font: { color: darkGray, size: 10 }, wrapText: true, verticalAlignment: "top" };
  s.getRange("A28:L28").merge(); s.getRange("A28").values = [["Navigation: Sources → Assumptions → Historicals → Forecast → DCF → APV → Market Methods → Valuation → Sensitivities → Checks"]]; s.getRange("A28:L28").format = { fill: paleBlue, font: { italic: true, color: navyDark, size: 9 }, horizontalAlignment: "center" };
  widths(s, { A: 15, B: 15, C: 15, D: 4, E: 15, F: 15, G: 4, H: 22, I: 17, J: 18, K: 24, L: 18 });
}

for (const name of names) wb.worksheets.getItem(name).getRange("A1:Z80").format.font.name = "Arial";
const xlsx = await SpreadsheetFile.exportXlsx(wb);
await xlsx.save(outputPath);
console.log(JSON.stringify({ outputPath, sheets: names }));
