import { test, expect } from '@playwright/test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
for (const locale of ['en','tr'] as const) test(`ILS metadata follows scenario and supports keyboard disclosures: ${locale}`, async ({page}) => {
  test.setTimeout(120000)
  const errors:string[]=[]
  page.on('pageerror',e=>errors.push(e.message))
  if(locale==='tr')await page.setViewportSize({width:390,height:844})
  await page.goto(`/?lang=${locale}&scenario=occlusion&ils=not-json`)
  await expect(page.locator('h1')).toHaveText(locale==='en'?'Out of sight. Still there.':'Görünmüyor. Hâlâ orada.')
  const panel=page.locator('.ils-shell')
  await expect(panel.locator('.ils-question')).toContainText(locale==='en'?'memory':'bellek')
  const summary=panel.locator('summary').first();await summary.focus();await page.keyboard.press('Enter')
  await expect(panel.locator('details').first()).toHaveAttribute('open','')
  await panel.locator('summary').nth(1).click()
  for(const kind of ['simulated','estimated','calculated'])await expect(panel.locator(`[data-evidence-kind="${kind}"]`)).toBeVisible()
  await panel.scrollIntoViewIfNeeded();await page.screenshot({path:join(tmpdir(),`wml-ils-${locale}.png`)})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false)
  await page.locator('[data-ils-action="step"]').click();await expect(page.getByTestId('world-time')).toContainText('0.10')
  await page.locator('[data-ils-action="reset"]').click();await expect(page.getByTestId('world-time')).toContainText('0.00')
  expect(errors).toEqual([])
  const response=await page.request.get('/lab.manifest.json');expect(response.status()).toBe(200);expect((await response.json()).code).toBe('wml')
})
