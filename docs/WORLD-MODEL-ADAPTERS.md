# World-model adapters

WML's initial adapters are transparent educational predictors, not learned foundation models. They run locally without accounts, remote APIs, training or network inference. Their purpose is to make the relationship between observations, internal estimates, imagined outcomes and execution visible.

The exported `WorldModelAdapter` contract is in `src/core/types.ts`:

```ts
interface WorldModelAdapter {
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
```

The sensor and encoder hooks share WML's default implementation. The engine uses these common functions to maintain one consistent belief across model comparisons. A future adapter with a different encoder must explicitly integrate that encoder into the engine; changing the hook alone does not change current engine sensing. `predict()` and `rollout()` receive belief and declared experiment context, never a Rapier world, body handle or snapshot.

## Data boundaries

- `Observation` contains only sensed objects, visibility IDs, camera configuration and sample time. Robot pose is included as proprioception.
- `BeliefState` contains observed and remembered object estimates. An object never observed remains absent. Hidden entities are dead reckoned from memory.
- `ModelContext` contains the scenario, focus-object ID, public goal and declared parameter settings. Parameters are controls, not secretly recovered future reality.
- `Prediction` identifies its model, action, focus object and starting tick. Samples contain absolute simulation ticks/times, positions and velocities. It also reports the candidate's goal distance, predicted collision and score.

The initial state measurements are idealized. Learning how to infer object state from images is outside this implementation. Human-readable object tables are an educational representation; a real learned model may use a latent state with no directly interpretable dimensions.

## Included adapters

| Adapter           | Uses                                                                                              | Omits or deliberately changes                                           |
| ----------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Constant velocity | Last measured/remembered position and velocity                                                    | Forces, floor constraints, obstacles and drive commands                 |
| Simple dynamics   | Approximate rolling acceleration, drag, floor response, route commands and believed box obstacles | Full contact solver, precise contact geometry and physical manipulation |
| Biased dynamics   | Same structural approximation                                                                     | Underestimates ramp slope and drive speed; exaggerates drag             |

Approximate predictors integrate at 1/60 s and return samples every 0.1 s. Horizons are bounded to 0.1–20 s. No adapter accesses future simulator state. Even the stronger predictor should exhibit error because its integration and controller assumptions differ from Rapier's reality.

## Meaning of action and rollout

An `ActionId` names a whole declared route command, not a single low-level motor pulse. The direct and two detour commands become waypoint sequences for the planning cube. For the ball, commands specify one velocity-change impulse; wait adds no impulse. Constant velocity intentionally ignores those future commands, exposing that baseline's limitation.

The current `rollout()` evaluates **alternative complete commands from the same initial belief**. Its array argument is a candidate set, not a sequential composition. Supporting multi-step action sequences later requires an explicit sequence type and propagation of the predicted state between steps. Do not silently reinterpret existing candidate arrays as a temporal sequence.

The planner is separate from the adapter. It evaluates the finite allowed candidate set using the declared distance, collision and path-length score, then selects the lowest score. No claim of globally optimal planning or general-purpose intelligence follows from this search.

## Execution and evaluation

`engine.predict(model, horizon)` generates the four candidate futures. `engine.plan(model, horizon)` also chooses a candidate without moving reality. `engine.selectAction(action)` changes the preview. `engine.act(action)` commits a forecast to execution and starts the physical command.

`engine.comparisonPrediction` identifies the forecast currently paired with the actual trace. During execution it remains fixed if another candidate is merely previewed. `engine.metrics` compares only matching simulation ticks. A fresh prediction establishes a new forecast origin; an unexpected impulse leaves the old forecast intact so the mismatch can be measured.

Time-travel snapshots retain the belief, prediction set and comparison forecast. Counterfactual predictions therefore start from the information available at the restored time, rather than today's hidden reality.

`engine.canAct` requires a sampled forecast from the current tick and decision. Executing an action, applying an intervention, or changing the sensor makes it stale even if the tick is unchanged. The UI disables Act until Predict or Plan refreshes the decision. A stale existing forecast also rejects `engine.act()` at the core boundary. Direct actuator calls without any forecast remain available to simulation tests. Forecast arrays are deeply frozen so a preview cannot mutate another branch's saved evidence.

