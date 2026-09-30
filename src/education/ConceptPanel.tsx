import { useState } from 'react'

import rawConcepts from '../ils/concepts.json'

type ConceptRecord = {
  id: string
  label: { en: string; tr: string }
  body: { en: string; tr: string }
}

export const concepts: readonly ConceptRecord[] = rawConcepts as readonly ConceptRecord[]

/**
 * Kavram yüzeyi.
 *
 * Bu dört kavram `lab.manifest.json` içinde yalnız kimlik olarak duruyordu.
 * Burada her biri tek cümlelik bir tanım taşır; tanım, ölçüm ya da doğrulanmış
 * sonuç iddiası içermez.
 */
export function ConceptPanel({ locale }: { locale: 'tr' | 'en' }) {
  const tr = locale === 'tr'
  const [open, setOpen] = useState<ConceptRecord['id'] | null>(null)

  return (
    <section className="concept-panel" id="concepts" aria-labelledby="concepts-title">
      <h2 id="concepts-title">{tr ? 'Bu laboratuvarın kavramları' : 'The concepts in this lab'}</h2>
      <p className="concept-panel__intro">
        {tr
          ? 'Kavramlar tek cümleyle tanımlanır. Bu tanım bir ölçüm veya doğrulanmış sonuç değildir; buradaki her sayı elle kodlanmış modellerin benzetim kapsamındadır.'
          : 'Each concept is defined in one sentence. A definition is not a measurement or a verified result; every number here stays inside the simulation of hand-coded models.'}
      </p>
      <dl className="concept-list">
        {concepts.map((concept) => {
          const expanded = open === concept.id
          return (
            <div key={concept.id} className="concept-row" data-open={expanded ? 'true' : 'false'}>
              <dt>
                <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : concept.id)}>
                  <b>{concept.label[locale]}</b>
                  <code>{concept.id.replace('concept:', '')}</code>
                </button>
              </dt>
              <dd>{expanded ? concept.body[locale] : null}</dd>
            </div>
          )
        })}
      </dl>
    </section>
  )
}
