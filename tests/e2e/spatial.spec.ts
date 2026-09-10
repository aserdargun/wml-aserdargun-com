import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect, type Page } from '@playwright/test'

const runtimeErrors: string[] = []
test.beforeEach(async ({ page }) => {
  runtimeErrors.length = 0
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text())
  })
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Think before you move.' }),
  ).toBeVisible()
  await expect(page.locator('.microverse canvas')).toBeVisible()
})
test.afterEach(() => expect(runtimeErrors).toEqual([]))

async function experimentState(page: Page) {
  return {
    time: await page.getByTestId('world-time').innerText(),
    goal: await page.getByTestId('goal-distance').innerText(),
    branches: await page.locator('.branch-id').innerText(),
  }
}

async function expectExperimentState(
  page: Page,
  state: Awaited<ReturnType<typeof experimentState>>,
) {
  await expect(page.getByTestId('world-time')).toHaveText(state.time)
  await expect(page.getByTestId('goal-distance')).toHaveText(state.goal)
  await expect(page.locator('.branch-id')).toHaveText(state.branches)
}

async function cameraScreenshot(
  page: Page,
  name: string,
  view: string,
  path: string,
) {
  const control = page.getByRole('button', { name, exact: true })
  await control.click()
  await expect(control).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.microverse')).toHaveAttribute(
    'data-camera-view',
    view,
  )
  // Only the spectator camera eases. Let that short visual transition settle for the evidence image.
  await page.waitForTimeout(650)
  await page.locator('.stage').screenshot({ path })
}

