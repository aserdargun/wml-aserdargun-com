import { afterEach, describe, expect, it } from 'vitest'
import {
  LabEngine,
  MODELS,
  SCENARIOS,
  encode,
  observe,
  predictionError,
  type BeliefState,
  type TrajectorySample,
} from '../src/core'

const engines: LabEngine[] = []
async function create(
  scenario: Parameters<typeof LabEngine.create>[0] = 'planning',
) {
  const engine = await LabEngine.create(scenario)
  engines.push(engine)
  return engine
}
afterEach(() => {
  for (const engine of engines.splice(0)) engine.dispose()
})

describe('observation and belief boundaries', () => {
  it('uses camera FOV and obstacle occlusion instead of exposing the whole world', async () => {
    const engine = await create()
    expect(engine.observation.visibleIds).toContain('cube')
    expect(engine.observation.visibleIds).toContain('obstacle')
    expect(engine.observation.visibleIds).not.toContain('yellow cube')
    expect(engine.observation.visibleIds).not.toContain('goal')
    expect(engine.belief.objects.some((o) => o.id === 'yellow cube')).toBe(
      false,
    )
    const narrow = observe(engine.state, {
      ...engine.parameters,
      sensorYaw: 90,
      sensorFov: 30,
    })
    expect(narrow.visibleIds).not.toContain('cube')
  })

  it('keeps a hidden object in memory without reading an unexpected hidden impulse', async () => {
    const engine = await create('occlusion')
    expect(engine.observation.visibleIds).toContain('ball')
    engine.step(160)
    const before = structuredClone(
      engine.belief.objects.find((o) => o.id === 'ball')!,
    )
    expect(before.visible).toBe(false)
    engine.surprise()
    engine.step(6)
    const remembered = engine.belief.objects.find((o) => o.id === 'ball')!
    const real = engine.state.objects.find((o) => o.id === 'ball')!
    expect(remembered.visible).toBe(false)
    expect(remembered.position[2]).toBeCloseTo(before.position[2], 5)
    expect(Math.abs(real.position[2] - remembered.position[2])).toBeGreaterThan(
      0.15,
    )
    expect(remembered.confidence).toBeLessThan(before.confidence)
  })

  it('reacquires the ball after it emerges and replaces its memory estimate', async () => {
    const engine = await create('occlusion')
    engine.step(210)
    expect(engine.belief.objects.find((o) => o.id === 'ball')!.visible).toBe(
      false,
    )
    engine.step(210)
    const remembered = engine.belief.objects.find((o) => o.id === 'ball')!
    expect(remembered.visible).toBe(true)
    expect(remembered.position).toEqual(
      engine.state.objects.find((o) => o.id === 'ball')!.position,
    )
    expect(remembered.confidence).toBe(1)
  })

  it('never seeds memory with entities absent from all observations', () => {
    const memory: BeliefState = { tick: 0, time: 0, objects: [], innovation: 0 }
    const encoded = encode(
      {
        tick: 60,
        time: 1,
        objects: [],
        visibleIds: [],
        camera: {
          position: [0, 0, 0],
          direction: [1, 0, 0],
          fov: 90,
          range: 10,
        },
      },
      memory,
    )
    expect(encoded.objects).toEqual([])
  })
})

