"use client"

import { memo, useRef, useState, type RefObject } from "react"
import clsx from "clsx"
import { CalendarDays, Check, ListChecks, User, X } from "lucide-react"
import {
  KIND_LABEL,
  LABEL_GROUPS,
  bucketAt,
  getLabel,
  type Bucket,
  type MissionChoice,
  type Mode,
  type Note,
} from "@/lib/board-data"
import { LabelChip } from "./label-chip"

type Props = {
  note: Note
  mode: Mode
  selected: boolean
  boardRef: RefObject<HTMLElement | null>
  onSelect: (id: string) => void
  onMove: (id: string, x: number, y: number, bucket: Bucket) => void
  onFront: (id: string) => void
  onMission: (id: string, choice: Exclude<MissionChoice, null>) => void
  onDelete: (id: string) => void
}

type DragState = { pointerId: number; startX: number; startY: number; left: number; top: number; moved: boolean }

const KEY_STEP = 16
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

const dueFormatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" })

function formatDue(value: string) {
  if (!value) return "No date"
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : dueFormatter.format(date)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

export const NoteCard = memo(function NoteCard({
  note,
  mode,
  selected,
  boardRef,
  onSelect,
  onMove,
  onFront,
  onMission,
  onDelete,
}: Props) {
  const cardRef = useRef<HTMLElement>(null)
  const drag = useRef<DragState | null>(null)
  const [dragging, setDragging] = useState(false)

  function commit(left: number, top: number) {
    const board = boardRef.current
    const card = cardRef.current
    if (!board || !card) return
    const width = board.clientWidth
    const height = board.clientHeight
    const x = left / width
    const y = top / height
    const bucket = bucketAt((left + card.offsetWidth / 2) / width, (top + card.offsetHeight / 2) / height)
    card.style.left = `${x * 100}%`
    card.style.top = `${y * 100}%`
    onMove(note.id, x, y, bucket)
  }

  function bounds() {
    const board = boardRef.current
    const card = cardRef.current
    if (!board || !card) return null
    return { card, maxLeft: board.clientWidth - card.offsetWidth, maxTop: board.clientHeight - card.offsetHeight }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    if (event.button !== 0) return
    if ((event.target as HTMLElement).closest("button, input, select, textarea, a")) return
    const card = cardRef.current
    if (!card) return
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: card.offsetLeft,
      top: card.offsetTop,
      moved: false,
    }
    card.setPointerCapture(event.pointerId)
    onFront(note.id)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY
    if (!state.moved) {
      if (Math.hypot(dx, dy) < 4) return
      state.moved = true
      setDragging(true)
    }
    const b = bounds()
    if (!b) return
    b.card.style.left = `${clamp(state.left + dx, 0, b.maxLeft)}px`
    b.card.style.top = `${clamp(state.top + dy, 0, b.maxTop)}px`
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLElement>) {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    drag.current = null
    const card = cardRef.current
    if (!state.moved) {
      if (event.type === "pointerup") onSelect(note.id)
      return
    }
    setDragging(false)
    if (card) commit(card.offsetLeft, card.offsetTop)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) return
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onSelect(note.id)
      return
    }
    const arrow = ARROWS[event.key]
    if (!arrow) return
    event.preventDefault()
    const b = bounds()
    if (!b) return
    const step = event.shiftKey ? KEY_STEP * 3 : KEY_STEP
    onFront(note.id)
    commit(
      clamp(b.card.offsetLeft + arrow[0] * step, 0, b.maxLeft),
      clamp(b.card.offsetTop + arrow[1] * step, 0, b.maxTop),
    )
  }

  const isTask = note.task !== null
  const released = note.mission === "release" && mode !== "unload" && mode !== "sort"
  const showLabels = mode === "labels" || mode === "task"
  const appliedLabels = LABEL_GROUPS.flatMap((group) => {
    const option = group.options.find((o) => o.id === note.labels[group.id])
    return option ? [{ ...option, shape: group.shape }] : []
  })

  return (
    <article
      ref={cardRef}
      tabIndex={0}
      aria-label={`${isTask ? "Task" : KIND_LABEL[note.kind]}: ${isTask ? note.task?.title : note.text}`}
      aria-describedby="board-help"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onKeyDown={handleKeyDown}
      style={{
        left: `${note.x * 100}%`,
        top: `${note.y * 100}%`,
        zIndex: dragging ? 9999 : note.z,
        transform: dragging ? "rotate(0deg) scale(1.04)" : `rotate(${note.rotation}deg)`,
      }}
      className={clsx(
        "group absolute touch-none select-none outline-none",
        "transition-[transform,box-shadow,opacity] duration-150",
        "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-board",
        dragging ? "cursor-grabbing" : "cursor-grab",
        isTask
          ? "task-ruled w-[224px] rounded-md border border-line bg-card"
          : "w-[196px] rounded-sm border-b-2 border-note-edge bg-note",
        dragging
          ? "shadow-[0_18px_30px_-12px_rgba(35,39,43,0.45)]"
          : "shadow-[0_1px_1px_rgba(35,39,43,0.08),0_6px_14px_-8px_rgba(35,39,43,0.35)]",
        selected && "ring-2 ring-accent ring-offset-2 ring-offset-board",
        released && "opacity-50",
      )}
    >
      {isTask ? <TaskFace note={note} released={released} /> : <NoteFace note={note} released={released} />}

      {showLabels && appliedLabels.length > 0 ? (
        <div className="flex flex-wrap gap-1 px-4 pb-3">
          {appliedLabels.map((label) => (
            <LabelChip key={label.id} name={label.name} color={label.color} shape={label.shape} />
          ))}
        </div>
      ) : null}

      {mode === "mission" ? <MissionControls note={note} onMission={onMission} /> : null}

      {mode === "unload" ? (
        <button
          type="button"
          onClick={() => onDelete(note.id)}
          aria-label={`Remove note: ${note.text}`}
          className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border border-line bg-card text-ink-soft opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:text-release focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-accent"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </article>
  )
})

