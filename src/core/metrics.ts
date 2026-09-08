import { distance } from './math'
import type {
  Prediction,
  PredictionError,
  TrajectorySample,
  WorldState,
} from './types'

/** Only compare samples at the same simulation tick; never align by array index. */
export function predictionError(
  prediction: Prediction | undefined,
  actual: TrajectorySample[],
  state: Pick<WorldState, 'goalDistance' | 'success'>,
  collisionCount = 0,
): PredictionError {
  const errors: number[] = []
  let finalStateError: number | null = null
  if (prediction) {
    const expected = new Map(
      prediction.samples.map((sample) => [sample.tick, sample]),
    )
    const lastTick = prediction.samples.at(-1)?.tick
    for (const sample of actual) {
      const matching = expected.get(sample.tick)
      if (!matching) continue
      const error = distance(sample.position, matching.position)
      errors.push(error)
      if (sample.tick === lastTick) finalStateError = error
    }
  }
  return {
    positionError: errors.at(-1) ?? null,
    trajectoryError: errors.length
      ? Math.sqrt(errors.reduce((sum, n) => sum + n * n, 0) / errors.length)
      : null,
    finalStateError,
    comparedSamples: errors.length,
    goalDistance: state.goalDistance,
    collisionCount,
    success: state.success,
  }
}
