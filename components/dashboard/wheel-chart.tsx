import type { WheelSlice } from "@/lib/wheels"

const WIDTH = 1000
const HEIGHT = 660
const CX = WIDTH / 2
const CY = HEIGHT / 2
const OUTER = 200
const INNER = 56
const GAP = (1.2 * Math.PI) / 180
const NAME_MAX = 18

function at(radius: number, angle: number) {
  return [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)] as const
}

function slicePath(start: number, end: number, inner: number, outer: number) {
  const [ox1, oy1] = at(outer, start)
  const [ox2, oy2] = at(outer, end)
  const [ix2, iy2] = at(inner, end)
  const [ix1, iy1] = at(inner, start)
  const large = end - start > Math.PI ? 1 : 0
  return `M${ox1} ${oy1} A${outer} ${outer} 0 ${large} 1 ${ox2} ${oy2} L${ix2} ${iy2} A${inner} ${inner} 0 ${large} 0 ${ix1} ${iy1}Z`
}

function shortName(name: string) {
  return name.length > NAME_MAX ? `${name.slice(0, NAME_MAX - 1)}\u2026` : name
}

/** A ring of equal slices. Each slice fills outward from the center to its own figure, and one without a figure stays empty. */
export function WheelChart({ title, centerLabel, slices }: { title: string; centerLabel: string; slices: WheelSlice[] }) {
  const step = (Math.PI * 2) / Math.max(slices.length, 1)
  const gap = slices.length > 1 ? GAP : 0

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={title} className="h-auto w-full">
        <circle cx={CX} cy={CY} r={OUTER} className="fill-none stroke-line" strokeDasharray="3 6" />
        {slices.map((slice, index) => {
          const start = -Math.PI / 2 + index * step + gap / 2
          const end = -Math.PI / 2 + (index + 1) * step - gap / 2 - (slices.length === 1 ? 0.001 : 0)
          const mid = (start + end) / 2
          const [lx, ly] = at(OUTER + 18, mid)
          const side = Math.cos(mid)
          const anchor = side > 0.25 ? "start" : side < -0.25 ? "end" : "middle"
          const dy = Math.sin(mid) > 0.6 ? "0.8em" : Math.sin(mid) < -0.6 ? "0" : "0.35em"
          const reach = slice.fill === null ? INNER : INNER + (OUTER - INNER) * slice.fill
          return (
            <g key={slice.id}>
              {slice.fill !== null && slice.fill > 0 ? (
                <path d={slicePath(start, end, INNER, reach)} fill={slice.color} fillOpacity={0.95} />
              ) : null}
              <path
                d={slicePath(start, end, INNER, OUTER)}
                fill="none"
                stroke={slice.color}
                strokeWidth={6}
                strokeLinejoin="round"
                opacity={0.9}
              />
              <path
                d={slicePath(start, end, INNER, OUTER)}
                fill="none"
                strokeLinejoin="round"
                strokeWidth={1.5}
                className="stroke-ink-soft"
              />
              <text x={lx} y={ly} textAnchor={anchor} dy={dy} fontSize={26} className="fill-ink font-medium">
                {shortName(slice.name)}
                {slice.value ? (
                  <tspan dx={8} className="fill-accent font-semibold tabular-nums">
                    {slice.value}
                  </tspan>
                ) : null}
              </text>
            </g>
          )
        })}
        {slices.length === 0 ? (
          <text x={CX} y={CY} textAnchor="middle" fontSize={26} className="fill-ink-soft">
            No sectors yet
          </text>
        ) : (
          <>
            <circle cx={CX} cy={CY} r={INNER - 6} className="fill-board stroke-line" />
            <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central" fontSize={20} className="fill-ink-soft">
              {centerLabel}
            </text>
          </>
        )}
      </svg>
      <ul className="sr-only">
        {slices.map((slice) => (
          <li key={slice.id}>
            {slice.name}: {slice.spoken}
          </li>
        ))}
      </ul>
    </div>
  )
}
