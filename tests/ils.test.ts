import { describe, expect, it } from 'vitest'
import { validateCatalog, validateExperiment, validateLesson } from '@aserdargun/lab-core'
import { manifest, experiments, guidedLesson, initialRoute } from '../src/ils/catalog'
import concepts from '../src/ils/concepts.json'
import { SCENARIOS } from '../src/core/scenarios'
import { chapters, scenarioContent } from '../src/lessons/content'
import { worldModelSources } from '../src/lessons/sources'
describe('ILS WML adapter', () => {
  it('validates real scenarios and all evidence references', () => {
    expect(validateCatalog(manifest, experiments, [guidedLesson], concepts.map(c => c.id))).toEqual([])
    expect(experiments.map(e => e.id).sort()).toEqual(Object.keys(SCENARIOS).sort())
    for (const e of experiments) {
      expect(validateExperiment(e).ok).toBe(true)
      expect(e.config?.scenarioId).toBe(e.id)
      for (const locale of ['en', 'tr'] as const) {
        const content = scenarioContent(locale).find(s => s.id === e.id)!
        expect(e.title[locale]).toBe(content.name)
        expect(e.description?.[locale]).toBe(content.description)
        expect(e.learningObjectives?.[0][locale]).toBe(content.questions[2])
        expect(e.observations?.[0].explanation[locale]).toBe(content.questions[1])
      }
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
  // The provenance section is rendered on every page, so an empty or English-only
  // field silently drops a scientific boundary from the Turkish page while the rest
  // of the suite stays green. The sources are hand-authored, so the record itself
  // is the contract: every claim must exist in both languages and cite a real link.
  it('keeps every cited source complete, bilingual and externally verifiable', () => {
    const sources = worldModelSources.sources
    expect(sources.length).toBeGreaterThan(0)
    expect(worldModelSources.boundary.en.trim().length).toBeGreaterThan(0)
    expect(worldModelSources.boundary.tr.trim().length).toBeGreaterThan(0)
    expect(worldModelSources.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const ids = new Set<string>()
    for (const source of sources) {
      expect(ids.has(source.id)).toBe(false)
      ids.add(source.id)
      expect(source.title.trim().length).toBeGreaterThan(0)
      expect(source.url).toMatch(/^https:\/\/(arxiv\.org|www\.nature\.com)\//)
      for (const locale of ['en', 'tr'] as const) {
        for (const field of ['published', 'establishes', 'differs'] as const) {
          expect(source[field][locale].trim().length, `${source.id}.${field}.${locale}`).toBeGreaterThan(0)
        }
        expect(source.differs[locale]).not.toBe(source.establishes[locale])
        // A `differs` field that states no boundary is not a boundary statement.
        expect(source.differs[locale], `${source.id}.differs.${locale}`).toMatch(
          locale === 'en' ? /\b(not|no|none|nothing|never)\b/i : /(değil|yoktur|yok)/i,
        )
      }
    }
  })
})
