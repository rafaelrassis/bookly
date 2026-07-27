import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";

/** Tamanho padrão de toda OG image do app (WhatsApp/Twitter/LinkedIn). */
export const OG_SIZE = { width: 1200, height: 630 };

export const OG_PAPER = "#F1E8D8";
export const OG_INK = "#221C18";
export const OG_INK_DIM = "#6E6353";
export const OG_RIBBON = "#C4472F";

/** Lido do disco (não via fetch): as rotas de OG image rodam em runtime
 * Node.js (Prisma usa o driver `pg`, incompatível com edge), e o fetch de
 * `file://` que o padrão "new URL(..., import.meta.url)" produz não é
 * suportado pelo undici fora do runtime edge. */
async function loadFont(path: string) {
  const buffer = await readFile(join(process.cwd(), "public", "fonts", path));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

/** Fontes carregadas dos arquivos locais em public/fonts (sem depender de
 * CSS/next/font, que não roda no runtime de ImageResponse). */
export async function ogFonts() {
  const [frauncesBold, frauncesBlack, karlaRegular, karlaBold] = await Promise.all([
    loadFont("Fraunces-Bold.ttf"),
    loadFont("Fraunces-Black.ttf"),
    loadFont("Karla-Regular.ttf"),
    loadFont("Karla-Bold.ttf"),
  ]);

  return [
    { name: "Fraunces", data: frauncesBold, weight: 700 as const, style: "normal" as const },
    { name: "Fraunces", data: frauncesBlack, weight: 900 as const, style: "normal" as const },
    { name: "Karla", data: karlaRegular, weight: 400 as const, style: "normal" as const },
    { name: "Karla", data: karlaBold, weight: 700 as const, style: "normal" as const },
  ];
}

/** Moldura visual compartilhada por toda OG image: fundo claro + fita ribbon
 * fixa na borda esquerda (mesma assinatura gráfica da "leitura atual" na home)
 * e a wordmark no canto. */
export function OgFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: OG_PAPER,
        fontFamily: "Karla",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: 28,
          display: "flex",
          background: OG_RIBBON,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "56px 72px 56px 100px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Fraunces",
            fontWeight: 900,
            fontSize: 30,
            color: OG_INK,
          }}
        >
          bookly
          <span style={{ color: OG_RIBBON }}>.</span>
        </div>
        <div style={{ display: "flex", flex: 1, width: "100%" }}>{children}</div>
      </div>
    </div>
  );
}

/** OG genérica (fallback de dado ausente e página raiz). */
export function OgGeneric({ subtitle }: { subtitle?: string }) {
  return (
    <OgFrame>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <span style={{ fontFamily: "Fraunces", fontWeight: 900, fontSize: 76, color: OG_INK }}>
          bookly<span style={{ color: OG_RIBBON }}>.</span>
        </span>
        <span style={{ marginTop: 20, fontSize: 32, color: OG_INK_DIM }}>
          {subtitle ?? "Registre o que você lê. Descubra o que ler."}
        </span>
      </div>
    </OgFrame>
  );
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1).trimEnd()}…` : trimmed;
}

export { truncate as ogTruncate };

const STAR_PATH =
  "M12 2.5l2.9 6.4 7 0.7-5.3 4.8 1.6 6.9L12 17.9l-6.2 3.4 1.6-6.9-5.3-4.8 7-0.7z";

function OgStarIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d={STAR_PATH} fill={color} />
    </svg>
  );
}

/** Estrelas desenhadas em SVG (mesma regra de arredondamento do componente
 * Stars) — o glifo unicode "★" não existe nas fontes carregadas via arquivo
 * (Fraunces/Karla), então o satori renderiza um tofu no lugar dele. */
export function OgStars({
  rating,
  size = 28,
  color = OG_RIBBON,
}: {
  rating: number;
  size?: number;
  color?: string;
}) {
  const rounded = Math.round(rating * 2) / 2;
  const full = Math.floor(rounded);
  const hasHalf = rounded - full === 0.5;

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {Array.from({ length: full }).map((_, i) => (
        <OgStarIcon key={i} size={size} color={color} />
      ))}
      {hasHalf && (
        <div style={{ display: "flex", width: size / 2, height: size, overflow: "hidden" }}>
          <OgStarIcon size={size} color={color} />
        </div>
      )}
    </div>
  );
}
