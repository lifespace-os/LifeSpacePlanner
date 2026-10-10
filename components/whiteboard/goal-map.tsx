import { type CSSProperties } from "react"
import {
  GOAL_MAP_EDGES,
  GOAL_MAP_RADIUS,
  GOAL_MAP_SIZE,
  GOAL_RING_NAMES,
  GOAL_RING_TAGS,
  getCardColor,
  getGoalLevel,
  goalSectorStart,
  layoutGoalMap,
  type IkigaiCenter,
  type Note,
} from "@/lib/board-data"

const HALF = GOAL_MAP_RADIUS

const SECTOR = (2 * Math.PI) / 3

const halo: CSSProperties = {
  paintOrder: "stroke",
  stroke: "var(--color-board)",
  strokeWidth: 5,
  strokeLinejoin: "round",
}

function frameAt(center: IkigaiCenter): CSSProperties {
  return { left: center.x - HALF, top: center.y - HALF, width: GOAL_MAP_SIZE, height: GOAL_MAP_SIZE }
}

function polar(radius: number, angle: number) {
  return `${HALF + radius * Math.cos(angle)} ${HALF + radius * Math.sin(angle)}`
}

function annulus(inner: number, outer: number) {
  const circle = (r: number) => `M ${HALF - r} ${HALF} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`
  return `${circle(outer)} ${circle(inner)}`
}

function sector(inner: number, outer: number, from: number, to: number) {
  return [
    `M ${polar(outer, from)}`,
    `A ${outer} ${outer} 0 0 1 ${polar(outer, to)}`,
    `L ${polar(inner, to)}`,
    `A ${inner} ${inner} 0 0 0 ${polar(inner, from)}`,
    "Z",
  ].join(" ")
}

/** The tag a ring or sector answers to when a card hovers over it. */
function ringPath(ring: number, tag: string | null) {
  const inner = GOAL_MAP_EDGES[ring]
  const outer = GOAL_MAP_EDGES[ring + 1]
  if (ring > 0) return annulus(inner, outer)
  const index = GOAL_RING_TAGS[0].indexOf(tag ?? "")
  return index < 0 ? annulus(inner, outer) : sector(inner, outer, goalSectorStart(index), goalSectorStart(index) + SECTOR)
}

/** The mission at the center and the four rings around it. Drawn behind the cards, only while Map is open. */
export function GoalMapRings({
  center,
  missionText,
  hoverTag,
}: {
  center: IkigaiCenter
  missionText: string
  hoverTag: string | null
}) {
  const saved = missionText.length > 0
  const hoverRing = hoverTag ? GOAL_RING_TAGS.findIndex((tags) => tags.includes(hoverTag)) : -1

  return (
    <div data-zone="" data-goal-map="" className="pointer-events-none absolute" style={frameAt(center)}>
      <svg
        viewBox={`0 0 ${GOAL_MAP_SIZE} ${GOAL_MAP_SIZE}`}
        width={GOAL_MAP_SIZE}
        height={GOAL_MAP_SIZE}
        role="img"
        aria-label="Goal map. The mission is in the center, with rings for needs, dreams, and wants, life goals, project goals, and tasks."
        className="absolute inset-0"
      >
        {GOAL_RING_NAMES.map((name, ring) => (
          <path
            key={name}
            d={annulus(GOAL_MAP_EDGES[ring], GOAL_MAP_EDGES[ring + 1])}
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
            x1={HALF + GOAL_MAP_EDGES[0] * Math.cos(goalSectorStart(i))}
            y1={HALF + GOAL_MAP_EDGES[0] * Math.sin(goalSectorStart(i))}
            x2={HALF + GOAL_MAP_EDGES[1] * Math.cos(goalSectorStart(i))}
            y2={HALF + GOAL_MAP_EDGES[1] * Math.sin(goalSectorStart(i))}
            stroke="var(--color-line)"
            strokeWidth={3}
          />
        ))}

        {hoverRing >= 0 ? (
          <path
            d={ringPath(hoverRing, hoverTag)}
            fillRule="evenodd"
            fill="var(--color-accent)"
            fillOpacity={0.22}
            stroke="var(--color-accent)"
            strokeWidth={4}
            strokeDasharray="14 10"
          />
        ) : null}

        <circle cx={HALF} cy={HALF} r={GOAL_MAP_EDGES[0]} fill="var(--color-card)" stroke="var(--color-accent)" strokeWidth={4} />
        <foreignObject
          x={HALF - GOAL_MAP_EDGES[0] + 28}
          y={HALF - GOAL_MAP_EDGES[0] + 28}
          width={(GOAL_MAP_EDGES[0] - 28) * 2}
          height={(GOAL_MAP_EDGES[0] - 28) * 2}
        >
          <div className="flex size-full items-center justify-center text-center">
            {saved ? (
              <p className="line-clamp-6 font-serif text-[22px] leading-snug text-pretty break-words text-ink italic">
                {`\u201C${missionText}\u201D`}
              </p>
            ) : (
              <p className="text-[20px] leading-snug text-pretty text-ink-soft">The mission is not written yet.</p>
            )}
          </div>
        </foreignObject>

        {GOAL_RING_NAMES.map((name, ring) => (
          <text
            key={name}
            x={HALF}
            y={HALF - (GOAL_MAP_EDGES[ring] + GOAL_MAP_EDGES[ring + 1]) / 2 + 6}
            textAnchor="middle"
            fontSize={20}
            fontWeight={600}
            letterSpacing={1.5}
            fill="var(--color-ink-soft)"
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
              x={HALF + (GOAL_MAP_EDGES[0] + 30) * Math.cos(angle)}
              y={HALF + (GOAL_MAP_EDGES[0] + 30) * Math.sin(angle) + 6}
              textAnchor="middle"
              fontSize={18}
              fill="var(--color-ink-soft)"
              style={halo}
            >
              {getGoalLevel(tag)?.name}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

function shorten(text: string) {
  const line = text.replace(/\s+/g, " ").trim()
  return line.length > 26 ? `${line.slice(0, 25)}\u2026` : line || "Empty card"
}

/** Each card with a level as a point on its ring, and the threads to the goals above. Drawn over the cards. */
export function GoalMapPoints({ center, notes }: { center: IkigaiCenter; notes: Note[] }) {
  const { points, threads } = layoutGoalMap(notes, center)
  const byId = new Map(notes.map((note) => [note.id, note]))

  return (
    <div aria-hidden="true" className="pointer-events-none absolute z-[5000]" style={frameAt(center)}>
      <svg
        viewBox={`${center.x - HALF} ${center.y - HALF} ${GOAL_MAP_SIZE} ${GOAL_MAP_SIZE}`}
        width={GOAL_MAP_SIZE}
        height={GOAL_MAP_SIZE}
        className="absolute inset-0"
      >
        {threads.map((thread) => (
          <line
            key={thread.id}
            data-goal-thread={thread.id}
            x1={thread.x1}
            y1={thread.y1}
            x2={thread.x2}
            y2={thread.y2}
            stroke="var(--color-accent)"
            strokeWidth={3}
            strokeLinecap="round"
          />
        ))}
        {points.map((point) => {
          const note = byId.get(point.id)
          if (!note) return null
          const color = getCardColor(note.color)
          return (
            <g key={point.id} data-goal-point={point.id}>
              <circle cx={point.x} cy={point.y} r={11} fill={color.fill} stroke="var(--color-ink)" strokeWidth={3} />
              <text
                x={point.x}
                y={point.y + 32}
                textAnchor="middle"
                fontSize={16}
                fill="var(--color-ink)"
                style={halo}
              >
                {shorten(note.text)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
