import type { Metadata, Viewport } from "next";
import { Fraunces, Karla } from "next/font/google";
import { ToastProvider, UserProvider } from "@/lib/store";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  variable: "--font-fraunces",
});

const karla = Karla({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-karla",
});

export const metadata: Metadata = {
  title: "bookly — registre o que você lê",
  description: "Registre o que você lê. Descubra o que ler.",
};

export const viewport: Viewport = {
  themeColor: "#161210",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${fraunces.variable} ${karla.variable} bg-leather font-sans text-paper antialiased`}
      >
        <UserProvider>
          <ToastProvider>
            <div className="mx-auto min-h-dvh w-full max-w-app">{children}</div>
          </ToastProvider>
        </UserProvider>
      </body>
    </html>
  );
}
