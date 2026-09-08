import { addScaled, clone, distance, segmentIntersectsBox } from './math'
import type {
  BeliefState,
  LabParameters,
  Observation,
  Vec3,
  WorldState,
} from './types'

/** Analytic camera sensing: range, horizontal FOV and object-center line-of-sight. */
export function observe(
  world: WorldState,
  parameters: LabParameters,
): Observation {
  const robot = world.objects.find((o) => o.kind === 'robot')!
  const position: Vec3 = [robot.position[0], 0.75, robot.position[2]]
  const baseYaw =
    world.scenario === 'occlusion'
      ? -Math.PI / 2
      : world.scenario === 'planning'
        ? 0
        : -Math.PI / 7
  const yaw = baseYaw + (parameters.sensorYaw * Math.PI) / 180
  const direction: Vec3 = [Math.cos(yaw), 0, Math.sin(yaw)]
  const blockers = world.objects.filter(
    (o) => o.kind === 'obstacle' || o.kind === 'panel',
  )
  const range = 12
  const visible = world.objects.filter((o) => {
    if (o.kind === 'floor') return false
    if (o.kind === 'robot') return true // Proprioceptive pose is separately available.
    const dx = o.position[0] - position[0]
    const dz = o.position[2] - position[2]
    const length = Math.hypot(dx, dz)
    if (length > range) return false
    if (
      length > 0.001 &&
      (dx * direction[0] + dz * direction[2]) / length <
        Math.cos((parameters.sensorFov * Math.PI) / 360)
    )
      return false
    return !blockers.some(
      (blocker) =>
        blocker.id !== o.id &&
        segmentIntersectsBox(
          position,
          o.position,
          blocker.position,
          blocker.size,
        ),
    )
  })
  return {
    tick: world.tick,
    time: world.time,
    objects: clone(visible),
    visibleIds: visible.map((o) => o.id),
    camera: { position, direction, fov: parameters.sensorFov, range },
  }
}

/** Hidden objects are propagated from their last estimate; unobserved entities stay absent. */
export function encode(
  observation: Observation,
  memory: BeliefState,
): BeliefState {
  const dt = Math.max(0, observation.time - memory.time)
  const estimates = new Map(
    memory.objects.map((o) => [
      o.id,
      {
        ...clone(o),
        position: o.dynamic
          ? addScaled(o.position, o.velocity, dt)
          : ([...o.position] as Vec3),
        visible: false,
        confidence: Math.max(0.05, o.confidence * Math.exp(-0.22 * dt)),
      },
    ]),
  )
  let innovation = 0
  let correction: BeliefState['lastCorrection']
  for (const measured of observation.objects) {
    const prior = estimates.get(measured.id)
    if (prior && measured.dynamic) {
      const error = distance(prior.position, measured.position)
      innovation = Math.max(innovation, error)
      const reacquired =
        memory.objects.find((o) => o.id === measured.id)?.visible === false
      if (
        (reacquired || error > 0.015) &&
        (!correction || error >= correction.error)
      ) {
        correction = {
          tick: observation.tick,
          objectId: measured.id,
          expected: [...prior.position],
          observed: [...measured.position],
          error,
          reacquired,
        }
      }
    }
    estimates.set(measured.id, {
      ...clone(measured),
      visible: true,
      confidence: 1,
      lastSeenTick: observation.tick,
    })
  }
  return {
    tick: observation.tick,
    time: observation.time,
    objects: [...estimates.values()],
    innovation,
    lastCorrection: correction ?? clone(memory.lastCorrection),
  }
}
