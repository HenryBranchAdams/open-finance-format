import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const workbookPath = resolve(
  process.cwd(),
  "../examples/pagaya-valuation/outputs/019f8fa1-90aa-7002-a17f-ddffc4552a84/pagaya-valuation-model.xlsx",
);

export async function GET() {
  const workbook = await readFile(workbookPath);
  return new Response(workbook, {
    headers: {
      "Content-Disposition": 'attachment; filename="pagaya-valuation-model.xlsx"',
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
