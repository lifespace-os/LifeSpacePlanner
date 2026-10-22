import type { CSSProperties } from "react"
import { GOAL_RING_TAGS, getCardColor, getGoalLevel, goalSectorStart, type GoalRing, type Note } from "@/lib/board-data"
import type { MapTileData } from "@/lib/map-tile"

const SECTOR = (2 * Math.PI) / 3
const DOT = 17

const halo: CSSProperties = {
  paintOrder: "stroke",
  stroke: "var(--color-card)",
  strokeWidth: 7,
  strokeLinejoin: "round",
}

function annulus(half: number, inner: number, outer: number) {
  const circle = (r: number) => `M ${half - r} ${half} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`
  return `${circle(outer)} ${circle(inner)}`
}

/** The Map without card text: the rings, one dot per card at its place on its ring, and the lines up to its goals. */
export function MapView({ map, notes, rings }: { map: MapTileData; notes: Note[]; rings: GoalRing[] }) {
  const { edges, half, points, threads } = map
  const size = half * 2
  const byId = new Map(notes.map((note) => [note.id, note]))

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Map. ${points.length} ${points.length === 1 ? "card" : "cards"} on ${rings.length} rings: ${rings
        .map((ring) => ring.name.toLowerCase())
        .join(", ")}.`}
      className="aspect-square w-full max-w-[720px]"
    >
      {rings.map(({ id }, ring) => (
        <path
          key={id}
          d={annulus(half, edges[ring], edges[ring + 1])}
          fillRule="evenodd"
          fill="var(--color-accent)"
          fillOpacity={0.035 + ring * 0.03}
          stroke="var(--color-line)"
          strokeWidth={3}
        />
      ))}
      {GOAL_RING_TAGS[0].map((tag, i) => (
        <line
          key={tag}
          x1={half + edges[0] * Math.cos(goalSectorStart(i))}
          y1={half + edges[0] * Math.sin(goalSectorStart(i))}
          x2={half + edges[1] * Math.cos(goalSectorStart(i))}
          y2={half + edges[1] * Math.sin(goalSectorStart(i))}
          stroke="var(--color-line)"
          strokeWidth={3}
        />
      ))}

      <circle cx={half} cy={half} r={edges[0]} strokeWidth={4} className="fill-card stroke-accent" />
      <text x={half} y={half} textAnchor="middle" dominantBaseline="central" fontSize={32} fontWeight={600} className="fill-ink">
        Mission
      </text>

      {rings.map(({ id, name }, ring) => (
        <text
          key={id}
          x={half}
          y={half - (edges[ring] + edges[ring + 1]) / 2 + 8}
          textAnchor="middle"
          fontSize={26}
          fontWeight={600}
          letterSpacing={1.5}
          className="fill-ink-soft"
          style={halo}
        >
          {name.toUpperCase()}
        </text>
      ))}
      {GOAL_RING_TAGS[0].map((tag, i) => {
        const angle = goalSectorStart(i) + SECTOR / 2
        return (
          <text
            key={tag}
            x={half + (edges[0] + 36) * Math.cos(angle)}
            y={half + (edges[0] + 36) * Math.sin(angle) + 8}
            textAnchor="middle"
            fontSize={24}
            className="fill-ink-soft"
            style={halo}
          >
            {getGoalLevel(tag)?.name}
          </text>
        )
      })}

      {threads.map((thread) => (
        <line
          key={thread.id}
          x1={thread.x1}
          y1={thread.y1}
          x2={thread.x2}
          y2={thread.y2}
          stroke="var(--color-accent)"
          strokeOpacity={0.75}
          strokeWidth={3.5}
          strokeLinecap="round"
        />
      ))}

      {points.map((point) => {
        const note = byId.get(point.id)
        if (!note) return null
        return (
          <circle
            key={point.id}
            cx={point.x}
            cy={point.y}
            r={DOT}
            fill={getCardColor(note.color).fill}
            stroke="var(--color-ink)"
            strokeWidth={3}
          />
        )
      })}
    </svg>
  )
}
