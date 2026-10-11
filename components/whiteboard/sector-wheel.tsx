"use client"

import clsx from "clsx"
import { WHEEL_INNER, WHEEL_OUTER, WHEEL_REACH, type IkigaiCenter, type Sector } from "@/lib/board-data"

export type SectorWheelBoardState = {
  center: IkigaiCenter
  title: string
  sectors: Sector[]
  counts: Record<string, number>
  /** The sector under a dragged card. */
  hoverId: string | null
  /** The sector whose cards are listed in the window. */
  openId: string | null
  onOpen: (id: string) => void
}

const SIZE = WHEEL_REACH * 2
const GAP_DEGREES = 1.2
const NAME_MAX = 20

function point(radius: number, angle: number) {
  return [WHEEL_REACH + radius * Math.cos(angle), WHEEL_REACH + radius * Math.sin(angle)] as const
}

function slicePath(start: number, end: number) {
  const [ox1, oy1] = point(WHEEL_OUTER, start)
  const [ox2, oy2] = point(WHEEL_OUTER, end)
  const [ix2, iy2] = point(WHEEL_INNER, end)
  const [ix1, iy1] = point(WHEEL_INNER, start)
  const large = end - start > Math.PI ? 1 : 0
  return `M${ox1} ${oy1} A${WHEEL_OUTER} ${WHEEL_OUTER} 0 ${large} 1 ${ox2} ${oy2} L${ix2} ${iy2} A${WHEEL_INNER} ${WHEEL_INNER} 0 ${large} 0 ${ix1} ${iy1}Z`
}

function shortName(name: string) {
  return name.length > NAME_MAX ? `${name.slice(0, NAME_MAX - 1)}…` : name
}

/** The wheel of the chosen set. A dropped card gets the sector's hashtag and color, then stays where it was. */
export function SectorWheel({ wheel }: { wheel: SectorWheelBoardState }) {
  const { center, sectors } = wheel
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
          const hover = wheel.hoverId === sector.id
          const open = wheel.openId === sector.id
          const [cx, cy] = point((WHEEL_OUTER + WHEEL_INNER) / 2, mid)
          const [lx, ly] = point(WHEEL_OUTER + 16, mid)
          const side = Math.cos(mid)
          const anchor = side > 0.25 ? "start" : side < -0.25 ? "end" : "middle"
          const dy = Math.sin(mid) > 0.6 ? "0.8em" : Math.sin(mid) < -0.6 ? "0" : "0.35em"
          return (
            <g
              key={sector.id}
              data-sector-item={sector.id}
              role="button"
              tabIndex={0}
              aria-label={`${sector.name}, ${count} ${count === 1 ? "card" : "cards"}. Press Enter or right-click to list its cards.`}
              className="pointer-events-auto cursor-context-menu focus-visible:outline-none"
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
              <path
                d={slicePath(start, end)}
                fill={sector.color}
                className={clsx(
                  "transition-[stroke-width,opacity] duration-150",
                  hover ? "stroke-ink" : open ? "stroke-accent" : "stroke-transparent",
                )}
                strokeWidth={hover ? 4 : open ? 3 : 0}
                opacity={hover || open ? 1 : 0.88}
              />
              {count > 0 ? (
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" className="fill-ink text-[22px] font-medium">
                  {count}
                </text>
              ) : null}
              <text x={lx} y={ly} textAnchor={anchor} dy={dy} className="fill-ink text-[16px] font-medium">
                <title>{sector.name}</title>
                {shortName(sector.name)}
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
