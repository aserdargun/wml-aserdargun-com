# WFM and the Aserdargun ecosystem

WFM supplies research, papers, concepts and evidence. WML supplies interactive experiments, approximate prediction, planning and counterfactual simulation. WML does not duplicate WFM's curriculum or modify its repository.

## Experiment metadata

| WML experiment  | Concept                                                   | Linked WFM route                   |
| --------------- | --------------------------------------------------------- | ---------------------------------- |
| Plan a path     | Action-conditioned prediction and planning                | `/en/concepts/action-conditioning` |
| Predict motion  | World model and dynamics                                  | `/en/concepts/world-model`         |
| See the unseen  | Internal representation, memory and partial observability | `/en/concepts/latent-state`        |
| Meet a surprise | Prediction limitations                                    | `/en/concepts/uncertainty`         |

The routes follow the current sibling WFM catalog and route implementation. Action-conditioning and latent-state endpoints returned HTTP 200 on 2026-09-08. Links are explicitly marked EN in both locales. WML's local experience remains bilingual. A research link opens a separate tab; it does not transmit simulation state.

## Future portfolio placement

| Application | Relationship to WML                                                                   |
| ----------- | ------------------------------------------------------------------------------------- |
| WFM         | Research/evidence parent                                                              |
| ITL / PDT   | Digital-twin interpretation and correspondence to physical assets                     |
| ENG / HEX   | Embodiment and physical AI; manipulation belongs there rather than inside WML's scope |
| GPU / GEX   | Execution and compute context for future learned adapters                             |
| ANT         | Collective intelligence as a distinct neighboring experimental discipline             |

Future root integration should use the portfolio's canonical data/renderer workflow and distinguish research from interactive laboratory. Do not imply WML replaces WFM, or that ANT's collective intelligence is equivalent to a world model. The current run only creates WML; it makes no root-site or sibling-app changes.

Target custom domain: `wml.aserdargun.com`; custom-domain provisioning remains separate. The GitHub-backed deployment targets the Free `swa-wml-aserdargun-com` in West Europe under `aserdargun subscription 3`. Verify the generated Azure hostname, successful workflow, matching `release.json` commit and asset hashes, and live browser behavior for every release. See the README for publication commands.
