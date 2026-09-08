import RAPIER from '@dimforge/rapier3d-compat'
import { analysisErrors, createAnalysis, freezeForecast } from './analysis'
import { clamp, clone, planarDistance } from './math'
import { predictionError } from './metrics'
import { actionKick, MODELS } from './models'
import { encode, observe } from './observation'
import {
  FIXED_DT,
  MAX_BRANCHES,
  MAX_FRAMES,
  object,
  routeFor,
  SAMPLE_EVERY,
  SCENARIOS,
} from './scenarios'
import type {
  ActionId,
  AnalysisBundle,
  BeliefState,
  ForecastOrigin,
  LabParameters,
  ModelContext,
  ModelId,
  Observation,
  Prediction,
  ReplayBranch,
  ScenarioId,
  TimelineFrame,
  TrajectorySample,
  Vec3,
  WorldObject,
  WorldState,
} from './types'

type Controller = { action: ActionId; waypoint: number } | null
type Snapshot = {
  physics: Uint8Array
  state: WorldState
  observation: Observation
  belief: BeliefState
  controller: Controller
  predictions: Prediction[]
  selectedAction: ActionId | null
  comparisonPrediction?: Prediction
  forecastOrigin?: ForecastOrigin
  analysis?: AnalysisBundle
  parameters: LabParameters
  collisionCount: number
  activeContacts: string[]
  actions: ReplayBranch['actions']
}
type StoredBranch = { info: ReplayBranch; frames: Snapshot[] }
let initialization: Promise<void> | undefined

/** The only owner of authoritative physics. Renderers read its cached plain state. */
export class LabEngine {
  private world!: RAPIER.World
  private bodyHandles = new Map<string, number>()
  private templates: WorldObject[] = []
  private _state!: WorldState
  private _observation!: Observation
  private _belief!: BeliefState
  private _parameters!: LabParameters
  private _predictions: Prediction[] = []
  private _selectedAction: ActionId | null = null
  private _comparisonPrediction: Prediction | undefined
  private forecastOrigin: ForecastOrigin | undefined
  private _analysis: AnalysisBundle | undefined
  private controller: Controller = null
  private storedBranches: StoredBranch[] = []
  private branchCounter = 0
  private _currentBranchId = 'branch-0'
  private _currentFrame = 0
  private collisionCount = 0
  private actionHistory: ReplayBranch['actions'] = []
  private activeContacts = new Set<string>()
  private disposed = false

  static async create(scenario: ScenarioId = 'planning'): Promise<LabEngine> {
    initialization ??= RAPIER.init()
    await initialization
    const engine = new LabEngine()
    engine.reset(scenario)
    return engine
  }

  get state() {
    return this._state
  }
  get observation() {
    return this._observation
  }
  get belief() {
    return this._belief
  }
  get parameters() {
    return this._parameters
  }
  get predictions() {
    return this._predictions
  }
  get selectedAction() {
    return this._selectedAction
  }
  get analysis() {
    return this._analysis
  }
  get analysisErrors() {
    return this.analysis
      ? analysisErrors(
          this.analysis,
          this.actualTrajectory,
          this.state,
          this.collisionCount,
        )
      : undefined
  }
  /** Forecast paired with actual execution; preview selection cannot change this pairing. */
  get comparisonPrediction() {
    return (
      this._comparisonPrediction ??
      this.predictions.find((p) => p.action === this.selectedAction)
    )
  }
  get currentBranchId() {
    return this._currentBranchId
  }
  get currentFrame() {
    return this._currentFrame
  }
  get branches(): ReplayBranch[] {
    return this.storedBranches.map((b) => b.info)
  }
  get actualTrajectory(): TrajectorySample[] {
    return this.branch.info.trajectory
  }
  get timeline(): TimelineFrame[] {
    return this.branch.frames.map((frame, index) => ({
      index,
      tick: frame.state.tick,
      time: frame.state.time,
      branchId: this.currentBranchId,
      position: frame.state.objects.find((o) => o.id === this.focusId)!
        .position,
      action: frame.state.activeAction,
    }))
  }
  get metrics() {
    return predictionError(
      this.comparisonPrediction,
      this.actualTrajectory.filter((s) => s.tick <= this.state.tick),
      this.state,
      this.collisionCount,
    )
  }
  private get branch() {
    return this.storedBranches.find((b) => b.info.id === this._currentBranchId)!
  }
  private get focusId() {
    return SCENARIOS[this._state.scenario].focusObjectId
  }
  private get context(): ModelContext {
    return {
      scenario: this.state.scenario,
      focusObjectId: this.focusId,
      goal: clone(this.state.goal),
      parameters: clone(this.parameters),
    }
  }
  private body(id: string) {
    return this.world.getRigidBody(this.bodyHandles.get(id)!)
  }

