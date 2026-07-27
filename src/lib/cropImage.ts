export type Area = { x: number; y: number; width: number; height: number };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Recorta `src` na `area` (px da imagem original) aplicando `rotation` (graus).
 * Saída quadrada de `size`×`size`, em WebP (o server ainda re-otimiza pra 400×400). */
export async function getCroppedBlob(
  src: string,
  area: Area,
  rotation = 0,
  size = 512,
): Promise<Blob> {
  const image = await loadImage(src);

  const rad = (rotation * Math.PI) / 180;
  const bBoxW = Math.abs(Math.cos(rad) * image.width) + Math.abs(Math.sin(rad) * image.height);
  const bBoxH = Math.abs(Math.sin(rad) * image.width) + Math.abs(Math.cos(rad) * image.height);

  const rot = document.createElement("canvas");
  rot.width = bBoxW;
  rot.height = bBoxH;
  const rctx = rot.getContext("2d");
  if (!rctx) throw new Error("Canvas indisponível.");
  rctx.translate(bBoxW / 2, bBoxH / 2);
  rctx.rotate(rad);
  rctx.drawImage(image, -image.width / 2, -image.height / 2);

  const out = document.createElement("canvas");
  out.width = size;
  out.height = size;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("Canvas indisponível.");
  octx.drawImage(rot, area.x, area.y, area.width, area.height, 0, 0, size, size);

  return new Promise((resolve, reject) => {
    out.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar recorte."))),
      "image/webp",
      0.9,
    );
  });
}
