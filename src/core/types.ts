/** Explicit contracts for reproducible exports; bump the affected field when semantics change. */
export const SCHEMA_VERSIONS = {
  world: '1', scenario: '1', predictor: '2', comparison: '2', branch: '2', export: '2',
} as const

export interface Intervention {
  tick: number
  kind: 'surprise-impulse'
  /** Applied change of velocity in m/s, not a prediction. */
  deltaVelocity: Vec3
}

export type Vec3 = [number, number, number]
export type Quaternion = [number, number, number, number]
export type ScenarioId = 'planning' | 'dynamics' | 'occlusion' | 'surprise'
export type ModelId = 'constant' | 'dynamics' | 'biased'
export type ActionId = 'direct' | 'left' | 'right' | 'wait'
export type ObjectKind =
  'cube' | 'ball' | 'obstacle' | 'panel' | 'ramp' | 'robot' | 'goal' | 'floor'

export interface WorldObject {
  id: string
  label: string
  kind: ObjectKind
  position: Vec3
  /** Half extents; for a ball all three components are its radius. */
  size: Vec3
  velocity: Vec3
  angularVelocity: Vec3
  rotation: Quaternion
  color: string
  dynamic: boolean
}

export interface WorldState {
  tick: number
  time: number
  scenario: ScenarioId
  seed: number
  objects: WorldObject[]
  goal: Vec3
  activeAction: ActionId | null
  contacts: string[]
  goalDistance: number
  success: boolean
}

export interface Observation {
  tick: number
  time: number
  objects: WorldObject[]
  visibleIds: string[]
  camera: { position: Vec3; direction: Vec3; fov: number; range: number }
}

export interface BeliefObject extends WorldObject {
  visible: boolean
  /** A decaying display weight, not a calibrated probability. */
  confidence: number
  lastSeenTick: number
}

export interface BeliefState {
  tick: number
  time: number
  objects: BeliefObject[]
  /** Distance between prior estimate and the newest visible measurement. */
  innovation: number
  /** Last visible correction worth inspecting; retained after the transient update. */
  lastCorrection?: {
    tick: number
    objectId: string
    expected: Vec3
    observed: Vec3
    error: number
    reacquired: boolean
  }
}

export interface TrajectorySample {
  tick: number
  time: number
  position: Vec3
  velocity: Vec3
}

export interface Prediction {
  id: string
  model: ModelId
  action: ActionId
  objectId: string
  startTick: number
  samples: TrajectorySample[]
  /** Lower is better: goal distance + collision penalty + travelled distance cost. */
  score: number
  collision: boolean
  goalDistance: number
}

export interface PredictionError {
  positionError: number | null
  trajectoryError: number | null
  finalStateError: number | null
  comparedSamples: number
  goalDistance: number
  collisionCount: number
  success: boolean
}

export interface LabParameters {
  friction: number
  /** Metres per second at reset. */
  initialVelocity: number
  /** Degrees, matching the laboratory controls. */
  slope: number
  /** Horizontal field of view in degrees. */
  sensorFov: number
  /** Sensor heading offset in degrees. */
  sensorYaw: number
}

export interface ScenarioDefinition {
  id: ScenarioId
  title: string
  description: string
  focusObjectId: string
  goal: Vec3
  allowedActions: ActionId[]
  parameters: LabParameters
}

export interface TimelineFrame {
  index: number
  tick: number
  time: number
  branchId: string
  position: Vec3
  action: ActionId | null
}

export interface ReplayBranch {
  id: string
  name: string
  parentBranchId: string | null
  forkTick: number
  actions: { tick: number; action: ActionId }[]
  interventions: Intervention[]
  trajectory: TrajectorySample[]
}

export interface ModelContext {
  scenario: ScenarioId
  focusObjectId: string
  goal: Vec3
  parameters: LabParameters
  /** Declared predictor assumptions; these never configure the physical world. */
  assumptions?: { driveSpeedScale?: number; dragScale?: number }
}

/** An immutable copy is captured whenever a new forecast is requested. */
export interface ForecastOrigin {
  belief: BeliefState
  context: ModelContext
  horizon: number
}

export interface SensitivityParameters {
  /** Added to the believed focus object's X velocity, in m/s. */
  velocityOffsetX: number
  driveSpeedScale: number
  dragScale: number
  friction: number
}

export type SensitivityRanges = {
  [Parameter in keyof SensitivityParameters]: [number, number]
}

export interface AnalysisBundle {
  /** Frozen observation-derived belief and public assumptions for an auditable forecast. */
  origin: ForecastOrigin
  originTick: number
  originTime: number
  action: ActionId
  horizon: number
  forecastByModel: Record<ModelId, Prediction>
  ensemble: {
    model: 'dynamics'
    spread: number
    /** Explicit sensitivity bounds, not a probability distribution. */
    ranges: SensitivityRanges
    members: {
      id: string
      label: string
      parameters: SensitivityParameters
      prediction: Prediction
    }[]
  }
}

export interface AnalysisErrors {
  throughTick: number
  byModel: Record<
    ModelId,
    {
      points: { tick: number; time: number; error: number }[]
      metrics: PredictionError
    }
  >
}

/** Predictors receive belief and declared controls, never a Rapier world. */
export interface WorldModelAdapter {
  id: ModelId
  name: string
  description: string
  observe(world: WorldState, parameters: LabParameters): Observation
  encode(observation: Observation, memory: BeliefState): BeliefState
  predict(
    belief: BeliefState,
    action: ActionId,
    horizon: number,
    context: ModelContext,
  ): Prediction
  rollout(
    belief: BeliefState,
    actions: ActionId[],
    horizon: number,
    context: ModelContext,
  ): Prediction[]
  score(prediction: Prediction): number
  reset(): void
}
