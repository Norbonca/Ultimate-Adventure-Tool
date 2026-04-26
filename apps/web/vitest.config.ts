import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "node_modules",
      ".next",
      // Playwright-only directories — futtatás `pnpm test:e2e` / `test:a11y`
      // parancsokkal, nem Vitest-tel. Az import-jaik (@playwright/test,
      // @axe-core/playwright) csak Playwright runtime-ban resolve-ódnak.
      "tests/e2e/**",
      "tests/usability/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["app/**", "components/**", "lib/**"],
      exclude: ["**/*.d.ts", "**/*.test.*", "**/*.spec.*"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
      "@uat/i18n": resolve(__dirname, "../../packages/i18n/src"),
      "@uat/db": resolve(__dirname, "../../packages/db/src"),
      "@uat/core": resolve(__dirname, "../../packages/core/src"),
      "@uat/validators": resolve(__dirname, "../../packages/validators/src"),
      "@uat/config": resolve(__dirname, "../../packages/config/src"),
    },
  },
});
