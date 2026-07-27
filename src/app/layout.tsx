import type { Metadata, Viewport } from "next";
import { Fraunces, Karla } from "next/font/google";
import { AuthSync } from "@/components/AuthSync";
import { Providers } from "@/components/Providers";
import { ThemeSync } from "@/components/ThemeSync";
import { Toaster } from "@/components/Toaster";
import "./globals.css";

// Fraunces só é usada em negrito/black (700/900) no app — 500 nunca aparece,
// então cai fora. "swap" evita FOIT enquanto a fonte carrega.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["700", "900"],
  display: "swap",
  variable: "--font-fraunces",
});

const karla = Karla({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
  variable: "--font-karla",
});

const DESCRIPTION =
  "Registre o que você lê, avalie e descubra o que ler a seguir — com clubes de livro e uma comunidade de leitores.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Bookly",
    template: "%s · Bookly",
  },
  description: DESCRIPTION,
  applicationName: "Bookly",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Bookly",
    title: "Bookly",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Bookly",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#161210",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" data-theme="dark">
      <body
        className={`${fraunces.variable} ${karla.variable} bg-leather font-sans text-paper antialiased`}
      >
        <Providers>
          <ThemeSync />
          <AuthSync />
          <div className="min-h-dvh w-full">{children}</div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
