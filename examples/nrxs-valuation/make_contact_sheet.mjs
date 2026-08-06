import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.dirname(fileURLToPath(import.meta.url));
const previewDir = path.join(root, "outputs/20260730-nrxs01/previews-reimport");
const output = path.join(root, "outputs/20260730-nrxs01/contact-sheet.png");
const names = [
  "Cover", "Sources", "Assumptions",
  "Historicals", "KPIs", "Forecast",
  "DCF", "Comps", "Sensitivities",
  "Reverse DCF", "Checks",
];
const tileW = 620;
const tileH = 410;
const labelH = 34;
const gap = 16;
const cols = 3;
const rows = Math.ceil(names.length / cols);
const composites = [];

for (let i = 0; i < names.length; i += 1) {
  const name = names[i];
  const input = path.join(previewDir, `${name}.png`);
  const image = await sharp(input)
    .resize(tileW, tileH - labelH, { fit: "inside", background: "#ffffff" })
    .extend({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      background: "#ffffff",
    })
    .png()
    .toBuffer();
  const meta = await sharp(image).metadata();
  const left = (i % cols) * (tileW + gap) + Math.floor((tileW - meta.width) / 2);
  const top = Math.floor(i / cols) * (tileH + gap) + labelH;
  composites.push({ input: image, left, top });
  const label = Buffer.from(
    `<svg width="${tileW}" height="${labelH}">
      <rect width="100%" height="100%" fill="#163A5F"/>
      <text x="14" y="23" font-family="Arial" font-size="17" font-weight="bold" fill="white">${name}</text>
    </svg>`,
  );
  composites.push({
    input: label,
    left: (i % cols) * (tileW + gap),
    top: Math.floor(i / cols) * (tileH + gap),
  });
}

await sharp({
  create: {
    width: cols * tileW + (cols - 1) * gap,
    height: rows * tileH + (rows - 1) * gap,
    channels: 3,
    background: "#e9edf2",
  },
}).composite(composites).png().toFile(output);

await fs.access(output);
console.log(output);
