import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bookly — registre o que você lê",
    short_name: "Bookly",
    description: "Registre o que você lê, avalie e descubra o que ler a seguir.",
    lang: "pt-BR",
    start_url: "/home",
    display: "standalone",
    background_color: "#161210",
    theme_color: "#161210",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
