# Scientific integrity

## What each system means

| Term                | WML implementation                                                                              | Boundary                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Reality / simulator | Rapier world plus explicit scenario and control rules                                           | An educational universe, not engineering validation of physical hardware     |
| Physics engine      | Rapier integrates rigid bodies and resolves contacts at 60 Hz                                   | Numerical approximations; constrained planar cube                            |
| Observation         | Ideal object pose/velocity measurements gated by horizontal FOV, range and center-ray occlusion | No learned vision; perfect measurements only for the visible set             |
| Belief              | Observations plus dead-reckoned memory                                                          | Never seen objects stay unknown; hidden disturbances cannot leak into memory |
| World model         | Constant velocity, simple dynamics or intentionally biased approximate dynamics                 | Hand-coded educational predictors; not trained latent or video models        |
| Planner             | Finite search over four complete action commands using declared costs                           | No claim of global optimality; quality depends on what belief contains       |
| Controller          | Bounded planar velocity servo and route waypoint tracking                                       | Assisted pusher proxy; no contact-rich robotic manipulation                  |
| Policy              | Choosing a route or waiting based on planner scores/user input                                  | No reinforcement learning policy is trained here                             |

## Evidence and error

Position error and trajectory RMSE compare actual and predicted samples at the same tick. A missing matching sample is not filled in with a fabricated value. Zero initial error alone says nothing about predictive performance. Metrics retain the executed forecast when a different candidate is previewed. The UI hides initial-only error until execution yields more samples.

The three-model comparison uses a frozen, common belief, action and horizon. Its table may show the valid zero error at the origin, but does not report an RMSE winner until more samples exist. Moving its forecast-time cursor does not execute physics. Unexecuted outcomes and their errors stay blank, including after rewinding a branch that has a saved future.

The evaluator has access to authoritative simulator positions, even while an object is occluded. These are labeled **recorded reality**, not agent observations. This privileged evaluation channel never feeds the predictor or estimator. Path plots omit height and maintain equal x/z spatial scale; measured errors use all three coordinates. A lower observed RMSE is evidence about this experiment, not a universal ordering of model quality.

The goal is an explicit instruction, not an object location secretly read from hidden reality. Predictors use believed obstacles. Shared public parameters and declared route commands are allowed; accessing unobserved moving-object positions is not.

The structured belief is the actual running representation. The latent illustration explains an architectural possibility only: its blocks are not learned vectors and have no semantic dimensions. Confidence is explicitly a heuristic memory weight, not a probability. No fake success rates or probabilities are shown.

A saved correction displays expected position, newly observed position, error and observation time. It remains readable after the instantaneous observation update, and rewinds with belief. It is an estimator correction within the simulator, not a proof of learning new dynamics parameters.

## Counterfactuals and reproducibility

Branches preserve the old outcome while a different action is run from the saved state. This is counterfactual simulation under specified assumptions. It does not establish observational causal identification or justify a real-world intervention.

Same-runtime snapshot continuation is tested for exact state equality. Cross-browser/CPU/version bit-for-bit equivalence is not promised. The seed is fixed metadata; the current scenarios contain no random initialization.

Retained branches can be restored by name, including their belief, controller, forecast origin and comparison. The JSON evidence report includes that frozen forecast origin, public assumptions, sampled forecasts, actual trajectory through the current cursor, errors and branch metadata. It contains no future actual samples. It is not an importable replay bundle; it omits the Rapier binary snapshot and complete intervention history.

## Parameter sensitivity and learning aids

Nine deterministic simple-dynamics forecasts explore the central settings and the lower/upper bound of initial X velocity, drive speed, drag and friction, changing one parameter at a time. Numeric bounds and exact sample parameters are visible or exported. These probes are not probability draws, calibrated confidence intervals, coverage guarantees or all joint combinations. A parameter that is irrelevant in a scenario can yield an overlapping trajectory. At zero range, all forecasts coincide; no visual spread or error growth is fabricated.

Bilingual term help describes each measure in the context of this model. Interpretation questions explain why an answer fits and propose a concrete experiment; they do not claim to measure competence. Help, answers, plot inspection and export do not issue simulation commands. If the user leaves the simulation playing, normal physics continues while help is open.

## Spatial presentation

The stronger 3D presentation adds materials, geometric detail and spectator controls without changing the physics. Metre markings, the physical board surface and visible object dimensions stay aligned with the simulator; decorative bevels, hardware and the robot shell are rendering details. The pusher remains the same assisted control abstraction.

The separate 3D forecast-time cursor inspects saved samples; it does not rewind or advance reality. Wire-edged future bodies and dashed paths remain distinguishable from opaque real objects and solid recorded history. Action labels identify commands, not a claim that the displayed intermediate position has already reached the target. Selecting a future previews a candidate without executing it.

Spectator camera movement does not move the sensor. Close-up follows a believed position in Observation/Belief views; privileged actual trajectory lines and alternate-branch outcomes are omitted from those views. This preserves the agent's information boundary even when the observer rotates the scene.

## Deliberate omissions

No external model services, neural training, video generation, invented latent semantics, calibrated uncertainty ensemble, reactive-agent comparison or formal causal lab. A horizon control and biased baseline demonstrate actual accumulated error without artificially forcing it to increase.

## One combined senior review — 2026-09-08

A single review covered research correctness, simulation engineering, education, interaction design and frontend engineering. High-impact findings addressed:

- Executed forecast pairing must survive preview selection and snapshot restore.
- Rewound active traces must stop at the restored tick; saved alternate outcomes use a different line style and named branch summaries.
- A transient belief correction must remain inspectable with its original observation time.
- Planner costs need explicit weights, and initial-only matching samples must not look like predictive success.
- Repeated Act must require a forecast from the current decision state.
- FOV renderer units must match the sensor; floor visualization must match physical extent; overlapping robot and future labels need separation.

Two focused visual passes were used: initial composition/flow inspection, then verification of the corrections. Runtime and visual evidence are summarized in the handoff, without claiming production deployment or universal browser coverage.
