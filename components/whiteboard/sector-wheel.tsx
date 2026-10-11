"use client"

import { useState } from "react"
import { SCORE_MAX, WHEEL_INNER, WHEEL_OUTER, WHEEL_REACH, type IkigaiCenter, type Sector } from "@/lib/board-data"

/** A card shown as a point inside a sector. It keeps the card's own color, which the latest drop set. */
export type WheelPoint = { id: string; text: string; fill: string }

export type SectorWheelBoardState = {
  center: IkigaiCenter
  title: string
  sectors: Sector[]
  counts: Record<string, number>
  points: Record<string, WheelPoint[]>
  /** Life spheres carry a satisfaction score. Happiness components never do. */
  scoring: boolean
  /** The Wheel view: the board of cards is hidden and a click on a sector lists its cards. */
  cardsHidden: boolean
  /** The sector under a dragged card. */
  hoverId: string | null
  /** The sector whose cards are listed in the window. */
  openId: string | null
  onOpen: (id: string) => void
}

const SIZE = WHEEL_REACH * 2
const GAP_DEGREES = 1.2
const NAME_MAX = 20
const POINT_RADIUS = 7
const GOLDEN = 0.6180339887

function point(radius: number, angle: number) {
  return [WHEEL_REACH + radius * Math.cos(angle), WHEEL_REACH + radius * Math.sin(angle)] as const
}

function slicePath(start: number, end: number, inner = WHEEL_INNER, outer = WHEEL_OUTER) {
  const [ox1, oy1] = point(outer, start)
  const [ox2, oy2] = point(outer, end)
  const [ix2, iy2] = point(inner, end)
  const [ix1, iy1] = point(inner, start)
  const large = end - start > Math.PI ? 1 : 0
  return `M${ox1} ${oy1} A${outer} ${outer} 0 ${large} 1 ${ox2} ${oy2} L${ix2} ${iy2} A${inner} ${inner} 0 ${large} 0 ${ix1} ${iy1}Z`
}

function shortName(name: string) {
  return name.length > NAME_MAX ? `${name.slice(0, NAME_MAX - 1)}…` : name
}

/** Spreads a sector's points over its ring with a golden-ratio spiral, so the same card keeps the same spot. */
function pointPosition(index: number, total: number, start: number, end: number) {
  const radius = WHEEL_INNER + 22 + (WHEEL_OUTER - WHEEL_INNER - 44) * Math.sqrt((index + 0.5) / Math.max(total, 1))
  const spread = Math.max(end - start - (POINT_RADIUS * 3) / radius, 0.05)
  const turn = (index * GOLDEN) % 1
  return point(radius, start + (end - start - spread) / 2 + spread * turn)
}

/**
 * The wheel of the chosen set. A dropped card gets the sector's hashtag and color, then stays where it was.
 * Life spheres are drawn as outlines and fill outward from the center once a satisfaction score is saved.
 */
