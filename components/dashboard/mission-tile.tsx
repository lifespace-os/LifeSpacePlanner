import {
  IKIGAI,
  IKIGAI_CIRCLES,
  IKIGAI_LABEL_REACH,
  IKIGAI_SIZE,
  ikigaiCircleOffset,
  type IkigaiCircleId,
  type IkigaiOverlapId,
  type IkigaiRegionId,
} from "@/lib/board-data"
import { MISSION_REGIONS, type MissionCounts } from "@/lib/mission-counts"

const HALF = IKIGAI_SIZE / 2

export const TONES: Record<IkigaiCircleId, { fill: string; edge: string }> = {
  love: { fill: "#f3cdd1", edge: "#d9a0a8" },
  "good-at": { fill: "#d1e2ec", edge: "#9fbfd2" },
  income: { fill: "#f7e8a4", edge: "#dcc56a" },
  needed: { fill: "#d6e5c9", edge: "#aac596" },
}

export const NAMES: Record<IkigaiRegionId, string> = {
  love: "Love",
  "good-at": "Good at",
  income: "Income",
  needed: "Needed",
  passion: "Passion",
  profession: "Profession",
  work: "Work",
  vocation: "Vocation",
  ikigai: "Ikigai",
}

const OVERLAP_SIDES: Record<IkigaiOverlapId, [number, number]> = {
  passion: [-1, -1],
  vocation: [1, -1],
  work: [1, 1],
  profession: [-1, 1],
}

/** Where the label of a region sits, in diagram units. */
export function labelAt(id: IkigaiRegionId): { x: number; y: number } {
  if (id === "ikigai") return { x: HALF, y: HALF }
  if (id in OVERLAP_SIDES) {
    const [sx, sy] = OVERLAP_SIDES[id as IkigaiOverlapId]
    return { x: HALF + sx * 164, y: HALF + sy * 164 }
  }
  const offset = ikigaiCircleOffset(id as IkigaiCircleId)
  const scale = IKIGAI_LABEL_REACH / IKIGAI.d
  return { x: HALF + offset.x * scale, y: HALF + offset.y * scale }
}

function circleCenter(id: IkigaiCircleId) {
  const offset = ikigaiCircleOffset(id)
  return { cx: HALF + offset.x, cy: HALF + offset.y }
}

function cards(count: number) {
  return `${count} ${count === 1 ? "card" : "cards"}`
}

export function MissionTile({ counts }: { counts: MissionCounts }) {
  const marks = [
    { id: "keep", name: "Keep", value: counts.keep },
    { id: "release", name: "Release", value: counts.release },
    { id: "none", name: "No mark", value: counts.none },
  ]

  return (
    <div className="flex flex-col items-center gap-6 rounded-xl border border-line bg-card p-4 md:flex-row md:items-center md:gap-10 md:p-6">
      <svg
        viewBox={`0 0 ${IKIGAI_SIZE} ${IKIGAI_SIZE}`}
        aria-hidden="true"
        className="aspect-square w-full max-w-[420px] shrink-0"
      >
        {IKIGAI_CIRCLES.map((id) => (
          <circle
            key={id}
            {...circleCenter(id)}
            r={IKIGAI.r}
            fill={TONES[id].fill}
            fillOpacity={0.35}
            stroke={TONES[id].edge}
            strokeWidth={3}
          />
        ))}
        {MISSION_REGIONS.map((id) => {
          const { x, y } = labelAt(id)
          const count = counts.regions[id]
          return (
            <g key={id} textAnchor="middle" className={count === 0 ? "opacity-60" : undefined}>
              <text x={x} y={y - 14} className="fill-ink-soft" fontSize={id === "ikigai" ? 22 : 26}>
                {NAMES[id]}
              </text>
              <text x={x} y={y + 38} className="fill-ink font-serif tabular-nums" fontSize={id === "ikigai" ? 56 : 66}>
                {count}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="flex w-full flex-col gap-3">
        <ul className="grid grid-cols-3 gap-3 md:grid-cols-1">
          {marks.map((mark) => (
            <li key={mark.id} className="rounded-xl border border-line px-4 py-3">
              <p className="text-sm text-ink-soft">{mark.name}</p>
              <p className="font-serif text-4xl leading-tight tabular-nums text-ink">{mark.value}</p>
            </li>
          ))}
        </ul>
        <p className="text-sm text-ink-soft text-pretty">
          {cards(counts.total)} in all, on the Whiteboard and in the Kanban. A card with two hashtags counts in both places.
        </p>
      </div>

      <ul className="sr-only">
        {MISSION_REGIONS.map((id) => (
          <li key={id}>
            {NAMES[id]}: {cards(counts.regions[id])}
          </li>
        ))}
      </ul>
    </div>
  )
}
