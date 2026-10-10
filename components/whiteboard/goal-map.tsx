"use client"

import { useRef, useState, type CSSProperties } from "react"
import {
  GOAL_MAP_RADIUS,
  GOAL_MAP_SIZE,
  GOAL_RING_NAMES,
  GOAL_RING_SCALE,
  GOAL_RING_TAGS,
  clampGoalAngle,
  getCardColor,
  getGoalLevel,
  goalLevelOf,
  goalMapEdges,
  goalMapTagAt,
  goalSectorStart,
  goalThreadsFor,
  layoutGoalMap,
  type IkigaiCenter,
  type Note,
} from "@/lib/board-data"

const HALF = GOAL_MAP_RADIUS

const LOCAL_CENTER: IkigaiCenter = { x: HALF, y: HALF }

const SECTOR = (2 * Math.PI) / 3

/** At or above this zoom every point shows its name. Below it, only the hovered or selected point does. */
const LABEL_ZOOM = 0.9

const halo: CSSProperties = {
  paintOrder: "stroke",
  stroke: "var(--color-board)",
  strokeWidth: 5,
  strokeLinejoin: "round",
}

export type GoalMapCommit = {
  /** Where the point now sits on its ring. */
  angle: number
  /** A new level when the point was dropped on another ring, otherwise null. */
  level: string | null
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

function shorten(text: string) {
  const line = text.replace(/\s+/g, " ").trim()
  return line.length > 28 ? `${line.slice(0, 27)}\u2026` : line || "Empty card"
}

type Press = { id: string; pointerId: number; startX: number; startY: number; moved: boolean }

type DragState = { id: string; angle: number; level: string | null }

/**
 * The Map: the mission at the center, four rings around it, and a point for every card that has a level.
 * It replaces the whiteboard cards while Map is open, and it moves with pan and zoom.
 */
export function GoalMapLayer({
  center,
  missionText,
  notes,
  scale,
  zoom,
  selectedId,
  showAllThreads,
  focusRing,
  toWorld,
  onSelect,
  onMenu,
  onCommit,
}: {
  center: IkigaiCenter
  missionText: string
  notes: Note[]
  scale: number
  zoom: number
  selectedId: string | null
  showAllThreads: boolean
  focusRing: number | null
  toWorld: (clientX: number, clientY: number) => { x: number; y: number }
  onSelect: (id: string) => void
  onMenu: (id: string, clientX: number, clientY: number) => void
  onCommit: (id: string, change: GoalMapCommit) => void
}) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const press = useRef<Press | null>(null)
  const dragRef = useRef<DragState | null>(null)

  const edges = goalMapEdges(scale)
  const saved = missionText.length > 0
  const { points, threads } = layoutGoalMap(notes, LOCAL_CENTER, {
    scale,
    drag: drag ? { id: drag.id, angle: drag.angle } : null,
  })
  const byId = new Map(notes.map((note) => [note.id, note]))
  const shown = new Set(points.filter((p) => focusRing === null || p.ring === focusRing).map((p) => p.id))
  const chain = selectedId ? goalThreadsFor(notes, selectedId) : null
  const k = Math.max(1, Math.min(2.2, 0.75 / zoom))

  const dragged = drag ? byId.get(drag.id) : null
  const hoverTag = drag && dragged && drag.level && drag.level !== goalLevelOf(dragged) ? drag.level : null
  const hoverRing = hoverTag ? GOAL_RING_TAGS.findIndex((tags) => tags.includes(hoverTag)) : -1

  function hoverPath() {
    const inner = edges[hoverRing]
    const outer = edges[hoverRing + 1]
    const index = GOAL_RING_TAGS[0].indexOf(hoverTag ?? "")
    if (hoverRing > 0 || index < 0) return annulus(inner, outer)
    return sector(inner, outer, goalSectorStart(index), goalSectorStart(index) + SECTOR)
  }

  function moveTo(id: string, level: string, event: React.PointerEvent<SVGGElement>) {
    const world = toWorld(event.clientX, event.clientY)
    const raw = Math.atan2(world.y - center.y, world.x - center.x)
    const next = { id, angle: clampGoalAngle(level, raw), level: goalMapTagAt(world.x, world.y, center, scale) }
    dragRef.current = next
    setDrag(next)
  }

  function handlePointerMove(event: React.PointerEvent<SVGGElement>, id: string, level: string) {
    const current = press.current
    if (!current || current.id !== id || current.pointerId !== event.pointerId) return
    if (!current.moved && Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < 4) return
    current.moved = true
    moveTo(id, level, event)
  }

  function handlePointerUp(event: React.PointerEvent<SVGGElement>, id: string, level: string) {
    const current = press.current
    if (!current || current.id !== id || current.pointerId !== event.pointerId) return
    press.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    const last = dragRef.current
    dragRef.current = null
    setDrag(null)
    if (!current.moved || !last) {
      onSelect(id)
      return
    }
    const changed = last.level && last.level !== level ? last.level : null
    const raw = toWorld(event.clientX, event.clientY)
    const angle = changed ? clampGoalAngle(changed, Math.atan2(raw.y - center.y, raw.x - center.x)) : last.angle
    onCommit(id, { angle, level: changed })
  }

  function handleKeyDown(event: React.KeyboardEvent<SVGGElement>, id: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onSelect(id)
    } else if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) {
      event.preventDefault()
      const box = event.currentTarget.getBoundingClientRect()
      onMenu(id, box.left + box.width / 2, box.top + box.height / 2)
    }
  }

  return (
    <div
      data-goal-map=""
      className="pointer-events-none absolute"
      style={{ left: center.x - HALF, top: center.y - HALF, width: GOAL_MAP_SIZE, height: GOAL_MAP_SIZE }}
    >
      <svg
        viewBox={`0 0 ${GOAL_MAP_SIZE} ${GOAL_MAP_SIZE}`}
        width={GOAL_MAP_SIZE}
        height={GOAL_MAP_SIZE}
        role="group"
        aria-label="Goal map. The mission is in the center, with rings for needs, dreams, and wants, life goals, project goals, and tasks."
        className="absolute inset-0 overflow-visible"
      >
        {GOAL_RING_NAMES.map((name, ring) => (
          <path
            key={name}
            d={annulus(edges[ring], edges[ring + 1])}
            fillRule="evenodd"
            fill="var(--color-accent)"
            fillOpacity={0.035 + ring * 0.03 + (focusRing === ring ? 0.08 : 0)}
            stroke="var(--color-line)"
            strokeWidth={3}
          />
        ))}
        {GOAL_RING_TAGS[0].map((tag, i) => (
          <line
            key={tag}
            x1={HALF + edges[0] * Math.cos(goalSectorStart(i))}
            y1={HALF + edges[0] * Math.sin(goalSectorStart(i))}
            x2={HALF + edges[1] * Math.cos(goalSectorStart(i))}
            y2={HALF + edges[1] * Math.sin(goalSectorStart(i))}
            stroke="var(--color-line)"
            strokeWidth={3}
          />
        ))}

        {hoverRing >= 0 ? (
          <path
            d={hoverPath()}
            fillRule="evenodd"
            fill="var(--color-accent)"
            fillOpacity={0.22}
            stroke="var(--color-accent)"
            strokeWidth={4}
            strokeDasharray="14 10"
          />
        ) : null}

        <circle cx={HALF} cy={HALF} r={edges[0]} fill="var(--color-card)" stroke="var(--color-accent)" strokeWidth={4} />
        <foreignObject
          x={HALF - edges[0] + 28}
          y={HALF - edges[0] + 28}
          width={(edges[0] - 28) * 2}
          height={(edges[0] - 28) * 2}
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
            y={HALF - (edges[ring] + edges[ring + 1]) / 2 + 6}
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
              x={HALF + (edges[0] + 30) * Math.cos(angle)}
              y={HALF + (edges[0] + 30) * Math.sin(angle) + 6}
              textAnchor="middle"
              fontSize={18}
              fill="var(--color-ink-soft)"
              style={halo}
            >
              {getGoalLevel(tag)?.name}
            </text>
          )
        })}

        {threads.map((thread) => {
          const from = shown.has(thread.id)
          const to = thread.to === "mission" || shown.has(thread.to)
          if (!from || !to) return null
          const lit = chain?.has(thread.id) ?? false
          const faded = chain !== null && !lit && !showAllThreads
          return (
            <line
              key={thread.id}
              data-goal-thread={thread.id}
              data-lit={lit ? "" : undefined}
              data-faded={faded ? "" : undefined}
              x1={thread.x1}
              y1={thread.y1}
              x2={thread.x2}
              y2={thread.y2}
              stroke="var(--color-accent)"
              strokeWidth={(lit ? 6 : 3) * Math.min(k, 1.6)}
              strokeOpacity={faded ? 0.12 : 1}
              strokeLinecap="round"
            />
          )
        })}

        {points.map((point) => {
          const note = byId.get(point.id)
          if (!note || !shown.has(point.id)) return null
          const level = goalLevelOf(note) ?? ""
          const color = getCardColor(note.color)
          const selected = selectedId === point.id
          const active = selected || hoverId === point.id || drag?.id === point.id
          return (
            <g
              key={point.id}
              data-goal-point={point.id}
              data-board-control=""
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={`${shorten(note.text)}, ${getGoalLevel(level)?.name ?? "no level"}`}
              className="group/point pointer-events-auto cursor-grab outline-none active:cursor-grabbing"
              onPointerEnter={() => setHoverId(point.id)}
              onPointerLeave={() => setHoverId((current) => (current === point.id ? null : current))}
              onPointerDown={(event) => {
                if (event.button !== 0) return
                event.stopPropagation()
                event.currentTarget.setPointerCapture?.(event.pointerId)
                press.current = {
                  id: point.id,
                  pointerId: event.pointerId,
                  startX: event.clientX,
                  startY: event.clientY,
                  moved: false,
                }
              }}
              onPointerMove={(event) => handlePointerMove(event, point.id, level)}
              onPointerUp={(event) => handlePointerUp(event, point.id, level)}
              onPointerCancel={() => {
                press.current = null
                dragRef.current = null
                setDrag(null)
              }}
              onContextMenu={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onMenu(point.id, event.clientX, event.clientY)
              }}
              onKeyDown={(event) => handleKeyDown(event, point.id)}
            >
              <circle cx={point.x} cy={point.y} r={22 * k} fill="transparent" />
              <circle
                cx={point.x}
                cy={point.y}
                r={(active ? 17 : 13) * k}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={selected ? 4 * k : 3 * k}
                strokeOpacity={selected ? 1 : active ? 0.6 : 0}
                className="group-focus-visible/point:stroke-opacity-100"
              />
              <circle
                cx={point.x}
                cy={point.y}
                r={11 * k}
                fill={color.fill}
                stroke="var(--color-ink)"
                strokeWidth={2.5 * Math.min(k, 1.6)}
              />
            </g>
          )
        })}

        {points.map((point) => {
          const note = byId.get(point.id)
          if (!note || !shown.has(point.id)) return null
          const show = zoom >= LABEL_ZOOM || selectedId === point.id || hoverId === point.id || drag?.id === point.id
          if (!show) return null
          return (
            <text
              key={point.id}
              data-goal-label={point.id}
              x={point.x}
              y={point.y + 34 * k}
              textAnchor="middle"
              fontSize={16 * k}
              fill="var(--color-ink)"
              pointerEvents="none"
              style={{ ...halo, strokeWidth: 5 * k }}
            >
              {shorten(note.text)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

/** Two controls that belong to the Map and nothing else: ring thickness, and showing every thread. */
export function GoalMapControls({
  scale,
  onScale,
  showAll,
  onShowAll,
}: {
  scale: number
  onScale: (scale: number) => void
  showAll: boolean
  onShowAll: (showAll: boolean) => void
}) {
  return (
    <section
      aria-label="Map controls"
      className="pointer-events-auto flex w-64 flex-col gap-3 rounded-xl border border-line bg-card px-4 py-3 shadow-sm"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="goal-map-thickness" className="flex items-center justify-between text-xs font-medium text-ink">
          Ring thickness
          <span className="text-ink-soft tabular-nums">{Math.round(scale * 100)}%</span>
        </label>
        <input
          id="goal-map-thickness"
          type="range"
          min={GOAL_RING_SCALE.min}
          max={GOAL_RING_SCALE.max}
          step={GOAL_RING_SCALE.step}
          value={scale}
          onChange={(event) => onScale(Number(event.target.value))}
          className="w-full accent-accent"
        />
      </div>
      <label className="flex items-center gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          checked={showAll}
          onChange={(event) => onShowAll(event.target.checked)}
          className="size-4 accent-accent"
        />
        Show every thread
      </label>
    </section>
  )
}
