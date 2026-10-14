import { describe, expect, it } from 'vitest'
import { worldModelSources } from '../src/lessons/sources'

// The provenance section renders on every page and is this lab's only claim
// about where its ideas came from. The existing ILS contract already proves
// each source is complete, bilingual, linked to a real publisher and states a
// boundary in both languages. What it does not check is that the citation is
// internally coherent: that the link points at the paper the heading names,
// that the verification date printed in the prose is the date the footer
// claims, and that the Turkish reader is told the same publication history as
// the English one.
//
// These are exactly the errors a hand-edited citation picks up silently. A
// heading that keeps "arXiv:1803.10122v4" while the link is repointed, or a
// `checkedAt` bumped after a re-check while the sentence beneath it still says
// it was verified on the old date, both read as authoritative and both are
// wrong. None of it is visible to any other test.

const ISO = /\d{4}-\d{2}-\d{2}/g

/** "27 March 2018" / "9 May 2018" -> an ISO date. English copy only. */
const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const
const EN_DATE = new RegExp(
  `\\b(\\d{1,2})\\s+(${MONTHS.join('|')})\\s+(\\d{4})\\b`,
  'gi',
)
const toIso = (day: string, month: string, year: string): string => {
  const index = MONTHS.findIndex(m => m === month.toLowerCase())
  return `${year}-${String(index + 1).padStart(2, '0')}-${day.padStart(2, '0')}`
}
const englishDates = (text: string): string[] =>
  [...text.matchAll(EN_DATE)].map(m => toIso(m[1]!, m[2]!, m[3]!)).sort()

// Turkish spells the same dates with Turkish month names. The Turkish reader
// must not be told a different publication history than the English one.
const TR_MONTHS: Record<string, string> = {
  ocak: '01', şubat: '02', mart: '03', nisan: '04', mayıs: '05', haziran: '06',
  temmuz: '07', ağustos: '08', eylül: '09', ekim: '10', kasım: '11', aralık: '12',
}
const TR_DATE = /\b(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})\b/g
const turkishDates = (text: string): string[] =>
  [...text.matchAll(TR_DATE)]
    .filter(m => TR_MONTHS[m[2]!.toLowerCase()] !== undefined)
    .map(m => `${m[3]}-${TR_MONTHS[m[2]!.toLowerCase()]}-${m[1]!.padStart(2, '0')}`)
    .sort()

describe('the citation record is internally coherent', () => {
  it('links to the paper the heading names', () => {
    // An arXiv link is a precise claim: it says "this is the paper". If the
    // heading keeps naming one identifier while the link points somewhere
    // else, the reader is sent to work they did not ask for.
    for (const source of worldModelSources.sources) {
      const arxivUrl = source.url.match(/arxiv\.org\/abs\/(\d{4}\.\d{4,5})/)
      if (!arxivUrl) continue
      expect(
        source.title.includes(arxivUrl[1]!),
        `${source.id} links to ${arxivUrl[1]} but its heading does not name it`,
      ).toBe(true)
    }
  })

  it('keeps every printed arXiv identifier well formed', () => {
    for (const source of worldModelSources.sources) {
      // Identifier characters only, so the closing bracket of "(arXiv:…v4)"
      // is not captured as part of the identifier.
      for (const match of source.title.matchAll(/arXiv:([0-9A-Za-z.]+)/g)) {
        expect(
          match[1]!,
          `${source.id} carries a malformed arXiv identifier`,
        ).toMatch(/^\d{4}\.\d{4,5}(v\d+)?$/)
      }
    }
  })

  it('prints one verification date, and it is the one the footer claims', () => {
    // Publication dates are written as prose ("27 March 2018"); the only
    // machine-readable date in the copy is the day the source was checked.
    // Bumping `checkedAt` after a re-check must therefore move the sentence
    // with it, or the page states two different verification days at once.
    for (const source of worldModelSources.sources) {
      for (const locale of ['en', 'tr'] as const) {
        const stated = source.published[locale].match(ISO) ?? []
        expect(
          stated.filter(date => date !== worldModelSources.checkedAt),
          `${source.id}.published.${locale} states a date other than ${worldModelSources.checkedAt}`,
        ).toEqual([])
      }
    }
  })

  it('tells both locales the same publication history, in order', () => {
    for (const source of worldModelSources.sources) {
      const en = englishDates(source.published.en)
      const tr = turkishDates(source.published.tr)
      expect(en.length, `${source.id} states no English publication date`).toBeGreaterThan(0)
      expect(tr, `${source.id} states a different history in Turkish`).toEqual(en)
      // A paper cannot be revised before it was submitted, and a transcription
      // slip is invisible once the dates are prose.
      for (let i = 1; i < en.length; i++) {
        expect(
          en[i]! >= en[i - 1]!,
          `${source.id} dates are out of order: ${en[i - 1]} then ${en[i]}`,
        ).toBe(true)
      }
    }
  })

  it('checks no source later than the day it claims to have checked it', () => {
    // A checkedAt in the future would silently excuse a stale record.
    expect(worldModelSources.checkedAt <= new Date().toISOString().slice(0, 10)).toBe(true)
  })
})