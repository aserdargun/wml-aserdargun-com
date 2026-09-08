# WML architecture

WML separates the simulated world, the agent's information, imagined trajectories, and the commands executed in reality. The renderer consumes plain typed state; Three.js objects do not own simulation state.

```text
Rapier reality → camera observation + proprioception → belief memory
                                                        ↓
                                             educational predictor
                                                        ↓
                                             four candidate futures
                                                        ↓
                                           finite search / selection
                                                        ↓
                                      controller command → Rapier reality
```

## Modules

| Module                    | Responsibility                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| `src/core/types.ts`       | World objects, observations, belief, actions, trajectories, branches and adapter contract |
| `src/core/engine.ts`      | Owns Rapier, fixed steps, controller, snapshots and public laboratory API                 |
| `src/core/observation.ts` | Sensor visibility and memory updates                                                      |
| `src/core/models.ts`      | Independent approximate predictors; never imports Rapier                                  |
| `src/core/metrics.ts`     | Error between actual and predicted samples at matching ticks                              |
| `src/core/analysis.ts`    | Frozen comparative forecasts, declared sensitivity samples and per-model error series     |
| `src/core/scenarios.ts`   | Scenario metadata, declared route commands and shared constants                           |

`LabEngine.create(id)` initializes Rapier once. `state`, `observation` and `belief` are cached plain objects, refreshed when the engine steps or changes state. Consumers treat these objects as read-only. Render frames can read them without querying the physics engine again.

## Reality and control

Rapier is authoritative for positions, rotations, velocities and physical contacts. The engine advances exactly `1/60` second per step, independently of render frequency. The UI may perform several steps per rendered frame. World coordinates use metres, seconds, kilograms and Y-up. The sensor FOV, sensor yaw and ramp slope controls use **degrees**.

The planning cube uses an explicit assisted planar pusher. A velocity servo accelerates it by at most 6 m/s² per horizontal axis toward a route command, with a target speed capped at 1.6 m/s. Rapier resolves cube–obstacle contacts. Cube rotation and vertical translation are constrained. The robot is a sensor collider that follows behind the cube as a visual proxy; it does not physically push through a simulated manipulator. This is a control abstraction, not a robotics manipulation benchmark.

The ball is a dynamic sphere. The dynamics experiment adds a rotated physical ramp. The occlusion experiment uses zero friction and zero linear damping to maintain a clear, simple horizontal trajectory. The surprise control introduces a real impulse without first updating the estimator or its existing forecast.

Scenario initialization is fixed, with seed metadata `42`; current scenarios do not draw random numbers. Snapshot continuation is tested for exact equality in the same installed runtime. Cross-browser, cross-CPU and future engine-version bitwise determinism are not promised.

## Observation and belief

The camera checks horizontal FOV, a 12 m range, and object-center line of sight against axis-aligned panels and obstacles. Robot pose is available as proprioception. Floor geometry is omitted from observed object tables. A goal location is an explicit public task command, even if its marker is hidden.

Visible objects provide idealized position and velocity measurements. This exposes the sensing boundary without implementing image recognition or noisy velocity estimation. It is not a learned camera pipeline. Object-center visibility is coarser than pixel-accurate partial visibility.

Belief is initialized empty and populated only from observations. Hidden dynamic objects advance by dead reckoning from their last estimated position and velocity. Unknown objects remain absent. An unexpected impulse on a hidden object does not update its belief. Reacquisition replaces the estimate with a measurement.

The `confidence` field decays as `exp(-0.22 × hidden seconds)`, with a display floor of 0.05. It is a memory freshness weight, not a calibrated probability. `innovation` is the largest distance between a propagated dynamic-object estimate and its new visible measurement at that observation.

`lastCorrection` retains the last meaningful dynamic-object update: its tick, object, expected and observed positions, error, and whether the object was reacquired. Reacquisition is recorded even with zero error; other corrections require more than 0.015 m of innovation. Small ongoing integration drift does not continuously replace this teaching moment. The field is part of belief and therefore restores with snapshots.

## Prediction and planning

Predictors integrate separately from Rapier. Constant velocity ignores future drive commands, forces and collisions. Simple dynamics approximates ball motion and cube route following, with box collision checks against **believed** obstacles. Biased dynamics intentionally uses slower drive, stronger drag and a smaller ramp angle.

