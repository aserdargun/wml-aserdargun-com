import type { Locale } from '../ui/i18n'

// WFM uses localized concept slugs, not just localized path prefixes.
const conceptSlugs = {
  'action-conditioning': { en: 'action-conditioning', tr: 'eylem-kosullama' },
  'world-model': { en: 'world-model', tr: 'dunya-modeli' },
  'latent-state': { en: 'latent-state', tr: 'gizil-durum' },
  uncertainty: { en: 'uncertainty', tr: 'belirsizlik' },
} as const

export type ResearchTopic = keyof typeof conceptSlugs
export const researchUrl = (topic: ResearchTopic, locale: Locale) =>
  `https://wfm.aserdargun.com/${locale}/concepts/${conceptSlugs[topic][locale]}`
