import { clamp, clone, distance } from './math'
import { predictionError } from './metrics'
import { MODELS } from './models'
import type {
  ActionId,
  AnalysisBundle,
  AnalysisErrors,
  ForecastOrigin,
  ModelId,
  SensitivityParameters,
  TrajectorySample,
  WorldState,
} from './types'

/** Freeze plain forecast data so sharing snapshots cannot leak subsequent mutation. */
export function freezeForecast<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value)) freezeForecast(child)
  }
  return value
}

export function createAnalysis(
  origin: ForecastOrigin,
  action: ActionId,
  requestedSpread = 0.5,
): AnalysisBundle {
  const spread = Number.isFinite(requestedSpread)
    ? clamp(requestedSpread, 0, 1)
    : 0.5
  const baseline: SensitivityParameters = {
    velocityOffsetX: 0,
    driveSpeedScale: 1,
    dragScale: 1,
    friction: origin.context.parameters.friction,
  }
  const ranges: AnalysisBundle['ensemble']['ranges'] = {
    velocityOffsetX: [0 - 0.4 * spread, 0.4 * spread],
    driveSpeedScale: [1 - 0.25 * spread, 1 + 0.25 * spread],
    dragScale: [1 - 0.6 * spread, 1 + 0.6 * spread],
    friction: [
      clamp(baseline.friction - 0.2 * spread, 0, 1),
      clamp(baseline.friction + 0.2 * spread, 0, 1),
    ],
  }
  const samples: {
    id: string
    label: string
    parameters: SensitivityParameters
  }[] = [
    { id: 'centre', label: 'Declared parameters', parameters: { ...baseline } },
  ]
  const labels = {
    velocityOffsetX: 'Initial X velocity',
    driveSpeedScale: 'Drive speed',
    dragScale: 'Drag',
    friction: 'Friction',
  }
  for (const parameter of Object.keys(
    ranges,
  ) as (keyof SensitivityParameters)[]) {
    for (const bound of [0, 1] as const) {
      samples.push({
        id: `${parameter}-${bound ? 'high' : 'low'}`,
        label: `${labels[parameter]} ${bound ? 'upper' : 'lower'} bound`,
        parameters: { ...baseline, [parameter]: ranges[parameter][bound] },
      })
    }
  }
  const forecastByModel = Object.fromEntries(
    (Object.keys(MODELS) as ModelId[]).map((model) => [
      model,
      MODELS[model].predict(
        clone(origin.belief),
        action,
        origin.horizon,
        clone(origin.context),
      ),
    ]),
  ) as AnalysisBundle['forecastByModel']
  const members = samples.map((sample) => {
    const belief = clone(origin.belief)
    const focus = belief.objects.find(
      (o) => o.id === origin.context.focusObjectId,
    )
    if (focus) focus.velocity[0] += sample.parameters.velocityOffsetX
    const context = clone(origin.context)
    context.parameters.friction = sample.parameters.friction
    context.assumptions = {
      driveSpeedScale: sample.parameters.driveSpeedScale,
      dragScale: sample.parameters.dragScale,
    }
    return {
      ...sample,
      prediction: MODELS.dynamics.predict(
        belief,
        action,
        origin.horizon,
        context,
      ),
    }
  })
  return freezeForecast({
    origin: clone(origin),
    originTick: origin.belief.tick,
    originTime: origin.belief.time,
    action,
    horizon: origin.horizon,
    forecastByModel,
    ensemble: { model: 'dynamics', spread, ranges, members },
  })
}

/** The evaluator compares predictions with simulator history through the current tick. */
export function analysisErrors(
  analysis: AnalysisBundle,
  actual: TrajectorySample[],
  state: Pick<WorldState, 'tick' | 'goalDistance' | 'success'>,
  collisionCount = 0,
): AnalysisErrors {
  const past = actual.filter((sample) => sample.tick <= state.tick)
  const byModel = Object.fromEntries(
    (Object.keys(MODELS) as ModelId[]).map((model) => {
      const forecast = analysis.forecastByModel[model]
      const expected = new Map(
        forecast.samples.map((sample) => [sample.tick, sample.position]),
      )
      const points = past.flatMap((sample) => {
        const position = expected.get(sample.tick)
        return position
          ? [
              {
                tick: sample.tick,
                time: sample.time,
                error: distance(sample.position, position),
              },
            ]
          : []
      })
      return [
        model,
        {
          points,
          metrics: predictionError(forecast, past, state, collisionCount),
        },
      ]
    }),
  ) as AnalysisErrors['byModel']
  return { throughTick: state.tick, byModel }
}
