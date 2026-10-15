import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1, timeout: 60000,
  expect: { timeout: 15000 }, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3100', viewport: { width: 390, height: 844 }, trace: 'retain-on-failure',
    launchOptions: { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] } },
  webServer: [
    { command: 'node e2e/support/api.mjs', url: 'http://127.0.0.1:3101/auth/me', reuseExistingServer: !process.env.CI },
    { command: 'npm run dev -- --port 3100 --hostname 127.0.0.1', url: 'http://127.0.0.1:3100/login', reuseExistingServer: !process.env.CI, timeout: 180000,
      env: { NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3101', NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3100', NEXT_TELEMETRY_DISABLED: '1' } },
  ],
})