  reset(scenario: ScenarioId = this._state?.scenario ?? 'planning'): void {
    if (this.world) this.world.free()
    this.disposed = false
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
    this.world.timestep = FIXED_DT
    this.bodyHandles.clear()
    this._parameters =
      this._state?.scenario === scenario
        ? clone(this._parameters)
        : clone(SCENARIOS[scenario].parameters)
    this.controller = null
    this._predictions = []
    this._selectedAction = null
    this._comparisonPrediction = undefined
    this.forecastOrigin = undefined
    this._analysis = undefined
    this.collisionCount = 0
    this.actionHistory = []
    this.activeContacts.clear()
    this.branchCounter = 0
    this._currentBranchId = 'branch-0'
    this._currentFrame = 0
    this._state = {
      tick: 0,
      time: 0,
      scenario,
      seed: 42,
      objects: [],
      goal: clone(SCENARIOS[scenario].goal),
      activeAction: null,
      contacts: [],
      goalDistance: 0,
      success: false,
    }
    this.createScene()
    this.readState()
    this._belief = { tick: 0, time: 0, objects: [], innovation: 0 }
    this.sense()
    this.storedBranches = [
      {
        info: {
          id: 'branch-0',
          name: 'Original',
          parentBranchId: null,
          forkTick: 0,
          actions: [],
          trajectory: [],
        },
        frames: [],
      },
    ]
    this.saveFrame()
  }

