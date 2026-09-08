import type { LabEngine } from './engine'

const STEP = 1 / 60
const MAX_CATCH_UP = 0.25

/** Wall time schedules fixed physics ticks; rendering never changes the tick size. */
export function advancePlayback(engine: LabEngine, elapsed: number, remainder: number) {
  let pending = remainder + (Number.isFinite(elapsed) ? Math.max(0, Math.min(elapsed, MAX_CATCH_UP)) : 0)
  let steps = 0
  while (pending + 1e-10 >= STEP && steps < 15) {
    if (engine.state.success || engine.state.time >= 18) return 0
    engine.step()
    pending = Math.max(0, pending - STEP)
    steps++
  }
  return pending
}
