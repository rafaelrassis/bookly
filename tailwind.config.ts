import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: { xs: "480px", sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
      colors: {
        leather: "rgb(var(--leather) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        card2: "rgb(var(--card2) / <alpha-value>)",
        paper: "rgb(var(--paper) / <alpha-value>)",
        paperDim: "rgb(var(--paperDim) / <alpha-value>)",
        paperMuted: "rgb(var(--paperMuted) / <alpha-value>)",
        foil: "rgb(var(--foil) / <alpha-value>)",
        ribbon: "rgb(var(--ribbon) / <alpha-value>)",
        ribbonText: "rgb(var(--ribbon-text) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-karla)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      maxWidth: {
        app: "480px",
        content: "720px",
        shell: "1360px",
      },
      fontSize: {
        // 11px — piso absoluto de legibilidade
        meta: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.14em", fontWeight: "700" }],
        caption: ["0.8125rem", { lineHeight: "1.15rem" }],
        body: ["0.9375rem", { lineHeight: "1.5rem" }],
        title: ["clamp(1.05rem, 0.9rem + 0.7vw, 1.25rem)", { lineHeight: "1.3" }],
        h1: ["clamp(1.5rem, 1.2rem + 1.6vw, 2.25rem)", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
      },
      minHeight: { tap: "44px" },
      minWidth: { tap: "44px" },
      spacing: { tabbar: "4.5rem" },
    },
  },
  plugins: [],
};
export default config;
