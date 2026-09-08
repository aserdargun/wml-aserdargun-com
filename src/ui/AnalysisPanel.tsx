import { useState } from 'react'
import { Download, ArrowRight } from 'lucide-react'
import type { LabEngine, ModelId } from '../core'
import { TermHelp } from '../education/TermHelp'
import { LearningCheck } from '../education/LearningCheck'
import { ScientificPlot, type PlotSeries } from './AnalysisCharts'
import { actionName, say, type Locale } from './i18n'
export type AnalysisView = 'off' | 'models' | 'ensemble'
import { modelAppearance } from '../visualization/analysisStyle'
export const modelName = (model: ModelId, l: Locale) =>
  ({
    constant: say(l, 'Constant velocity', 'Sabit hız'),
    dynamics: say(l, 'Simple dynamics', 'Basit dinamikler'),
    biased: say(l, 'Biased dynamics', 'Yanlı dinamikler'),
  })[model]
const models: ModelId[] = ['constant', 'dynamics', 'biased']
export function AnalysisPanel({
  engine,
  locale,
  view,
  setView,
  analyze,
}: {
  engine: LabEngine
  locale: Locale
  view: AnalysisView
  setView: (view: AnalysisView) => void
  analyze: (spread: number, view: AnalysisView) => void
}) {
  const [cursor, setCursor] = useState<number | null>(null)
  const analysis = engine.analysis,
    errors = engine.analysisErrors,
    spread = analysis?.ensemble.spread ?? 0.5
  const reference = analysis?.forecastByModel.dynamics.samples ?? []
  const observed = engine.actualTrajectory.filter(
    (s) => s.tick <= engine.state.tick,
  )
  const latestIndex = Math.max(
    0,
    reference.reduce(
      (last, s, i) => (s.tick <= engine.state.tick ? i : last),
      0,
    ),
  )
  const index = Math.min(
      cursor ?? latestIndex,
      Math.max(0, reference.length - 1),
    ),
    sample = reference[index]
  const actualAtSample = sample
    ? observed.find((s) => s.tick === sample.tick)
    : undefined
  const pathSeries: PlotSeries[] = analysis
    ? view === 'ensemble'
      ? analysis.ensemble.members.map((m) => ({
          id: `sample-${m.id}`,
          label: m.id,
          color: '#687c99',
          dash: m.id === 'centre' ? undefined : '2 4',
          points: m.prediction.samples.map((s) => ({
            x: s.position[0],
            y: s.position[2],
          })),
          probe: m.prediction.samples[index]
            ? {
                x: m.prediction.samples[index].position[0],
                y: m.prediction.samples[index].position[2],
              }
            : undefined,
        }))
      : models.map((m) => ({
          id: m,
          label: modelName(m, locale),
          ...modelAppearance[m],
          points: analysis.forecastByModel[m].samples.map((s) => ({
            x: s.position[0],
            y: s.position[2],
          })),
          probe: analysis.forecastByModel[m].samples[index]
            ? {
                x: analysis.forecastByModel[m].samples[index].position[0],
                y: analysis.forecastByModel[m].samples[index].position[2],
              }
            : undefined,
        }))
    : []
  if (analysis)
    pathSeries.push({
      id: 'actual',
      label: say(
        locale,
        'Actual to current time',
        'Mevcut zamana kadar gerçek',
      ),
      color: '#25382a',
      points: observed
        .filter((s) => s.tick >= analysis.originTick)
        .map((s) => ({ x: s.position[0], y: s.position[2] })),
      probe: actualAtSample
        ? { x: actualAtSample.position[0], y: actualAtSample.position[2] }
        : undefined,
    })
  const sampledPositions =
    analysis?.ensemble.members.flatMap((m) =>
      m.prediction.samples[index] ? [m.prediction.samples[index].position] : [],
    ) ?? []
  const errorSeries: PlotSeries[] = errors
    ? models.map((m) => ({
        id: m,
        label: modelName(m, locale),
        ...modelAppearance[m],
        points: errors.byModel[m].points.map((p) => ({
          x: p.time - (analysis?.originTime ?? 0),
          y: p.error,
        })),
      }))
    : []
  const ranked = errors
    ? models
        .filter((m) => errors.byModel[m].metrics.comparedSamples > 1)
        .sort(
          (a, b) =>
            (errors.byModel[a].metrics.trajectoryError ?? Infinity) -
            (errors.byModel[b].metrics.trajectoryError ?? Infinity),
        )
    : []
  const exportEvidence = () => {
    if (!analysis || !errors) return
    const report = {
      format: 'wml-experiment-v1',
      scientificBoundary:
        'Educational simulation. Sensitivity samples are not probabilities. No future actual samples are included.',
      scenario: engine.state.scenario,
      seed: engine.state.seed,
      branchId: engine.currentBranchId,
      throughTick: engine.state.tick,
      throughTime: engine.state.time,
      analysis,
      actual: observed.filter((s) => s.tick >= analysis.originTick),
      errors,
      branches: engine.branches.map((b) => ({
        id: b.id,
        parentBranchId: b.parentBranchId,
        forkTick: b.forkTick,
        actions: b.actions,
      })),
      units: { position: 'm', time: 's', velocity: 'm/s' },
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `wml-${engine.state.scenario}-${engine.currentBranchId}-t${engine.state.tick}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <section
      className="analysis-panel"
      aria-label={say(locale, 'Forecast investigation', 'Tahmin incelemesi')}
    >
      <div className="analysis-header">
        <div>
          <span className="section-label">
            {say(locale, 'INVESTIGATE THE DECISION', 'KARARI İNCELE')}
          </span>
          <h2>
            {say(
              locale,
              'One action. Different models.',
              'Bir eylem. Farklı modeller.',
            )}
          </h2>
          <p>
            {say(
              locale,
              'Fix the starting belief and action. Discover where the models agree, and where evidence separates them.',
              'Başlangıç inancını ve eylemi sabitle. Modellerin nerede uzlaştığını ve kanıtın onları nerede ayırdığını keşfet.',
            )}
          </p>
        </div>
        <button
          className="button-secondary"
          disabled={!engine.predictions.some((p) => p.samples.length)}
          onClick={() => {
            setCursor(null)
            analyze(spread, 'models')
          }}
        >
          {analysis
            ? say(locale, 'Refresh comparison', 'Karşılaştırmayı yenile')
            : say(locale, 'Compare models', 'Modelleri karşılaştır')}
          <ArrowRight size={15} />
        </button>
      </div>
      {!analysis ? (
        <p className="analysis-empty">
          {say(
            locale,
            'Generate a prediction or plan first. This comparison will reuse that saved decision point; it does not run or reset reality.',
            'Önce tahmin veya plan oluştur. Bu karşılaştırma kayıtlı karar noktasını kullanır; gerçekliği çalıştırmaz veya sıfırlamaz.',
          )}
        </p>
      ) : (
        <>
          <div className="analysis-toolbar">
            <div
              className="analysis-modes"
              role="group"
              aria-label={say(locale, 'Forecast overlay', 'Tahmin katmanı')}
            >
              <button
                aria-pressed={view === 'models'}
                onClick={() => setView('models')}
              >
                {say(locale, 'Three models', 'Üç model')}
              </button>
              <button
                aria-pressed={view === 'ensemble'}
                onClick={() => setView('ensemble')}
              >
                {say(locale, 'Sample assumptions', 'Varsayımları örnekle')}
              </button>
              <button
                aria-pressed={view === 'off'}
                onClick={() => setView('off')}
              >
                {say(locale, 'Action futures', 'Eylem gelecekleri')}
              </button>
            </div>
            <span className="origin-label" data-testid="analysis-origin">
              {actionName(analysis.action, locale, engine.state.scenario)} · t₀
              = {analysis.originTime.toFixed(2)} s · +{analysis.horizon}s
            </span>
          </div>
          {view === 'ensemble' && (
            <div className="sensitivity-controls">
              <div>
                <h3>
                  {say(
                    locale,
                    'How sensitive is this prediction?',
                    'Bu tahmin ne kadar duyarlı?',
                  )}
                  <TermHelp id="sensitivity" locale={locale} />
                </h3>
                <p>
                  {say(
                    locale,
                    'Nine deterministic samples: central parameters, then each parameter’s lower and upper bound separately. Not probabilities or a confidence interval.',
                    'Dokuz deterministik örnek: merkez parametreler, ardından her parametrenin alt ve üst sınırı ayrı ayrı. Olasılık veya güven aralığı değildir.',
                  )}
                </p>
              </div>
              <label>
                {say(locale, 'Assumption range', 'Varsayım aralığı')}
                <b>
                  {spread === 0
                    ? say(locale, 'Identical settings', 'Aynı ayarlar')
                    : spread.toFixed(2)}
                </b>
                <input
                  aria-label={say(
                    locale,
                    'Assumption range',
                    'Varsayım aralığı',
                  )}
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={spread}
                  onChange={(e) => analyze(+e.target.value, 'ensemble')}
                />
              </label>
              <div className="range-summary">
                <span>
                  Δvₓ{' '}
                  {analysis.ensemble.ranges.velocityOffsetX
                    .map((v) => v.toFixed(2))
                    .join(' … ')}{' '}
                  m/s
                </span>
                <span>
                  {say(locale, 'Drive', 'Sürüş')} ×{' '}
                  {analysis.ensemble.ranges.driveSpeedScale
                    .map((v) => v.toFixed(2))
                    .join(' … ')}
                </span>
                <span>
                  {say(locale, 'Drag', 'Direnç')} ×{' '}
                  {analysis.ensemble.ranges.dragScale
                    .map((v) => v.toFixed(2))
                    .join(' … ')}
                </span>
                <span>
                  {say(locale, 'Friction', 'Sürtünme')}{' '}
                  {analysis.ensemble.ranges.friction
                    .map((v) => v.toFixed(2))
                    .join(' … ')}
                </span>
              </div>
            </div>
          )}
          <div className="analysis-charts">
            <div>
              <h3>
                {view === 'ensemble'
                  ? say(locale, 'Sampled paths', 'Örnek yollar')
                  : say(locale, 'Predicted paths', 'Tahmin edilen yollar')}
                <TermHelp id="projection" locale={locale} />
              </h3>
              <ScientificPlot
                series={pathSeries}
                xLabel="x (m)"
                yLabel="z (m)"
                locale={locale}
                goal={engine.state.goal}
                kind="path"
                probeLabel={say(
                  locale,
                  'Outlined markers: inspected time',
                  'Çerçeveli işaretler: incelenen an',
                )}
              />
            </div>
            <div>
              <h3>
                {say(
                  locale,
                  'Error needs a real outcome.',
                  'Hata için gerçekleşen sonuç gerekir.',
                )}
                <TermHelp id="positionError" locale={locale} />
              </h3>
              <ScientificPlot
                series={errorSeries}
                xLabel={say(
                  locale,
                  'Time since decision (s)',
                  'Karardan sonraki süre (s)',
                )}
                yLabel={say(locale, 'Position error (m)', 'Konum hatası (m)')}
                locale={locale}
                domainX={[0, analysis.horizon]}
                probeX={sample ? sample.time - analysis.originTime : 0}
                kind="error"
              />
              <p className="chart-boundary">
                {say(
                  locale,
                  'Only executed physics samples have an error. The evaluator can inspect hidden objects; the agent cannot.',
                  'Yalnızca yürütülen fizik örneklerinin hatası vardır. Değerlendirici gizli nesneleri inceleyebilir; ajan inceleyemez.',
                )}
              </p>
            </div>
          </div>
          <div className="sample-inspector">
            <div>
              <label htmlFor="comparison-cursor">
                {say(
                  locale,
                  'Inspect a forecast time',
                  'Bir tahmin zamanını incele',
                )}
                <b>
                  t₀ +{' '}
                  {sample
                    ? (sample.time - analysis.originTime).toFixed(1)
                    : '0.0'}{' '}
                  s
                </b>
              </label>
              <input
                id="comparison-cursor"
                type="range"
                min={0}
                max={Math.max(0, reference.length - 1)}
                value={index}
                disabled={!reference.length}
                onChange={(e) => setCursor(+e.target.value)}
              />
            </div>
            <button onClick={() => setCursor(null)}>
              {say(locale, 'Follow current time', 'Mevcut zamanı izle')}
            </button>
          </div>
          {view === 'ensemble' && (
            <p className="sample-spans" data-testid="sample-position-ranges">
              <span>
                {say(
                  locale,
                  'At this time, the nine predictions span:',
                  'Bu anda dokuz tahminin kapsadığı aralık:',
                )}
              </span>
              {[0, 1, 2].map((axis) => (
                <code key={axis}>
                  {['x', 'y', 'z'][axis]}{' '}
                  {sampledPositions.length
                    ? `${Math.min(...sampledPositions.map((p) => p[axis])).toFixed(2)} … ${Math.max(...sampledPositions.map((p) => p[axis])).toFixed(2)} m`
                    : '—'}
                </code>
              ))}
              <small>
                {say(
                  locale,
                  'Move the time cursor to compare arrival speeds, even when paths overlap. These bounds describe only the nine sampled predictions.',
                  'Yollar örtüşse bile varış hızlarını karşılaştırmak için zaman imlecini kaydır. Bu sınırlar yalnızca dokuz örnek tahmini betimler.',
                )}
              </small>
            </p>
          )}
          <p className="table-scroll-hint">
            {say(
              locale,
              'Scroll the table sideways for all values.',
              'Tüm değerler için tabloyu yana kaydır.',
            )}
          </p>
          <div
            className="analysis-table-wrap"
            tabIndex={0}
            role="region"
            aria-label={say(
              locale,
              'Model comparison table',
              'Model karşılaştırma tablosu',
            )}
          >
            <table className="analysis-table">
              <caption>
                {say(
                  locale,
                  'Same initial belief and action; errors measured in 3D.',
                  'Aynı başlangıç inancı ve eylem; hatalar 3D ölçülür.',
                )}
              </caption>
              <thead>
                <tr>
                  <th>{say(locale, 'Predictor', 'Tahminci')}</th>
                  <th>
                    {say(
                      locale,
                      'Position at inspected time (x, y, z) m',
                      'İncelenen andaki konum (x, y, z) m',
                    )}
                  </th>
                  <th>{say(locale, 'Error here', 'Buradaki hata')}</th>
                  <th>
                    RMSE
                    <TermHelp id="rmse" locale={locale} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => {
                  const p = analysis.forecastByModel[m].samples[index],
                    error = sample
                      ? errors?.byModel[m].points.find(
                          (p) => p.tick === sample.tick,
                        )?.error
                      : undefined
                  const metrics = errors?.byModel[m].metrics
                  return (
                    <tr key={m} data-testid={`comparison-${m}`}>
                      <th>
                        <span
                          className="model-dot"
                          style={{ background: modelAppearance[m].color }}
                        />
                        {modelName(m, locale)}
                      </th>
                      <td>
                        {p
                          ? p.position.map((v) => v.toFixed(2)).join(', ')
                          : '—'}
                      </td>
                      <td>
                        {error === undefined ? '—' : `${error.toFixed(3)} m`}
                      </td>
                      <td>
                        {metrics && metrics.comparedSamples > 1
                          ? `${metrics.trajectoryError?.toFixed(3)} m`
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
                <tr className="actual-row">
                  <th>
                    {say(locale, 'Recorded reality', 'Kaydedilen gerçeklik')}
                  </th>
                  <td data-testid="inspected-actual">
                    {actualAtSample
                      ? actualAtSample.position
                          .map((v) => v.toFixed(2))
                          .join(', ')
                      : say(locale, 'Not yet simulated', 'Henüz yürütülmedi')}
                  </td>
                  <td>—</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="analysis-conclusion">
            <p>
              {ranked.length
                ? say(
                    locale,
                    `${modelName(ranked[0], locale)} has the lowest measured RMSE in this run.`,
                    `${modelName(ranked[0], locale)} bu koşuda en düşük ölçülen RMSE’ye sahip.`,
                  )
                : say(
                    locale,
                    'Act or step to collect the first comparable physics samples.',
                    'İlk karşılaştırılabilir fizik örnekleri için uygula veya adımla.',
                  )}
              <span>
                {say(
                  locale,
                  'RMSE uses all matched executed samples; this is not a universal model ranking.',
                  'RMSE şu ana kadarki tüm eşleşen yürütülmüş örnekleri kullanır; bu evrensel bir model sıralaması değildir.',
                )}
              </span>
            </p>
            <button className="export-evidence" onClick={exportEvidence}>
              <Download size={14} />
              {say(
                locale,
                'Export evidence · JSON',
                'Kanıtı dışa aktar · JSON',
              )}
            </button>
          </div>
          <LearningCheck
            key={engine.state.scenario}
            scenario={engine.state.scenario}
            locale={locale}
          />
        </>
      )}
    </section>
  )
}