  private createScene(): void {
    const scenario = this.state.scenario
    const floor = object(
      'floor',
      'floor',
      [0, -0.1, 0],
      [5.6, 0.1, 4.6],
      '#e7e8e3',
    )
    const goal = object(
      'goal',
      'goal',
      [...this.state.goal],
      [0.55, 0.025, 0.55],
      '#64a38c',
    )
    goal.position[1] = 0.025
    const robotPosition: Vec3 =
      scenario === 'occlusion'
        ? [0, 0.3, 4]
        : scenario === 'planning'
          ? [-4.05, 0.3, 0]
          : [-4, 0.3, 2.4]
    this.templates = [
      floor,
      goal,
      object('robot', 'robot', robotPosition, [0.38, 0.3, 0.32], '#dbd9ca'),
    ]
    if (scenario === 'planning') {
      this.templates.push(
        object(
          'cube',
          'cube',
          [-3, 0.35, 0],
          [0.35, 0.35, 0.35],
          '#538fb5',
          true,
        ),
      )
      this.templates.push(
        object('obstacle', 'obstacle', [0, 0.7, 0], [0.65, 0.7, 1], '#969b95'),
      )
      this.templates.push(
        object(
          'yellow cube',
          'cube',
          [-3.5, 0.25, 3.4],
          [0.25, 0.25, 0.25],
          '#c8ad63',
        ),
      )
    } else {
      const ball = object(
        'ball',
        'ball',
        [-3, 0.3, scenario === 'occlusion' ? -1 : 0],
        [0.3, 0.3, 0.3],
        '#bf765a',
        true,
      )
      ball.velocity = [this.parameters.initialVelocity, 0, 0]
      ball.angularVelocity = [0, 0, -this.parameters.initialVelocity / 0.3]
      if (scenario === 'dynamics') {
        const angle = (this.parameters.slope * Math.PI) / 180
        const ramp = object(
          'ramp',
          'ramp',
          [-1.4, 0.58, 0],
          [1.9, 0.1, 1],
          '#b7b19a',
        )
        ramp.rotation = [0, 0, Math.sin(-angle / 2), Math.cos(-angle / 2)]
        ball.position[1] =
          0.58 +
          0.4 / Math.cos(angle) -
          Math.tan(angle) * (ball.position[0] + 1.4) +
          0.015
        this.templates.push(ramp)
      }
      this.templates.push(ball)
      if (scenario === 'occlusion')
        this.templates.push(
          object('panel', 'panel', [0, 0.85, 1], [1.2, 0.85, 0.12], '#959d99'),
        )
      this.templates.push(
        object(
          'blue cube',
          'cube',
          [3.8, 0.25, 3.4],
          [0.25, 0.25, 0.25],
          '#538fb5',
        ),
      )
    }
    for (const item of this.templates) {
      if (item.kind === 'goal') continue
      const descriptor = item.dynamic
        ? RAPIER.RigidBodyDesc.dynamic().setCanSleep(false).setCcdEnabled(true)
        : item.kind === 'robot'
          ? RAPIER.RigidBodyDesc.kinematicPositionBased()
          : RAPIER.RigidBodyDesc.fixed()
      descriptor.setTranslation(...item.position).setRotation({
        x: item.rotation[0],
        y: item.rotation[1],
        z: item.rotation[2],
        w: item.rotation[3],
      })
      if (item.dynamic)
        descriptor
          .setLinvel(...item.velocity)
          .setAngvel({
            x: item.angularVelocity[0],
            y: item.angularVelocity[1],
            z: item.angularVelocity[2],
          })
          .setLinearDamping(
            scenario === 'occlusion'
              ? 0
              : 0.12 + this.parameters.friction * 0.08,
          )
      const rigidBody = this.world.createRigidBody(descriptor)
      if (item.id === 'cube') {
        rigidBody.lockRotations(true, true)
        rigidBody.setEnabledTranslations(true, false, true, true)
      }
      let collider =
        item.kind === 'ball'
          ? RAPIER.ColliderDesc.ball(item.size[0])
          : RAPIER.ColliderDesc.cuboid(...item.size)
      collider = collider
        .setFriction(scenario === 'occlusion' ? 0 : this.parameters.friction)
        .setRestitution(0.03)
      if (item.dynamic) collider.setMass(1)
      if (item.kind === 'robot') collider.setSensor(true)
      this.world.createCollider(collider, rigidBody)
      this.bodyHandles.set(item.id, rigidBody.handle)
    }
  }

  private readState(): void {
    const objects = this.templates.map((template) => {
      if (!this.bodyHandles.has(template.id)) return clone(template)
      const body = this.body(template.id)
      const p = body.translation(),
        v = body.linvel(),
        q = body.rotation(),
        a = body.angvel()
      return {
        ...template,
        position: [p.x, p.y, p.z] as Vec3,
        velocity: [v.x, v.y, v.z] as Vec3,
        angularVelocity: [a.x, a.y, a.z] as Vec3,
        rotation: [q.x, q.y, q.z, q.w] as [number, number, number, number],
      }
    })
    const focus = objects.find((o) => o.id === this.focusId)!
    const goalDistance = planarDistance(focus.position, this.state.goal)
    this._state = {
      ...this._state,
      objects,
      activeAction: this.controller?.action ?? null,
      goalDistance,
      success: this.state.scenario === 'planning' && goalDistance < 0.35,
      contacts: [...this.activeContacts],
    }
  }

  private sense(): void {
    this._observation = observe(this.state, this.parameters)
    this._belief = encode(this.observation, this.belief)
  }

