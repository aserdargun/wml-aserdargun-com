import { afterEach, describe, expect, it } from 'vitest'
import { LabEngine, lowestRmseModels } from '../src/core'

const engines: LabEngine[] = []
async function create(scenario: 'planning' | 'surprise' = 'planning') {
  const engine = await LabEngine.create(scenario)
  engines.push(engine)
  return engine
}
afterEach(() => engines.splice(0).forEach(engine => engine.dispose()))

describe('decision and branch integrity', () => {
  it('restores an immediate action and impulse without losing the pre-action checkpoint', async () => {
    const engine = await create('surprise')
    engine.predict()
    const decision = structuredClone(engine.state)
    engine.act('direct')
    engine.surprise()
    const executed = structuredClone(engine.state)
    const child = engine.fork()
    engine.switchBranch('branch-0')
    expect(engine.state).toEqual(executed)
    engine.switchBranch(child.id)
    expect(engine.state).toEqual(executed)
    engine.rewind(0)
    expect(engine.state).toEqual(decision)
    expect(engine.actualTrajectory.filter(s => s.tick === 0)).toHaveLength(1)
    expect(engine.actualTrajectory[0].velocity).toEqual(decision.objects.find(o => o.id === 'ball')!.velocity)
  })

  it('requires a new forecast after a same-tick action, sensor change or surprise', async () => {
    const engine = await create()
    engine.plan()
    expect(engine.canAct).toBe(true)
    engine.configure({ sensorYaw: 10 })
    expect(engine.canAct).toBe(false)
    expect(() => engine.act()).toThrow(/fresh forecast/i)
    engine.plan()
    expect(engine.canAct).toBe(true)
    engine.act()
    expect(engine.canAct).toBe(false)
    expect(() => engine.act()).toThrow(/fresh forecast/i)
    engine.predict()
    engine.surprise()
    expect(engine.canAct).toBe(false)
    engine.rewind(0)
    expect(engine.canAct).toBe(true)
  })

  it('does not poison physics with non-finite parameters or alter history on a zero step', async () => {
    const engine = await create()
    const parameters = structuredClone(engine.parameters)
    expect(() => engine.configure({ friction: NaN, sensorYaw: Infinity, slope: -Infinity })).toThrow(RangeError)
    expect(engine.parameters).toEqual(parameters)
    engine.step(12)
    engine.rewind(0)
    engine.step(0)
    engine.step(NaN)
    expect(engine.branches).toHaveLength(1)
    expect(engine.state.tick).toBe(0)
    expect(() => engine.rewind(NaN)).toThrow(RangeError)
    expect(engine.state.tick).toBe(0)
  })

  it('keeps saved predictions immutable across shared branches', async () => {
    const engine = await create()
    engine.plan()
    expect(() => { engine.predictions[0].samples[0].position[0] = 999 }).toThrow(TypeError)
  })

  it('reports all tied models without manufacturing a winner for a stationary experiment', async () => {
    const engine = await create()
    engine.predict()
    engine.selectAction('wait')
    engine.analyze()
    expect(lowestRmseModels(engine.analysisErrors)).toEqual([])
    engine.act('wait')
    engine.step(60)
    expect(lowestRmseModels(engine.analysisErrors)).toEqual(['constant', 'dynamics', 'biased'])
  })
})
