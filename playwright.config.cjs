const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./tests/browser",
  timeout: 30000,
  workers: 1,
  retries: 0,
  use: {
    channel: "msedge",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "tablet-touch",
      use: { viewport: { width: 820, height: 1180 }, hasTouch: true },
    },
  ],
});