describe('world model and planner', () => {
  it('generates independent action-conditioned futures without advancing or mutating reality or belief', async () => {
    const engine = await create()
    const world = structuredClone(engine.state)
    const belief = structuredClone(engine.belief)
    const predictions = engine.plan('dynamics', 10)
    expect(engine.state).toEqual(world)
    expect(engine.belief).toEqual(belief)
    expect(predictions).toHaveLength(4)
    expect(predictions.find((p) => p.action === 'direct')!.collision).toBe(true)
    expect(
      predictions
        .find((p) => p.action === 'left')!
        .samples.some((p) => p.position[2] < -1.7),
    ).toBe(true)
    expect(
      predictions
        .find((p) => p.action === 'right')!
        .samples.some((p) => p.position[2] > 2.3),
    ).toBe(true)
    expect(SCENARIOS.planning.allowedActions).toContain(engine.selectedAction)
    expect(engine.selectedAction).toBe('left')
    const context = {
      scenario: 'planning' as const,
      focusObjectId: 'cube',
      goal: world.goal,
      parameters: engine.parameters,
    }
    expect(MODELS.dynamics.predict(belief, 'left', 10, context)).toEqual(
      predictions.find((p) => p.action === 'left'),
    )
  })

  it('moves the cube to the goal with the selected route in authoritative Rapier physics', async () => {
    const engine = await create()
    engine.plan('dynamics', 10)
    engine.act()
    engine.step(600)
    expect(engine.state.success).toBe(true)
    expect(engine.state.goalDistance).toBeLessThan(0.2)
    expect(engine.metrics.collisionCount).toBe(0)
    expect(engine.metrics.comparedSamples).toBe(101)
    expect(engine.metrics.trajectoryError).toBeGreaterThan(0)
    expect(engine.metrics.finalStateError).not.toBeNull()
  })

  it('reports a physical collision when directly driving into the obstacle', async () => {
    const engine = await create()
    engine.predict('dynamics')
    engine.act('direct')
    engine.step(360)
    expect(engine.metrics.collisionCount).toBeGreaterThan(0)
    expect(engine.state.contacts).toContain('obstacle')
    expect(engine.state.success).toBe(false)
    expect(
      engine.state.objects.find((o) => o.id === 'cube')!.position[0],
    ).toBeLessThan(-0.9)
  })

  it('keeps the executed forecast paired with actual motion while another candidate is previewed', async () => {
    const engine = await create()
    engine.plan('dynamics')
    engine.act('left')
    engine.step(180)
    const before = engine.metrics
    engine.selectAction('direct')
    expect(engine.selectedAction).toBe('direct')
    expect(engine.comparisonPrediction!.action).toBe('left')
    expect(engine.metrics).toEqual(before)
    engine.step(60)
    const index = engine.currentFrame
    engine.step(60)
    engine.rewind(index)
    expect(engine.comparisonPrediction!.action).toBe('left')
  })

  it('computes aligned RMS error and ignores unmatched ticks', () => {
    const sample = (tick: number, x: number): TrajectorySample => ({
      tick,
      time: tick / 60,
      position: [x, 0, 0],
      velocity: [0, 0, 0],
    })
    const error = predictionError(
      {
        id: 'p',
        model: 'constant',
        action: 'wait',
        objectId: 'ball',
        startTick: 0,
        samples: [sample(0, 0), sample(6, 1)],
        score: 0,
        collision: false,
        goalDistance: 0,
      },
      [sample(0, 0), sample(3, 100), sample(6, 4)],
      { goalDistance: 2, success: false },
    )
    expect(error.comparedSamples).toBe(2)
    expect(error.positionError).toBe(3)
    expect(error.finalStateError).toBe(3)
    expect(error.trajectoryError).toBeCloseTo(Math.sqrt(4.5))
  })
})

describe('time travel and deterministic continuation', () => {
  it('retains the pre-action decision checkpoint when an action occurs at its exact tick', async () => {
    const engine = await create('surprise')
    const decision = structuredClone(engine.state)
    engine.act('direct')
    expect(engine.state.activeAction).toBe('direct')
    expect(
      engine.state.objects.find((o) => o.id === 'ball')!.velocity[0],
    ).toBeGreaterThan(
      decision.objects.find((o) => o.id === 'ball')!.velocity[0],
    )
    engine.rewind(0)
    expect(engine.state).toEqual(decision)
    expect(engine.state.activeAction).toBeNull()
  })

  it('restores complete physics, belief and controller state and repeats the same continuation', async () => {
    const engine = await create()
    engine.plan('dynamics')
    engine.act('left')
    engine.step(150)
    const index = engine.currentFrame
    const savedState = structuredClone(engine.state)
    const savedBelief = structuredClone(engine.belief)
    engine.step(180)
    const expectedState = structuredClone(engine.state)
    const expectedBelief = structuredClone(engine.belief)
    engine.rewind(index)
    expect(engine.state).toEqual(savedState)
    expect(engine.belief).toEqual(savedBelief)
    engine.step(180)
    expect(engine.state).toEqual(expectedState)
    expect(engine.belief).toEqual(expectedBelief)
    expect(engine.branches).toHaveLength(2)
  })

  it('preserves the collision future while a branch from the same starting snapshot succeeds', async () => {
    const engine = await create()
    engine.plan('dynamics')
    const startingState = structuredClone(engine.state)
    engine.act('direct')
    engine.step(600)
    const parent = structuredClone(engine.branches[0])
    engine.rewind(0)
    expect(engine.state).toEqual(startingState)
    engine.fork()
    engine.act('right')
    engine.step(600)
    expect(engine.state.success).toBe(true)
    expect(engine.branches[0]).toEqual(parent)
    expect(engine.branches[1].parentBranchId).toBe(parent.id)
    expect(engine.branches[1].forkTick).toBe(0)
    expect(engine.branches[1].actions).toEqual([{ tick: 0, action: 'right' }])
    expect(engine.branches[0].trajectory.at(-1)!.position[0]).toBeLessThan(-0.9)
    expect(engine.branches[1].trajectory.at(-1)!.position[0]).toBeGreaterThan(
      2.8,
    )
  })

  it('resets scenario, belief, predictions and history to reproducible initial state', async () => {
    const engine = await create('dynamics')
    const initial = structuredClone(engine.state)
    engine.predict('biased', 3)
    engine.step(180)
    engine.reset()
    expect(engine.state).toEqual(initial)
    expect(engine.predictions).toEqual([])
    expect(engine.timeline).toHaveLength(1)
    expect(engine.branches).toHaveLength(1)
    expect(engine.belief.tick).toBe(0)
  })
})

