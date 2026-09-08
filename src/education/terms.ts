import { say, type Locale } from '../ui/i18n'
export type TermId =
  | 'worldModel'
  | 'belief'
  | 'horizon'
  | 'rmse'
  | 'positionError'
  | 'counterfactual'
  | 'sensitivity'
  | 'planner'
  | 'controller'
  | 'visibility'
  | 'memory'
  | 'projection'
export const term = (id: TermId, l: Locale) =>
  ({
    worldModel: {
      name: say(l, 'World model', 'Dünya modeli'),
      meaning: say(
        l,
        'An internal predictive representation used to estimate what may happen under an action.',
        'Bir eylem altında ne olabileceğini tahmin etmek için kullanılan iç temsil.',
      ),
      example: say(
        l,
        'In WML, the predictor starts from belief and integrates approximate dynamics. Rapier separately produces the observed outcome.',
        'WML’de tahminci inançtan başlar ve yaklaşık dinamikleri ilerletir. Gözlenen sonucu ayrı olarak Rapier üretir.',
      ),
    },
    belief: {
      name: say(l, 'Belief state', 'İnanç durumu'),
      meaning: say(
        l,
        'What the agent currently represents, assembled from observations and memory. It can be incomplete or wrong.',
        'Ajanın gözlem ve bellekten oluşturduğu mevcut temsil. Eksik veya hatalı olabilir.',
      ),
      example: say(
        l,
        'A ball behind the panel keeps an estimated position. An unseen impulse changes reality without changing that estimate.',
        'Perdenin arkasındaki topun tahmini konumu korunur. Görülmeyen itki, tahmini değiştirmeden gerçekliği değiştirir.',
      ),
    },
    horizon: {
      name: say(l, 'Prediction horizon', 'Tahmin ufku'),
      meaning: say(
        l,
        'How far ahead a forecast runs from its saved starting time.',
        'Tahminin kayıtlı başlangıç zamanından ne kadar ileriye uzandığı.',
      ),
      example: say(
        l,
        'A 10 s forecast made at t = 2 s ends at t = 12 s. Error can only be measured where actual observations exist.',
        't = 2 s’de yapılan 10 s’lik tahmin t = 12 s’de biter. Hata yalnızca gerçek gözlemlerin bulunduğu zamanlarda ölçülebilir.',
      ),
    },
    rmse: {
      name: say(l, 'Trajectory RMSE', 'Yörünge RMSE'),
      meaning: say(
        l,
        'The square root of the average squared position error across matching times. Large errors contribute more strongly.',
        'Eşleşen zamanlardaki konum hatalarının karelerinin ortalamasının karekökü. Büyük hataların katkısı daha fazladır.',
      ),
      example: say(
        l,
        'For errors of 0 m and 2 m, RMSE = √((0² + 2²) / 2) ≈ 1.414 m. It is not a success probability.',
        '0 m ve 2 m hata için RMSE = √((0² + 2²) / 2) ≈ 1,414 m. Başarı olasılığı değildir.',
      ),
    },
    positionError: {
      name: say(l, 'Position error', 'Konum hatası'),
      meaning: say(
        l,
        'The three-dimensional distance between a predicted position and the actual position at the same simulation tick.',
        'Aynı simülasyon adımındaki tahmini konum ile gerçek konum arasındaki üç boyutlu mesafe.',
      ),
      example: say(
        l,
        'A 0.10 m error means the two positions are 10 cm apart. The most recent error can be small even after a large earlier mistake.',
        '0,10 m hata, iki konumun 10 cm ayrı olduğunu gösterir. Daha önce büyük hata yapılmış olsa da son hata küçük olabilir.',
      ),
    },
    counterfactual: {
      name: say(l, 'Counterfactual branch', 'Karşı-olgusal dal'),
      meaning: say(
        l,
        'A different action executed from a restored simulation state, with the previous outcome retained.',
        'Geri yüklenen simülasyon durumundan farklı eylem yürütülmesi; önceki sonuç korunur.',
      ),
      example: say(
        l,
        'Compare direct push with a detour from the same decision point. This tests alternatives inside WML; it does not prove real-world causality.',
        'Aynı karar noktasından doğrudan itişi dolanma rotasıyla karşılaştır. Bu, WML içindeki alternatifleri sınar; gerçek dünyada nedensellik kanıtlamaz.',
      ),
    },
    sensitivity: {
      name: say(l, 'Parameter sensitivity', 'Parametre duyarlılığı'),
      meaning: say(
        l,
        'How a prediction changes when a stated assumption is changed. The samples are a designed comparison, not a probability distribution.',
        'Belirtilmiş bir varsayım değiştiğinde tahminin nasıl değiştiği. Örnekler tasarlanmış bir karşılaştırmadır; olasılık dağılımı değildir.',
      ),
      example: say(
        l,
        'Nine runs use the central setting and one-at-a-time lower/upper velocity, drive, drag and friction assumptions. They do not cover every joint combination.',
        'Dokuz koşu, merkez ayarı ve tek tek hız, sürüş, direnç ve sürtünmenin alt/üst varsayımlarını kullanır. Tüm ortak kombinasyonları kapsamaz.',
      ),
    },
    planner: {
      name: say(l, 'Planner cost', 'Planlayıcı maliyeti'),
      meaning: say(
        l,
        'A declared preference for outcomes. WML uses distance to target, collision penalty and path length to compare four candidates.',
        'Sonuçlar için tanımlanan tercih. WML dört adayı hedef mesafesi, çarpışma cezası ve yol uzunluğuyla karşılaştırır.',
      ),
      example: say(
        l,
        'Cost = 10 × goal distance + 30 if collision + 0.08 × path length. These chosen weights are not physical units or learned rewards.',
        'Maliyet = 10 × hedef mesafesi + çarpışma varsa 30 + 0,08 × yol uzunluğu. Bu ağırlıklar fiziksel birim veya öğrenilmiş ödül değildir.',
      ),
    },
    controller: {
      name: say(l, 'Controller', 'Denetleyici'),
      meaning: say(
        l,
        'The rule that turns a selected route into motion commands. It is distinct from the model that predicts their outcome.',
        'Seçilen rotayı hareket komutlarına dönüştüren kural. Komutların sonucunu tahmin eden modelden ayrıdır.',
      ),
      example: say(
        l,
        'The assisted pusher applies a bounded velocity servo to the cube; Rapier resolves its contacts. The robot is a visual sensor proxy.',
        'Destekli itici küpe sınırlı hız denetimi uygular; temasları Rapier çözer. Robot görsel bir sensör temsilidir.',
      ),
    },
    visibility: {
      name: say(l, 'Observation region', 'Gözlem bölgesi'),
      meaning: say(
        l,
        'WML tests horizontal sensor angle, distance and line of sight to an object’s centre.',
        'WML yatay sensör açısını, mesafeyi ve nesnenin merkezine görüş hattını sınar.',
      ),
      example: say(
        l,
        'Orbiting the spectator camera does not change the robot’s observation. Adjust Sensor direction to turn the actual observation region.',
        'İzleyici kamerasını döndürmek robotun gözlemini değiştirmez. Gerçek gözlem bölgesini çevirmek için Sensör yönünü ayarla.',
      ),
    },
    memory: {
      name: say(l, 'Memory weight', 'Bellek ağırlığı'),
      meaning: say(
        l,
        'A heuristic freshness indicator that decays while an object is hidden. It is not a calibrated confidence or probability.',
        'Nesne gizliyken azalan sezgisel güncellik göstergesi. Kalibre edilmiş güven veya olasılık değildir.',
      ),
      example: say(
        l,
        'The weight multiplies by exp(−0.22 × hidden seconds), down to 0.05. Seeing the object again restores it to 1.',
        'Ağırlık exp(−0,22 × gizli süre) ile çarpılarak 0,05’e kadar azalır. Nesneyi yeniden görmek değeri 1’e getirir.',
      ),
    },
    projection: {
      name: say(l, 'Top-down projection', 'Üstten izdüşüm'),
      meaning: say(
        l,
        'The trajectory chart shows x and z, collapsing height. Different 3D paths can overlap in this view.',
        'Yörünge grafiği x ve z’yi gösterir; yüksekliği dışarıda bırakır. Farklı 3D yollar burada üst üste gelebilir.',
      ),
      example: say(
        l,
        'Use the 3D view to inspect the ball’s height on the ramp. Error metrics still use all three coordinates.',
        'Topun rampadaki yüksekliğini 3D görünümde incele. Hata ölçümleri üç koordinatı da kullanır.',
      ),
    },
  })[id]
