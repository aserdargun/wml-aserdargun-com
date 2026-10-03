import { test, expect } from '@playwright/test'

// The production run serves the artifact with the Azure globalHeaders applied.
// These assertions exist because the policy used to be absent from the test
// server entirely: the page then passed every browser flow in CI and still
// failed on the public site, where the real policy blocked the physics engine.

test('the artifact is served under the real content security policy', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)
  const csp = response?.headers()['content-security-policy'] ?? ''
  expect(csp, 'the production e2e server must apply globalHeaders').toContain('script-src')
  expect(csp).toContain("'wasm-unsafe-eval'")
  expect(response?.headers()['x-frame-options']).toBe('DENY')
})

test('the laboratory boots and simulates under that policy', async ({ page }) => {
  const errors: string[] = []
  const consoleErrors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.goto('/')

  // A blocked WebAssembly compile throws before the app mounts, so the error
  // boundary replaces the laboratory. Reaching the controls is the assertion.
  await expect(page.getByRole('button', { name: 'Plan', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Plan', exact: true })).toBeEnabled()

  // Prove the physics actually stepped rather than only rendering: plan, act,
  // then confirm the recorded goal distance moved toward the target.
  const distance = page.getByTestId('goal-distance')
  const before = parseFloat(await distance.innerText())
  expect(before).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Act', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Act', exact: true }).click()
  const play = page.getByRole('button', { name: 'Play', exact: true })
  if (await play.isEnabled()) await play.click()
  await expect
    .poll(async () => parseFloat(await distance.innerText()))
    .toBeLessThan(before)

  expect(errors, `page errors under the shipped policy: ${errors.join(' | ')}`).toEqual([])
  expect(consoleErrors, `console errors under the shipped policy: ${consoleErrors.join(' | ')}`).toEqual([])
})