test('spatial cameras and forecast inspection preserve reality', async ({
  page,
}) => {
  // This flow checks many camera/lens transitions on CI's software renderer.
  test.setTimeout(120000)
  await page
    .locator('.stage')
    .screenshot({ path: join(tmpdir(), 'wml-spatial-reality.png') })
  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  const origin = await experimentState(page)
  await expect(page.locator('.candidate.selected')).toContainText('Left detour')
  const expanded = page.getByRole('button', {
    name: 'Expand stage',
    exact: true,
  })
  await expanded.click()
  await expect(
    page.getByRole('button', { name: 'Reduce stage', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.microverse')).toHaveAttribute(
    'data-camera-view',
    'studio',
  )
  await page
    .locator('.stage')
    .screenshot({ path: join(tmpdir(), 'wml-spatial-plan.png') })

  await cameraScreenshot(
    page,
    'Overhead',
    'overhead',
    join(tmpdir(), 'wml-spatial-overhead.png'),
  )
  await expectExperimentState(page, origin)
  await cameraScreenshot(
    page,
    'Close-up',
    'detail',
    join(tmpdir(), 'wml-spatial-detail.png'),
  )
  await expectExperimentState(page, origin)
  await page.getByRole('button', { name: 'Studio', exact: true }).click()
  await expect(page.locator('.microverse')).toHaveAttribute(
    'data-camera-view',
    'studio',
  )

  const cursor = page.getByRole('slider', {
    name: '3D forecast time',
    exact: true,
  })
  await expect(cursor).toHaveValue('2.5')
  const earlierPosition = await page
    .getByTestId('spatial-future-position')
    .innerText()
  await cursor.fill('4')
  await expect(cursor).toHaveValue('4')
  await expect(page.getByTestId('spatial-future-position')).not.toHaveText(
    earlierPosition,
  )
  await expectExperimentState(page, origin)

  for (const letter of ['A', 'B', 'C', 'D'])
    await expect(
      page.getByRole('button', {
        name: `Preview future ${letter}`,
        exact: true,
      }),
    ).toBeVisible()
  await page
    .getByRole('button', { name: 'Preview future A', exact: true })
    .click()
  await expect(page.locator('.candidate.selected')).toContainText('Direct push')
  await expect(
    page.getByRole('button', { name: 'Preview future A', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expectExperimentState(page, origin)

  const lenses = page.getByRole('tablist', {
    name: 'World representation',
    exact: true,
  })
  for (const lens of ['Observation', 'Belief']) {
    await lenses.getByRole('tab', { name: lens, exact: true }).click()
    await expect(
      lenses.getByRole('tab', { name: lens, exact: true }),
    ).toHaveAttribute('aria-selected', 'true')
    await expect(
      page.getByRole('button', { name: /^Preview future [A-D]$/ }),
    ).toHaveCount(0)
    await expectExperimentState(page, origin)
  }
  await lenses.getByRole('tab', { name: 'Imagination', exact: true }).click()
  await expect(
    page.getByRole('button', { name: /^Preview future [A-D]$/ }),
  ).toHaveCount(4)
  await expectExperimentState(page, origin)
})

test('a spatial future selection executes in physics and changes the rendered world', async ({ page }) => {
  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  await page.getByRole('button', { name: 'Preview future A', exact: true }).click()
  await expect(page.locator('.candidate.selected')).toContainText('Direct push')
  const origin = await experimentState(page)
  const canvasBeforeAct = await page.locator('.microverse canvas').screenshot()
  await page.getByRole('button', { name: 'Act', exact: true }).click()
  await expect
    .poll(async () =>
      Number(
        await page
          .locator('.measurements > div')
          .nth(3)
          .locator('strong')
          .innerText(),
      ),
    )
    .toBeGreaterThan(0)
  await expect
    .poll(async () =>
      Number(
        (await page.getByTestId('world-time').innerText()).match(
          /[0-9]+(?:\.[0-9]+)?/,
        )?.[0],
      ),
    )
    .toBeGreaterThan(1)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Play', exact: true }),
  ).toBeVisible()
  expect(
    parseFloat(await page.getByTestId('goal-distance').innerText()),
  ).toBeLessThan(parseFloat(origin.goal))
  await expect(page.locator('.microverse canvas')).toBeVisible()
  const canvasAfterAct = await page.locator('.microverse canvas').screenshot()
  expect(Buffer.compare(canvasBeforeAct, canvasAfterAct)).not.toBe(0)
})

test('Turkish spatial controls remain accessible at 390px with reduced motion and never advance the experiment', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('button', { name: 'Türkçeye geç', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
  await page.getByRole('button', { name: 'Planla', exact: true }).click()
  const origin = await experimentState(page)
  await page
    .getByRole('button', { name: 'Sahneyi genişlet', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Sahneyi küçült', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')

  for (const [name, view] of [
    ['Üstten', 'overhead'],
    ['Yakın', 'detail'],
    ['Stüdyo', 'studio'],
  ]) {
    const button = page.getByRole('button', { name, exact: true })
    await expect(button).toBeVisible()
    await button.focus()
    await page.keyboard.press('Enter')
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.microverse')).toHaveAttribute(
      'data-camera-view',
      view,
    )
    await expectExperimentState(page, origin)
  }

  const cursor = page.getByRole('slider', {
    name: '3D tahmin zamanı',
    exact: true,
  })
  await expect(cursor).toBeVisible()
  const earlierPosition = await page
    .getByTestId('spatial-future-position')
    .innerText()
  await cursor.fill('4')
  await expect(cursor).toHaveValue('4')
  await expect(page.getByTestId('spatial-future-position')).not.toHaveText(
    earlierPosition,
  )
  await expect(page.locator('.spatial-inspection')).toContainText(
    'Yalnızca inceleme',
  )
  await expectExperimentState(page, origin)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  const stageBounds = await page.locator('.stage').boundingBox()
  expect(stageBounds).not.toBeNull()
  expect(stageBounds!.x).toBeGreaterThanOrEqual(0)
  expect(stageBounds!.x + stageBounds!.width).toBeLessThanOrEqual(390)
  await page
    .locator('.stage')
    .screenshot({ path: join(tmpdir(), 'wml-spatial-mobile.png') })
})
