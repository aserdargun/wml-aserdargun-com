import { TermHelp } from '../education/TermHelp'
import type { LabEngine } from '../core'
import { say, type Locale } from './i18n'
interface Props {
  engine: LabEngine
  locale: Locale
  horizon: number
  setHorizon: (value: number) => void
  setPlaying: (value: boolean) => void
  touch: () => void
}
export function ExperimentControls({
  engine,
  locale,
  horizon,
  setHorizon,
  setPlaying,
  touch,
}: Props) {
  const scenario = { id: engine.state.scenario }
  return (
    <details className="parameters">
      <summary>
        {say(
          locale,
          'Experiment controls & model boundaries',
          'Deney kontrolleri ve model sınırları',
        )}
      </summary>
      <div className="parameter-grid">
        <label>
          {say(locale, 'Prediction horizon', 'Tahmin ufku')}
          <TermHelp id="horizon" locale={locale} /> <b>{horizon}s</b>
          <input
            type="range"
            min={3}
            max={15}
            step={1}
            value={horizon}
            onChange={(e) => setHorizon(+e.target.value)}
          />
        </label>
        <label>
          {say(locale, 'Sensor field of view', 'Sensör görüş açısı')}
          <TermHelp id="visibility" locale={locale} />
          <b>{engine.parameters.sensorFov}°</b>
          <input
            aria-label={say(locale, 'Sensor FOV', 'Sensör görüş açısı')}
            type="range"
            min={30}
            max={170}
            value={engine.parameters.sensorFov}
            onChange={(e) => {
              setPlaying(false)
              engine.configure({ sensorFov: +e.target.value })
              touch()
            }}
          />
        </label>
        <label>
          {say(locale, 'Sensor direction', 'Sensör yönü')}
          <b>{engine.parameters.sensorYaw}°</b>
          <input
            aria-label={say(locale, 'Sensor direction', 'Sensör yönü')}
            type="range"
            min={-180}
            max={180}
            value={engine.parameters.sensorYaw}
            onChange={(e) => {
              setPlaying(false)
              engine.configure({ sensorYaw: +e.target.value })
              touch()
            }}
          />
        </label>
        {scenario.id !== 'planning' && (
          <>
            <label>
              {say(locale, 'Reality friction', 'Gerçeklik sürtünmesi')}
              <b>{scenario.id === 'occlusion' ? '0.00' : engine.parameters.friction.toFixed(2)}</b>
              <input
                aria-label={say(
                  locale,
                  'Reality friction',
                  'Gerçeklik sürtünmesi',
                )}
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={scenario.id === 'occlusion' ? 0 : engine.parameters.friction}
                disabled={scenario.id === 'occlusion'}
                aria-describedby={scenario.id === 'occlusion' ? 'occlusion-friction-note' : undefined}
                onChange={(e) => {
                  setPlaying(false)
                  engine.configure({ friction: +e.target.value })
                  touch()
                }}
              />
            </label>
            <label>
              {say(locale, 'Initial velocity', 'İlk hız')}
              <b>{engine.parameters.initialVelocity} m/s</b>
              <input
                aria-label={say(locale, 'Initial velocity', 'İlk hız')}
                type="range"
                min={0}
                max={3}
                step={0.1}
                value={engine.parameters.initialVelocity}
                onChange={(e) => {
                  setPlaying(false)
                  engine.configure({ initialVelocity: +e.target.value })
                  touch()
                }}
              />
            </label>
          </>
        )}
        {scenario.id === 'dynamics' && (
          <label>
            {say(locale, 'Ramp slope', 'Rampa eğimi')}
            <b>{engine.parameters.slope}°</b>
            <input
              aria-label={say(locale, 'Ramp slope', 'Rampa eğimi')}
              type="range"
              min={5}
              max={24}
              step={1}
              value={engine.parameters.slope}
              onChange={(e) => {
                setPlaying(false)
                engine.configure({ slope: +e.target.value })
                touch()
              }}
            />
          </label>
        )}
      </div>
      {scenario.id === 'occlusion' && (
        <p id="occlusion-friction-note" className="small muted">
          {say(locale,
            'This occlusion experiment fixes friction and drag at zero to isolate observation and memory.',
            'Bu örtülme deneyi, gözlem ve belleği ayrı incelemek için sürtünme ve direnci sıfırda tutar.')}
        </p>
      )}
      <p className="small muted">
        {say(
          locale,
          'Physical parameter changes reset the experiment; sensor adjustments update observation. Horizon and model changes affect the next prediction. The robot uses an assisted pusher: a bounded velocity servo drives the cube; contact manipulation is abstracted.',
          'Fiziksel parametre değişiklikleri deneyi sıfırlar; sensör ayarları gözlemi günceller. Ufuk ve model değişiklikleri sonraki tahmini etkiler. Robot destekli itici kullanır: küp sınırlı hız denetimiyle sürülür; temasla manipülasyon soyutlanmıştır.',
        )}
      </p>
    </details>
  )
}
