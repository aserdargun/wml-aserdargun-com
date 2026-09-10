import { describe, expect, it } from 'vitest'
import { validateCatalog, validateExperiment, validateLesson } from '@aserdargun/lab-core'
import { manifest, experiments, guidedLesson, initialRoute } from '../src/ils/catalog'
import concepts from '../src/ils/concepts.json'
import { SCENARIOS } from '../src/core/scenarios'
import { chapters, scenarioContent } from '../src/lessons/content'
describe('ILS WML adapter', () => {
  it('validates real scenarios and all evidence references', () => {
    expect(validateCatalog(manifest, experiments, [guidedLesson], concepts.map(c => c.id))).toEqual([])
    expect(experiments.map(e => e.id).sort()).toEqual(Object.keys(SCENARIOS).sort())
    for (const e of experiments) {
      expect(validateExperiment(e).ok).toBe(true)
      expect(e.config?.scenarioId).toBe(e.id)
      for (const locale of ['en', 'tr'] as const) expect(e.title[locale]).toBe(scenarioContent(locale).find(s => s.id === e.id)!.name)
    }
    expect(manifest.evidence.find(e => e.id === 'error')?.calculatedFrom).toEqual(['trajectory', 'forecast'])
    expect(manifest.evidence.some(e => e.kind === 'measured' || e.verificationStatus === 'verified')).toBe(false)
  })
  it('maps the existing bilingual lesson without changing completion signals', () => {
    expect(validateLesson(guidedLesson).ok).toBe(true)
    for (const locale of ['en', 'tr'] as const) chapters(locale).forEach((c, i) => {
      expect(guidedLesson.steps[i].explanation[locale]).toBe(c.text)
      expect(guidedLesson.steps[i].mode).toBe(c.lens)
      expect(guidedLesson.steps[i].completion?.signal).toBe(c.task === 'view' ? undefined : c.task)
    })
  })
  it('resolves only existing route selections and ignores unsupported context', () => {
    expect(initialRoute('?scenario=occlusion&lang=tr').scenario).toBe('occlusion')
    expect(initialRoute('?scenario=surprise&lesson=world-model-101').scenario).toBe('planning')
    expect(initialRoute('?scenario=constructor&lang=xx&ils=not-json')).toEqual({scenario:'planning',lesson:false,locale:undefined})
    expect(initialRoute('?ils='+encodeURIComponent(JSON.stringify({version:'0.1',sourceLab:'tfl',targetLab:'wml',payload:{scenario:'surprise'}}))).scenario).toBe('planning')
  })
})
