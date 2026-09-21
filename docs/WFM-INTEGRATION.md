# WFM and the Aserdargun learning system

WML is the interactive experiment laboratory under WFM (World Models Atlas) in the aserdargun.com learning system. WFM supplies research, papers, concepts and evidence; WML makes observation, belief, approximate prediction, planning and counterfactual simulation explorable. Its three hand-coded predictors are educational models, not trained foundation world models or evidence of real-world transfer.

## Experiment-to-research links

| WML experiment | Concept | English WFM route | Turkish WFM route |
| --- | --- | --- | --- |
| Plan a path / Bir yol planla | Action-conditioned prediction and planning | `/en/concepts/action-conditioning` | `/tr/concepts/eylem-kosullama` |
| Predict motion / Hareketi tahmin et | World model and dynamics | `/en/concepts/world-model` | `/tr/concepts/dunya-modeli` |
| See the unseen / Görünmeyeni izle | Internal representation and memory | `/en/concepts/latent-state` | `/tr/concepts/gizil-durum` |
| Meet a surprise / Bir sürprizle karşılaş | Prediction limitations | `/en/concepts/uncertainty` | `/tr/concepts/belirsizlik` |

`src/lessons/research.ts` maps stable topic IDs to WFM’s localized slugs. Changing only the language prefix would produce missing-record pages for Turkish concepts. WML uses structured belief; linking to latent-state research does not imply learned latent features. Likewise, sensitivity probes are not calibrated uncertainty estimates.

Research and portfolio links follow WML’s selected language and open a separate tab, preserving the local experiment. They transmit no simulation state. The footer explains WML’s role and links to the root site and its application map.

## Portfolio placement

The root portfolio already registers WML as a public bilingual lab with `parentApp: wfm`, the address `https://wml.aserdargun.com/`, and an explicit hand-coded-predictor boundary. Its source of truth is `data/living-system.json` in the sibling `aserdargun-com` repository. Update that canonical data and regenerate its dependent pages if the relationship changes; do not edit generated HTML or `portfolio.json` directly.

| Application | Relationship to WML |
| --- | --- |
| WFM | Research and evidence parent |
| ITL / PDT | Neighboring digital-twin interpretation and correspondence to physical assets |
| ENG / HEX | Neighboring embodiment and physical-AI learning; the shared panel links to HEX |
| GPU / GEX | Compute context for potential future learned adapters |
| ANT | Collective intelligence as a distinct neighboring experimental discipline |

These are educational relationships, not runtime integrations. WML does not load another laboratory’s model or receive its experiment state. Its ILS manifest and learning panel use the shared packages, while physics, predictors and branch evidence remain WML-owned. Incoming cross-lab payloads are not supported.

## Publication boundary

The canonical address is `https://wml.aserdargun.com/`; the Azure origin is `https://blue-dune-0802ac003.3.azurestaticapps.net/`. The existing GitHub workflow targets Free `swa-wml-aserdargun-com` in `rg-wml-aserdargun-com`, West Europe. Content edits remain local unless publication is authorized.

For every authorized release, verify the workflow, matching `release.json` commit, asset hashes and live browser behavior. DNS/TLS readiness and deployed code identity are separate checks. See the README for validation commands; a local content audit does not establish a new production release.
