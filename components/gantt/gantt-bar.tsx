"use client"

import { useRef, useState } from "react"
import clsx from "clsx"
import { daysBetween, type CalendarTask } from "@/lib/calendar"
import { DAY_WIDTH, describeShape, movePatch, shapeOf, stretchPatch, type DatePatch } from "@/lib/gantt"

type Props = {
  task: CalendarTask
  /** The first day the chart shows. */
  start: string
  onOpen: (cardId: string) => void
  onSchedule: (task: CalendarTask, patch: DatePatch, how: "move" | "stretch") => void
}

type Drag = { originX: number; days: number; moved: boolean }

/** One task on the chart: a bar to move, or a point to stretch into a bar. Finished tasks are drawn but not dragged. */
export function GanttBar({ task, start, onOpen, onSchedule }: Props) {
  const { card } = task
  const shape = shapeOf(card)
  const [drag, setDrag] = useState<Drag | null>(null)
  const dragging = useRef(false)
  if (shape.kind === "none") return null

  const days = drag?.days ?? 0
  const patch: DatePatch = shape.kind === "bar" ? movePatch(shape, days) : stretchPatch(shape.day, days)
  const from = shape.kind === "bar" ? patch.since : patch.since || patch.due
  const to = patch.due
  const asPoint = shape.kind === "point" && days === 0
  const left = daysBetween(start, from) * DAY_WIDTH
  const width = (daysBetween(from, to) + 1) * DAY_WIDTH - 4
  const label = `${card.title}, ${describeShape(shape)}.${task.done ? " Finished." : ""}`
  const hint = task.done
    ? ""
    : shape.kind === "bar"
      ? " Drag or press the arrow keys to move it."
      : " Drag or press the arrow keys to stretch it into a bar."

  const finish = (commit: boolean) => {
    const current = drag
    dragging.current = false
    setDrag(null)
    if (!current || !commit) return
    if (!current.moved) onOpen(task.id)
    else if (current.days !== 0) onSchedule(task, patch, shape.kind === "bar" ? "move" : "stretch")
  }

  const movable = !task.done
  const inside = !asPoint && width >= 140

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={label + hint}
      onClick={(event) => {
        if (event.detail === 0) onOpen(task.id)
        else if (!movable) onOpen(task.id)
      }}
      onPointerDown={
        movable
          ? (event) => {
              if (event.button !== 0) return
              event.currentTarget.setPointerCapture(event.pointerId)
              dragging.current = true
              setDrag({ originX: event.clientX, days: 0, moved: false })
            }
          : undefined
      }
      onPointerMove={
        movable
          ? (event) => {
              if (!dragging.current || !drag) return
              const dx = event.clientX - drag.originX
              setDrag({ ...drag, days: Math.round(dx / DAY_WIDTH), moved: drag.moved || Math.abs(dx) > 4 })
            }
          : undefined
      }
      onPointerUp={movable ? () => finish(true) : undefined}
      onPointerCancel={movable ? () => finish(false) : undefined}
      onKeyDown={
        movable
          ? (event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
              event.preventDefault()
              const step = (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 7 : 1)
              onSchedule(
                task,
                shape.kind === "bar" ? movePatch(shape, step) : stretchPatch(shape.day, step),
                shape.kind === "bar" ? "move" : "stretch",
              )
            }
          : undefined
      }
      style={{ left: asPoint ? left + DAY_WIDTH / 2 - 8 : left + 2, width: asPoint ? 16 : width }}
      className={clsx(
        "absolute top-1/2 flex h-6 -translate-y-1/2 items-center text-left text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        movable && "touch-none",
        asPoint
          ? clsx("h-4 rounded-full border-2 bg-card", task.done ? "border-line" : "cursor-ew-resize border-accent")
          : clsx(
              "rounded-md px-2",
              task.done ? "border border-line bg-accent-soft text-ink-soft" : "cursor-grab bg-accent text-card active:cursor-grabbing",
              drag?.moved && "opacity-80 shadow-md",
            ),
      )}
    >
      {inside && <span className="truncate">{card.title}</span>}
      {!inside && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-full ml-2 max-w-64 truncate whitespace-nowrap text-ink"
        >
          {card.title}
        </span>
      )}
    </button>
  )
}
