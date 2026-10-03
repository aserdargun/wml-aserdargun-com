/**
 * External sources behind this lab's world-model teaching.
 *
 * Checked 2026-10-03. Until now the only "research" affordance in this lab was
 * `researchUrl`, which routes every topic to the matching concept page on the
 * sibling wfm site. That is a useful cross-link, but it is not evidence: a
 * sibling atlas cannot establish where a field's ideas came from, and it moves
 * when wfm moves.
 *
 * What this lab actually ships is three hand-coded predictor models, not a
 * learned world model. Each source below is recorded with what it establishes
 * and, just as importantly, what this lab does not do. Nothing here was
 * executed and no result was reproduced.
 */

export interface WorldModelSource {
  id: string;
  title: string;
  url: string;
  /** Where it appeared, verified rather than assumed. */
  published: { en: string; tr: string };
  establishes: { en: string; tr: string };
  differs: { en: string; tr: string };
}

export const worldModelSources = {
  checkedAt: "2026-10-03",
  boundary: {
    en: "The three predictors in this lab are hand-coded kinematic models with fixed parameters. None of them is trained, none has a latent state that was learned, and none reproduces a published result. What follows is provenance for the ideas, not a claim of implementation.",
    tr: "Bu laboratuvardaki üç öngörücü, sabit parametreli elle yazılmış kinematik modellerdir. Hiçbiri eğitilmiş değildir, hiçbirinde öğrenilmiş bir gizil durum yoktur ve hiçbiri yayımlanmış bir sonucu yeniden üretmez. Aşağıdakiler fikirlerin kökenidir, uygulanmışlık iddiası değildir.",
  },
  sources: [
    {
      id: "ha-schmidhuber-2018",
      title: "World Models (arXiv:1803.10122v4)",
      url: "https://arxiv.org/abs/1803.10122",
      published: {
        en: "Submitted 27 March 2018, last revised 9 May 2018. Preprint; title and author list confirmed through the arXiv API on 2026-10-03.",
        tr: "27 Mart 2018 gönderildi, son düzenleme 9 Mayıs 2018. Ön baskı; başlık ve yazar listesi 2026-10-03’te arXiv API üzerinden doğrulandı.",
      },
      establishes: {
        en: "The architecture this lab's name comes from. A world model compresses an observation stream into a compact latent state, fits a probabilistic dynamics model over that state, and trains a controller against the model's own imagined rollouts. The latent variable is the load-bearing idea: it is what lets prediction happen in a cheaper space than pixels.",
        tr: "Bu laboratuvarın adını aldığı mimari. Dünya modeli bir gözlem akışını derin bir gizil duruma sıkıştırır, bu durum üzerinde olasılıksal bir dinamik modeli kurar ve denetleyiciyi modelin kendi hayal ettiği açılımlara karşı eğitir. Gizil değişken taşıyıcı fikirdir: öngörünün piksellerden daha ucuz bir uzayda gerçekleşmesini sağlayan odur.",
      },
      differs: {
        en: "This lab has no VAE, no MDN and no controller trained on imagination. Its three predictors are deterministic and hand-set, and it inspects what they predict rather than training anything against them. The “latent state” the lessons discuss is a stated modelling position, not a learned variable.",
        tr: "Bu laboratuvarda VAE, MDN ya da hayal üzerine eğitilmiş denetleyici yoktur. Üç öngörücü belirlenimcidir ve elle ayarlanmıştır; laboratuvar bunları eğitmez, öngördüklerini inceler. Derslerin ele aldığı “gizil durum”, öğrenilmiş bir değişken değil, beyan edilmiş bir modelleme konumudur.",
      },
    },
    {
      id: "dreamerv3",
      title: "Mastering Diverse Domains through World Models (arXiv:2301.04104v2); peer-reviewed as “Mastering diverse control tasks through world models”, Nature 640(8059), 647–653, 2 April 2025",
      url: "https://www.nature.com/articles/s41586-025-08744-2",
      published: {
        en: "Preprint submitted 10 January 2023, last revised 17 April 2024. The Nature version appeared on 2 April 2025 under a different title; cite the published title, not the preprint title, when referring to the paper of record.",
        tr: "Ön baskı 10 Ocak 2023 gönderildi, son düzenleme 17 Nisan 2024. Nature sürümü 2 Nisan 2025’te farklı bir başlıkla yayımlandı; kayıt sürümüne atıfta ön baskı başlığını değil, yayımlanan başlığı kullanın.",
      },
      establishes: {
        en: "What the modern version of the idea looks like. The world model encodes sensory input into categorical representations and predicts future representations and rewards given actions, so a policy is trained on imagined trajectories rather than real environment steps. The paper's central claim is that a single fixed hyperparameter configuration works across more than 150 tasks and 8 domains, which is a claim about removing tuning, not about any one benchmark.",
        tr: "Fikrin modern hâli nasıl görünüyor. Dünya modeli duyusal girdiyi kategorik temsillere kodlar ve eylemlere koşul olarak gelecekteki temsilleri ve ödülleri öngörür; böylece politika gerçek ortam adımları yerine hayal edilmiş açılımlar üzerinde eğitilir. Papernin merkezî iddiası, tek bir sabit hiperparametre yapılandırmasının 150’den fazla görev ve 8 alanda çalıştığıdır; bu, ayarlamayı kaldırma iddiasıdır, tek bir kıyaslama ölçütü hakkında değil.",
      },
      differs: {
        en: "None of this lab's machinery is present: no categorical representation, no reward prediction, no actor-critic trained on imagination, no Minecraft result. Citing DreamerV3 here establishes where the action-conditioned latent predictor idea is defined, and nothing about this lab's own fidelity to it.",
        tr: "Bu laboratuvarın hiçbir makinesi yoktur: kategorik temsil, ödül öngörüsü, hayal üzerine eğitilmiş aktör-kritik ya da Minecraft sonucu yoktur. DreamerV3’ü burada anmak, eyleme koşullu gizil öngörücü fikrinin nerede tanımlandığını gösterir; bu laboratuvarın kendisine sadakati hakkında hiçbir şey söylemez.",
      },
    },
  ] as const,
};
