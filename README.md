# WML — World Model Laboratory

**Observe. Imagine. Predict. Act. Learn.**

An interactive EN/TR scientific laboratory for experiencing observation, belief, prediction, planning and counterfactual simulation. WFM is the research parent; WML is the experiment surface. Intended domain: `wml.aserdargun.com`.

## Run

Node 22.12 or newer is required.

```sh
npm ci --legacy-peer-deps
npm run dev
```

Open http://127.0.0.1:5188. The server uses a strict, checkout-specific port and will fail rather than replace another listener. `--legacy-peer-deps` avoids an npm 10 optional-peer resolution crash; exact installed versions are locked. No account, API key or remote AI service is needed. All simulation and models run in the browser. Dependencies are installed once; production fonts, code and physics are served locally from the built application.

```sh
npm run build
npm test
npm run test:e2e
npm run test:e2e:production
```

Playwright requires its Chromium browser (`npx playwright install chromium` if missing). Browser tests run at 1440×1040 and 390×844. Tests use the existing server when available. Set `WML_E2E_URL=https://your-production-host` to run the same suite against a deployed app without starting a local server. `npm run preview` serves the built `dist/` at the same port; stop the dev server first.

## Try the signature loop

1. **Plan** generates four futures without moving the world. Compare routes and the explicit cost formula.
2. **Act** executes the chosen action in Rapier. Solid history and dashed forecasts reveal the measured mismatch.
3. **Rewind** returns to the saved decision point. **Branch**, select a different action, and **Act**. The old branch stays visible as a dotted trace with its action and recorded goal distance.
4. Use the **Observation** and **Belief** lenses to compare sensing with memory. The spectator orbit camera is separate from the robot sensor.
5. Try the ball/ramp, object permanence and surprise experiments. **World Model 101** guides the full loop in ten chapters.

## Investigate a prediction

After **Plan** or **Predict**, choose **Compare models**. Constant velocity, simple dynamics and biased dynamics reuse the same saved belief, action and horizon. Run the action to reveal three measured error curves. Inspect an earlier or future forecast time without moving reality: unexecuted outcomes and errors remain blank. A model's RMSE ranking applies only to the recorded portion of this experiment.

Choose **Sample assumptions** to inspect nine deterministic simple-dynamics paths. The slider changes declared bounds for initial X velocity, drive speed, drag and friction, one parameter at a time. Move the forecast-time cursor to see outlined positions and numeric x/y/z ranges at the same instant: different speeds can share a path. Zero range produces identical forecasts. These are sensitivity samples, not probabilities, confidence intervals or a complete exploration of combinations. The real world's settings stay unchanged.

**Export evidence · JSON** saves the frozen starting belief and public model context, all forecast samples and parameters, executed samples through the current cursor, measured errors and branch metadata. It is an evidence report, not an importable replay file or a physics snapshot. Restore a retained branch by clicking its timeline record. Contextual term explanations and scenario-specific interpretation questions are available in both languages.

Physical parameter changes reset the experiment. Sensor controls update observation. Changing predictor or horizon affects the next generated prediction. After time advances, generate a fresh forecast before committing a new action; Play resumes a paused execution.

## Explore the spatial laboratory

The Microverse is a procedural instrument with a machined, metre-marked deck, detailed robot, soft shadows and a contrasting studio backdrop. **Expand stage** gives the world more space. **Studio**, **Overhead** and **Close-up** provide spectator views; close-up follows the experiment's focus object. Drag to orbit, or reset the camera. Reduced-motion preferences disable camera easing.

After planning, move **3D forecast time** to place translucent future objects at a saved forecast instant while reality stays still. The displayed coordinate belongs to the selected forecast (or the dynamics baseline during model comparison). Click an A–D beacon in the scene to preview that action, then use **Act** to execute it. The page's action controls and timeline remain available in the expanded layout.

Rendering detail does not change the physics. Identified software renderers use lower pixel and shadow resolution to keep the same experiment usable without a GPU. Agent views hide privileged actual-history lines. The canvas requests frames as needed while paused and continues drawing during execution; no external 3D or lighting assets are loaded.

## Boundaries