The finite planner scores four complete command candidates: direct, left detour, right detour and wait. Lower score is better:

```text
score = 10 × final planar goal distance
      + 30 × predicted collision indicator
      + 0.08 × predicted path length
```

The weights are declared educational preferences, not learned rewards or physical units. `plan()` changes neither world time nor reality. `act()` executes the selected allowed command. A chosen forecast is retained as `comparisonPrediction`, so previewing a different candidate during motion cannot silently change the reported execution error.

## Comparative experiments and sensitivity

Every `predict()` or `plan()` captures an immutable `ForecastOrigin`: the current belief, declared model context and horizon. `analyze(spread)` evaluates all three adapters with **the same saved belief, action and horizon**. Calling it after reality moves still uses that origin. The bundle includes the complete `origin`, plus `originTick`, `originTime`, `action`, `horizon` and `forecastByModel` so the experiment remains inspectable and exportable.

An existing analysis follows the action actually committed by `act()`. Merely selecting another preview cannot relabel an executed experiment. A fresh prediction deliberately replaces the origin and clears the old analysis; reset clears both. The frozen origin and analysis are included in snapshots. Their nested objects and arrays are frozen, allowing safe reference sharing between checkpoints. UI code must copy arrays before sorting them.

The sensitivity ensemble contains nine deterministic simple-dynamics forecasts: the declared centre and one lower/upper probe for each of four parameters. Only one parameter changes per probe. For spread `s` in `[0, 1]`, the declared bounds are:

| Parameter                 | Bounds                                          | Meaning                                              |
| ------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| Initial X velocity offset | `[-0.4s, +0.4s]` m/s                            | Added to the saved believed velocity                 |
| Drive speed multiplier    | `[1 − 0.25s, 1 + 0.25s]`                        | Scales the predictor's cube speed limit              |
| Drag multiplier           | `[1 − 0.6s, 1 + 0.6s]`                          | Scales the predictor's horizontal ball damping       |
| Friction assumption       | configured friction `±0.2s`, clipped to `[0,1]` | Changes the predictor's friction-dependent drag term |

These are **parameter sensitivity samples**, not draws from a learned distribution, confidence intervals, coverage guarantees or probabilities. They omit joint parameter combinations. Some parameters do not affect some scenarios: cube predictions do not use ball drag, and the idealized occlusion model has zero drag. Corresponding paths may coincide. At zero spread, all nine forecasts are exactly equal to the declared dynamics forecast. No spread is added artificially to their geometry.

The sensitivity module reads the saved belief and declared context only; it neither consults hidden physical state nor changes the actual world's parameters. Parameter values and trajectories are returned together for inspection.

## Timeline and branches

Snapshots contain Rapier's binary world snapshot plus plain authoritative state, observation, belief memory, controller waypoint, prediction set, selected/committed forecast, frozen forecast origin and analysis, parameters, contact state, collision count and action history. Restoring a snapshot restores the physics engine rather than moving meshes.

Normal snapshots occur every six physics ticks (10 Hz); control operations may also preserve an exact intermediate state. A forecast that starts between global checkpoints adds checkpoints at its own six-tick intervals, so its samples can be compared without interpolation. Each branch retains at most 451 frames and the session retains at most six branches; extra checkpoints can shorten the retained time span. The oldest eligible branch is evicted when that bound is exceeded. History is in memory only and resets with the scenario.

Rewinding selects an existing checkpoint. Stepping or acting from an earlier checkpoint automatically creates a branch, preserving the parent's recorded future. `fork()` makes that choice explicit. Snapshot prefixes can be shared because they are immutable; subsequent frames belong to the new branch. A branch stores its parent ID, fork tick, actions and actual trajectory. A retained parent trajectory represents what happened in that branch, including its future relative to a rewound cursor.

An action or impulse issued exactly at a decision checkpoint does not overwrite that pre-action checkpoint. Rewinding immediately to it restores the state before the command; the following sampled checkpoint includes the resulting controller and physics state. Forking explicitly after the command can capture that exact post-command state. This convention preserves the decision point needed to compare alternative actions.

`switchBranch(id, frameIndex?)` restores another retained branch's last checkpoint or an explicitly requested checkpoint, including its controller, belief and forecasts. Inspecting a branch does not delete either history. Continuing from one of its earlier checkpoints still creates a new branch. Unknown or evicted branch IDs are rejected explicitly.

