import { useState } from 'react'
import type { ScenarioId } from '../core'
import { say, type Locale } from '../ui/i18n'
export function LearningCheck({
  scenario,
  locale,
}: {
  scenario: ScenarioId
  locale: Locale
}) {
  const [choice, setChoice] = useState<number | null>(null)
  const question = {
    planning: {
      q: say(
        locale,
        'If the dynamics model has the lowest measured RMSE in a run, what does that establish?',
        'Bir koşuda dinamik model en düşük ölçülen RMSE’ye sahipse, bundan ne çıkar?',
      ),
      options: [
        say(
          locale,
          'It is the best model for every task.',
          'Her görev için en iyi modeldir.',
        ),
        say(
          locale,
          'It matched this action’s recorded trajectory best.',
          'Bu eylemin kaydedilen yörüngesine en iyi uydu.',
        ),
      ],
      answer: 1,
      why: say(
        locale,
        'The comparison fixes one state, action and observed interval. Other actions, hidden objects or a different goal can change which model is useful.',
        'Karşılaştırma tek bir durum, eylem ve gözlenen aralığı sabitler. Başka eylemler, gizli nesneler veya farklı hedefler hangi modelin yararlı olduğunu değiştirebilir.',
      ),
      try: say(
        locale,
        'Rewind to the same decision, branch and execute Direct. Compare the models again.',
        'Aynı karara geri sar, dal oluştur ve Doğrudan it eylemini yürüt. Modelleri yeniden karşılaştır.',
      ),
    },
    dynamics: {
      q: say(
        locale,
        'Two paths overlap in the top-down chart. Must their position error be zero?',
        'Üstten grafikte iki yol örtüşüyor. Konum hatası sıfır olmak zorunda mı?',
      ),
      options: [
        say(
          locale,
          'No. Their height can differ.',
          'Hayır. Yükseklikleri farklı olabilir.',
        ),
        say(
          locale,
          'Yes. Overlapping lines prove a match.',
          'Evet. Örtüşen çizgiler eşleşmeyi kanıtlar.',
        ),
      ],
      answer: 0,
      why: say(
        locale,
        'The chart projects x and z. Position error uses x, y and z at the same tick. Height or arrival time can differ even when the 2D paths overlap.',
        'Grafik x ve z’yi izdüşürür. Konum hatası aynı adımda x, y ve z’yi kullanır. 2D yollar örtüşse de yükseklik veya varış zamanı farklı olabilir.',
      ),
      try: say(
        locale,
        'Choose the biased model and change the ramp slope. Inspect height in 3D and the error curve together.',
        'Yanlı modeli seç ve rampa eğimini değiştir. 3D yüksekliği ve hata eğrisini birlikte incele.',
      ),
    },
    occlusion: {
      q: say(
        locale,
        'An unseen impulse changes the hidden ball. Which state updates immediately?',
        'Görülmeyen itki gizli topu değiştiriyor. Hangi durum hemen güncellenir?',
      ),
      options: [
        say(locale, 'Both reality and belief.', 'Hem gerçeklik hem inanç.'),
        say(
          locale,
          'Reality; belief needs new evidence.',
          'Gerçeklik; inanç yeni kanıt bekler.',
        ),
      ],
      answer: 1,
      why: say(
        locale,
        'Memory can extrapolate only what was observed. The agent cannot read hidden physics. Reappearance supplies a measurement and corrects the estimate.',
        'Bellek yalnızca gözleneni ileri taşıyabilir. Ajan gizli fiziği okuyamaz. Yeniden görünme bir ölçüm sağlar ve tahmini düzeltir.',
      ),
      try: say(
        locale,
        'Pause while the ball is hidden. Compare its remembered position with Reality, then play until it reappears.',
        'Top gizliyken duraklat. Hatırlanan konumu Gerçeklik ile karşılaştır; ardından yeniden görünene kadar oynat.',
      ),
    },
    surprise: {
      q: say(
        locale,
        'Do nine sampled futures guarantee that the real outcome is covered?',
        'Dokuz örnek gelecek, gerçek sonucun kapsanacağını garanti eder mi?',
      ),
      options: [
        say(
          locale,
          'No. The assumptions can miss the event.',
          'Hayır. Varsayımlar olayı dışarıda bırakabilir.',
        ),
        say(
          locale,
          'Yes. Nine samples form a confidence interval.',
          'Evet. Dokuz örnek bir güven aralığı oluşturur.',
        ),
      ],
      answer: 0,
      why: say(
        locale,
        'These are one-at-a-time parameter variations, not a calibrated distribution. An external impulse is outside those assumptions. New observation is still necessary.',
        'Bunlar tek tek değiştirilen parametrelerdir; kalibre edilmiş dağılım değildir. Dış itki bu varsayımların dışındadır. Yeni gözlem hâlâ gereklidir.',
      ),
      try: say(
        locale,
        'Sample the assumptions before acting. Apply the surprise and compare the actual path with the sampled paths.',
        'Eylemden önce varsayımları örnekle. Sürprizi uygula ve gerçek yolu örnek yollarla karşılaştır.',
      ),
    },
  }[scenario]
  return (
    <details className="learning-check">
      <summary>
        {say(locale, 'Check your interpretation', 'Yorumunu sına')}
      </summary>
      <h3>{question.q}</h3>
      <div
        role="group"
        aria-label={say(locale, 'Your interpretation', 'Yorumun')}
      >
        {question.options.map((text, i) => (
          <button
            key={i}
            aria-pressed={choice === i}
            onClick={() => setChoice(i)}
          >
            {text}
          </button>
        ))}
      </div>
      {choice !== null && (
        <p className="learning-feedback" role="status">
          <strong>
            {choice === question.answer
              ? say(
                  locale,
                  'That follows from the evidence.',
                  'Kanıt bunu destekliyor.',
                )
              : say(
                  locale,
                  'Look at the comparison boundary.',
                  'Karşılaştırmanın sınırını düşün.',
                )}
          </strong>
          {question.why}
        </p>
      )}
      <p className="learning-try">
        <b>{say(locale, 'Try it: ', 'Dene: ')}</b>
        {question.try}
      </p>
    </details>
  )
}
