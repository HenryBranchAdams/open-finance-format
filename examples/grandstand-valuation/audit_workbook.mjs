import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadArtifactTool } from "./load_artifact_tool.mjs";

const { FileBlob, SpreadsheetFile } = await loadArtifactTool();

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(packageRoot, "outputs", "20260728-grsd-multimethod");
const workbookPath = path.join(outputDir, "grandstand-multi-method-valuation-model.xlsx");
const previewDir = path.join(outputDir, "previews");
await fs.mkdir(previewDir, { recursive: true });

const input = await FileBlob.load(workbookPath);
const wb = await SpreadsheetFile.importXlsx(input);
const ranges = [
  "Cover!A1:L28",
  "Assumptions!A1:F44",
  "Forecast!A1:H27",
  "DCF!A1:H38",
  "APV!A1:G41",
  "Market Methods!A1:G22",
  "Valuation!A1:Q25",
  "Sensitivities!A1:H62",
  "Checks!A1:F26",
];
for (const range of ranges) {
  const result = await wb.inspect({ kind: "table", range, include: "values,formulas", tableMaxRows: 70, tableMaxCols: 18, maxChars: 16000 });
  console.log(result.ndjson);
}
const errors = await wb.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!", options: { useRegex: true, maxResults: 300 }, summary: "formula error scan" });
console.log(errors.ndjson);
const drawings = await wb.inspect({ kind: "drawing", maxChars: 5000 });
console.log(drawings.ndjson);

const sheetNames = ["Cover", "Sources", "Assumptions", "Historicals", "Forecast", "DCF", "APV", "Market Methods", "Valuation", "Sensitivities", "Checks"];
for (const sheetName of sheetNames) {
  const blob = await wb.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(path.join(previewDir, `${sheetName.replaceAll(" ", "-")}.png`), new Uint8Array(await blob.arrayBuffer()));
}
console.log(JSON.stringify({ workbookPath, previewDir, sheetsRendered: sheetNames.length }));
