export default async function globalSetup() {
  const url = new URL(process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000");
  if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("E2E tests require an explicit local test environment");
  }
  // Migrations are an explicit preparation step, never a silent test side effect.
}
