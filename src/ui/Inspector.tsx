import { TermHelp } from '../education/TermHelp'
import { useState } from 'react'
import { ArrowUpRight, Check, Eye, EyeOff } from 'lucide-react'
import type { LabEngine, ModelId, ActionId } from '../core'
import { actionName, objectName, say, type Locale } from './i18n'
import { navigateTabs } from './tabNavigation'
interface Props {
  engine: LabEngine
  locale: Locale
  model: ModelId
  choose: (action: ActionId) => void
  tab: 'futures' | 'state' | 'learn'
  setTab: (tab: 'futures' | 'state' | 'learn') => void
  questions: string[]
  topic: string
}
export function Inspector({
  engine,
  locale,
  model,
  choose,
  tab,
  setTab,
  questions,
  topic,
}: Props) {
  const [latent, setLatent] = useState(false)
  const headings = [
    say(locale, 'What am I seeing?', 'Ne görüyorum?'),
    say(locale, 'What changed?', 'Ne değişti?'),
    say(locale, 'Why does it matter?', 'Neden önemli?'),
    say(locale, 'What is the model doing?', 'Model ne yapıyor?'),
    say(locale, 'What can go wrong?', 'Ne yanlış gidebilir?'),
  ]
  return (
    <aside className="inspector">
      <div
        className="inspector-tabs"
        role="tablist"
        aria-label={say(locale, 'Inspector', 'İnceleme')}
      >
        {(['futures', 'state', 'learn'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            id={`inspector-${t}`}
            aria-controls="inspector-panel"
            tabIndex={tab === t ? 0 : -1}
            onKeyDown={navigateTabs}
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {
              {
                futures: say(locale, 'Futures', 'Gelecekler'),
                state: say(locale, 'Belief', 'İnanç'),
                learn: say(locale, 'Learn', 'Öğren'),
              }[t]
            }
          </button>
        ))}
      </div>
      <div className="inspector-content" id="inspector-panel" role="tabpanel" aria-labelledby={`inspector-${tab}`}>
        {tab === 'futures' && (
          <>
            <div className="section-label">
              {say(locale, 'ACTION → OUTCOME', 'EYLEM → SONUÇ')}
            </div>
            <h2>
              {say(
                locale,
                'One state. Four futures.',
                'Bir durum. Dört gelecek.',
              )}
            </h2>
            <p className="muted small">
              {say(
                locale,
                'The planner compares model rollouts. You choose which prediction becomes an action.',
                'Planlayıcı model tahminlerini karşılaştırır. Hangi tahminin eyleme dönüşeceğini sen seçersin.',
              )}
            </p>
            {engine.predictions.length === 0 ? (
              <div className="empty-futures">
                <span className="branch-glyph">⌁</span>
                <p>
                  {say(locale, 'The world is paused.', 'Dünya duraklatıldı.')}
                </p>
                <span>
                  {say(
                    locale,
                    'Choose Plan to explore possible outcomes.',
                    'Olası sonuçları keşfetmek için Planla.',
                  )}
                </span>
              </div>
            ) : (
              <div className="candidate-list">
                {engine.predictions.map((p) => (
                  <button
                    className={`candidate ${engine.selectedAction === p.action ? 'selected' : ''}`}
                    key={p.id}
                    onClick={() => choose(p.action)}
                    disabled={!p.samples.length}
                    aria-pressed={engine.selectedAction === p.action}
                  >
                    <div className="candidate-top">
                      <strong>
                        {actionName(p.action, locale, engine.state.scenario)}
                      </strong>
                      {engine.selectedAction === p.action && (
                        <Check size={15} />
                      )}
                    </div>
                    <div className="candidate-details">
                      <span className={p.collision ? 'collision-tag' : ''}>
                        {!p.samples.length
                          ? say(locale, 'Object not observed', 'Nesne gözlenmedi')
                          : p.collision
                          ? say(
                              locale,
                              'Collision predicted',
                              'Çarpışma tahmini',
                            )
                          : p.goalDistance < 0.35
                            ? say(
                                locale,
                                'Target predicted',
                                'Hedefe varış tahmini',
                              )
                            : say(
                                locale,
                                'Target not reached',
                                'Hedefe ulaşılmıyor',
                              )}
                      </span>
                      <span>
                        {say(locale, 'Cost', 'Maliyet')}{' '}
                        <b>{Number.isFinite(p.score) ? p.score.toFixed(2) : '—'}</b>
                      </span>
                    </div>
                    <span className="candidate-distance">
                      {Number.isFinite(p.goalDistance) ? p.goalDistance.toFixed(2) : '—'} m{' '}
                      {say(locale, 'from target', 'hedef mesafesi')}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <p className="score-formula">
              <TermHelp id="planner" locale={locale} />
              {say(
                locale,
                'Cost = 10 × goal distance + 30 if collision + 0.08 × path length. Lower is better.',
                'Maliyet = 10 × hedef mesafesi + çarpışma varsa 30 + 0,08 × yol uzunluğu. Düşük olan seçilir.',
              )}
            </p>
            <div className="model-note">
              <span className="section-label">
                {say(locale, 'MODEL ASSUMPTION', 'MODEL VARSAYIMI')}
              </span>
              <p>
                {model === 'constant'
                  ? say(
                      locale,
                      'Constant velocity ignores the action and collisions. A deliberately limited baseline.',
                      'Sabit hız, eylemi ve çarpışmaları yok sayar. Bilerek sınırlı bir başlangıç modeli.',
                    )
                  : model === 'biased'
                    ? say(
                        locale,
                        'Biased dynamics uses incorrect actuation and friction assumptions. Test how its choices fare.',
                        'Yanlı dinamikler hatalı itme ve sürtünme varsayımları kullanır. Seçimlerinin sonucunu incele.',
                      )
                    : say(
                        locale,
                        'Approximate action-conditioned dynamics. Collision and control are simplified; the outcome can differ.',
                        'Eyleme bağlı yaklaşık dinamikler. Çarpışma ve kontrol basitleştirilmiştir; sonuç farklı olabilir.',
                      )}
              </p>
            </div>
          </>
        )}
        {tab === 'state' && (
          <>
            <div className="section-label">
              {say(locale, 'OBSERVATION + MEMORY', 'GÖZLEM + BELLEK')}
              <TermHelp id="belief" locale={locale} />
            </div>
            <h2>
              {say(locale, 'What the agent knows.', 'Ajanın bildikleri.')}
            </h2>
            <div className="small-toggle">
              <button aria-pressed={!latent} onClick={() => setLatent(false)}>
                {say(locale, 'Structured', 'Yapılandırılmış')}
              </button>
              <button aria-pressed={latent} onClick={() => setLatent(true)}>
                {say(locale, 'Latent concept', 'Gizil kavram')}
              </button>
            </div>
            {latent ? (
              <div className="latent-concept">
                <div className="latent-blocks" aria-hidden="true">
                  {Array.from({ length: 24 }, (_, i) => (
                    <i key={i} style={{ opacity: 0.2 + ((i * 7) % 11) / 15 }} />
                  ))}
                </div>
                <p>
                  {say(
                    locale,
                    'A learned model can encode state in features that have no simple object labels.',
                    'Öğrenilmiş bir model, durumu basit nesne etiketleri olmayan özelliklerde kodlayabilir.',
                  )}
                </p>
                <p className="muted small">
                  {say(
                    locale,
                    'Conceptual illustration only. These blocks are not learned features, embeddings, or measured latent dimensions. The running model uses the structured state.',
                    'Yalnızca kavramsal gösterim. Bu bloklar öğrenilmiş özellikler, gömmeler veya ölçülmüş gizil boyutlar değildir. Çalışan model yapılandırılmış durum kullanır.',
                  )}
                </p>
              </div>
            ) : (
              <>
                <p className="muted small">
                  {say(
                    locale,
                    'Positions in metres · velocity in m/s. Memory weight is a heuristic, not probability.',
                    'Konum: metre · hız: m/s. Bellek ağırlığı sezgiseldir; olasılık değildir.',
                  )}
                </p>
                <TermHelp id="memory" locale={locale} />
                <div className="belief-table">
                  {engine.belief.objects
                    .filter((o) => !['floor', 'goal', 'ramp'].includes(o.kind))
                    .map((o) => (
                      <div className="belief-row" key={o.id}>
                        <div>
                          <strong>{objectName(o.id, locale)}</strong>
                          <span className="visibility">
                            {o.visible ? (
                              <Eye size={13} />
                            ) : (
                              <EyeOff size={13} />
                            )}{' '}
                            {o.visible
                              ? say(locale, 'Seen', 'Görülüyor')
                              : say(locale, 'Remembered', 'Hatırlanıyor')}
                          </span>
                        </div>
                        <code>
                          x {o.position[0].toFixed(2)} · z{' '}
                          {o.position[2].toFixed(2)}
                        </code>
                        <small>
                          v {Math.hypot(...o.velocity).toFixed(2)} ·{' '}
                          {say(locale, 'memory', 'bellek')}{' '}
                          {o.confidence.toFixed(2)}
                        </small>
                      </div>
                    ))}
                </div>
                <p className="small muted">
                  {say(
                    locale,
                    'Objects never observed are absent from this table.',
                    'Hiç gözlenmemiş nesneler bu tabloda yer almaz.',
                  )}
                </p>
              </>
            )}
            <div className="model-note">
              <span className="section-label">
                {say(locale, 'BELIEF CORRECTION', 'İNANÇ DÜZELTMESİ')}
              </span>
              <strong className="innovation">
                {engine.belief.innovation.toFixed(3)} <small>m</small>
              </strong>
              <p>
                {say(
                  locale,
                  'Distance from the previous estimate to the newest visible measurement.',
                  'Önceki tahmin ile en yeni görünür ölçüm arasındaki mesafe.',
                )}
              </p>
            </div>
            {engine.belief.lastCorrection && (
              <div className="correction-event">
                <span className="section-label">
                  {say(
                    locale,
                    'LAST EVIDENCE UPDATE',
                    'SON KANIT GÜNCELLEMESİ',
                  )}
                </span>
                <strong>
                  {objectName(engine.belief.lastCorrection.objectId, locale)} ·
                  t = {(engine.belief.lastCorrection.tick / 60).toFixed(2)} s
                </strong>
                <p>
                  {say(locale, 'Expected', 'Beklenen')}:{' '}
                  <code>
                    {engine.belief.lastCorrection.expected[0].toFixed(2)},{' '}
                    {engine.belief.lastCorrection.expected[2].toFixed(2)}
                  </code>
                  <br />
                  {say(
                    locale,
                    'Observed → new belief',
                    'Gözlenen → yeni inanç',
                  )}
                  :{' '}
                  <code>
                    {engine.belief.lastCorrection.observed[0].toFixed(2)},{' '}
                    {engine.belief.lastCorrection.observed[2].toFixed(2)}
                  </code>
                </p>
                <p>
                  {engine.belief.lastCorrection.error.toFixed(3)} m ·{' '}
                  {say(
                    locale,
                    'correction at observation (x, z)',
                    'gözlem anındaki düzeltme (x, z)',
                  )}
                </p>
              </div>
            )}
          </>
        )}
        {tab === 'learn' && (
          <>
            <div className="section-label">
              {say(locale, 'FIELD NOTES', 'DENEY NOTLARI')}
            </div>
            <h2>{say(locale, 'Make the connection.', 'Bağlantıyı kur.')}</h2>
            {questions.map((q, i) => (
              <section className="lesson-question" key={i}>
                <h3>{headings[i]}</h3>
                <p>{q}</p>
              </section>
            ))}
            <a
              className="research-link"
              href={`https://wfm.aserdargun.com/en/concepts/${topic}`}
              target="_blank"
              rel="noreferrer"
            >
              {say(
                locale,
                'Explore the concept in WFM (EN)',
                'Kavramı WFM’de incele (EN)',
              )}
              <ArrowUpRight size={15} />
            </a>
          </>
        )}
      </div>
    </aside>
  )
}