`SCHEMA_VERSIONS` in `types.ts` declares world/scenario v1, predictor/comparison/branch v2 and export v2. `wml-experiment-v2` exports those versions plus recorded surprise impulses. For the active branch, actions and interventions reflect the restored cursor, including the distinction before and after an action at the same tick. Other branches are explicitly retained alternatives. This report remains an evidence export, not an importable physics replay.

## Fair comparisons from a frozen origin

Each new forecast saves `ForecastOrigin { belief, context, horizon }`. `engine.analyze(spread = 0.5)` returns an `AnalysisBundle`, or `undefined` if no forecast origin exists. It calls every adapter with independent copies of **the same saved belief, action and horizon**, rather than allowing the later models to see later reality. The saved origin remains unchanged when actual physics advances or an unexpected intervention occurs.

```ts
engine.plan('dynamics', 10)
const analysis = engine.analyze(0.5)
// analysis.forecastByModel.constant / dynamics / biased
// analysis.ensemble.members: nine named parameter probes
engine.act() // pairs the experiment with the command actually executed
engine.step(60)
const errors = engine.analysisErrors
// errors.byModel.dynamics.points: { tick, time, error }[]
// errors.byModel.dynamics.metrics: PredictionError
```

The engine exposes `analysis` and `analysisErrors` getters. `AnalysisBundle` carries the full frozen `origin`, `originTick`, `originTime`, `action`, `horizon`, `forecastByModel` and `ensemble`. Preview selection does not change the committed experiment; `act()` re-pairs an existing analysis when a different action is actually executed. Requesting a new prediction establishes a new origin and clears the previous analysis.

Error curves use actual samples at matching absolute ticks and never include samples after the current timeline cursor. They report Euclidean position error in metres. Their RMS summaries can be used to rank the models **for the observed portion of this experiment**; ties or absent data are valid outcomes. Calling analysis before execution does not manufacture a measured winner.

The displayed minimum-RMSE conclusion includes all models within an absolute tolerance of 10⁻⁶ m of the minimum. This declared numerical tie tolerance is not a statistical significance test. It avoids presenting sub-micrometre floating-point differences as a unique winner; exports retain the unrounded measured values.

## Declared parameter sensitivity

The ensemble always uses the simple-dynamics adapter. It contains the centre plus lower/upper probes of initial X velocity, drive speed, drag and friction, changing one parameter at a time. `ensemble.ranges` gives the numeric bounds; each member includes its exact `parameters` and `prediction`. Spread is clamped to `[0,1]`. Zero spread produces nine identical predictions.

The velocity probe perturbs the **saved believed** X velocity, not actual hidden velocity. `ModelContext.assumptions` optionally contains `driveSpeedScale` and `dragScale`, applied only by approximate prediction. Friction probes change the copied model parameters. None of these modify Rapier. The physical parameter controls instead start a fresh scenario, which clears the old experiment.

These samples expose sensitivity to explicit assumptions. They are not probabilities, a calibrated uncertainty model or confidence intervals. They do not explore joint parameter interactions. It is scientifically valid for several paths to overlap when the changed parameter does not affect that scenario. The complete bounds and omission notes are in `ARCHITECTURE.md`.

Origins and analysis bundles are deeply frozen. Store new output objects instead of mutating them, and copy arrays before sorting. Snapshots restore both; `switchBranch(id, frameIndex?)` retrieves another retained branch with its own analysis and execution state.

## Adding an adapter

1. Extend `ModelId` and register metadata and implementation in `MODELS`.
2. Implement `predict()` as a pure function of belief, action, horizon and explicit context. Return an empty sample array if the required object is unknown; do not fill it from reality.
3. State the units, parameter assumptions, supported actions and omitted mechanisms in its description and documentation.
4. Implement candidate rollouts and keep scoring visible. If using a different scorer, explain its terms and direction.
5. Test that predictions leave the input belief and live world unchanged, differ where action conditioning matters, and produce aligned metrics after actual execution.
6. Add the UI option and scientific explanation. Check rewind/branch behavior with the new adapter.

A learned or remote adapter can later use this boundary, but asynchronous inference would require an explicit async contract, cancellation, origin-tick validation and deterministic serialization of outputs. Those integrations are intentionally not implemented. Do not label parameter perturbations as probabilities without a defined probabilistic model, or invent semantic labels for arbitrary latent coordinates.
