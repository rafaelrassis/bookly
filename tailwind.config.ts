import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        leather: "#161210",
        card: "#221C18",
        card2: "#2B2420",
        paper: "#F1E8D8",
        paperDim: "#B8AB97",
        foil: "#E4A93C",
        ribbon: "#C4472F",
        line: "#3A322B",
      },
      fontFamily: {
        sans: ["var(--font-karla)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      maxWidth: {
        app: "480px",
      },
    },
  },
  plugins: [],
};
export default config;
