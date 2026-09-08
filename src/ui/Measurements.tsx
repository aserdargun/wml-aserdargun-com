import { TermHelp } from '../education/TermHelp'
import type { LabEngine } from '../core'
import { actionName, say, type Locale } from './i18n'
const fmt = (n: number | null) => (n === null ? '—' : n.toFixed(3))
export function Measurements({
  engine,
  locale,
}: {
  engine: LabEngine
  locale: Locale
}) {
  const metrics = engine.metrics
  return (
    <section
      className="measurements"
      aria-label={say(locale, 'Measured results', 'Ölçülen sonuçlar')}
    >
      <div>
        <span>
          {say(locale, 'POSITION ERROR', 'KONUM HATASI')}
          <TermHelp id="positionError" locale={locale} />
        </span>
        <strong data-testid="position-error">
          {fmt(metrics.comparedSamples > 1 ? metrics.positionError : null)}
          <small>m</small>
        </strong>
      </div>
      <div>
        <span>
          {say(locale, 'TRAJECTORY RMSE', 'YÖRÜNGE RMSE')}
          <TermHelp id="rmse" locale={locale} />
        </span>
        <strong>
          {fmt(metrics.comparedSamples > 1 ? metrics.trajectoryError : null)}
          <small>m</small>
        </strong>
      </div>
      <div>
        <span>{say(locale, 'GOAL DISTANCE', 'HEDEF MESAFESİ')}</span>
        <strong data-testid="goal-distance">
          {metrics.goalDistance.toFixed(2)}
          <small>m</small>
        </strong>
      </div>
      <div>
        <span>{say(locale, 'CONTACT EVENTS', 'TEMAS OLAYLARI')}</span>
        <strong>{metrics.collisionCount}</strong>
      </div>
      <p>
        {metrics.comparedSamples}{' '}
        {say(locale, 'time-aligned samples.', 'eşzamanlı örnek.')}{' '}
        {engine.comparisonPrediction && (
          <span className="comparison-label">
            {actionName(
              engine.comparisonPrediction.action,
              locale,
              engine.state.scenario,
            )}
          </span>
        )}
      </p>
    </section>
  )
}
