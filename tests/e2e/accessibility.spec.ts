import { expect, test } from '@playwright/test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

for (const locale of ['en', 'tr'] as const) {
  test(`keyboard lenses and fixed occlusion controls preserve evidence: ${locale}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.setViewportSize(locale === 'tr' ? { width: 390, height: 844 } : { width: 1440, height: 1040 })
    await page.goto('/')
    await expect(page).toHaveTitle('WML - World Model Laboratory')
    await page.getByRole('button', { name: /See the unseen/ }).click()
    if (locale === 'tr') await page.getByRole('button', { name: 'Türkçeye geç', exact: true }).click()
    const lenses = page.getByRole('tablist', { name: locale === 'en' ? 'World representation' : 'Dünya temsili' })
    const before = await page.getByTestId('world-time').innerText()
    await lenses.locator('[aria-selected="true"]').focus()
    await page.keyboard.press('End')
    await expect(lenses.getByRole('tab').last()).toBeFocused()
    await expect(lenses.getByRole('tab').last()).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('ArrowRight')
    await expect(lenses.getByRole('tab').first()).toBeFocused()
    await expect(lenses.getByRole('tab').first()).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByTestId('world-time')).toHaveText(before)
    await page.locator('.parameters summary').click()
    const friction = page.getByRole('slider', { name: locale === 'en' ? 'Reality friction' : 'Gerçeklik sürtünmesi', exact: true })
    await expect(friction).toBeDisabled()
    await expect(friction).toHaveValue('0')
    await expect(page.locator('#occlusion-friction-note')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await lenses.scrollIntoViewIfNeeded()
    await page.screenshot({ path: join(tmpdir(), `wml-audit-${locale}.png`) })
    expect(errors).toEqual([])
  })
}
