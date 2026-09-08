import { useId } from 'react'
import { CircleHelp, X } from 'lucide-react'
import { term, type TermId } from './terms'
import { say, type Locale } from '../ui/i18n'
export function TermHelp({ id, locale }: { id: TermId; locale: Locale }) {
  const popoverId = useId(),
    definition = term(id, locale)
  return (
    <span className="term-help">
      <button
        className="term-trigger"
        popoverTarget={popoverId}
        aria-label={`${say(locale, 'Explain', 'Açıkla')}: ${definition.name}`}
      >
        <CircleHelp size={13} />
      </button>
      <span
        popover="auto"
        id={popoverId}
        className="term-popover"
        role="dialog"
        aria-label={definition.name}
      >
        <span className="term-title">
          <strong>{definition.name}</strong>
          <button
            popoverTarget={popoverId}
            popoverTargetAction="hide"
            aria-label={say(locale, 'Close explanation', 'Açıklamayı kapat')}
          >
            <X size={17} />
          </button>
        </span>
        <span>{definition.meaning}</span>
        <span className="term-example">{definition.example}</span>
        <small>
          {say(
            locale,
            'Reading this does not change the simulation.',
            'Bu açıklamayı okumak simülasyonu değiştirmez.',
          )}
        </small>
      </span>
    </span>
  )
}
