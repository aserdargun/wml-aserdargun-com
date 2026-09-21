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
      'Move the blue cube to the target. Predict four actions, compare their outcomes, then execute one in the simulator.',
      'Mavi küpü hedefe götür. Dört eylemin sonucunu tahmin et, karşılaştır ve birini simülatörde uygula.',
    ),
    topic: 'action-conditioning' as const,
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
        'The selected predictor evaluates four commands from the same belief. Constant velocity ignores commands; the dynamics models approximate their effects.',
        'Seçilen model, aynı inançtan dört komutu değerlendirir. Sabit hız modeli komutları yok sayar; dinamik modeller etkilerini yaklaşık hesaplar.',
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
      'Release a ball on a ramp. Compare a predicted path with the simulated outcome. Change friction or the model and repeat.',
      'Rampadaki topu serbest bırak. Tahmin edilen yolu simülasyon sonucuyla karşılaştır. Sürtünmeyi veya modeli değiştirip tekrarla.',
    ),
    topic: 'world-model' as const,
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
        'Constant velocity extrapolates motion without forces. The dynamics models add approximate gravity, friction and contact assumptions.',
        'Sabit hız modeli hareketi kuvvetleri hesaba katmadan ileri taşır. Dinamik modeller yaklaşık yerçekimi, sürtünme ve temas varsayımları ekler.',
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
    topic: 'latent-state' as const,
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
        'Memory extrapolates the last observed velocity. Its freshness weight decays while hidden; it is not a probability.',
        'Bellek, son gözlenen hızı ileri taşır. Gizli kalma süresi arttıkça güncellik ağırlığı azalır; bu bir olasılık değildir.',
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
    topic: 'uncertainty' as const,
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
        'An unseen intervention cannot update belief until new evidence arrives. The saved forecast stays unchanged until you predict again.',
        'Görülmeyen müdahale, yeni kanıt gelene kadar inancı güncelleyemez. Yeniden tahmin üretene kadar kayıtlı tahmin değişmez.',
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
      'Compare the solid simulated trace with the dashed prediction. Error is calculated from positions at matching times, including hidden objects; these reference positions never feed the predictor.',
      'Sürekli simülasyon izini kesikli tahminle karşılaştır. Hata, gizli nesneler dahil eşleşen zamanlardaki konumlardan hesaplanır; referans konumlar tahmin modeline aktarılmaz.',
    ),
    lens: 'imagination',
    task: 'error',
  },
  {
    title: say(l, 'Update', 'Güncelle'),
    text: say(
      l,
      'New observations correct belief, not the saved forecast or model parameters. Rewind, branch, predict and try another action. World model ≠ world. Prediction ≠ certainty.',
      'Yeni gözlem inancı düzeltir; kayıtlı tahmini veya model parametrelerini değiştirmez. Geri sar, dal oluştur, tahmin üret ve başka eylem dene. Dünya modeli ≠ dünya. Tahmin ≠ kesinlik.',
    ),
    lens: 'belief',
    task: 'view',
  },
]
