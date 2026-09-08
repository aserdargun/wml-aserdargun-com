import { useCallback, useEffect, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Box,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { LabEngine, type ModelId, type ScenarioId } from './core'
import { Stage } from './ui/Stage'
import { Measurements } from './ui/Measurements'
import { ExperimentControls } from './ui/ExperimentControls'
import { AnalysisPanel, type AnalysisView } from './ui/AnalysisPanel'
import { TermHelp } from './education/TermHelp'
import { Inspector } from './ui/Inspector'
import { Timeline } from './ui/Timeline'
import { chapters, scenarioContent, type Lens } from './lessons/content'
import { say, type Locale } from './ui/i18n'
export default function App() {
  const [locale, setLocale] = useState<Locale>(() => {
    try {
      return localStorage.getItem('wml.locale') === 'tr' ? 'tr' : 'en'
    } catch {
      return 'en'
    }
  })
  const [engine, setEngine] = useState<LabEngine | null>(null),
    [error, setError] = useState('')
  const [revision, refresh] = useState(0),
    [playing, setPlaying] = useState(false)
  const [lens, setLens] = useState<Lens>('reality'),
    [model, setModel] = useState<ModelId>('dynamics'),
    [horizon, setHorizon] = useState(10)
  const [tab, setTab] = useState<'futures' | 'state' | 'learn'>('futures')
  const [showFov, setFov] = useState(false),
    [showLabels, setLabels] = useState(true),
    [cameraPreset, setCamera] = useState(0)
  const [lesson, setLesson] = useState<number | null>(null),
    [message, setMessage] = useState('')
  const [analysisView, setAnalysisView] = useState<AnalysisView>('off')
  const [expandedStage, setExpandedStage] = useState(false)
  const [completed, setCompleted] = useState<Record<string, boolean>>({})
  useEffect(() => {
    let disposed = false
    let instance: LabEngine | undefined
    LabEngine.create('planning')
      .then((e) => {
        instance = e
        if (disposed) e.dispose()
        else setEngine(e)
      })
      .catch((e) => setError(String(e)))
    return () => {
      disposed = true
      instance?.dispose()
    }
  }, [])
  useEffect(() => {
    document.documentElement.lang = locale
    try {
      localStorage.setItem('wml.locale', locale)
    } catch {
      /* Preferences are optional. */
    }
  }, [locale])
  useEffect(() => {
    if (!engine || !playing) return
    let id = 0,
      last = performance.now(),
      accumulator = 0,
      lastUi = 0
    const frame = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1)
      last = now
      if (playing) {
        accumulator += delta
        let steps = 0
        while (accumulator >= 1 / 60 && steps++ < 6) {
          engine.step()
          accumulator -= 1 / 60
        }
        if (engine.state.success || engine.state.time >= 18) setPlaying(false)
      }
      if (now - lastUi > 100) {
        refresh((n) => n + 1)
        lastUi = now
      }
      id = requestAnimationFrame(frame)
    }
    id = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(id)
  }, [engine, playing])
  const touch = useCallback(() => refresh((n) => n + 1), [])
  const switchLens = (next: Lens) => {
    setLens(next)
    if (next === 'belief' || next === 'observation') setTab('state')
    if (next === 'imagination') setTab('futures')
  }
  const reset = (id?: ScenarioId) => {
    if (!engine) return
    setPlaying(false)
    engine.reset(id)
    setAnalysisView('off')
    setCompleted({})
    setError('')
    setMessage('')
    touch()
  }
  const predict = () => {
    if (!engine) return
    setPlaying(false)
    try {
      engine.predict(model, horizon)
      setAnalysisView('off')
      switchLens('imagination')
      setCompleted((c) => ({ ...c, predict: true }))
      setMessage(
        say(
          locale,
          'Prediction saved. Reality has not advanced.',
          'Tahmin kaydedildi. Gerçeklik ilerlemedi.',
        ),
      )
      touch()
    } catch (e) {
      setError(String(e))
    }
  }
  const plan = () => {
    if (!engine) return
    setPlaying(false)
    try {
      engine.plan(model, horizon)
      setAnalysisView('off')
      switchLens('imagination')
      setCompleted((c) => ({ ...c, plan: true, predict: true }))
      setMessage(
        say(
          locale,
          'Four futures evaluated. Select a route, then Act.',
          'Dört gelecek değerlendirildi. Bir rota seç, ardından Uygula.',
        ),
      )
      touch()
    } catch (e) {
      setError(String(e))
    }
  }
  const act = () => {
    if (!engine) return
    engine.act()
    setPlaying(true)
    setCompleted((c) => ({ ...c, act: true }))
    setMessage(
      say(
        locale,
        'Action is executing in the physics world.',
        'Eylem fizik dünyasında yürütülüyor.',
      ),
    )
    touch()
  }
  const rewind = (i: number) => {
    if (!engine) return
    setPlaying(false)
    engine.rewind(i)
    setMessage(
      say(
        locale,
        'Physics, controller and belief restored. Branch to try another action.',
        'Fizik, denetleyici ve inanç geri yüklendi. Başka eylem için dal oluştur.',
      ),
    )
    touch()
  }
  const fork = () => {
    if (!engine) return
    setPlaying(false)
    engine.fork()
    setMessage(
      say(
        locale,
        'A new branch begins here. The previous trajectory is preserved as a dotted trace.',
        'Buradan yeni bir dal başlıyor. Önceki yörünge noktalı iz olarak korundu.',
      ),
    )
    touch()
  }
  const startLesson = () => {
    reset('planning')
    setLesson(0)
    switchLens('reality')
  }
  const guide = chapters(locale),
    chapter = lesson === null ? null : guide[lesson]
  const changeChapter = (index: number) => {
    setLesson(index)
    switchLens(guide[index].lens)
  }
  const done =
    chapter?.task === 'view' ||
    !!completed[chapter?.task || ''] ||
    (chapter?.task === 'error' && (engine?.metrics.comparedSamples || 0) > 10)
  const scenarios = scenarioContent(locale),
    scenario =
      scenarios.find((s) => s.id === engine?.state.scenario) || scenarios[0]
  if (!engine)
    return (
      <div className="boot">
        <span className="brand-symbol">
          <Box />
        </span>
        <h1>World Model Laboratory</h1>
        <p>
          {error ||
            say(
              locale,
              'Preparing the physics laboratory…',
              'Fizik laboratuvarı hazırlanıyor…',
            )}
        </p>
        {error && (
          <button onClick={() => location.reload()}>
            {say(locale, 'Retry', 'Tekrar dene')}
          </button>
        )}
      </div>
    )
  return (
    <div className="app-shell">
      <a className="skip-link" href="#laboratory">
        {say(locale, 'Skip to laboratory', 'Laboratuvara geç')}
      </a>
      <header className="site-header">
        <a href="/" className="brand" aria-label="WML — World Model Laboratory">
          <span className="brand-symbol">
            <Box size={23} />
          </span>
          <b>WML</b>
          <span className="brand-name">
            World Model
            <br />
            Laboratory
          </span>
        </a>
        <nav aria-label={say(locale, 'Primary navigation', 'Ana gezinme')}>
          <button
            className={lesson === null ? 'nav-active' : ''}
            onClick={() => setLesson(null)}
          >
            {say(locale, 'Laboratory', 'Laboratuvar')}
          </button>
          <button
            className={lesson !== null ? 'nav-active' : ''}
            onClick={startLesson}
          >
            World Model 101
            <span className="nav-dot" />
          </button>
        </nav>
        <div className="header-end">
          <a
            className="wfm-link"
            href="https://wfm.aserdargun.com/en/"
            target="_blank"
            rel="noreferrer"
          >
            WFM <span>{say(locale, 'Research', 'Araştırma')}</span>
            <ArrowUpRight size={14} />
          </a>
          <button
            className="locale"
            onClick={() => setLocale(locale === 'en' ? 'tr' : 'en')}
            aria-label={locale === 'en' ? 'Türkçeye geç' : 'Switch to English'}
          >
            {locale === 'en' ? 'TR' : 'EN'}
          </button>
        </div>
      </header>
      <div className="workspace">
        <aside className="experiment-rail">
          <div className="rail-heading">
            {say(locale, 'THE MICROVERSE', 'MİKRO EVREN')}
          </div>
          <div className="experiment-links">
            {scenarios.map((s) => (
              <button
                key={s.id}
                className={scenario.id === s.id ? 'active' : ''}
                onClick={() => {
                  reset(s.id)
                  setLesson(null)
                  switchLens(s.id === 'occlusion' ? 'observation' : 'reality')
                  setTab(s.id === 'occlusion' ? 'state' : 'futures')
                }}
              >
                <span>{s.n}</span>
                <div>
                  <strong>{s.name}</strong>
                  <small>{s.concept}</small>
                </div>
                <ArrowRight size={14} />
              </button>
            ))}
          </div>
          <div className="rail-bottom">
            <span className="orbit-mark" aria-hidden="true">
              ◎
            </span>
            <p>
              {say(locale, 'World model', 'Dünya modeli')}
              <br />
              <b>≠ {say(locale, 'world.', 'dünya.')}</b>
            </p>
            <span>
              {say(
                locale,
                'A small world for big ideas.',
                'Büyük fikirler için küçük bir dünya.',
              )}
            </span>
            <button onClick={startLesson}>
              {say(locale, 'Take the guided tour', 'Rehberli tura başla')}
              <ArrowRight size={14} />
            </button>
          </div>
        </aside>
        <main id="laboratory" className="laboratory">
          <div className="intro">
            <div>
              <h1>{scenario.title}</h1>
              <p>{scenario.description}</p>
            </div>
            <div className="experiment-number">
              {say(locale, 'EXPERIMENT', 'DENEY')}
              <b>
                {scenario.n}
                <span>/ 04</span>
              </b>
            </div>
          </div>
          {chapter && (
            <section className="guided">
              <div className="guided-progress">
                {String((lesson || 0) + 1).padStart(2, '0')}
                <span>/10</span>
              </div>
              <div className="guided-copy">
                <strong>{chapter.title}</strong>
                <p>{chapter.text}</p>
                {!done && (
                  <span>
                    {say(
                      locale,
                      'Complete the action to continue.',
                      'Devam etmek için eylemi tamamla.',
                    )}
                  </span>
                )}
                {lesson === 9 && (
                  <b className="guide-finish">
                    Observe. Imagine. Predict. Act. Learn.
                  </b>
                )}
              </div>
              <div className="guided-controls">
                <button
                  disabled={lesson === 0}
                  onClick={() => changeChapter((lesson || 0) - 1)}
                  aria-label={say(locale, 'Previous chapter', 'Önceki bölüm')}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  disabled={!done}
                  onClick={() =>
                    lesson === 9
                      ? setLesson(null)
                      : changeChapter((lesson || 0) + 1)
                  }
                  aria-label={say(locale, 'Next chapter', 'Sonraki bölüm')}
                >
                  {lesson === 9 ? <CheckIcon /> : <ChevronRight size={18} />}
                </button>
                <button
                  onClick={() => setLesson(null)}
                  aria-label={say(locale, 'Close guide', 'Rehberi kapat')}
                >
                  <X size={17} />
                </button>
              </div>
            </section>
          )}
          <div className={`lab-grid${expandedStage ? ' expanded-stage' : ''}`}>
            <div className="stage-column">
              <Stage
                engine={engine}
                locale={locale}
                lens={lens}
                switchLens={switchLens}
                showFov={showFov}
                setFov={setFov}
                showLabels={showLabels}
                setLabels={setLabels}
                cameraPreset={cameraPreset}
                setCamera={setCamera}
                revision={revision}
                analysisView={analysisView}
                playing={playing}
                expanded={expandedStage}
                onExpand={() => setExpandedStage((v) => !v)}
                onSelectAction={(action) => {
                  engine.selectAction(action)
                  touch()
                }}
              />
              <div className="action-strip">
                <div className="model-select">
                  <label htmlFor="model">
                    {say(locale, 'WORLD MODEL', 'DÜNYA MODELİ')}
                    <TermHelp id="worldModel" locale={locale} />
                  </label>
                  <select
                    id="model"
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value as ModelId)
                      setMessage(
                        say(
                          locale,
                          'Model changed. Generate a new prediction to compare.',
                          'Model değişti. Karşılaştırmak için yeni tahmin üret.',
                        ),
                      )
                    }}
                  >
                    <option value="dynamics">
                      {say(locale, 'Simple dynamics', 'Basit dinamikler')}
                    </option>
                    <option value="constant">
                      {say(locale, 'Constant velocity', 'Sabit hız')}
                    </option>
                    <option value="biased">
                      {say(locale, 'Biased dynamics', 'Yanlı dinamikler')}
                    </option>
                  </select>
                </div>
                <button
                  className="button-secondary predict-button"
                  onClick={predict}
                >
                  {say(locale, 'Predict', 'Tahmin et')}
                </button>
                <button className="button-plan" onClick={plan}>
                  <Sparkles size={16} />
                  {say(locale, 'Plan', 'Planla')}
                </button>
                <button
                  className="button-act"
                  onClick={act}
                  disabled={
                    !engine.predictions.find(
                      (p) => p.action === engine.selectedAction,
                    )?.samples.length ||
                    playing ||
                    engine.predictions[0]?.startTick !== engine.state.tick
                  }
                >
                  {say(locale, 'Act', 'Uygula')}
                  <ArrowRight size={16} />
                </button>
              </div>
              <div className="live-message" role="status">
                {error ||
                  (engine.state.success
                    ? say(
                        locale,
                        'Target reached. Rewind to compare another action.',
                        'Hedefe ulaşıldı. Başka eylemi karşılaştırmak için geri sar.',
                      )
                    : playing
                      ? say(
                          locale,
                          'Simulated reality is running.',
                          'Simüle edilen gerçeklik ilerliyor.',
                        )
                      : engine.state.tick > 0
                        ? say(
                            locale,
                            'Paused. Inspect the evidence, or rewind to a decision point.',
                            'Duraklatıldı. Kanıtı incele veya bir karar noktasına geri sar.',
                          )
                        : message) ||
                  say(
                    locale,
                    'Start with Plan. Nothing moves until you act.',
                    'Planla ile başla. Eyleme geçene kadar hiçbir şey hareket etmez.',
                  )}
              </div>
              {(scenario.id === 'surprise' || scenario.id === 'occlusion') && (
                <button
                  className="surprise-button"
                  disabled={
                    scenario.id === 'occlusion' &&
                    engine.observation.visibleIds.includes('ball')
                  }
                  onClick={() => {
                    engine.surprise()
                    setMessage(
                      say(
                        locale,
                        'Unexpected impulse applied. The old prediction stays visible.',
                        'Beklenmedik itki uygulandı. Eski tahmin görünür kalır.',
                      ),
                    )
                    touch()
                  }}
                >
                  <Zap size={17} />
                  {say(locale, 'Apply surprise impulse', 'Sürpriz itki uygula')}
                </button>
              )}
              <Timeline
                engine={engine}
                locale={locale}
                playing={playing}
                toggle={() => {
                  if (engine.state.time >= 18)
                    setMessage(
                      say(
                        locale,
                        'Rewind or reset to run again.',
                        'Yeniden çalıştırmak için geri sar veya sıfırla.',
                      ),
                    )
                  else setPlaying(!playing)
                }}
                step={() => {
                  setPlaying(false)
                  engine.step(6)
                  touch()
                }}
                reset={() => reset()}
                rewind={rewind}
                fork={fork}
                switchBranch={(id) => {
                  setPlaying(false)
                  engine.switchBranch(id)
                  setMessage('')
                  setAnalysisView(engine.analysis ? 'models' : 'off')
                  touch()
                }}
              />
            </div>
            <Inspector
              engine={engine}
              locale={locale}
              model={engine.predictions[0]?.model ?? model}
              choose={(a) => {
                engine.selectAction(a)
                touch()
              }}
              tab={tab}
              setTab={setTab}
              questions={scenario.questions}
              topic={scenario.topic}
            />
          </div>
          <Measurements engine={engine} locale={locale} />
          <AnalysisPanel
            engine={engine}
            locale={locale}
            view={analysisView}
            setView={(view) => {
              setAnalysisView(view)
              if (view !== 'off') switchLens('imagination')
            }}
            analyze={(spread, view) => {
              engine.analyze(spread)
              setAnalysisView(view)
              switchLens('imagination')
              touch()
            }}
          />
          <ExperimentControls
            engine={engine}
            locale={locale}
            horizon={horizon}
            setHorizon={setHorizon}
            setPlaying={setPlaying}
            touch={touch}
          />
          <footer className="lab-footer">
            <p>
              {say(
                locale,
                'WML uses simplified educational predictors, not learned foundation world models.',
                'WML, öğrenilmiş temel dünya modelleri yerine basitleştirilmiş eğitsel tahmin modelleri kullanır.',
              )}
            </p>
            <span>Observe. Imagine. Predict. Act. Learn.</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
function CheckIcon() {
  return <span>✓</span>
}