  step(count = 1): void {
    if (this.disposed) return
    if (this.currentFrame < this.branch.frames.length - 1) this.fork()
    if (!this._comparisonPrediction)
      this.commitComparison(this.controller?.action ?? 'wait')
    for (let i = 0; i < Math.max(0, Math.floor(count)); i++) {
      this.driveController()
      this.world.step()
      this._state = {
        ...this._state,
        tick: this.state.tick + 1,
        time: (this.state.tick + 1) * FIXED_DT,
      }
      this.readContacts()
      this.readState()
      this.sense()
      // A forecast can start between global checkpoints; sample its exact future ticks too.
      if (
        this.state.tick % SAMPLE_EVERY === 0 ||
        (this.forecastOrigin &&
          (this.state.tick - this.forecastOrigin.belief.tick) % SAMPLE_EVERY ===
            0)
      )
        this.saveFrame()
    }
  }

  /** An assisted planar pusher: bounded velocity servo on the cube, with real contacts. */
  private driveController(): void {
    if (this.state.scenario !== 'planning' || !this.controller) return
    const cube = this.body('cube')
    const p = cube.translation(),
      velocity = cube.linvel()
    const route = routeFor(this.controller.action, this.state.goal)
    let destination = route[this.controller.waypoint]
    if (destination && planarDistance([p.x, p.y, p.z], destination) < 0.12)
      destination = route[++this.controller.waypoint]
    let wanted: Vec3 = [0, 0, 0]
    if (destination) {
      const distance = Math.hypot(destination[0] - p.x, destination[2] - p.z)
      const speed = Math.min(1.6, distance * 5)
      wanted = [
        ((destination[0] - p.x) / Math.max(distance, 0.001)) * speed,
        0,
        ((destination[2] - p.z) / Math.max(distance, 0.001)) * speed,
      ]
    }
    // Acceleration is bounded; contact resolution is still owned by Rapier.
    const vx =
      velocity.x + clamp(wanted[0] - velocity.x, -6 * FIXED_DT, 6 * FIXED_DT)
    const vz =
      velocity.z + clamp(wanted[2] - velocity.z, -6 * FIXED_DT, 6 * FIXED_DT)
    cube.setLinvel({ x: vx, y: 0, z: vz }, true)
    const norm = Math.hypot(wanted[0], wanted[2])
    const behind: Vec3 =
      norm > 0.01
        ? [
            p.x - (wanted[0] / norm) * 0.84,
            0.3,
            p.z - (wanted[2] / norm) * 0.84,
          ]
        : [p.x - 0.84, 0.3, p.z]
    this.body('robot').setNextKinematicTranslation({
      x: behind[0],
      y: behind[1],
      z: behind[2],
    })
  }

  private readContacts(): void {
    const now = new Set<string>()
    const focus = this.body(this.focusId).collider(0)
    for (const item of this.templates.filter(
      (o) => o.kind === 'obstacle' || o.kind === 'panel',
    )) {
      this.world.contactPair(
        focus,
        this.body(item.id).collider(0),
        (manifold) => {
          if (manifold.numContacts() > 0) now.add(item.id)
        },
      )
    }
    for (const id of now)
      if (!this.activeContacts.has(id)) this.collisionCount++
    this.activeContacts = now
  }

  predict(model: ModelId = 'dynamics', horizon = 10): Prediction[] {
    const normalizedHorizon =
      Math.round(clamp(Number.isFinite(horizon) ? horizon : 10, 0.1, 20) * 10) /
      10
    this.forecastOrigin = freezeForecast({
      belief: clone(this.belief),
      context: this.context,
      horizon: normalizedHorizon,
    })
    this._predictions = MODELS[model].rollout(
      clone(this.forecastOrigin.belief),
      SCENARIOS[this.state.scenario].allowedActions,
      normalizedHorizon,
      clone(this.forecastOrigin.context),
    )
    this._comparisonPrediction = undefined
    this._analysis = undefined
    if (!this._selectedAction)
      this._selectedAction =
        this.state.scenario === 'planning' ? 'direct' : 'wait'
    this.updateCurrentSnapshot()
    return this.predictions
  }