export function SectorWheel({ wheel }: { wheel: SectorWheelBoardState }) {
  const { center, sectors } = wheel
  const [hovered, setHovered] = useState<string | null>(null)
  const step = (Math.PI * 2) / Math.max(sectors.length, 1)
  const gap = sectors.length > 1 ? (GAP_DEGREES * Math.PI) / 180 : 0

  return (
    <div
      data-wheel=""
      className="pointer-events-none absolute"
      style={{ left: center.x - WHEEL_REACH, top: center.y - WHEEL_REACH, width: SIZE, height: SIZE }}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="group" aria-label={`${wheel.title} wheel`} className="overflow-visible">
        <circle cx={WHEEL_REACH} cy={WHEEL_REACH} r={WHEEL_OUTER} className="fill-none stroke-line" strokeDasharray="3 6" />
        {sectors.map((sector, index) => {
          const start = -Math.PI / 2 + index * step + gap / 2
          const end = -Math.PI / 2 + (index + 1) * step - gap / 2 - (sectors.length === 1 ? 0.001 : 0)
          const mid = (start + end) / 2
          const count = wheel.counts[sector.id] ?? 0
          const dots = wheel.points[sector.id] ?? []
          const dragHover = wheel.hoverId === sector.id
          const open = wheel.openId === sector.id
          const preview = hovered === sector.id
          const scored = wheel.scoring && typeof sector.score === "number"
          const [lx, ly] = point(WHEEL_OUTER + 16, mid)
          const side = Math.cos(mid)
          const anchor = side > 0.25 ? "start" : side < -0.25 ? "end" : "middle"
          const dy = Math.sin(mid) > 0.6 ? "0.8em" : Math.sin(mid) < -0.6 ? "0" : "0.35em"
          const fillTo = scored ? WHEEL_INNER + ((WHEEL_OUTER - WHEEL_INNER) * (sector.score ?? 0)) / SCORE_MAX : WHEEL_INNER
          const scoreText = scored ? `${sector.score}%` : ""
          const label = `${sector.name}${scored ? `, satisfaction ${sector.score} percent` : ""}, ${count} ${count === 1 ? "card" : "cards"}. Press Enter to list its cards.`
          return (
            <g
              key={sector.id}
              data-sector-item={sector.id}
              data-board-control={wheel.cardsHidden ? "" : undefined}
              role="button"
              tabIndex={0}
              aria-label={label}
              className="pointer-events-auto cursor-context-menu focus-visible:outline-none"
              onPointerEnter={() => setHovered(sector.id)}
              onPointerLeave={() => setHovered((current) => (current === sector.id ? null : current))}
              onClick={wheel.cardsHidden ? () => wheel.onOpen(sector.id) : undefined}
              onContextMenu={(event) => {
                event.preventDefault()
                event.stopPropagation()
                wheel.onOpen(sector.id)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " " || event.key === "ContextMenu") {
                  event.preventDefault()
                  wheel.onOpen(sector.id)
                }
              }}
            >
              {wheel.scoring && preview ? (
                <path d={slicePath(start, end)} fill={sector.color} opacity={0.35} className="pointer-events-none" />
              ) : null}
              {scored && (sector.score ?? 0) > 0 ? (
                <path d={slicePath(start, end, WHEEL_INNER, fillTo)} fill={sector.color} opacity={0.95} className="pointer-events-none" />
              ) : null}
              <path
                d={slicePath(start, end)}
                fill="none"
                stroke={sector.color}
                strokeWidth={6}
                strokeLinejoin="round"
                opacity={0.9}
                pointerEvents="all"
              />
              <path
                d={slicePath(start, end)}
                fill="none"
                strokeLinejoin="round"
                className={dragHover ? "stroke-ink" : open ? "stroke-accent" : "stroke-ink-soft"}
                strokeWidth={dragHover ? 4 : open ? 3 : 1.25}
                pointerEvents="none"
              />
              {dots.map((dot, i) => {
                const [px, py] = pointPosition(i, dots.length, start, end)
                return (
                  <circle
                    key={dot.id}
                    data-wheel-point={dot.id}
                    cx={px}
                    cy={py}
                    r={POINT_RADIUS}
                    fill={dot.fill}
                    className="stroke-ink"
                    strokeWidth={1.5}
                  >
                    <title>{dot.text.trim() || "Untitled card"}</title>
                  </circle>
                )
              })}
              <text x={lx} y={ly} textAnchor={anchor} dy={dy} className="fill-ink text-[16px] font-medium">
                <title>{sector.name}</title>
                {shortName(sector.name)}
                {scoreText ? (
                  <tspan dx={6} data-sector-score={sector.id} className="fill-accent font-semibold">
                    {scoreText}
                  </tspan>
                ) : null}
              </text>
            </g>
          )
        })}
        {sectors.length === 0 ? (
          <text x={WHEEL_REACH} y={WHEEL_REACH} textAnchor="middle" className="fill-ink-soft text-[16px]">
            No sectors yet
          </text>
        ) : (
          <>
            <circle cx={WHEEL_REACH} cy={WHEEL_REACH} r={WHEEL_INNER - 6} className="fill-board stroke-line" />
            <text x={WHEEL_REACH} y={WHEEL_REACH} textAnchor="middle" dominantBaseline="central" className="fill-ink-soft text-[13px]">
              {wheel.title.split(" ")[0]}
            </text>
          </>
        )}
      </svg>
    </div>
  )
}
