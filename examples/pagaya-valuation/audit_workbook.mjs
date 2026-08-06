import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const root = path.dirname(fileURLToPath(import.meta.url));
const workbookPath = path.join(
  root,
  "outputs/2026-07-30-q2-refresh/pagaya-valuation-model.xlsx",
);
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));

const dcf = await workbook.inspect({ kind: "table", range: "DCF!A3:H6", include: "values,formulas" });
const sensitivity = await workbook.inspect({ kind: "table", range: "Sensitivities!A4:F9", include: "values,formulas" });
const reverse = await workbook.inspect({ kind: "table", range: "Sensitivities!F13:H17", include: "values,formulas" });
const checks = await workbook.inspect({ kind: "table", range: "Checks!A8:G19", include: "values,formulas" });
const cover = await workbook.inspect({ kind: "table", range: "Cover!A6:L12", include: "values,formulas" });
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!",
  options: { useRegex: true, maxResults: 200 },
  summary: "final formula error scan",
});
const trace = await workbook.trace("DCF!G5");

const dcfJson = JSON.parse(dcf.ndjson);
const sensitivityJson = JSON.parse(sensitivity.ndjson);
const reverseJson = JSON.parse(reverse.ndjson);
const checksJson = JSON.parse(checks.ndjson);
const coverJson = JSON.parse(cover.ndjson);
const checkRows = checksJson.values.slice(1).filter((row) => row[0]);
const failed = checkRows.filter((row) => row[5] !== "PASS");
const baseDcf = dcfJson.values[2][6];
const baseSensitivity = sensitivityJson.values[3][3];
const reconciles = Math.abs(baseDcf - baseSensitivity) < 0.001;
const impliedMarketValue = reverseJson.values[2][1];
const marketPrice = coverJson.values[1][0];
const reverseReconciles = Math.abs(impliedMarketValue - marketPrice) <= 0.01;
const coverModelStatus = coverJson.values[6][8];

if (
  failed.length ||
  !reconciles ||
  !reverseReconciles ||
  coverModelStatus !== "PASS" ||
  !errors.ndjson.includes("matched 0 entries")
) {
  throw new Error(
    JSON.stringify({
      failedChecks: failed,
      baseDcf,
      baseSensitivity,
      impliedMarketValue,
      marketPrice,
      coverModelStatus,
      formulaErrors: errors.ndjson,
    }),
  );
}

console.log(
  JSON.stringify({
    status: "PASS",
    baseDcf,
    baseSensitivity,
    impliedMarketValue,
    marketPrice,
    coverModelStatus,
    checks: checkRows.length,
    formulaErrors: 0,
    traceBytes: JSON.stringify(trace).length,
  }),
);