  plan(model: ModelId = 'dynamics', horizon = 10): Prediction[] {
    this.predict(model, horizon)
    const best = [...this.predictions]
      .filter((p) => p.samples.length)
      .sort((a, b) => a.score - b.score)[0]
    this._selectedAction = best?.action ?? 'wait'
    this.updateCurrentSnapshot()
    return this.predictions
  }

  selectAction(action: ActionId): void {
    if (!SCENARIOS[this.state.scenario].allowedActions.includes(action))
      throw new Error('Action is not allowed in this scenario')
    this._selectedAction = action
    this.updateCurrentSnapshot()
  }

  /** Compare models and declared parameter sensitivities at the saved decision point. */
  analyze(spread = 0.5): AnalysisBundle | undefined {
    if (!this.forecastOrigin || !this.predictions.length) return undefined
    const action =
      this._comparisonPrediction?.action ?? this.selectedAction ?? 'wait'
    this._analysis = createAnalysis(this.forecastOrigin, action, spread)
    this.updateCurrentSnapshot()
    return this._analysis
  }

  private commitComparison(action: ActionId): void {
    this._comparisonPrediction = this.predictions.find(
      (p) => p.action === action,
    )
    if (
      this.analysis &&
      this.forecastOrigin &&
      this.analysis.action !== action
    ) {
      this._analysis = createAnalysis(
        this.forecastOrigin,
        action,
        this.analysis.ensemble.spread,
      )
    }
  }

  act(action: ActionId = this._selectedAction ?? 'wait'): void {
    if (!SCENARIOS[this.state.scenario].allowedActions.includes(action))
      throw new Error('Action is not allowed in this scenario')
    if (this.currentFrame < this.branch.frames.length - 1) this.fork()
    this._selectedAction = action
    this.controller = { action, waypoint: 0 }
    this.commitComparison(action)
    if (this.state.scenario !== 'planning') {
      const kick = actionKick(action),
        body = this.body(this.focusId)
      body.applyImpulse(
        {
          x: kick[0] * body.mass(),
          y: kick[1] * body.mass(),
          z: kick[2] * body.mass(),
        },
        true,
      )
    }
    this.actionHistory.push({ tick: this.state.tick, action })
    this.branch.info.actions = clone(this.actionHistory)
    this.readState()
  }

  surprise(): void {
    if (this.currentFrame < this.branch.frames.length - 1) this.fork()
    const body = this.body(this.focusId)
    body.applyImpulse(
      { x: -0.2 * body.mass(), y: 0, z: 2.5 * body.mass() },
      true,
    )
    this.readState()
    // The estimator is intentionally not updated until its next observation.
  }

  configure(parameters: Partial<LabParameters>): void {
    const normalized = {
      friction: clamp(parameters.friction ?? this.parameters.friction, 0, 1),
      initialVelocity: clamp(
        parameters.initialVelocity ?? this.parameters.initialVelocity,
        0,
        3,
      ),
      slope: clamp(parameters.slope ?? this.parameters.slope, 3, 24),
      sensorFov: clamp(
        parameters.sensorFov ?? this.parameters.sensorFov,
        30,
        170,
      ),
      sensorYaw: clamp(
        parameters.sensorYaw ?? this.parameters.sensorYaw,
        -180,
        180,
      ),
    }
    const physicalChanged =
      normalized.friction !== this.parameters.friction ||
      normalized.initialVelocity !== this.parameters.initialVelocity ||
      normalized.slope !== this.parameters.slope
    this._parameters = normalized
    if (physicalChanged) this.reset()
    else {
      this.sense()
      this.updateCurrentSnapshot()
    }
  }

  private sample(): TrajectorySample {
    const focus = this.state.objects.find((o) => o.id === this.focusId)!
    return {
      tick: this.state.tick,
      time: this.state.time,
      position: [...focus.position],
      velocity: [...focus.velocity],
    }
  }