describe('dynamics and surprise', () => {
  it('retains a meaningful correction after the transient event and restores it with belief', async () => {
    const engine = await create('surprise')
    engine.step(60)
    engine.surprise()
    engine.step(1)
    const correction = structuredClone(engine.belief.lastCorrection!)
    expect(correction.objectId).toBe('ball')
    expect(correction.tick).toBe(61)
    expect(correction.error).toBeGreaterThan(0.015)
    expect(correction.reacquired).toBe(false)
    expect(correction.observed[2]).toBeGreaterThan(correction.expected[2])
    engine.step(5)
    const savedIndex = engine.currentFrame
    expect(engine.belief.lastCorrection).toEqual(correction)
    engine.step(24)
    expect(engine.belief.lastCorrection).toEqual(correction)
    engine.rewind(savedIndex)
    expect(engine.belief.lastCorrection).toEqual(correction)
  })

  it('runs a real rolling ball and compares it with an independently integrated prediction', async () => {
    const engine = await create('dynamics')
    engine.predict('dynamics', 3)
    engine.selectAction('wait')
    engine.step(180)
    const ball = engine.state.objects.find((o) => o.id === 'ball')!
    expect(ball.position[0]).toBeGreaterThan(-1)
    expect(ball.position.every(Number.isFinite)).toBe(true)
    expect(ball.position[1]).toBeGreaterThan(0.25)
    expect(engine.metrics.comparedSamples).toBe(31)
    expect(engine.metrics.trajectoryError).toBeGreaterThan(0)
  })

  it('makes an unpredicted intervention produce a measurable mismatch and a belief update', async () => {
    const engine = await create('surprise')
    engine.predict('dynamics', 3)
    engine.selectAction('wait')
    engine.step(60)
    const oldBelief = structuredClone(engine.belief)
    const oldPrediction = structuredClone(engine.predictions)
    engine.surprise()
    expect(engine.belief).toEqual(oldBelief)
    expect(engine.predictions).toEqual(oldPrediction)
    engine.step(60)
    expect(engine.metrics.positionError).toBeGreaterThan(1)
    expect(
      engine.belief.objects.find((o) => o.id === 'ball')!.velocity[2],
    ).toBeGreaterThan(1)
  })
})

