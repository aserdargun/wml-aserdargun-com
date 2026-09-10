import { test, expect } from '@playwright/test'

test('a same-tick sensor change requires a new decision, in both languages', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Act', exact: true })).toBeEnabled()
  await page.locator('.parameters > summary').click()
  const yaw = page.getByRole('slider', { name: 'Sensor direction', exact: true })
  await yaw.focus()
  await yaw.press('ArrowRight')
  await expect(page.getByTestId('world-time')).toContainText('0.00')
  await expect(page.getByRole('button', { name: 'Act', exact: true })).toBeDisabled()
  await expect(page.locator('.live-message')).toContainText('decision has changed')
  await page.getByRole('button', { name: 'Türkçeye geç' }).click()
  await expect(page.locator('.live-message')).toContainText('Karar durumu değişti')
  await expect(page.locator('.candidate')).toHaveCount(4)
  await page.getByRole('button', { name: 'Planla', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Uygula', exact: true })).toBeEnabled()
  expect(errors).toEqual([])
})

test('representation and inspector tabs support arrows and Home/End without changing physics', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const lenses = page.getByRole('tablist', { name: 'World representation' })
  await lenses.getByRole('tab', { name: 'Reality', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(lenses.getByRole('tab', { name: 'Observation', exact: true })).toBeFocused()
  await expect(lenses.getByRole('tab', { name: 'Observation', exact: true })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('End')
  await expect(lenses.getByRole('tab', { name: 'Imagination', exact: true })).toBeFocused()
  const inspector = page.getByRole('tablist', { name: 'Inspector', exact: true })
  await inspector.getByRole('tab', { name: 'Futures', exact: true }).focus()
  await page.keyboard.press('ArrowLeft')
  await expect(inspector.getByRole('tab', { name: 'Learn', exact: true })).toBeFocused()
  await page.keyboard.press('Home')
  await expect(inspector.getByRole('tab', { name: 'Futures', exact: true })).toBeFocused()
  await expect(page.getByTestId('world-time')).toContainText('0.00')
  await expect(page.locator('.branch-id')).toContainText('1 branches')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('physics and evidence remain usable when WebGL is unavailable and storage is denied', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function(this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type.startsWith('webgl') || type === 'experimental-webgl') return null
      return Reflect.apply(original, this, [type, ...args])
    } as typeof original
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Denied', 'SecurityError') } })
  })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Spatial view unavailable' })).toBeVisible()
  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  await page.getByRole('button', { name: 'Compare models', exact: true }).click()
  await page.getByRole('button', { name: 'Step', exact: true }).click()
  await expect(page.getByTestId('world-time')).toContainText('0.10')
  await expect(page.getByTestId('comparison-dynamics')).not.toContainText('NaN')
  await page.getByRole('button', { name: 'Türkçeye geç' }).click()
  await expect(page.getByRole('heading', { name: 'Uzamsal görünüm kullanılamıyor' })).toBeVisible()
  expect(errors).toEqual([])
})
