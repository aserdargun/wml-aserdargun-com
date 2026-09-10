import { addScaled, clone, distance, planarDistance } from './math'
import { encode, observe } from './observation'
import { FIXED_DT, routeFor, SAMPLE_EVERY } from './scenarios'
import type {
  ActionId,
  BeliefState,
  ModelContext,
  ModelId,
  Prediction,
  Vec3,
  WorldModelAdapter,
} from './types'

export const actionKick = (action: ActionId): Vec3 =>
  action === 'left'
    ? [0.3, 0, -0.9]
    : action === 'right'
      ? [0.3, 0, 0.9]
      : action === 'direct'
        ? [0.6, 0, 0]
        : [0, 0, 0]

/** Independent approximate integration. No access to rigid bodies or snapshots. */
export function predictFromBelief(
  belief: BeliefState,
  action: ActionId,
  horizon: number,
  context: ModelContext,
  model: ModelId,
): Prediction {
  const focus = belief.objects.find((o) => o.id === context.focusObjectId)
  const result: Prediction = {
    id: `${model}-${action}-${belief.tick}`,
    model,
    action,
    objectId: context.focusObjectId,
    startTick: belief.tick,
    samples: [],
    score: Infinity,
    collision: false,
    goalDistance: Infinity,
  }
  if (!focus) return result
  let position = [...focus.position] as Vec3
  let velocity = [...focus.velocity] as Vec3
  const route = routeFor(action, context.goal)
  let waypoint = 0
  let travelled = 0
  const blockers = belief.objects.filter(
    (o) => o.kind === 'obstacle' || o.kind === 'panel',
  )
  const horizonTicks =
    Math.round(Math.min(20, Math.max(0.1, Number.isFinite(horizon) ? horizon : 10)) / FIXED_DT / SAMPLE_EVERY) *
    SAMPLE_EVERY
  const friction = model === 'biased' ? 0.9 : context.parameters.friction
  const slope =
    ((model === 'biased'
      ? context.parameters.slope * 0.55
      : context.parameters.slope) *
      Math.PI) /
    180
  if (focus.kind === 'ball' && model !== 'constant')
    velocity = addScaled(velocity, actionKick(action), 1)
  result.samples.push({
    tick: belief.tick,
    time: belief.time,
    position: [...position],
    velocity: [...velocity],
  })

  for (let tick = 1; tick <= horizonTicks; tick++) {
    const previous = [...position] as Vec3
    if (model !== 'constant') {
      if (focus.kind === 'cube') {
        if (waypoint < route.length) {
          const destination = route[waypoint]
          const d = planarDistance(position, destination)
          if (d < 0.13) waypoint++
          const speed = Math.min(
            (model === 'biased' ? 1.05 : 1.58) *
              (context.assumptions?.driveSpeedScale ?? 1),
            d * 5,
          )
          if (waypoint < route.length && d > 0.001) {
            velocity[0] +=
              (((destination[0] - position[0]) / d) * speed - velocity[0]) *
              Math.min(1, FIXED_DT * 10)
            velocity[2] +=
              (((destination[2] - position[2]) / d) * speed - velocity[2]) *
              Math.min(1, FIXED_DT * 10)
          }
        } else {
          velocity[0] *= Math.exp(-8 * FIXED_DT)
          velocity[2] *= Math.exp(-8 * FIXED_DT)
        }
        velocity[1] = 0
      } else {
        const radius = focus.size[1]
        const rampHeight =
          0.58 +
          (0.1 + radius) / Math.cos(slope) -
          Math.tan(slope) * (position[0] + 1.4)
        const onRamp =
          context.scenario === 'dynamics' &&
          position[0] > -3.3 &&
          position[0] < 0.48 &&
          Math.abs(position[2]) < 0.98 &&
          position[1] <= rampHeight + 0.14
        if (onRamp) {
          velocity[0] +=
            (5 / 7) * 9.81 * Math.sin(slope) * Math.cos(slope) * FIXED_DT
          velocity[1] = -Math.tan(slope) * velocity[0]
          position[1] = rampHeight
        } else if (position[1] > radius + 0.005 || velocity[1] > 0)
          velocity[1] -= 9.81 * FIXED_DT
        else velocity[1] = 0
        const drag =
          (context.scenario === 'occlusion'
            ? 0
            : model === 'biased'
              ? friction * 1.4
              : 0.12 + friction * 0.08) * (context.assumptions?.dragScale ?? 1)
        velocity[0] *= Math.exp(-drag * FIXED_DT)
        velocity[2] *= Math.exp(-drag * FIXED_DT)
      }
    }
    position = addScaled(position, velocity, FIXED_DT)
    if (model !== 'constant') {
      if (position[1] < focus.size[1]) {
        position[1] = focus.size[1]
        velocity[1] = 0
      }
      for (const obstacle of blockers) {
        if (
          Math.abs(position[0] - obstacle.position[0]) <
            obstacle.size[0] + focus.size[0] &&
          Math.abs(position[2] - obstacle.position[2]) <
            obstacle.size[2] + focus.size[2] &&
          Math.abs(position[1] - obstacle.position[1]) <
            obstacle.size[1] + focus.size[1]
        ) {
          position = previous
          velocity = [0, 0, 0]
          result.collision = true
        }
      }
    }
    travelled += distance(previous, position)
    if (tick % SAMPLE_EVERY === 0)
      result.samples.push({
        tick: belief.tick + tick,
        time: belief.time + tick * FIXED_DT,
        position: [...position],
        velocity: [...velocity],
      })
  }
  result.goalDistance = planarDistance(position, context.goal)
  result.score =
    result.goalDistance * 10 + (result.collision ? 30 : 0) + travelled * 0.08
  return result
}

function adapter(
  id: ModelId,
  name: string,
  description: string,
): WorldModelAdapter {
  return {
    id,
    name,
    description,
    observe,
    encode,
    predict: (belief, action, horizon, context) =>
      predictFromBelief(belief, action, horizon, context, id),
    // Candidate rollouts share the same initial belief; each represents one complete route command.
    rollout: (belief, actions, horizon, context) =>
      actions.map((action) =>
        predictFromBelief(clone(belief), action, horizon, context, id),
      ),
    score: (prediction) => prediction.score,
    reset: () => {},
  }
}

export const MODELS: Record<ModelId, WorldModelAdapter> = {
  constant: adapter(
    'constant',
    'Constant velocity',
    'Extrapolates measured velocity; ignores forces, contacts and future drive commands.',
  ),
  dynamics: adapter(
    'dynamics',
    'Simple dynamics',
    'Uses approximate rolling dynamics, commanded routes and observed box obstacles.',
  ),
  biased: adapter(
    'biased',
    'Biased dynamics',
    'Uses slower drive, exaggerated drag and an underestimated ramp slope.',
  ),
}
