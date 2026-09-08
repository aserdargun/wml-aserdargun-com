import { useMemo } from 'react'
import { Edges, Html, Line } from '@react-three/drei'
import type { ActionId, LabEngine, Vec3 } from '../core'
import type { Lens } from '../lessons/content'
import type { AnalysisView } from '../ui/AnalysisPanel'
import { say, type Locale } from '../ui/i18n'
import { modelAppearance } from './analysisStyle'

const actions: ActionId[] = ['direct', 'left', 'right', 'wait']
const colors = ['#b7755c', '#397c68', '#557fb3', '#9b875b']
function FutureShape({
  position,
  color,
  size,
  ball,
  primary,
}: {
  position: Vec3
  color: string
  size: Vec3
  ball: boolean
  primary: boolean
}) {
  return (
    <group position={position}>
      <mesh>
        {ball ? (
          <sphereGeometry args={[size[0], 24, 16]} />
        ) : (
          <boxGeometry args={size.map((n) => n * 2) as Vec3} />
        )}
        <meshStandardMaterial
          color={color}
          transparent
          opacity={primary ? 0.17 : 0.065}
          roughness={0.35}
          depthWrite={false}
        />
        {!ball && (
          <Edges color={color} linewidth={primary ? 1.7 : 1} threshold={30} />
        )}
      </mesh>
      {ball && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[size[0], primary ? 0.009 : 0.005, 5, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} />
        </mesh>
      )}
      {primary && (
        <>
          <Line
            points={[
              [0, -position[1] + 0.035, 0],
              [0, -size[1], 0],
            ]}
            color={color}
            lineWidth={1}
            dashed
            dashSize={0.04}
            gapSize={0.04}
            transparent
            opacity={0.65}
          />
          <mesh
            position={[0, -position[1] + 0.03, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry
              args={[
                Math.max(size[0], 0.22) + 0.06,
                Math.max(size[0], 0.22) + 0.085,
                48,
              ]}
            />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.5}
              depthWrite={false}
            />
          </mesh>
        </>
      )}
    </group>
  )
}
export function FutureTrails({
  engine,
  lens,
  locale,
  view,
  forecastTime,
  onSelectAction,
  showLabels,
}: {
  engine: LabEngine
  lens: Lens
  locale: Locale
  view: AnalysisView
  forecastTime: number
  onSelectAction: (a: ActionId) => void
  showLabels: boolean
}) {
  const analysis = engine.analysis,
    overlay = analysis && view !== 'off'
  const predictions = engine.predictions,
    comparison = engine.comparisonPrediction
  const sources = useMemo(
    () =>
      (overlay
        ? view === 'ensemble'
          ? analysis.ensemble.members.map((m) => ({
              id: m.id,
              p: m.prediction,
              color: '#667e9a',
              label: '',
              sample: true,
            }))
          : Object.entries(analysis.forecastByModel).map(([id, p]) => ({
              id,
              p,
              color: modelAppearance[p.model].color,
              label:
                p.model === 'constant'
                  ? say(locale, 'VELOCITY', 'HIZ')
                  : p.model === 'dynamics'
                    ? say(locale, 'DYNAMICS', 'DİNAMİK')
                    : say(locale, 'BIASED', 'YANLI'),
              sample: false,
            }))
        : (lens === 'imagination'
            ? predictions
            : comparison
              ? [comparison]
              : []
          ).map((p) => ({
            id: p.id,
            p,
            color: colors[actions.indexOf(p.action)],
            label: String.fromCharCode(65 + actions.indexOf(p.action)),
            sample: false,
          }))
      ).map((source) => ({
        ...source,
        points: source.p.samples.map(
          (sample) =>
            [
              sample.position[0],
              Math.max(sample.position[1], 0.08) + 0.022,
              sample.position[2],
            ] as Vec3,
        ),
      })),
    [analysis, overlay, predictions, comparison, lens, view, locale],
  )
  // Privileged physical history is never rendered in the agent's information views.
  if (lens === 'observation' || lens === 'belief') return null
  const actual = engine.actualTrajectory.filter(
    (s) => s.tick <= engine.state.tick,
  )
  return (
    <group>
      {sources.map(({ id, p, color, label, sample, points }) => {
        if (p.samples.length < 2) return null
        const primary = overlay ? !sample : p.action === engine.selectedAction
        const tick = p.startTick + Math.round(forecastTime * 60)
        const inspected = p.samples.reduce(
          (best, s) =>
            Math.abs(s.tick - tick) < Math.abs(best.tick - tick) ? s : best,
          p.samples[0],
        )
        const known = engine.belief.objects.find((o) => o.id === p.objectId)
        const size = known?.size ?? ([0.35, 0.35, 0.35] as Vec3)
        const labelIndex = Math.min(
          p.samples.length - 1,
          Math.round(p.samples.length * 0.2),
        )
        const anchor = p.samples[labelIndex].position
        const labelPosition = [
          anchor[0],
          anchor[1] +
            (p.action === 'wait' && !overlay ? 0.45 : 0) +
            0.72 +
            (overlay
              ? p.model === 'constant'
                ? 0.5
                : p.model === 'biased'
                  ? 0.25
                  : 0
              : 0),
          anchor[2],
        ] as Vec3
        return (
          <group key={id}>
            <Line
              points={points}
              color={color}
              lineWidth={sample ? 1 : primary ? 3 : 1.6}
              dashed
              dashSize={sample ? 0.055 : 0.14}
              gapSize={0.09}
              transparent
              opacity={sample ? 0.35 : primary ? 1 : 0.5}
            />
            {primary && (
              <Line
                points={points}
                color={color}
                lineWidth={8}
                dashed
                dashSize={0.14}
                gapSize={0.09}
                transparent
                opacity={0.07}
              />
            )}
            <FutureShape
              position={inspected.position}
              color={color}
              size={size}
              ball={p.objectId === 'ball'}
              primary={primary}
            />
            {!sample && lens === 'imagination' && showLabels && (
              <>
                <Line
                  points={[
                    [anchor[0], anchor[1] + 0.1, anchor[2]],
                    labelPosition,
                  ]}
                  color={color}
                  lineWidth={0.8}
                  transparent
                  opacity={0.45}
                />
                <Html position={labelPosition} center zIndexRange={[25, 0]}>
                  {overlay ? (
                    <span
                      className="future-beacon"
                      style={{ '--future-color': color } as React.CSSProperties}
                    >
                      {label}
                    </span>
                  ) : (
                    <button
                      className={`future-beacon ${primary ? 'is-selected' : ''}`}
                      style={{ '--future-color': color } as React.CSSProperties}
                      aria-label={say(
                        locale,
                        `Preview future ${label}`,
                        `${label} geleceğini önizle`,
                      )}
                      aria-pressed={primary}
                      onClick={() => onSelectAction(p.action)}
                    >
                      <b>{label}</b>
                      <span>
                        {say(
                          locale,
                          ['DIRECT', 'LEFT', 'RIGHT', 'WAIT'][
                            actions.indexOf(p.action)
                          ],
                          ['DOĞRUDAN', 'SOL', 'SAĞ', 'BEKLE'][
                            actions.indexOf(p.action)
                          ],
                        )}
                      </span>
                    </button>
                  )}
                </Html>
              </>
            )}
          </group>
        )
      })}
      {engine.branches
        .filter(
          (b) => b.id !== engine.currentBranchId && b.trajectory.length > 1,
        )
        .map((b) => (
          <Line
            key={b.id}
            points={b.trajectory.map(
              (s) =>
                [s.position[0], s.position[1] + 0.045, s.position[2]] as Vec3,
            )}
            color="#947595"
            lineWidth={2}
            dashed
            dashSize={0.025}
            gapSize={0.085}
          />
        ))}
      {actual.length > 1 && (
        <Line
          points={actual.map(
            (s) =>
              [s.position[0], s.position[1] + 0.035, s.position[2]] as Vec3,
          )}
          color="#1e4e43"
          lineWidth={3.5}
        />
      )}
    </group>
  )
}
