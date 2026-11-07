import { defineConfig } from "@playwright/test";

const CI = !!process.env.CI;

export default defineConfig({
  testDir: "./specs",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node servidor.mjs",
    url: "http://localhost:4173",
    reuseExistingServer: !CI,
  },
  // Os mesmos três tamanhos usados à mão desde o começo do projeto
  projects: [
    { name: "computador", use: { viewport: { width: 1366, height: 850 } } },
    { name: "tablet", use: { viewport: { width: 900, height: 1000 } } },
    { name: "celular", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 } },
  ],
});
