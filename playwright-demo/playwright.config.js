const { defineConfig } = require('@playwright/test')

module.exports = defineConfig({
  testDir: '.',
  timeout: 180_000,
  use: {
    baseURL: 'http://localhost:3001',
    viewport: { width: 1440, height: 900 },
    video: { mode: 'on', size: { width: 1440, height: 900 } },
    screenshot: 'only-on-failure',
    launchOptions: { slowMo: 350 },
  },
  outputDir: 'test-results',
  reporter: [['list'], ['html', { open: 'never' }]],
})