- Rapier is the educational universe's authoritative simulator, not a claim about physical reality outside the app.
- Three hand-coded predictors operate on observation-derived belief. They are not learned foundation models.
- The robot is an **assisted pusher proxy**. A bounded velocity servo drives the cube; Rapier resolves its obstacle contacts. Grasping/manipulation and wheel-ground control are abstracted.
- Idealized object measurements use horizontal FOV and center-ray occlusion. Memory extrapolates velocity and can be wrong. Its freshness weight is not probability.
- Error evaluation can inspect authoritative simulated positions, including hidden objects. Those positions are not fed to the agent. Path charts show x/z with equal spatial scale; errors use full 3D Euclidean distance.
- Counterfactuals compare branches within this simulator; they do not establish real-world causality.
- Snapshots are in memory: up to 451 per branch and six retained branches. Reload/reset clears experiments. The locale preference persists if browser storage is available.
- Mobile uses one 3D canvas. Without WebGL, controls, measured metrics and textual belief remain usable. Animation starts only through explicit controls, with pause and step alternatives.

See [architecture](docs/ARCHITECTURE.md), [scientific integrity](docs/SCIENTIFIC-INTEGRITY.md), [adapter contract](docs/WORLD-MODEL-ADAPTERS.md) and [WFM integration](docs/WFM-INTEGRATION.md).

## Deployment

Production URL: [WML on Azure](https://blue-dune-0802ac003.3.azurestaticapps.net). Source: [aserdargun/wml-aserdargun-com](https://github.com/aserdargun/wml-aserdargun-com).

`dist/` is a static web application. `public/staticwebapp.config.json` provides Azure Static Web Apps fallback, MIME and header configuration. The production workflow in `.github/workflows/deploy-swa-wml-aserdargun-com.yml` runs locked installation, core tests, build, artifact verification and browser acceptance tests before uploading the prebuilt artifact. Pushes to `main` and manual dispatch share one serialized deployment queue.

Deployment target: `swa-wml-aserdargun-com` in `rg-wml-aserdargun-com`, West Europe, Free SKU, under `aserdargun subscription 3`. The workflow reads `AZURE_STATIC_WEB_APPS_API_TOKEN_SWA_WML_ASERDARGUN_COM`; credentials never belong in this repository. Custom-domain and DNS configuration are separate from this release.

Each build writes `dist/release.json` with its commit, build timestamp and artifact SHA-256 hashes. `npm run verify:artifact` verifies the local artifact. After deployment, run `node scripts/verify-live.mjs https://your-production-host FULL_COMMIT_SHA` to verify the served commit, every public asset hash, byte length and MIME type.

The physics compatibility package embeds WebAssembly, producing a ~2.23 MB JavaScript chunk (~0.84 MB gzip). Three.js and rendering helpers are ~1.16 MB (~0.32 MB gzip). These are measured build costs; lower-end mobile performance and other browser engines are not certified.

## Verified in this run

On 2026-09-08: production build and **28 core tests passed**. All **12 browser acceptance flows passed against the production build**: plan/act/rewind/alternate collision branch, occlusion memory, ten-chapter guide, Turkish mobile/keyboard controls, surprise error, common-origin model comparison with future outcomes blank, nine-sample sensitivity and JSON export, switching between successful/colliding branches with their own evidence, Turkish term help without paused-state mutation, spatial camera and preview state preservation, execution of an on-canvas future with a changed rendered world, and Turkish spatial controls with reduced motion at 390px. Camera changes, stage expansion and forecast-time inspection preserve the experiment's clock, goal distance and branch count.

The production flows reported no page exceptions or console errors. Desktop 1440×1040 and mobile 390×844 screenshots were visually inspected, including the studio, overhead and close-up views, spatial futures, comparison charts, sampled positions and the native help overlay. Export checks verified forecast provenance, zero-range equality, branch-specific histories and exclusion of future actual samples after rewind. The in-app browser also completed Plan → Compare models → Act → target. Other browser engines and physical mobile hardware were not tested.

## ILS compatibility

WML consumes the canonical ILS 0.1 core and UI archives from `vendor/`, with lockfile integrity and no sibling checkout dependency. `lab.manifest.json` describes all four existing experiments; the ten World Model 101 chapters are adapted directly from the existing bilingual curriculum. The shared learning panel follows the selected experiment and exposes assumptions, simulated reference trajectories, estimated forecasts and calculated errors. Physics, predictors and branch state remain in WML.

`?scenario=planning|dynamics|occlusion|surprise` opens an existing experiment; `?lesson=world-model-101` opens the guide. `?lang=en|tr` selects the initial language. No incoming cross-lab payload profile is supported: `ils` parameters are ignored without affecting runtime state. Related HEX/WFM links convey conceptual continuity only. Play/pause, step (six fixed ticks), reset and rewind retain their existing semantics; rewind restores the saved decision point.
