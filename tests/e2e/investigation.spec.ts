import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { test, expect, type Page, type TestInfo } from '@playwright/test'
import type {
  AnalysisBundle,
  AnalysisErrors,
  ReplayBranch,
  TrajectorySample,
} from '../../src/core'

interface EvidenceReport {
  format: string
  scientificBoundary: string
  scenario: string
  branchId: string
  throughTick: number
  throughTime: number
  analysis: AnalysisBundle
  actual: TrajectorySample[]
  errors: AnalysisErrors
  branches: Pick<
    ReplayBranch,
    'id' | 'parentBranchId' | 'forkTick' | 'actions'
  >[]
}

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
})
test.afterEach(() => expect(runtimeErrors).toEqual([]))

async function exportEvidence(
  page: Page,
  info: TestInfo,
  label: string,
): Promise<EvidenceReport> {
  const downloaded = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Export evidence · JSON', exact: true })
    .click()
  const download = await downloaded
  expect(download.suggestedFilename()).toMatch(/^wml-.+\.json$/)
  const path = info.outputPath(`${label}.json`)
  await download.saveAs(path)
  expect(await download.failure()).toBeNull()
  return JSON.parse(await readFile(path, 'utf8')) as EvidenceReport
}

test('three models share a decision point and future outcomes remain unmeasured', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  const decisionTime = await page.getByTestId('world-time').innerText()
  await page
    .getByRole('button', { name: 'Compare models', exact: true })
    .click()
  await expect(page.getByTestId('analysis-origin')).toContainText('Left detour')
  await expect(page.getByTestId('analysis-origin')).toContainText('t₀ = 0.00 s')

  const initialPositions: string[] = []
  for (const model of ['constant', 'dynamics', 'biased']) {
    const row = page.getByTestId(`comparison-${model}`)
    await expect(row).toBeVisible()
    initialPositions.push(await row.locator('td').nth(0).innerText())
    await expect(row.locator('td').nth(2)).toHaveText('—')
  }
  expect(new Set(initialPositions).size).toBe(1)
  await expect(page.getByTestId('inspected-actual')).not.toContainText(
    'Not yet simulated',
  )

  await page.locator('#comparison-cursor').press('End')
  await expect(page.getByTestId('inspected-actual')).toHaveText(
    'Not yet simulated',
  )
  for (const model of ['constant', 'dynamics', 'biased']) {
    const row = page.getByTestId(`comparison-${model}`)
    await expect(row.locator('td').nth(0)).not.toHaveText('—')
    await expect(row.locator('td').nth(1)).toHaveText('—')
    await expect(row.locator('td').nth(2)).toHaveText('—')
  }
  await expect(page.locator('.analysis-conclusion')).toContainText(
    'Act or step to collect',
  )
  await expect(page.getByTestId('world-time')).toHaveText(decisionTime)
  await page.getByText('Check your interpretation', { exact: true }).click()
  await expect(page.locator('.learning-check h3')).toContainText(
    'If the dynamics model',
  )
  await page
    .getByRole('button', {
      name: 'It matched this action’s recorded trajectory best.',
      exact: true,
    })
    .click()
  await expect(page.locator('.learning-feedback')).toContainText(
    'That follows from the evidence.',
  )
  await expect(page.getByTestId('world-time')).toHaveText(decisionTime)
})

