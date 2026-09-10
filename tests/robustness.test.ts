import { afterEach, describe, expect, it } from 'vitest'
import { LabEngine, MODELS } from '../src/core'
const engines: LabEngine[] = []
async function create() {
  const engine = await LabEngine.create('surprise')
  engines.push(engine)
  return engine
}
afterEach(() => engines.splice(0).forEach(e => e.dispose()))
describe('experiment integrity at boundary inputs and checkpoints', () => {
  it('does not fork or commit an action for zero, negative or non-finite steps', async () => {
    const e = await create()
    e.predict(); e.step(12); e.rewind(0)
    const before = structuredClone(e.state)
    for (const count of [0, -1, NaN, -Infinity]) e.step(count)
    expect(e.branches).toHaveLength(1)
    expect(e.state).toEqual(before)
  })
  it('rejects non-finite physical inputs before any state mutation', async () => {
    const e = await create()
    const before = structuredClone(e.state)
    const params = structuredClone(e.parameters)
    expect(() => e.configure({ friction: NaN, sensorYaw: 45 })).toThrow()
    expect(e.parameters).toEqual(params)
    expect(e.state).toEqual(before)
    expect(() => e.configure({ initialVelocity: Infinity })).toThrow()
  })
  it('rejects an invalid rewind without freeing the live physics world', async () => {
    const e = await create()
    expect(() => e.rewind(NaN)).toThrow()
    e.step(6)
    expect(e.state.tick).toBe(6)
  })
  it('keeps the exact parent state when forking between periodic checkpoints', async () => {
    const e = await create()
    e.step(5)
    const parent = structuredClone(e.state)
    e.fork(); e.act('left'); e.step(6)
    e.switchBranch('branch-0')
    expect(e.state).toEqual(parent)
  })
  it('retains a pre-action decision made between periodic checkpoints', async () => {
    const e = await create()
    e.step(5)
    const before = structuredClone(e.state)
    e.act('direct'); e.step(7)
    const index = e.timeline.findIndex(s => s.tick === 5)
    expect(index).toBeGreaterThanOrEqual(0)
    e.rewind(index)
    expect(e.state).toEqual(before)
  })
  it('keeps the pre-action checkpoint after preview and comparison changes', async () => {
    const e = await create()
    e.plan()
    const decision = structuredClone(e.state)
    e.act('direct'); e.selectAction('left'); e.analyze()
    e.rewind(0)
    expect(e.state).toEqual(decision)
    expect(e.currentActions).toEqual([])
  })
  it('restores an immediate impulse when switching away and back without advancing time', async () => {
    const e = await create()
    e.fork(); e.act('direct')
    const committed = structuredClone(e.state)
    e.switchBranch('branch-0'); e.switchBranch('branch-1')
    expect(e.state).toEqual(committed)
    expect(e.currentActions).toEqual([{ tick: 0, action: 'direct' }])
  })
  it('normalizes a non-finite horizon even when an adapter is used directly', async () => {
    const e = await create()
    const context = { scenario: e.state.scenario, focusObjectId: 'ball', goal: e.state.goal, parameters: e.parameters }
    const forecast = MODELS.dynamics.predict(e.belief, 'wait', NaN, context)
    expect(forecast.samples).toHaveLength(101)
    expect(forecast.samples.at(-1)!.time).toBe(10)
  })
})
