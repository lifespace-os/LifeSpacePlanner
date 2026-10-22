import type { LabelShareGroup, LabelShareSlice } from "@/lib/label-shares"

const SIZE = 200
const C = SIZE / 2
const OUTER = 92
const INNER = 58
const GAP = (1.6 * Math.PI) / 180

function at(radius: number, angle: number) {
  return [C + radius * Math.cos(angle), C + radius * Math.sin(angle)] as const
}

function arcPath(start: number, end: number) {
  const [ox1, oy1] = at(OUTER, start)
  const [ox2, oy2] = at(OUTER, end)
  const [ix2, iy2] = at(INNER, end)
  const [ix1, iy1] = at(INNER, start)
  const large = end - start > Math.PI ? 1 : 0
  return `M${ox1} ${oy1} A${OUTER} ${OUTER} 0 ${large} 1 ${ox2} ${oy2} L${ix2} ${iy2} A${INNER} ${INNER} 0 ${large} 0 ${ix1} ${iy1}Z`
}

function Ring({ slices, cards }: { slices: LabelShareSlice[]; cards: number }) {
  const drawn = slices.filter((slice) => slice.count > 0)
  const total = drawn.reduce((sum, slice) => sum + slice.count, 0)
  const gap = drawn.length > 1 ? GAP : 0
  let cursor = -Math.PI / 2

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true" className="mx-auto h-auto w-full max-w-[220px]">
      {total === 0 ? (
        <circle cx={C} cy={C} r={(OUTER + INNER) / 2} strokeWidth={OUTER - INNER} className="fill-none stroke-line" />
      ) : (
        drawn.map((slice) => {
          const span = (slice.count / total) * Math.PI * 2
          const start = cursor + gap / 2
          const end = cursor + span - gap / 2 - (drawn.length === 1 ? 0.001 : 0)
          cursor += span
          return slice.color ? (
            <path key={slice.id} d={arcPath(start, end)} fill={slice.color} />
          ) : (
            <path key={slice.id} d={arcPath(start, end)} className="fill-ink-soft/30" />
          )
        })
      )}
      <text x={C} y={C - 4} textAnchor="middle" dominantBaseline="central" fontSize={30} className="fill-ink font-serif tabular-nums">
        {cards}
      </text>
      <text x={C} y={C + 20} textAnchor="middle" dominantBaseline="central" fontSize={12} className="fill-ink-soft">
        {cards === 1 ? "card" : "cards"}
      </text>
    </svg>
  )
}

export function LabelsTile({ groups }: { groups: LabelShareGroup[] }) {
  return (
    <div className="grid gap-6 rounded-xl border border-line bg-card p-4 md:p-6 lg:grid-cols-3">
      {groups.map((group) => (
        <figure key={group.id} className="flex flex-col gap-3">
          <figcaption className="font-serif text-lg font-medium">{group.name}</figcaption>
          <Ring slices={group.slices} cards={group.cards} />
          <ul className="flex flex-col gap-1.5 text-sm">
            {group.slices.map((slice) => (
              <li key={slice.id} className={`flex items-center gap-2 ${slice.count === 0 ? "text-ink-soft" : "text-ink"}`}>
                <span
                  aria-hidden="true"
                  className={`size-3 shrink-0 rounded-full ${slice.color ? "" : "bg-ink-soft/30"}`}
                  style={slice.color ? { backgroundColor: slice.color } : undefined}
                />
                <span className="min-w-0 flex-1 truncate">{slice.name}</span>
                <span className="tabular-nums">
                  {slice.percent}%<span className="sr-only"> of the ring, </span>
                  <span aria-hidden="true"> · </span>
                  {slice.count}
                  <span className="sr-only">{slice.count === 1 ? " card" : " cards"}</span>
                </span>
              </li>
            ))}
          </ul>
        </figure>
      ))}
    </div>
  )
}
