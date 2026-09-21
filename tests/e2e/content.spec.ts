import { test, expect } from '@playwright/test'

for (const locale of ['en', 'tr'] as const) {
  test(`localized content connects all experiments to research: ${locale}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
    if (locale === 'tr') await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/?lang=${locale}`)
    await expect(page.locator('.intro h1')).toBeVisible()
    await expect(page).toHaveTitle(locale === 'en' ? 'WML - World Model Laboratory' : 'WML - Dünya Modeli Laboratuvarı')
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /WFM/)
    const slugs = locale === 'en'
      ? ['action-conditioning', 'world-model', 'latent-state', 'uncertainty']
      : ['eylem-kosullama', 'dunya-modeli', 'gizil-durum', 'belirsizlik']
    for (let index = 0; index < 4; index++) {
      await page.locator('.experiment-links button').nth(index).click()
      await page.getByRole('tab', { name: locale === 'en' ? 'Learn' : 'Öğren', exact: true }).click()
      await expect(page.locator('.lesson-question')).toHaveCount(5)
      await expect(page.locator('.research-link')).toHaveAttribute('href', `https://wfm.aserdargun.com/${locale}/concepts/${slugs[index]}`)
      await expect(page.locator('.research-link')).toHaveAttribute('target', '_blank')
      await expect(page.locator('.research-link')).not.toContainText('(EN)')
      await expect(page.getByTestId('world-time')).toContainText('0.00')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
    const footer = page.locator('.lab-footer')
    await expect(footer).toContainText(locale === 'en' ? 'learning system' : 'öğrenme sistemi')
    await expect(footer.getByRole('link', { name: locale === 'en' ? 'Application map' : 'Uygulama haritası' })).toHaveAttribute('href', `https://aserdargun.com/${locale === 'tr' ? 'tr/' : ''}applications/`)
    await page.getByRole('button', { name: locale === 'en' ? 'World Model 101' : 'Dünya Modeli 101', exact: true }).click()
    await expect(page.locator('.guided-copy strong')).toHaveText(locale === 'en' ? 'Reality' : 'Gerçeklik')
    expect(errors).toEqual([])
  })
}