function NoteFace({ note, released }: { note: Note; released: boolean }) {
  return (
    <div className="px-4 pt-3 pb-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-soft">{KIND_LABEL[note.kind]}</p>
      <p
        className={clsx(
          "mt-1.5 font-serif text-lg leading-snug text-ink text-pretty",
          released && "line-through decoration-release/60",
        )}
      >
        {note.text}
      </p>
    </div>
  )
}

function TaskFace({ note, released }: { note: Note; released: boolean }) {
  const task = note.task!
  const label = getLabel(task.labelId)

  return (
    <div className="relative px-4 pt-3 pb-3">
      <span aria-hidden="true" className="absolute top-0 bottom-0 left-2 w-px bg-release/30" />
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 rounded-sm bg-accent px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-board">
          <ListChecks className="size-3" aria-hidden="true" />
          Task
        </span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-ink-soft">1 note = 1 task</span>
      </div>
      <p
        className={clsx(
          "mt-2 font-serif text-lg leading-snug font-medium text-ink text-pretty",
          released && "line-through decoration-release/60",
        )}
      >
        {task.title}
      </p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1 text-xs text-ink">
        <dt className="sr-only">Label</dt>
        <dd className="col-span-2">
          {label ? (
            <LabelChip name={label.name} color={label.color} shape={label.group.shape} />
          ) : (
            <span className="text-ink-soft">No label</span>
          )}
        </dd>
        <dt>
          <CalendarDays className="size-3.5 text-ink-soft" aria-hidden="true" />
          <span className="sr-only">Due</span>
        </dt>
        <dd className="tabular-nums">{formatDue(task.due)}</dd>
        <dt>
          <User className="size-3.5 text-ink-soft" aria-hidden="true" />
          <span className="sr-only">Owner</span>
        </dt>
        <dd>{task.owner || "Unassigned"}</dd>
      </dl>
      <p className="mt-2 border-t border-dashed border-line pt-1.5 text-[11px] leading-4 text-ink-soft">
        <span className="font-medium">From note:</span> <span className="italic">{note.text}</span>
      </p>
    </div>
  )
}

function MissionControls({
  note,
  onMission,
}: {
  note: Note
  onMission: (id: string, choice: Exclude<MissionChoice, null>) => void
}) {
  return (
    <div className="flex border-t border-ink/10" role="group" aria-label="Keep or release">
      <button
        type="button"
        aria-pressed={note.mission === "keep"}
        onClick={() => onMission(note.id, "keep")}
        className={clsx(
          "flex flex-1 items-center justify-center gap-1 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
          note.mission === "keep" ? "bg-accent text-board" : "text-ink-soft hover:bg-accent-soft hover:text-accent",
        )}
      >
        <Check className="size-3.5" aria-hidden="true" />
        Keep
      </button>
      <button
        type="button"
        aria-pressed={note.mission === "release"}
        onClick={() => onMission(note.id, "release")}
        className={clsx(
          "flex flex-1 items-center justify-center gap-1 border-l border-ink/10 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
          note.mission === "release" ? "bg-release text-board" : "text-ink-soft hover:bg-release/10 hover:text-release",
        )}
      >
        <X className="size-3.5" aria-hidden="true" />
        Release
      </button>
    </div>
  )
}