test('zero sensitivity spread exports nine coincident forecasts and an auditable observed origin', async ({
  page,
}, info) => {
  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  await page
    .getByRole('button', { name: 'Compare models', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Sample assumptions', exact: true })
    .click()
  await page
    .getByRole('slider', { name: 'Assumption range', exact: true })
    .press('End')
  await expect(
    page.getByRole('slider', { name: 'Assumption range', exact: true }),
  ).toHaveValue('1')
  await page.locator('#comparison-cursor').fill('30')
  const markers = page.locator(
    '[data-testid="forecast-time-marker"][data-series^="sample-"]',
  )
  await expect(markers).toHaveCount(9)
  expect(
    new Set(
      await markers.evaluateAll((nodes) =>
        nodes.map((n) => `${n.getAttribute('cx')},${n.getAttribute('cy')}`),
      ),
    ).size,
  ).toBeGreaterThan(1)
  await page
    .locator('.analysis-panel')
    .screenshot({ path: join(tmpdir(), 'wml-depth-sensitivity.png') })
  await page
    .getByRole('slider', { name: 'Assumption range', exact: true })
    .press('Home')
  await expect(page.locator('.sensitivity-controls')).toContainText(
    'Identical settings',
  )
  await expect(page.locator('.sensitivity-controls')).toContainText(
    'Not probabilities or a confidence interval',
  )
  expect(
    new Set(
      await markers.evaluateAll((nodes) =>
        nodes.map((n) => `${n.getAttribute('cx')},${n.getAttribute('cy')}`),
      ),
    ).size,
  ).toBe(1)
  await page
    .locator('.analysis-panel')
    .screenshot({ path: join(tmpdir(), 'wml-depth-sensitivity-zero.png') })

  const report = await exportEvidence(page, info, 'zero-spread')
  expect(report.format).toBe('wml-experiment-v1')
  expect(report.analysis.ensemble.spread).toBe(0)
  expect(report.analysis.ensemble.members).toHaveLength(9)
  expect(report.analysis.origin.belief.tick).toBe(report.analysis.originTick)
  expect(report.analysis.origin.context.scenario).toBe('planning')
  expect(report.analysis.origin.context.parameters.friction).toEqual(
    expect.any(Number),
  )
  expect(
    report.analysis.origin.belief.objects.map((object) => object.id),
  ).not.toContain('yellow cube')
  for (const member of report.analysis.ensemble.members) {
    expect(member.prediction.samples).toEqual(
      report.analysis.forecastByModel.dynamics.samples,
    )
    expect(member.parameters).toEqual(
      report.analysis.ensemble.members[0].parameters,
    )
  }
  for (const forecast of Object.values(report.analysis.forecastByModel)) {
    expect(forecast.startTick).toBe(report.analysis.originTick)
    expect(forecast.action).toBe(report.analysis.action)
    expect(forecast.samples[0].time).toBe(report.analysis.originTime)
    expect(forecast.samples.at(-1)!.time).toBeCloseTo(
      report.analysis.originTime + report.analysis.horizon,
    )
  }
  expect(report.actual.length).toBeGreaterThan(0)
  expect(
    report.actual.every((sample) => sample.tick <= report.throughTick),
  ).toBe(true)
  for (const result of Object.values(report.errors.byModel)) {
    expect(
      result.points.every((point) => point.tick <= report.throughTick),
    ).toBe(true)
    expect(result.metrics.finalStateError).toBeNull()
  }
})

test('switching branches restores successful and colliding realities with their own analysis', async ({
  page,
}, info) => {
  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  await page
    .getByRole('button', { name: 'Compare models', exact: true })
    .click()
  await page.getByRole('button', { name: 'Act', exact: true }).click()
  await expect(page.locator('.success-label')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Play', exact: true }),
  ).toBeVisible()
  await page
    .locator('.analysis-panel')
    .screenshot({ path: join(tmpdir(), 'wml-depth-analysis.png') })
  const successReport = await exportEvidence(page, info, 'left-success')
  expect(successReport.analysis.action).toBe('left')
  expect(successReport.errors.byModel.dynamics.metrics.success).toBe(true)

  await page.getByRole('button', { name: 'Rewind', exact: true }).click()
  await expect(page.getByTestId('world-time')).toContainText('0.00')
  await page.locator('#comparison-cursor').press('End')
  await expect(page.getByTestId('inspected-actual')).toHaveText(
    'Not yet simulated',
  )
  const rewoundReport = await exportEvidence(page, info, 'rewound')
  expect(
    rewoundReport.actual.every(
      (sample) => sample.tick <= rewoundReport.throughTick,
    ),
  ).toBe(true)
  for (const result of Object.values(rewoundReport.errors.byModel))
    expect(
      result.points.every((point) => point.tick <= rewoundReport.throughTick),
    ).toBe(true)
  await page.getByRole('button', { name: 'Branch', exact: true }).click()
  await page.getByRole('button', { name: /A · Direct push/ }).click()
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
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  const collisionReport = await exportEvidence(page, info, 'direct-collision')
  expect(collisionReport.analysis.action).toBe('direct')
  expect(collisionReport.errors.byModel.dynamics.metrics.success).toBe(false)
  expect(
    collisionReport.errors.byModel.dynamics.metrics.collisionCount,
  ).toBeGreaterThan(0)
  expect(collisionReport.branchId).not.toBe(successReport.branchId)

  await page
    .getByRole('button', {
      name: `Restore ${successReport.branchId}`,
      exact: true,
    })
    .click()
  await expect(page.locator('.success-label')).toBeVisible()
  await expect(page.getByTestId('analysis-origin')).toContainText('Left detour')
  expect(
    parseFloat(await page.getByTestId('goal-distance').innerText()),
  ).toBeLessThan(0.36)
  const restoredSuccess = await exportEvidence(page, info, 'restored-success')
  expect(restoredSuccess.analysis).toEqual(successReport.analysis)
  expect(restoredSuccess.actual).toEqual(successReport.actual)

  await page
    .getByRole('button', {
      name: `Restore ${collisionReport.branchId}`,
      exact: true,
    })
    .click()
  await expect(page.locator('.success-label')).toBeHidden()
  await expect(page.getByTestId('analysis-origin')).toContainText('Direct push')
  const restoredCollision = await exportEvidence(
    page,
    info,
    'restored-collision',
  )
  expect(restoredCollision.analysis).toEqual(collisionReport.analysis)
  // Switching can save the paused partial tick, preserving additional real evidence.
  expect(restoredCollision.throughTick).toBe(collisionReport.throughTick)
  expect(
    restoredCollision.actual.slice(0, collisionReport.actual.length),
  ).toEqual(collisionReport.actual)
  expect(restoredCollision.branches).toEqual(collisionReport.branches)
  expect(
    restoredCollision.errors.byModel.dynamics.metrics.collisionCount,
  ).toBeGreaterThan(0)
})

test('Turkish term help fits a 390px viewport and keyboard dismissal leaves the paused experiment intact', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Türkçeye geç', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
  await page.getByRole('button', { name: 'Adımla', exact: true }).click()
  await page.getByRole('button', { name: 'Dal oluştur', exact: true }).click()
  await page.getByRole('button', { name: 'Planla', exact: true }).click()
  await page
    .getByRole('button', { name: 'Modelleri karşılaştır', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Oynat', exact: true }),
  ).toBeVisible()
  const before = {
    clock: await page.getByTestId('world-time').innerText(),
    goal: await page.getByTestId('goal-distance').innerText(),
    branches: await page.locator('.branch-id').innerText(),
    history: await page.locator('.branch-record').allTextContents(),
    origin: await page.getByTestId('analysis-origin').innerText(),
  }

  const help = page.getByRole('button', {
    name: 'Açıkla: Dünya modeli',
    exact: true,
  })
  await help.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Dünya modeli', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(
    'Bu açıklamayı okumak simülasyonu değiştirmez.',
  )
  const box = await dialog.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(390)
  expect(box!.y + box!.height).toBeLessThanOrEqual(844)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({ path: join(tmpdir(), 'wml-depth-mobile.png') })
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(help).toBeFocused()
  await expect(page.getByTestId('world-time')).toHaveText(before.clock)
  await expect(page.getByTestId('goal-distance')).toHaveText(before.goal)
  await expect(page.locator('.branch-id')).toHaveText(before.branches)
  expect(await page.locator('.branch-record').allTextContents()).toEqual(
    before.history,
  )
  await expect(page.getByTestId('analysis-origin')).toHaveText(before.origin)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page
    .locator('.analysis-panel')
    .screenshot({ path: join(tmpdir(), 'wml-depth-mobile-analysis.png') })
})