describe('comparative forecast experiment', () => {
  it('requires a forecast origin and clears analysis on reset', async () => {
    const engine = await create()
    expect(engine.analyze()).toBeUndefined()
    expect(engine.analysisErrors).toBeUndefined()
    engine.plan('dynamics', 2)
    engine.analyze()
    expect(engine.analysis).toBeDefined()
    engine.reset()
    expect(engine.analysis).toBeUndefined()
    expect(engine.analysisErrors).toBeUndefined()
  })

  it('compares all three models from the same frozen belief, action and horizon', async () => {
    const engine = await create('dynamics')
    engine.step(60)
    const belief = structuredClone(engine.belief)
    const world = structuredClone(engine.state)
    const parameters = structuredClone(engine.parameters)
    engine.predict('biased', 2)
    engine.selectAction('wait')
    const analysis = engine.analyze(0.4)!
    expect(analysis.originTick).toBe(60)
    expect(analysis.originTime).toBe(1)
    expect(analysis.action).toBe('wait')
    expect(analysis.horizon).toBe(2)
    expect(analysis.origin.belief).toEqual(belief)
    expect(analysis.origin.context.parameters).toEqual(parameters)
    expect(Object.isFrozen(analysis.origin.belief.objects)).toBe(true)
    for (const model of ['constant', 'dynamics', 'biased'] as const) {
      const forecast = analysis.forecastByModel[model]
      expect(forecast).toEqual(
        MODELS[model].predict(belief, 'wait', 2, {
          scenario: 'dynamics',
          focusObjectId: 'ball',
          goal: world.goal,
          parameters,
        }),
      )
      expect(forecast.samples).toHaveLength(21)
      expect(forecast.samples[0].tick).toBe(60)
      expect(forecast.samples.at(-1)!.tick).toBe(180)
    }
    expect(engine.state).toEqual(world)
    expect(engine.belief).toEqual(belief)
    expect(engine.parameters).toEqual(parameters)
  })

  it('keeps the experiment origin and executed action after hidden reality changes or preview selection changes', async () => {
    const engine = await create('occlusion')
    engine.step(160)
    expect(engine.belief.objects.find((o) => o.id === 'ball')!.visible).toBe(
      false,
    )
    engine.predict('dynamics', 3)
    engine.selectAction('wait')
    const before = structuredClone(engine.analyze(0.5)!)
    engine.act('wait')
    engine.surprise()
    engine.step(18)
    engine.selectAction('right')
    const after = engine.analyze(0.5)!
    expect(after).toEqual(before)
    expect(engine.state.tick).toBe(178)
    expect(after.originTick).toBe(160)
    expect(after.action).toBe('wait')
    expect(
      engine.belief.objects.find((o) => o.id === 'ball')!.position,
    ).not.toEqual(engine.state.objects.find((o) => o.id === 'ball')!.position)
  })

  it('re-pairs an existing experiment with the actually committed action, then ignores previews', async () => {
    const engine = await create()
    engine.plan('dynamics', 4)
    engine.analyze(0.3)
    expect(engine.analysis!.action).toBe('left')
    engine.act('right')
    expect(engine.analysis!.action).toBe('right')
    for (const forecast of Object.values(engine.analysis!.forecastByModel))
      expect(forecast.action).toBe('right')
    engine.step(6)
    engine.selectAction('direct')
    expect(engine.analyze(0.7)!.action).toBe('right')
    expect(engine.analysis!.originTick).toBe(0)
  })

  it('makes all nine zero-spread members exactly equal to the declared dynamics forecast', async () => {
    const engine = await create('dynamics')
    engine.predict('dynamics', 3)
    const bundle = engine.analyze(0)!
    expect(bundle.ensemble.members).toHaveLength(9)
    for (const member of bundle.ensemble.members) {
      expect(member.prediction).toEqual(bundle.forecastByModel.dynamics)
      expect(member.parameters).toEqual(bundle.ensemble.members[0].parameters)
    }
    for (const [minimum, maximum] of Object.values(bundle.ensemble.ranges))
      expect(minimum).toBe(maximum)
  })

  it('samples explicit deterministic one-parameter bounds and shows actual sensitivity without changing physics', async () => {
    const engine = await create('dynamics')
    engine.configure({ friction: 0.05 })
    engine.predict('dynamics', 3)
    const originalWorld = structuredClone(engine.state)
    const originalBelief = structuredClone(engine.belief)
    const bundle = engine.analyze(1)!
    expect(bundle.ensemble.ranges.velocityOffsetX).toEqual([-0.4, 0.4])
    expect(bundle.ensemble.ranges.driveSpeedScale).toEqual([0.75, 1.25])
    expect(bundle.ensemble.ranges.dragScale).toEqual([0.4, 1.6])
    expect(bundle.ensemble.ranges.friction).toEqual([0, 0.25])
    const centre = bundle.ensemble.members[0]
    for (const member of bundle.ensemble.members.slice(1)) {
      const changed = (
        Object.keys(member.parameters) as (keyof typeof member.parameters)[]
      ).filter((key) => member.parameters[key] !== centre.parameters[key])
      expect(changed).toHaveLength(1)
    }
    const lower = bundle.ensemble.members.find(
      (member) => member.id === 'velocityOffsetX-low',
    )!
    const upper = bundle.ensemble.members.find(
      (member) => member.id === 'velocityOffsetX-high',
    )!
    expect(upper.prediction.samples.at(-1)!.position[0]).toBeGreaterThan(
      lower.prediction.samples.at(-1)!.position[0] + 0.2,
    )
    expect(engine.analyze(1)).toEqual(bundle)
    expect(engine.state).toEqual(originalWorld)
    expect(engine.belief).toEqual(originalBelief)
    expect(engine.parameters.friction).toBe(0.05)
  })

  it('aligns model errors with actual ticks and never includes the saved future after rewind', async () => {
    const engine = await create()
    engine.plan('dynamics', 3)
    engine.analyze()
    engine.act()
    engine.step(120)
    const results = engine.analysisErrors!
    expect(results.throughTick).toBe(120)
    for (const model of ['constant', 'dynamics', 'biased'] as const) {
      const result = results.byModel[model]
      expect(result.points).toHaveLength(21)
      expect(result.metrics.comparedSamples).toBe(21)
      expect(result.metrics.finalStateError).toBeNull()
      expect(result.points.every((point) => point.tick <= 120)).toBe(true)
      const expectedRms = Math.sqrt(
        result.points.reduce((sum, point) => sum + point.error ** 2, 0) /
          result.points.length,
      )
      expect(result.metrics.trajectoryError).toBeCloseTo(expectedRms, 12)
    }
    expect(results.byModel.dynamics.metrics.trajectoryError!).toBeLessThan(
      results.byModel.constant.metrics.trajectoryError!,
    )
    expect(results.byModel.dynamics.metrics.trajectoryError!).toBeLessThan(
      results.byModel.biased.metrics.trajectoryError!,
    )
    engine.rewind(7)
    expect(engine.actualTrajectory.at(-1)!.tick).toBe(120)
    expect(engine.analysisErrors!.throughTick).toBe(42)
    for (const result of Object.values(engine.analysisErrors!.byModel)) {
      expect(result.points).toHaveLength(8)
      expect(result.points.at(-1)!.tick).toBe(42)
      expect(result.metrics.comparedSamples).toBe(8)
    }
  })

  it('samples a forecast started between regular checkpoints at matching future ticks', async () => {
    const engine = await create()
    engine.step(1)
    engine.plan('dynamics', 2)
    engine.analyze()
    engine.act()
    engine.step(60)
    expect(engine.analysis!.originTick).toBe(1)
    expect(engine.state.tick).toBe(61)
    for (const result of Object.values(engine.analysisErrors!.byModel)) {
      expect(result.points).toHaveLength(11)
      expect(result.points[0].tick).toBe(1)
      expect(result.points.at(-1)!.tick).toBe(61)
      expect(result.points.every((point) => (point.tick - 1) % 6 === 0)).toBe(
        true,
      )
    }
  })

  it('restores analysis origin and spread and prevents mutation leaking between shared snapshots', async () => {
    const engine = await create()
    engine.plan('dynamics', 4)
    const original = structuredClone(engine.analyze(0.2)!)
    engine.act()
    engine.step(120)
    const savedIndex = engine.currentFrame
    engine.step(6)
    engine.analyze(0.9)
    expect(engine.analysis!.ensemble.spread).toBe(0.9)
    engine.rewind(savedIndex)
    expect(engine.analysis).toEqual(original)
    expect(() => {
      engine.analysis!.ensemble.members[0].prediction.samples[0].position[0] = 123
    }).toThrow(TypeError)
    const child = engine.fork()
    engine.analyze(0.8)
    engine.switchBranch('branch-0', savedIndex)
    expect(engine.analysis).toEqual(original)
    engine.switchBranch(child.id)
    expect(engine.analysis!.ensemble.spread).toBe(0.8)
    expect(engine.analysis!.originTick).toBe(0)
  })

  it('switches between retained successful and colliding realities with their corresponding forecasts', async () => {
    const engine = await create()
    engine.plan('dynamics', 10)
    engine.analyze(0.5)
    engine.act('left')
    engine.step(600)
    const success = structuredClone(engine.state)
    engine.rewind(0)
    engine.act('direct')
    const collisionId = engine.currentBranchId
    engine.step(300)
    const collision = structuredClone(engine.state)
    const histories = structuredClone(engine.branches)
    engine.switchBranch('branch-0')
    expect(engine.state).toEqual(success)
    expect(engine.state.success).toBe(true)
    expect(engine.analysis!.action).toBe('left')
    engine.switchBranch(collisionId)
    expect(engine.state).toEqual(collision)
    expect(engine.metrics.collisionCount).toBeGreaterThan(0)
    expect(engine.analysis!.action).toBe('direct')
    expect(engine.branches).toEqual(histories)
    engine.switchBranch('branch-0', 0)
    expect(engine.state.tick).toBe(0)
    expect(engine.state.activeAction).toBeNull()
    expect(() => engine.switchBranch('missing')).toThrow(
      'Unknown or expired branch',
    )
  })
})
