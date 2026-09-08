import { useState } from 'react'
import {
  Eye,
  Maximize2,
  Minimize2,
  RotateCcw,
  Camera,
  Grid2X2,
  Focus,
} from 'lucide-react'
import { Microverse } from '../visualization/Microverse'
import type { ActionId, LabEngine } from '../core'
import type { CameraView } from '../visualization/SceneCamera'
import type { AnalysisView } from './AnalysisPanel'
import type { Lens } from '../lessons/content'
import { actionName, say, type Locale } from './i18n'
interface Props {
  engine: LabEngine
  locale: Locale
  lens: Lens
  switchLens: (lens: Lens) => void
  showFov: boolean
  setFov: (v: boolean) => void
  showLabels: boolean
  setLabels: (v: boolean) => void
  cameraPreset: number
  setCamera: React.Dispatch<React.SetStateAction<number>>
  analysisView: AnalysisView
  revision: number
  playing: boolean
  expanded: boolean
  onExpand: () => void
  onSelectAction: (action: ActionId) => void
}
export function Stage({
  engine,
  locale,
  lens,
  switchLens,
  showFov,
  setFov,
  showLabels,
  setLabels,
  cameraPreset,
  setCamera,
  revision,
  analysisView,
  playing,
  expanded,
  onExpand,
  onSelectAction,
}: Props) {
  const [cameraView, setCameraView] = useState<CameraView>('studio')
  const [forecastTime, setForecastTime] = useState(2.5)
  const forecast =
    analysisView !== 'off' && engine.analysis
      ? engine.analysis.forecastByModel.dynamics
      : engine.predictions.find((p) => p.action === engine.selectedAction)
  const duration = forecast?.samples.length
    ? forecast.samples.at(-1)!.time - forecast.samples[0].time
    : 0
  const inspectionTime = Math.min(forecastTime, duration)
  const inspected = forecast?.samples.length
    ? forecast.samples.reduce(
        (best, s) =>
          Math.abs(s.time - forecast.samples[0].time - inspectionTime) <
          Math.abs(best.time - forecast.samples[0].time - inspectionTime)
            ? s
            : best,
        forecast.samples[0],
      )
    : undefined
  return (
    <section className={`stage stage-${lens}`}>
      <div className="stage-toolbar">
        <div
          className="lenses"
          role="tablist"
          aria-label={say(locale, 'World representation', 'Dünya temsili')}
        >
          {(['reality', 'observation', 'belief', 'imagination'] as const).map(
            (v, i) => (
              <button
                role="tab"
                aria-selected={lens === v}
                onClick={() => switchLens(v)}
                key={v}
              >
                <span className={`lens-symbol symbol-${v}`} />
                {
                  [
                    say(locale, 'Reality', 'Gerçeklik'),
                    say(locale, 'Observation', 'Gözlem'),
                    say(locale, 'Belief', 'İnanç'),
                    say(locale, 'Imagination', 'Hayal'),
                  ][i]
                }
              </button>
            ),
          )}
        </div>
        <button
          className="camera-reset"
          title={say(locale, 'Reset camera', 'Kamerayı sıfırla')}
          aria-label={say(locale, 'Reset camera', 'Kamerayı sıfırla')}
          onClick={() => {
            setCameraView('studio')
            setCamera((x) => x + 1)
          }}
        >
          <RotateCcw size={15} />
        </button>
        <button
          className="stage-expand"
          onClick={onExpand}
          aria-pressed={expanded}
          aria-label={say(
            locale,
            expanded ? 'Reduce stage' : 'Expand stage',
            expanded ? 'Sahneyi küçült' : 'Sahneyi genişlet',
          )}
          title={say(
            locale,
            expanded ? 'Reduce stage' : 'Expand stage',
            expanded ? 'Sahneyi küçült' : 'Sahneyi genişlet',
          )}
        >
          {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>
      <div className="stage-viewport">
        <Microverse
          engine={engine}
          lens={lens}
          locale={locale}
          showFov={showFov}
          showLabels={showLabels}
          cameraPreset={cameraPreset}
          revision={revision}
          analysisView={analysisView}
          cameraView={cameraView}
          forecastTime={inspectionTime}
          playing={playing}
          onSelectAction={onSelectAction}
        />
        <div className="viewport-caption">
          <span className="live-indicator" />
          {say(locale, 'SIMULATED WORLD', 'SİMÜLE EDİLEN DÜNYA')}
          <span>1 {say(locale, 'unit', 'birim')} = 1 m</span>
        </div>
        <div
          className="camera-views"
          role="group"
          aria-label={say(locale, 'Spectator camera', 'İzleyici kamerası')}
        >
          {(
            [
              { id: 'studio', icon: Camera, en: 'Studio', tr: 'Stüdyo' },
              { id: 'overhead', icon: Grid2X2, en: 'Overhead', tr: 'Üstten' },
              { id: 'detail', icon: Focus, en: 'Close-up', tr: 'Yakın' },
            ] as const
          ).map(({ id, icon: Icon, en, tr }) => (
            <button
              key={id}
              aria-pressed={cameraView === id}
              onClick={() => setCameraView(id)}
            >
              <Icon size={12} />
              {say(locale, en, tr)}
            </button>
          ))}
        </div>
        <div className="viewport-tools">
          <button aria-pressed={showFov} onClick={() => setFov(!showFov)}>
            <Eye size={13} />
            {say(locale, 'Sensor cone', 'Sensör konisi')}
          </button>
          <button
            aria-pressed={showLabels}
            onClick={() => setLabels(!showLabels)}
          >
            {say(locale, 'Labels', 'Etiketler')}
          </button>
        </div>
        <div className="orbit-hint">
          {say(
            locale,
            'Drag to orbit · scroll to zoom',
            'Döndürmek için sürükle · yakınlaştırmak için kaydır',
          )}
        </div>
        {engine.state.success && (
          <div className="success-label" role="status">
            {say(
              locale,
              'Target reached in reality',
              'Gerçeklikte hedefe ulaşıldı',
            )}
            <span>{engine.state.goalDistance.toFixed(2)} m</span>
          </div>
        )}
      </div>
      {!!duration && (
        <div
          className="spatial-inspection"
          aria-label={say(
            locale,
            'Inspect imagined time in 3D',
            'Hayal edilen zamanı 3D incele',
          )}
        >
          <div className="spatial-time-label">
            <label htmlFor="spatial-forecast-time">
              {say(locale, 'FUTURE IN 3D', '3D GELECEK')}
              <b>t₀ + {inspectionTime.toFixed(1)} s</b>
            </label>
            <span>
              {say(locale, 'Inspection only', 'Yalnızca inceleme')} ·{' '}
              {say(locale, 'reality', 'gerçeklik')} t ={' '}
              {engine.state.time.toFixed(2)} s
            </span>
          </div>
          <input
            id="spatial-forecast-time"
            aria-label={say(locale, '3D forecast time', '3D tahmin zamanı')}
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={inspectionTime}
            onChange={(e) => {
              setForecastTime(+e.target.value)
              if (lens !== 'imagination') switchLens('imagination')
            }}
          />
          <span
            className="spatial-position"
            data-testid="spatial-future-position"
          >
            {analysisView !== 'off' && engine.analysis
              ? say(locale, 'Dynamics baseline', 'Dinamik temel')
              : actionName(
                  forecast?.action ?? 'wait',
                  locale,
                  engine.state.scenario,
                )}{' '}
            ·{' '}
            {inspected
              ? `x ${inspected.position[0].toFixed(2)} · y ${inspected.position[1].toFixed(2)} · z ${inspected.position[2].toFixed(2)} m`
              : '—'}
          </span>
        </div>
      )}
      <div className="stage-legend">
        {analysisView !== 'off' && engine.analysis && (
          <span className="overlay-caption">
            {actionName(engine.analysis.action, locale, engine.state.scenario)}{' '}
            ·{' '}
            {analysisView === 'models'
              ? say(locale, '3 models', '3 model')
              : say(
                  locale,
                  '9 parameter samples · no probabilities',
                  '9 parametre örneği · olasılık değil',
                )}
          </span>
        )}
        <span>
          <i className="solid-line" />
          {say(locale, 'Actual', 'Gerçek')}
        </span>
        <span>
          <i className="dashed-line" />
          {say(locale, 'Predicted', 'Tahmin')}
        </span>
        <span>
          <i className="dotted-line" />
          {say(locale, 'Other branch', 'Diğer dal')}
        </span>
        <span className="legend-note">
          {say(locale, 'Prediction ≠ certainty', 'Tahmin ≠ kesinlik')}
        </span>
      </div>
    </section>
  )
}
