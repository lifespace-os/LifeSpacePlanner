"use client"

import { useRef } from "react"
import clsx from "clsx"
import { GripHorizontal } from "lucide-react"
import type { Zone } from "@/lib/board-data"

const KEY_STEP = 24

type Direction = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw"

const HANDLES: { dir: Direction; cursor: string }[] = [
  { dir: "n", cursor: "cursor-ns-resize" },
  { dir: "s", cursor: "cursor-ns-resize" },
  { dir: "e", cursor: "cursor-ew-resize" },
  { dir: "w", cursor: "cursor-ew-resize" },
  { dir: "ne", cursor: "cursor-nesw-resize" },
  { dir: "sw", cursor: "cursor-nesw-resize" },
  { dir: "nw", cursor: "cursor-nwse-resize" },
  { dir: "se", cursor: "cursor-nwse-resize" },
]

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

type MinSize = { width: number; height: number }

function resizeFrom(start: Zone, dir: Direction, dx: number, dy: number, min: MinSize): Zone {
  let { left, top, width, height } = start
  if (dir.includes("e")) width = Math.max(min.width, start.width + dx)
  if (dir.includes("s")) height = Math.max(min.height, start.height + dy)
  if (dir.includes("w")) {
    width = Math.max(min.width, start.width - dx)
    left = start.left + start.width - width
  }
  if (dir.includes("n")) {
    height = Math.max(min.height, start.height - dy)
    top = start.top + start.height - height
  }
  return { left, top, width, height }
}

/** A movable, resizable area on the canvas. Drag the title to move it; drag any edge or corner to resize. */
export function AreaFrame({
  id,
  title,
  caption,
  count,
  zone,
  zoom,
  minSize,
  tint,
  size = "large",
  onMove,
  onResize,
}: {
  id: string
  title: string
  caption: string
  count: number
  zone: Zone
  zoom: number
  minSize: MinSize
  tint: string
  size?: "large" | "small"
  onMove: (id: string, dx: number, dy: number) => void
  onResize: (id: string, zone: Zone) => void
}) {
  const moving = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(null)
  const resizing = useRef<{ pointerId: number; dir: Direction; startX: number; startY: number; start: Zone } | null>(null)

  function handleTitleDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.stopPropagation()
    moving.current = { pointerId: event.pointerId, lastX: event.clientX, lastY: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleTitleMove(event: React.PointerEvent<HTMLDivElement>) {
    const state = moving.current
    if (!state || state.pointerId !== event.pointerId) return
    onMove(id, (event.clientX - state.lastX) / zoom, (event.clientY - state.lastY) / zoom)
    state.lastX = event.clientX
    state.lastY = event.clientY
  }

  function handleTitleEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (moving.current?.pointerId === event.pointerId) moving.current = null
  }

  function handleTitleKey(event: React.KeyboardEvent<HTMLDivElement>) {
    const arrow = ARROWS[event.key]
    if (!arrow) return
    event.preventDefault()
    const step = event.shiftKey ? KEY_STEP * 4 : KEY_STEP
    if (event.altKey) onResize(id, resizeFrom(zone, "se", arrow[0] * step, arrow[1] * step, minSize))
    else onMove(id, arrow[0] * step, arrow[1] * step)
  }

  function handleResizeDown(event: React.PointerEvent<HTMLDivElement>, dir: Direction) {
    if (event.button !== 0) return
    event.stopPropagation()
    resizing.current = { pointerId: event.pointerId, dir, startX: event.clientX, startY: event.clientY, start: zone }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleResizeMove(event: React.PointerEvent<HTMLDivElement>) {
    const state = resizing.current
    if (!state || state.pointerId !== event.pointerId) return
    onResize(
      id,
      resizeFrom(state.start, state.dir, (event.clientX - state.startX) / zoom, (event.clientY - state.startY) / zoom, minSize),
    )
  }

  function handleResizeEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (resizing.current?.pointerId === event.pointerId) resizing.current = null
  }

  const hit = 16 / zoom
  const knob = 10 / zoom
  const large = size === "large"

  return (
    <section
      data-zone=""
      aria-label={`${title} area, ${count} ${count === 1 ? "card" : "cards"}`}
      className={clsx("pointer-events-none absolute rounded-3xl border-2 border-dashed", tint)}
      style={{ left: zone.left, top: zone.top, width: zone.width, height: zone.height }}
    >
      <div
        data-zone-handle=""
        role="button"
        tabIndex={0}
        aria-label={`Move ${title}. Drag, or use arrow keys. Hold Alt with arrow keys to resize.`}
        onPointerDown={handleTitleDown}
        onPointerMove={handleTitleMove}
        onPointerUp={handleTitleEnd}
        onPointerCancel={handleTitleEnd}
        onKeyDown={handleTitleKey}
        className={clsx(
          "pointer-events-auto flex cursor-move touch-none items-center gap-3 rounded-t-[1.35rem] px-6 select-none hover:bg-ink/5 focus-visible:bg-ink/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
          large ? "h-16" : "h-[4.5rem] flex-wrap content-center gap-x-3 gap-y-0 py-2",
        )}
      >
        <span
          className={clsx(
            "font-serif leading-tight font-medium italic",
            large ? "text-4xl leading-none" : "min-w-0 flex-1 truncate text-2xl",
          )}
        >
          {title}
        </span>
        {large ? null : <GripHorizontal className="size-5 shrink-0 opacity-60" aria-hidden="true" />}
        <span
          className={clsx(
            "min-w-0 truncate text-sm uppercase tracking-[0.18em] opacity-80",
            large ? "flex-1" : "basis-full",
          )}
        >
          {caption} · {count}
        </span>
        {large ? <GripHorizontal className="size-5 shrink-0 opacity-60" aria-hidden="true" /> : null}
      </div>

      {HANDLES.map(({ dir, cursor }) => {
        const corner = dir.length === 2
        const style: React.CSSProperties = corner
          ? {
              width: hit,
              height: hit,
              [dir.includes("n") ? "top" : "bottom"]: -hit / 2,
              [dir.includes("w") ? "left" : "right"]: -hit / 2,
            }
          : dir === "n" || dir === "s"
            ? { height: hit, left: hit / 2, right: hit / 2, [dir === "n" ? "top" : "bottom"]: -hit / 2 }
            : { width: hit, top: hit / 2, bottom: hit / 2, [dir === "w" ? "left" : "right"]: -hit / 2 }
        return (
          <div
            key={dir}
            data-zone-handle=""
            aria-hidden="true"
            onPointerDown={(event) => handleResizeDown(event, dir)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            className={clsx("pointer-events-auto absolute flex touch-none items-center justify-center", cursor)}
            style={style}
          >
            {corner ? (
              <span
                className="block rounded-[2px] border border-current bg-board"
                style={{ width: knob, height: knob, borderWidth: Math.max(1, 1.5 / zoom) }}
              />
            ) : null}
          </div>
        )
      })}
    </section>
  )
}
