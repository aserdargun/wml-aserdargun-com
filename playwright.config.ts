import { defineConfig } from '@playwright/test'
const production = !!process.env.WML_E2E_PRODUCTION
const remoteURL = process.env.WML_E2E_URL
const baseURL = remoteURL || (production ? 'http://127.0.0.1:5189' : 'http://127.0.0.1:5188')
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45000,
  expect: { timeout: 20000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL,
    viewport: { width: 1440, height: 1040 },
    headless: true,
    trace: 'retain-on-failure',
    launchOptions: {
      args: [
        '--enable-webgl',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
  webServer: remoteURL ? undefined : {
    command: production ? 'npm run preview -- --port 5189' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
})
