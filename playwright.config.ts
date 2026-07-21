import fs from "node:fs";
import { defineConfig } from "@playwright/test";

// Ambientes com Chromium pré-instalado em caminho fixo (ex.: sandbox de dev)
// usam esse executável; CI instala o browser padrão via `playwright install`.
const pinnedChromium = "/opt/pw-browsers/chromium";
const launchOptions = fs.existsSync(pinnedChromium)
  ? { executablePath: pinnedChromium }
  : undefined;

export default defineConfig({
  testDir: "./e2e",
  use: {
    viewport: { width: 390, height: 844 },
    baseURL: "http://localhost:3000",
    launchOptions,
  },
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