  private capture(): Snapshot {
    return {
      physics: this.world.takeSnapshot(),
      state: clone(this.state),
      observation: clone(this.observation),
      belief: clone(this.belief),
      controller: clone(this.controller),
      predictions: this.predictions,
      selectedAction: this.selectedAction,
      comparisonPrediction: this._comparisonPrediction,
      forecastOrigin: this.forecastOrigin,
      analysis: this.analysis,
      parameters: clone(this.parameters),
      collisionCount: this.collisionCount,
      activeContacts: [...this.activeContacts],
      actions: clone(this.actionHistory),
    }
  }

  private saveFrame(): void {
    this.branch.frames.push(this.capture())
    this.branch.info.trajectory.push(this.sample())
    if (this.branch.frames.length > MAX_FRAMES) {
      this.branch.frames.shift()
      this.branch.info.trajectory.shift()
    }
    this._currentFrame = this.branch.frames.length - 1
  }

  private updateCurrentSnapshot(): void {
    // Editing an earlier decision does not replace the parent's stored future.
    if (this.currentFrame < this.branch.frames.length - 1) return
    if (this.branch.frames.at(-1)?.state.tick === this.state.tick)
      this.branch.frames[this.currentFrame] = this.capture()
    else this.saveFrame()
  }

  rewind(index: number): void {
    const frameIndex = clamp(
      Math.round(index),
      0,
      this.branch.frames.length - 1,
    )
    const snapshot = this.branch.frames[frameIndex]
    this.world.free()
    this.world = RAPIER.World.restoreSnapshot(snapshot.physics)
    this._state = clone(snapshot.state)
    this._observation = clone(snapshot.observation)
    this._belief = clone(snapshot.belief)
    this.controller = clone(snapshot.controller)
    this._predictions = snapshot.predictions
    this._selectedAction = snapshot.selectedAction
    this._comparisonPrediction = snapshot.comparisonPrediction
    this.forecastOrigin = snapshot.forecastOrigin
    this._analysis = snapshot.analysis
    this._parameters = clone(snapshot.parameters)
    this.collisionCount = snapshot.collisionCount
    this.activeContacts = new Set(snapshot.activeContacts)
    this.actionHistory = clone(snapshot.actions)
    this._currentFrame = frameIndex
  }

  /** Inspect another retained reality without deleting either recorded future. */
  switchBranch(id: string, frameIndex?: number): void {
    const target = this.storedBranches.find((branch) => branch.info.id === id)
    if (!target) throw new Error(`Unknown or expired branch: ${id}`)
    if (
      this.currentFrame === this.branch.frames.length - 1 &&
      this.branch.frames.at(-1)?.state.tick !== this.state.tick
    )
      this.saveFrame()
    this._currentBranchId = id
    this.rewind(frameIndex ?? target.frames.length - 1)
  }

  fork(): ReplayBranch {
    const parent = this.branch
    const index = this.currentFrame
    const id = `branch-${++this.branchCounter}`
    const info: ReplayBranch = {
      id,
      name: `Branch ${this.branchCounter}`,
      parentBranchId: parent.info.id,
      forkTick: this.state.tick,
      actions: clone(this.actionHistory),
      trajectory: clone(
        parent.info.trajectory.filter((s) => s.tick <= this.state.tick),
      ),
    }
    const frames = parent.frames.slice(0, index + 1)
    this.storedBranches.push({ info, frames })
    this._currentBranchId = id
    this._currentFrame = frames.length - 1
    // Capture estimator, predictions and exact current physics, including a mid-sample fork.
    this.updateCurrentSnapshot()
    if (this.storedBranches.length > MAX_BRANCHES) {
      const removable = this.storedBranches.findIndex(
        (b) => b.info.id !== parent.info.id && b.info.id !== id,
      )
      if (removable >= 0) this.storedBranches.splice(removable, 1)
    }
    return info
  }

  dispose(): void {
    if (!this.disposed) {
      this.world.free()
      this.disposed = true
    }
  }
}
