import type { Locale } from '../ui/i18n'
import { say } from '../ui/i18n'
export type Lens = 'reality' | 'observation' | 'belief' | 'imagination'
export const scenarioContent = (locale: Locale) => [
  {
    id: 'planning' as const,
    n: '01',
    title: say(locale, 'Think before you move.', 'Hareket etmeden düşün.'),
    name: say(locale, 'Plan a path', 'Bir yol planla'),
    concept: say(
      locale,
      'Action → imagined outcome',
      'Eylem → hayal edilen sonuç',
    ),
    description: say(
      locale,
      'Move the blue cube to the target. Imagine four actions, compare their outcomes, then make one future real.',
      'Mavi küpü hedefe götür. Dört eylemi hayal et, sonuçlarını karşılaştır ve bir geleceği gerçeğe dönüştür.',
    ),
    topic: 'action-conditioning',
    questions: [
      say(
        locale,
        'A robot, a cube, an obstacle and one goal. Solid objects belong to the simulator.',
        'Robot, küp, engel ve bir hedef. Katı nesneler simülatöre aittir.',
      ),
      say(
        locale,
        'Plan creates futures without moving reality. Act executes the selected action.',
        'Planla, gerçekliği hareket ettirmeden gelecekler üretir. Uygula, seçilen eylemi yürütür.',
      ),
      say(
        locale,
        'A planner uses predicted outcomes to choose an action; the model supplies those predictions.',
        'Planlayıcı, eylem seçmek için tahminleri kullanır; bu tahminleri model sağlar.',
      ),
      say(
        locale,
        'An approximate controller model rolls out four routes and estimates their cost.',
        'Yaklaşık bir denetleyici modeli dört rotayı ilerletir ve maliyetlerini hesaplar.',
      ),
      say(
        locale,
        'Unseen obstacles or wrong dynamics can make a good-looking plan fail.',
        'Görülmeyen engeller veya hatalı dinamikler iyi görünen bir planı başarısız kılabilir.',
      ),
    ],
  },
  {
    id: 'dynamics' as const,
    n: '02',
    title: say(
      locale,
      'How far into the future?',
      'Geleceği ne kadar görebiliriz?',
    ),
    name: say(locale, 'Predict motion', 'Hareketi tahmin et'),
    concept: say(
      locale,
      'Dynamics → prediction error',
      'Dinamikler → tahmin hatası',
    ),
    description: say(
      locale,
      'Release a ball on a ramp. Compare a predicted path with actual physics. Change friction or the model and repeat.',
      'Rampadaki topu serbest bırak. Tahmin edilen yolu gerçek fizikle karşılaştır. Sürtünmeyi veya modeli değiştirip tekrarla.',
    ),
    topic: 'world-model',
    questions: [
      say(
        locale,
        'A ball on a tilted surface, with gravity and contact friction.',
        'Eğimli yüzeyde, yerçekimi ve temas sürtünmesi altında bir top.',
      ),
      say(
        locale,
        'Dashed samples are predictions. The continuous trail is the recorded outcome.',
        'Kesikli örnekler tahminlerdir. Sürekli iz, kaydedilen sonuçtur.',
      ),
      say(
        locale,
        'Prediction error is measured at matching simulation times, in metres.',
        'Tahmin hatası, eşleşen simülasyon zamanlarında metre cinsinden ölçülür.',
      ),
      say(
        locale,
        'It approximates motion using velocity, gravity and a friction assumption.',
        'Hızı, yerçekimini ve bir sürtünme varsayımını kullanarak hareketi yaklaşık hesaplar.',
      ),
      say(
        locale,
        'Rolling contact and simplified friction need not agree. Longer predictions can drift.',
        'Yuvarlanma teması ile basitleştirilmiş sürtünme uyuşmayabilir. Uzun tahminler sapabilir.',
      ),
    ],
  },
  {
    id: 'occlusion' as const,
    n: '03',
    title: say(locale, 'Out of sight. Still there.', 'Görünmüyor. Hâlâ orada.'),
    name: say(locale, 'See the unseen', 'Görünmeyeni izle'),
    concept: say(locale, 'Observation → memory', 'Gözlem → bellek'),
    description: say(
      locale,
      'A moving ball passes behind a panel. Switch between what exists, what is seen, and what is remembered.',
      'Hareketli bir top perdenin arkasından geçer. Var olan, görülen ve hatırlanan arasında geçiş yap.',
    ),
    topic: 'latent-state',
    questions: [
      say(
        locale,
        'Reality contains a ball even when the robot cannot see it.',
        'Robot göremese de gerçeklikte bir top vardır.',
      ),
      say(
        locale,
        'An occluded object leaves the observation, but its last known state stays in memory.',
        'Örtülen nesne gözlemden çıkar, son bilinen durumu bellekte kalır.',
      ),
      say(
        locale,
        'Missing observations do not imply that an object stopped existing.',
        'Gözlem eksikliği, nesnenin yok olduğu anlamına gelmez.',
      ),
      say(
        locale,
        'It extrapolates the last observed velocity. Confidence decays with time unseen.',
        'Son gözlenen hızı ileri taşır. Görülmeyen süre arttıkça güven azalır.',
      ),
      say(
        locale,
        'Hidden collisions cannot be inferred from memory alone. Reappearance corrects belief.',
        'Gizli çarpışmalar yalnızca bellekten çıkarılamaz. Yeniden görünme inancı düzeltir.',
      ),
    ],
  },
  {
    id: 'surprise' as const,
    n: '04',
    title: say(
      locale,
      'Reality has other plans.',
      'Gerçekliğin başka planları var.',
    ),
    name: say(locale, 'Meet a surprise', 'Bir sürprizle karşılaş'),
    concept: say(
      locale,
      'Mismatch → belief update',
      'Uyumsuzluk → inanç güncelleme',
    ),
    description: say(
      locale,
      'Predict the ball’s path. Start the world, then apply an unexpected impulse. Watch evidence correct the belief.',
      'Topun yolunu tahmin et. Dünyayı başlat, sonra beklenmedik bir itki uygula. Yeni kanıtın inancı düzeltmesini izle.',
    ),
    topic: 'uncertainty',
    questions: [
      say(
        locale,
        'The dashed prediction was generated before your intervention.',
        'Kesikli tahmin, müdahalenden önce üretildi.',
      ),
      say(
        locale,
        'An external impulse changes the real velocity while the original prediction remains.',
        'Dışarıdan gelen itki gerçek hızı değiştirir; ilk tahmin korunur.',
      ),
      say(
        locale,
        'Acting in a changing world requires observation and revision.',
        'Değişen dünyada eylem, gözlem ve gözden geçirme gerektirir.',
      ),
      say(
        locale,
        'New visible measurements replace the old estimated position and velocity.',
        'Yeni görünür ölçümler eski tahmini konum ve hızın yerini alır.',
      ),
      say(
        locale,
        'A surprising event outside the field of view remains unknown until it is observed.',
        'Görüş alanı dışındaki sürpriz, gözlenene dek bilinmez.',
      ),
    ],
  },
]
export const chapters = (
  l: Locale,
): { title: string; text: string; lens: Lens; task: string }[] => [
  {
    title: say(l, 'Reality', 'Gerçeklik'),
    text: say(
      l,
      'This is a simulated world. Rotate the camera to explore the robot, cube and obstacle.',
      'Bu simüle edilen bir dünya. Robotu, küpü ve engeli incelemek için kamerayı döndür.',
    ),
    lens: 'reality',
    task: 'view',
  },
  {
    title: say(l, 'Observation', 'Gözlem'),
    text: say(
      l,
      'The robot sees only inside its sensor cone, with line of sight. Your orbit camera is an outside observer.',
      'Robot, yalnızca sensör konisi içinde ve önü açıksa görür. Döndürdüğün kamera dışarıdan bir gözlemcidir.',
    ),
    lens: 'observation',
    task: 'view',
  },
  {
    title: say(l, 'Belief', 'İnanç'),
    text: say(
      l,
      'The wireframe is an internal estimate built from observations and memory. Never seen means unknown.',
      'Tel kafes, gözlem ve bellekten oluşan iç tahmindir. Hiç görülmeyen, bilinmeyendir.',
    ),
    lens: 'belief',
    task: 'view',
  },
  {
    title: say(l, 'Prediction', 'Tahmin'),
    text: say(
      l,
      'Choose Predict to roll the current belief forward. No physical time passes while imagining.',
      'Mevcut inancı ileri taşımak için Tahmin et. Hayal ederken fiziksel zaman ilerlemez.',
    ),
    lens: 'imagination',
    task: 'predict',
  },
  {
    title: say(l, 'Action', 'Eylem'),
    text: say(
      l,
      'Choose Plan to generate four action-conditioned futures from the same state.',
      'Aynı durumdan eyleme bağlı dört gelecek üretmek için Planla.',
    ),
    lens: 'imagination',
    task: 'plan',
  },
  {
    title: say(l, 'Imagination', 'Hayal'),
    text: say(
      l,
      'Inspect the candidate routes. A dashed path describes a possibility under a model, not certainty.',
      'Aday rotaları incele. Kesikli yol, model altında bir olasılığı gösterir; kesinlik değildir.',
    ),
    lens: 'imagination',
    task: 'view',
  },
  {
    title: say(l, 'Planning', 'Planlama'),
    text: say(
      l,
      'The lowest cost route is selected. Distance and collision penalties are shown so you can disagree.',
      'En düşük maliyetli rota seçilir. Hedef mesafesi ve çarpışma cezaları görünürdür; başka bir rota seçebilirsin.',
    ),
    lens: 'imagination',
    task: 'plan',
  },
  {
    title: say(l, 'Reality check', 'Gerçeklik kontrolü'),
    text: say(
      l,
      'Choose Act and let the physics engine execute. Use the timeline controls to pause or step.',
      'Uygula ile fizik motorunu çalıştır. Duraklatmak veya adımlamak için zaman çizelgesini kullan.',
    ),
    lens: 'imagination',
    task: 'act',
  },
  {
    title: say(l, 'Error', 'Hata'),
    text: say(
      l,
      'Compare the solid actual trace with the dashed prediction. Error is measured, never a decorative number.',
      'Sürekli gerçek izi kesikli tahminle karşılaştır. Hata ölçülür; dekoratif bir sayı değildir.',
    ),
    lens: 'imagination',
    task: 'error',
  },
  {
    title: say(l, 'Update', 'Güncelle'),
    text: say(
      l,
      'Observe again. Rewind, branch, choose another action and compare. World model ≠ world. Prediction ≠ certainty.',
      'Yeniden gözle. Geri sar, dal oluştur, başka eylem seç ve karşılaştır. Dünya modeli ≠ dünya. Tahmin ≠ kesinlik.',
    ),
    lens: 'belief',
    task: 'view',
  },
]
