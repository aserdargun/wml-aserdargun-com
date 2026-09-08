import type {
  ActionId,
  ScenarioDefinition,
  ScenarioId,
  Vec3,
  WorldObject,
} from './types'

export const FIXED_DT = 1 / 60
export const SAMPLE_EVERY = 6
export const MAX_FRAMES = 451
export const MAX_BRANCHES = 6
export const ACTIONS: { id: ActionId; label: string; detail: string }[] = [
  {
    id: 'direct',
    label: 'Direct push',
    detail: 'Shortest route through the obstacle.',
  },
  {
    id: 'left',
    label: 'Left detour',
    detail: 'Travel around the near side of the obstacle.',
  },
  {
    id: 'right',
    label: 'Right detour',
    detail: 'Travel around the farther side of the obstacle.',
  },
  { id: 'wait', label: 'Wait', detail: 'Apply no drive; observe the world.' },
]

const defaults = {
  friction: 0.35,
  initialVelocity: 0.65,
  slope: 12,
  sensorFov: 110,
  sensorYaw: 0,
}
export const SCENARIOS: Record<ScenarioId, ScenarioDefinition> = {
  planning: {
    id: 'planning',
    title: 'Cube to target',
    description:
      'Imagine four routes. Choose one. Let physics decide what happens.',
    focusObjectId: 'cube',
    goal: [3, 0.35, 0],
    allowedActions: ['direct', 'left', 'right', 'wait'],
    parameters: { ...defaults },
  },
  dynamics: {
    id: 'dynamics',
    title: 'Ball & ramp',
    description:
      'Compare simple predictions with a ball rolling down a physical ramp.',
    focusObjectId: 'ball',
    goal: [3.5, 0.3, 0],
    allowedActions: ['direct', 'left', 'right', 'wait'],
    parameters: { ...defaults },
  },
  occlusion: {
    id: 'occlusion',
    title: 'Beyond sight',
    description:
      'The ball continues behind the panel. Its estimated location comes from memory.',
    focusObjectId: 'ball',
    goal: [3, 0.3, -1],
    allowedActions: ['direct', 'left', 'right', 'wait'],
    parameters: { ...defaults, initialVelocity: 0.95, sensorFov: 100 },
  },
  surprise: {
    id: 'surprise',
    title: 'An unexpected push',
    description:
      'Predict the ball, then intervene. New evidence changes belief.',
    focusObjectId: 'ball',
    goal: [3, 0.3, 0],
    allowedActions: ['direct', 'left', 'right', 'wait'],
    parameters: { ...defaults, initialVelocity: 0.8 },
  },
}

export function object(
  id: string,
  kind: WorldObject['kind'],
  position: Vec3,
  size: Vec3,
  color: string,
  dynamic = false,
): WorldObject {
  return {
    id,
    label:
      id === 'cube' ? 'Blue cube' : id.charAt(0).toUpperCase() + id.slice(1),
    kind,
    position,
    size,
    color,
    dynamic,
    velocity: [0, 0, 0],
    angularVelocity: [0, 0, 0],
    rotation: [0, 0, 0, 1],
  }
}

/** Candidate waypoints are declared controller commands, not paths recovered from reality. */
export function routeFor(action: ActionId, goal: Vec3): Vec3[] {
  if (action === 'wait') return []
  if (action === 'direct') return [[...goal]]
  const z = action === 'left' ? -1.9 : 2.5
  return [[-1.5, goal[1], z], [1.5, goal[1], z], [...goal]]
}
