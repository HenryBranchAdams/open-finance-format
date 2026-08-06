import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const root = path.dirname(fileURLToPath(import.meta.url));
const workbookPath = path.join(root, "outputs/20260730-nrxs01/nrxs-valuation-model.xlsx");
const previewDir = path.join(root, "outputs/20260730-nrxs01/previews-reimport");
await fs.mkdir(previewDir, { recursive: true });

const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const dcf = JSON.parse((await wb.inspect({
  kind: "table",
  range: "DCF!A3:N19",
  include: "values,formulas",
  tableMaxRows: 25,
  tableMaxCols: 15,
})).ndjson);
const checks = JSON.parse((await wb.inspect({
  kind: "table",
  range: "Checks!A8:G23",
  include: "values,formulas",
  tableMaxRows: 20,
  tableMaxCols: 8,
})).ndjson);
const reverse = JSON.parse((await wb.inspect({
  kind: "table",
  range: "'Reverse DCF'!A17:C21",
  include: "values,formulas",
  tableMaxRows: 10,
  tableMaxCols: 5,
})).ndjson);
const cover = JSON.parse((await wb.inspect({
  kind: "table",
  range: "Cover!A34:L40",
  include: "values,formulas",
  tableMaxRows: 10,
  tableMaxCols: 13,
})).ndjson);
const errors = await wb.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!",
  options: { useRegex: true, maxResults: 300 },
  summary: "post-export formula error scan",
});

const checkRows = checks.values.slice(1).filter((row) => row[0]);
const failed = checkRows.filter((row) => row[5] !== "PASS");
const bear = dcf.values[1][11];
const base = dcf.values[2][11];
const bull = dcf.values[3][11];
const weighted = dcf.values[6][1];
const weightedFromCases = dcf.values[1][13] + dcf.values[2][13] + dcf.values[3][13];
const market = dcf.values[7][1];
const impliedScale = reverse.values[1][1];
const reproducedMarket = reverse.values[4][1];
const coverStatus = cover.values[1][7];
const formulaErrors = errors.ndjson.includes("matched 0 entries") ? 0 : 1;

if (
  failed.length
  || !(bear <= base && base <= bull)
  || Math.abs(weighted - weightedFromCases) > 1e-9
  || Math.abs(reproducedMarket - market) > 0.01
  || !(impliedScale > 1.5 && impliedScale < 1.6)
  || coverStatus !== "PASS"
  || formulaErrors
) {
  throw new Error(JSON.stringify({
    failed,
    bear,
    base,
    bull,
    weighted,
    weightedFromCases,
    market,
    impliedScale,
    reproducedMarket,
    coverStatus,
    formulaErrors: errors.ndjson,
  }));
}

for (const sheetName of [
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
]) {
  const preview = await wb.render({ sheetName, autoCrop: "all", scale: sheetName === "Cover" ? 1.1 : 1, format: "png" });
  const bytes = new Uint8Array(await preview.arrayBuffer());
  await fs.writeFile(path.join(previewDir, `${sheetName}.png`), bytes);
}

console.log(JSON.stringify({
  status: "PASS",
  checks: checkRows.length,
  bear,
  base,
  bull,
  weighted,
  market,
  discountToMarket: weighted / market - 1,
  impliedScale,
  reproducedMarket,
  coverStatus,
  formulaErrors,
  renderedSheets: 11,
}));
