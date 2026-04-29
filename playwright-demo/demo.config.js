const { defineConfig } = require('@playwright/test')

module.exports = defineConfig({
  testDir: '.',
  testMatch: '**/demo.spec.js',
  timeout: 960_000,          // 16 min hard cap
  use: {
    baseURL: 'http://localhost:3001',
    viewport: { width: 1440, height: 900 },
    video: { mode: 'on', size: { width: 1440, height: 900 } },
    screenshot: 'off',
    launchOptions: { slowMo: 0 },
  },
  outputDir: 'demo-results',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'demo-report' }]],
})
