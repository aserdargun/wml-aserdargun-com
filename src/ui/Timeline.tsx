import { LabControlButton } from '@aserdargun/lab-ui'
import { manifest } from '../ils/catalog'
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  GitBranch,
  Rewind,
} from 'lucide-react'
import { TermHelp } from '../education/TermHelp'
import type { LabEngine } from '../core'
import { actionName, say, type Locale } from './i18n'
interface Props {
  engine: LabEngine
  locale: Locale
  playing: boolean
  toggle: () => void
  step: () => void
  reset: () => void
  rewind: (frame: number) => void
  fork: () => void
  switchBranch: (id: string) => void
}
export function Timeline({
  engine,
  locale,
  playing,
  toggle,
  step,
  reset,
  rewind,
  fork,
  switchBranch,
}: Props) {
  const end = Math.max(0, engine.timeline.length - 1)
  return (
    <section
      className="timeline"
      aria-label={say(locale, 'Time travel', 'Zamanda yolculuk')}
    >
      <div className="timeline-top">
        <div>
          <span className="section-label">
            {say(locale, 'TIME TRAVEL', 'ZAMANDA YOLCULUK')}
            <TermHelp id="counterfactual" locale={locale} />
          </span>
          <span className="branch-id">
            {engine.currentBranchId} · {engine.branches.length}{' '}
            {say(locale, 'branches', 'dal')}
          </span>
        </div>
        <code data-testid="world-time">
          t = {engine.state.time.toFixed(2)} s
        </code>
      </div>
      <div className="timeline-track">
        <span>{say(locale, 'PAST', 'GEÇMİŞ')}</span>
        <input
          type="range"
          min={0}
          max={end}
          value={Math.min(engine.currentFrame, end)}
          onChange={(e) => rewind(+e.target.value)}
          disabled={end === 0}
          aria-label={say(
            locale,
            'Timeline position',
            'Zaman çizelgesi konumu',
          )}
        />
        <span>{say(locale, 'NOW', 'ŞİMDİ')}</span>
        <div className="future-dashes" />
        <span>{say(locale, 'IMAGINED', 'HAYAL')}</span>
      </div>
      <div className="timeline-bottom">
        <div className="transport">
          <LabControlButton action={playing ? 'pause' : 'play'} capabilities={manifest.capabilities} locale={locale} onClick={toggle}>
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </LabControlButton>
          <LabControlButton action="step" capabilities={manifest.capabilities} locale={locale} onClick={step} aria-label={say(locale, 'Step', 'Adımla')}>
            <SkipForward size={16} />
          </LabControlButton>
          <LabControlButton action="reset" capabilities={manifest.capabilities} locale={locale} onClick={reset}>
            <RotateCcw size={16} />
          </LabControlButton>
          <span className="transport-divider" />
          <LabControlButton action="rewind" capabilities={manifest.capabilities} locale={locale} aria-label={say(locale, 'Rewind', 'Geri sar')} title={say(locale, 'Restore the saved decision point', 'Kaydedilmiş karar noktasını geri yükle')} onClick={() => rewind(0)} disabled={!end}>
            <Rewind size={15} />
            {say(locale, 'Rewind', 'Geri sar')}
          </LabControlButton>
          <button onClick={fork} disabled={playing}>
            <GitBranch size={15} />
            {say(locale, 'Branch', 'Dal oluştur')}
          </button>
        </div>
        <p>
          {say(
            locale,
            'Rewind to a moment. Take a different action.',
            'Bir ana geri dön. Başka bir eylem seç.',
          )}
        </p>
      </div>
      {engine.branches.length > 1 && (
        <div className="branch-comparison">
          {engine.branches.map((b) => {
            const sample = (
              b.id === engine.currentBranchId
                ? b.trajectory.filter((s) => s.tick <= engine.state.tick)
                : b.trajectory
            ).at(-1)
            const distance = sample
              ? Math.hypot(
                  sample.position[0] - engine.state.goal[0],
                  sample.position[2] - engine.state.goal[2],
                )
              : null
            return (
              <button
                type="button"
                key={b.id}
                onClick={() => switchBranch(b.id)}
                aria-pressed={b.id === engine.currentBranchId}
                aria-label={`${say(locale, 'Restore', 'Geri yükle')} ${b.id}`}
                className="branch-record"
              >
                <span>
                  {b.id}{' '}
                  {b.id === engine.currentBranchId
                    ? say(locale, '· current', '· etkin')
                    : say(locale, '· recorded', '· kayıtlı')}
                </span>
                <strong>
                  {b.actions.at(-1)
                    ? actionName(
                        b.actions.at(-1)!.action,
                        locale,
                        engine.state.scenario,
                      )
                    : say(locale, 'No action', 'Eylem yok')}
                </strong>
                <code>
                  {distance?.toFixed(2) ?? '—'} m{' '}
                  {say(locale, 'to goal', 'hedefe')}
                </code>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
