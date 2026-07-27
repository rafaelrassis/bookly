// Gera os ícones do app (favicon, apple-touch-icon, PWA) a partir de um único
// SVG com a identidade visual do bookly: fundo leather + fita ribbon central
// (mesmo motivo gráfico da "leitura atual" na home). Rodar só quando o ícone
// precisar mudar — a saída (public/icons, src/app/icon.png, apple-icon.png)
// fica versionada no repo.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const LEATHER = "#161210";
const RIBBON = "#C4472F";

function svg(size) {
  const w = 140;
  const h = 220;
  const x0 = (512 - w) / 2;
  const y0 = (512 - h) / 2;
  const notch = 40;
  const points = [
    [x0, y0],
    [x0 + w, y0],
    [x0 + w, y0 + h],
    [x0 + w / 2, y0 + h - notch],
    [x0, y0 + h],
  ]
    .map((p) => p.join(","))
    .join(" ");

  return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="${LEATHER}"/>
  <polygon points="${points}" fill="${RIBBON}"/>
</svg>`;
}

const outputs = [
  { file: "src/app/icon.png", size: 64 },
  { file: "src/app/apple-icon.png", size: 180 },
  { file: "public/icons/icon-192.png", size: 192 },
  { file: "public/icons/icon-512.png", size: 512 },
  { file: "public/icons/icon-512-maskable.png", size: 512 },
];

await mkdir("public/icons", { recursive: true });

for (const { file, size } of outputs) {
  await sharp(Buffer.from(svg(size))).resize(size, size).png().toFile(file);
  console.log(`✓ ${file}`);
}
