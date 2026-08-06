import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const workbookPath = resolve(
  process.cwd(),
  "../examples/pagaya-valuation/outputs/2026-07-30-q2-refresh/pagaya-valuation-model.xlsx",
);

export async function GET() {
  const workbook = await readFile(workbookPath);
  return new Response(workbook, {
    headers: {
      "Content-Disposition":
        'attachment; filename="pagaya-valuation-model-2026-07-30.xlsx"',
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
