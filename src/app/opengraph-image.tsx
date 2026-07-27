import { ImageResponse } from "next/og";
import { OG_SIZE, OgGeneric, ogFonts } from "@/lib/og";

export const alt = "Bookly";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const fonts = await ogFonts();
  return new ImageResponse(<OgGeneric />, { ...OG_SIZE, fonts });
}
