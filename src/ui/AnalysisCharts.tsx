import type { Vec3 } from '../core'
import { say, type Locale } from './i18n'
export interface PlotSeries {
  id: string
  label: string
  color: string
  dash?: string
  points: { x: number; y: number }[]
  probe?: { x: number; y: number }
}
export function ScientificPlot({
  series,
  xLabel,
  yLabel,
  locale,
  domainX,
  probeX,
  goal,
  kind,
  probeLabel,
}: {
  series: PlotSeries[]
  xLabel: string
  yLabel: string
  locale: Locale
  domainX?: [number, number]
  probeX?: number
  goal?: Vec3
  kind: 'error' | 'path'
  probeLabel?: string
}) {
  const values = series.flatMap((s) => s.points),
    xValues = values.map((p) => p.x),
    yValues = values.map((p) => p.y)
  if (goal) {
    xValues.push(goal[0])
    yValues.push(goal[2])
  }
  const rawMinX = domainX?.[0] ?? Math.min(0, ...xValues),
    rawMaxX = domainX?.[1] ?? Math.max(1, ...xValues)
  const rawMinY = kind === 'error' ? 0 : Math.min(-1, ...yValues),
    rawMaxY = Math.max(kind === 'error' ? 0.1 : 1, ...yValues)
  const xPad = domainX ? 0 : Math.max(0.25, (rawMaxX - rawMinX) * 0.08),
    yPad =
      kind === 'error'
        ? Math.max(0.02, rawMaxY * 0.12)
        : Math.max(0.25, (rawMaxY - rawMinY) * 0.1)
  let minX = rawMinX - xPad,
    maxX = rawMaxX + xPad,
    minY = kind === 'error' ? 0 : rawMinY - yPad,
    maxY = rawMaxY + yPad
  if (kind === 'path') {
    const ratio = 550 / 184,
      width = maxX - minX,
      height = maxY - minY
    if (width / height < ratio) {
      const pad = (height * ratio - width) / 2
      minX -= pad
      maxX += pad
    } else {
      const pad = (width / ratio - height) / 2
      minY -= pad
      maxY += pad
    }
  }
  const x = (v: number) => 52 + ((v - minX) / (maxX - minX || 1)) * 550,
    y = (v: number) => 220 - ((v - minY) / (maxY - minY || 1)) * 184
  const yDecimals = (maxY - minY) / 4 < 0.1 ? 2 : 1
  return (
    <figure className="scientific-plot">
      <svg
        viewBox="0 0 630 260"
        role="img"
        aria-label={
          kind === 'error'
            ? say(
                locale,
                'Position error over time. Values and exact samples are also available in the comparison table and export.',
                'Zamana göre konum hatası. Değerler ve kesin örnekler karşılaştırma tablosunda ve dışa aktarmada da bulunur.',
              )
            : say(
                locale,
                'Top-down forecast paths. Height is omitted; the comparison errors use three dimensions.',
                'Üstten tahmin yolları. Yükseklik gösterilmez; karşılaştırma hataları üç boyutu kullanır.',
              )
        }
      >
        <rect x="52" y="36" width="550" height="184" fill="#f6f7f0" />
        {Array.from({ length: 5 }, (_, i) => {
          const v = minY + ((maxY - minY) * i) / 4
          return (
            <g key={`y${i}`}>
              <line
                x1="52"
                x2="602"
                y1={y(v)}
                y2={y(v)}
                stroke="#dce3d2"
                strokeDasharray="2 4"
              />
              <text x="42" y={y(v) + 3} textAnchor="end">
                {v.toFixed(yDecimals)}
              </text>
            </g>
          )
        })}
        {Array.from({ length: 5 }, (_, i) => {
          const v = minX + ((maxX - minX) * i) / 4
          return (
            <g key={`x${i}`}>
              <line x1={x(v)} x2={x(v)} y1="36" y2="220" stroke="#e4e9da" />
              <text x={x(v)} y="239" textAnchor="middle">
                {v.toFixed(1)}
              </text>
            </g>
          )
        })}
        {series.map((s) => (
          <g key={s.id}>
            {s.points.length > 1 && (
              <polyline
                points={s.points
                  .map((p) => `${x(p.x).toFixed(2)},${y(p.y).toFixed(2)}`)
                  .join(' ')}
                fill="none"
                stroke={s.color}
                strokeWidth={
                  s.id === 'actual' ? 2.8 : s.id.startsWith('sample') ? 1.1 : 2
                }
                strokeDasharray={s.dash}
                opacity={s.id.startsWith('sample') ? 0.5 : 1}
                strokeLinejoin="round"
              />
            )}
            {s.points.length > 0 && (
              <circle
                cx={x(s.points.at(-1)!.x)}
                cy={y(s.points.at(-1)!.y)}
                r={s.id.startsWith('sample') ? 2 : 3}
                fill={s.color}
              />
            )}
            {s.probe && (
              <circle
                data-testid="forecast-time-marker"
                data-series={s.id}
                cx={x(s.probe.x)}
                cy={y(s.probe.y)}
                r={s.id === 'actual' ? 3 : 5}
                fill={s.id === 'actual' ? s.color : '#fdfdf6'}
                stroke={s.color}
                strokeWidth="2"
              />
            )}
          </g>
        ))}
        {probeX !== undefined && (
          <line
            data-testid="chart-probe"
            x1={x(probeX)}
            x2={x(probeX)}
            y1="31"
            y2="224"
            stroke="#879978"
            strokeDasharray="3 3"
          />
        )}
        {goal && (
          <g>
            <circle
              cx={x(goal[0])}
              cy={y(goal[2])}
              r="7"
              fill="none"
              stroke="#567b43"
              strokeWidth="1.5"
            />
            <path
              d={`M${x(goal[0]) - 4},${y(goal[2])}h8 M${x(goal[0])},${y(goal[2]) - 4}v8`}
              stroke="#567b43"
            />
          </g>
        )}
        <text x="52" y="18" className="axis-label">
          {yLabel}
        </text>
        <text x="602" y="257" textAnchor="end" className="axis-label">
          {xLabel}
        </text>
      </svg>
      <figcaption>
        {series
          .filter((s) => !s.id.startsWith('sample'))
          .map((s) => (
            <span key={s.id}>
              <svg viewBox="0 0 24 8" aria-hidden="true">
                <line
                  x1="0"
                  x2="24"
                  y1="4"
                  y2="4"
                  stroke={s.color}
                  strokeWidth="2"
                  strokeDasharray={s.dash}
                />
              </svg>
              {s.label}
            </span>
          ))}
        {series.some((s) => s.id.startsWith('sample')) && (
          <span>
            <i className="sample-key" />
            {say(locale, '9 parameter samples', '9 parametre örneği')}
          </span>
        )}
        {probeLabel && (
          <span>
            <i className="probe-key" />
            {probeLabel}
          </span>
        )}
      </figcaption>
    </figure>
  )
}