## Metrics

Predicted and actual trajectories are sampled at matching simulation ticks. Position error is the latest Euclidean distance; trajectory error is the RMS of those distances; final-state error is available only after the forecast endpoint has been observed. Missing samples are not interpolated or fabricated. Zero initial error is a valid measured comparison, not evidence of perfect prediction.

Goal distance is planar. Planning success means the cube centre is within 0.35 m of the commanded target. Collision count records the beginning of obstacle/panel contact episodes; ordinary floor contact does not count as a collision failure.

`analysisErrors` contains one Euclidean error series and the same summary metrics for each model, plus `throughTick`. It compares only actual samples at or before the current cursor. A parent's stored future does not contribute after rewind. Ranking models by observed RMS error is specific to this action, scenario, origin and elapsed horizon; it does not establish that one model is universally better.

## Spatial rendering

`Microverse.tsx` composes procedural studio lighting, the instrument deck, state-driven bodies, predictions and spectator cameras. `LaboratoryAssets.tsx` owns the bevelled deck and robot detail; repeated bolts, tyre treads and hardware use instanced meshes. A local canvas texture carries metre markings. Neither asset adds physics bodies. The deck's contact surface remains x±5.6, z±4.6, y=0; the lower frame and feet are visual detail. The robot's mesh origin is offset vertically to place its tyres on the ground while its recorded pose remains authoritative.

`WorldBodies.tsx` reads real state for Reality and visible Observation bodies, and estimated state for Belief bodies. Belief uses translucent surfaces, edges and memory labels. `FutureTrails.tsx` draws full predicted paths and object-sized ghost markers at the closest stored forecast sample to the separate 3D time cursor. Ghosts do not integrate physics or represent probability. Their orientation is illustrative; prediction samples do not contain future rotations. Scene beacons select candidate previews; only Act commits a command.

Actual and alternate-branch traces are evaluator information and render only in Reality/Imagination. Observation/Belief views omit these privileged traces, so an occluded object's actual motion cannot be revealed through its history line. Numerical comparison charts retain their explicitly labelled evaluator role.

`SceneCamera.tsx` provides studio, overhead and close-up spectator views. Close-up follows the focus object; in agent views its target comes from belief rather than hidden physical state. Camera changes never affect the agent sensor. Manual orbit interrupts an easing transition, and reduced-motion users get immediate camera changes. The expanded scene remains in the page, with action and timeline controls available beneath it.

The canvas uses demand rendering when idle. Active physics and camera transitions request frames; it has no perpetual decorative animation. Physics still advances through the independent fixed-step engine. Shadow resolution is 1024² for ordinary/narrow scenes and 2048² for scenes wider than 1024 px. DPR is capped at 1.5. The static studio is memoized so routine simulation updates cannot recapture its reflection environment; fixed forecast line geometry is cached until the forecast changes. No remote model, HDR image or 3D asset request is required. These choices are bounded rendering costs, not a claim of a universal frame rate.

## Adding a scenario

1. Add a `ScenarioId` and a typed entry in `SCENARIOS`, including focus object, goal, allowed actions and parameter defaults.
2. Add its compact physical geometry in `LabEngine.createScene()`. Keep physics ownership in the engine.
3. Define sensing orientation and any new occluder geometry in `observe()`. Preserve the observation-only belief boundary.
4. Add explicit model assumptions if the new experiment needs different approximate dynamics. Do not call the real simulator to create its predictions.
5. Add the scenario's UI explanation and visual labels, then a targeted test of its educational claim and reset/restore behavior.

The current four scene constructions live together intentionally. Extract a scenario factory when additional scenarios justify it; avoid duplicating world ownership or building a generic scene framework prematurely.

## Verification

`tests/core.test.ts` covers FOV and occlusion, hidden-state isolation, memory reacquisition, independent action-conditioned predictions, finite planner selection, physical collision and goal success, aligned error, retained forecast pairing, exact snapshot continuation, distinct counterfactual histories, reset, ramp dynamics and surprise updates. Comparative tests also verify a common frozen origin, commitment despite preview changes, exact zero-spread equality, deterministic parameter bounds, tick-aligned error curves, cursor filtering, immutable snapshot sharing and branch switching. Browser QA must additionally verify that rendered state follows restored authoritative state and that the flagship UI completes the plan–act–rewind–branch flow.
