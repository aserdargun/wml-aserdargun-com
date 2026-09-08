import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect } from '@playwright/test'
const errors: string[] = []
test.beforeEach(async ({ page }) => {
  errors.length = 0
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Think before you move.' }),
  ).toBeVisible()
})
test.afterEach(() => expect(errors).toEqual([]))
test('flagship: plan, act, compare, restore and branch into a collision', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  await expect(page.getByTestId('world-time')).toContainText('0.00')
  await expect(page.locator('.candidate')).toHaveCount(4)
  await expect(page.locator('.candidate.selected')).toContainText('Left detour')
  await page.screenshot({
    path: join(tmpdir(), 'wml-desktop-plan.png'),
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Act', exact: true }).click()
  await expect(page.locator('.success-label')).toBeVisible()
  expect(
    parseFloat(await page.getByTestId('goal-distance').innerText()),
  ).toBeLessThan(0.5)
  await expect(page.getByTestId('position-error')).not.toContainText('—')
  await page.screenshot({
    path: join(tmpdir(), 'wml-desktop-result.png'),
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Rewind', exact: true }).click()
  await expect(page.getByTestId('world-time')).toContainText('0.00')
  await expect(page.getByTestId('goal-distance')).toContainText('6.00')
  await page.getByRole('button', { name: 'Branch', exact: true }).click()
  await expect(page.locator('.branch-id')).toContainText('2 branches')
  await page.getByRole('button', { name: /A · Direct push/ }).click()
  await page.getByRole('button', { name: 'Act', exact: true }).click()
  await expect
    .poll(async () =>
      Number(
        await page
          .locator('.measurements>div')
          .nth(3)
          .locator('strong')
          .innerText(),
      ),
    )
    .toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.screenshot({ path: join(tmpdir(), 'wml-branch.png'), fullPage: true })
})
test('occlusion removes an observed ball while belief remembers it', async ({
  page,
}) => {
  await page.getByRole('button', { name: /See the unseen/ }).click()
  await expect(
    page.locator('.belief-row').filter({ hasText: 'Ball' }),
  ).toContainText('Seen')
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(
    page.locator('.belief-row').filter({ hasText: 'Ball' }),
  ).toContainText('Remembered')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await page
    .getByRole('tablist', { name: 'World representation' })
    .getByRole('tab', { name: 'Belief', exact: true })
    .click()
  await page.screenshot({
    path: join(tmpdir(), 'wml-occlusion.png'),
    fullPage: true,
  })
})
test('guided story reaches measured error and update', async ({ page }) => {
  await page
    .getByRole('button', { name: 'World Model 101', exact: true })
    .click()
  for (let i = 0; i < 3; i++)
    await page.getByRole('button', { name: 'Next chapter' }).click()
  await expect(page.locator('.guided-copy strong')).toHaveText('Prediction')
  await expect(
    page.getByRole('button', { name: 'Next chapter' }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Predict', exact: true }).click()
  await page.getByRole('button', { name: 'Next chapter' }).click()
  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  for (let i = 0; i < 3; i++)
    await page.getByRole('button', { name: 'Next chapter' }).click()
  await expect(page.locator('.guided-copy strong')).toHaveText('Reality check')
  await page.getByRole('button', { name: 'Act', exact: true }).click()
  await page.getByRole('button', { name: 'Next chapter' }).click()
  await expect(page.getByRole('button', { name: 'Next chapter' })).toBeEnabled()
  await page.getByRole('button', { name: 'Next chapter' }).click()
  await expect(page.locator('.guided-copy strong')).toHaveText('Update')
  await page.getByRole('button', { name: 'Next chapter' }).click()
  await expect(page.locator('.guided')).toHaveCount(0)
})
test('narrow Turkish layout and keyboard control', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Türkçeye geç' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
  await expect(
    page.getByRole('heading', { name: 'Hareket etmeden düşün.' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Planla', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.candidate')).toHaveCount(4)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: join(tmpdir(), 'wml-mobile-tr.png'),
    fullPage: true,
  })
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
})
test('surprise keeps old predictions and generates real error', async ({
  page,
}) => {
  await page.getByRole('button', { name: /Meet a surprise/ }).click()
  await page.getByRole('button', { name: 'Predict', exact: true }).click()
  await page.getByRole('button', { name: /D · Wait/ }).click()
  await page.getByRole('button', { name: 'Act', exact: true }).click()
  await expect(page.getByTestId('world-time')).not.toContainText('0.00')
  await page.getByRole('button', { name: 'Apply surprise impulse' }).click()
  await expect
    .poll(async () =>
      parseFloat(await page.getByTestId('position-error').innerText()),
    )
    .toBeGreaterThan(0.5)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
})
