"use client"

import { memo, useRef, useState, type RefObject } from "react"
import clsx from "clsx"
import { CalendarDays, Check, ListChecks, User, X } from "lucide-react"
import {
  CARD_MIN_HEIGHT,
  CARD_WIDTH,
  LABEL_GROUPS,
  getCardColor,
  getLabel,
  type MissionChoice,
  type Mode,
  type Note,
  type View,
} from "@/lib/board-data"
import { LabelChip } from "./label-chip"

type Props = {
  note: Note
  mode: Mode
  selected: boolean
  editing: boolean
  viewRef: RefObject<View>
  onSelect: (id: string) => void
  onMove: (id: string, x: number, y: number, centerX: number, centerY: number) => void
  onFront: (id: string) => void
  onMission: (id: string, choice: Exclude<MissionChoice, null>) => void
  onEditStart: (id: string) => void
  onEditEnd: (id: string, text: string) => void
  onMenu: (id: string, clientX: number, clientY: number) => void
  onDelete: (id: string) => void
}

type DragState = { pointerId: number; startX: number; startY: number; left: number; top: number; moved: boolean }

const KEY_STEP = 24
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

export const NoteCard = memo(function NoteCard({
  note,
  mode,
  selected,
  editing,
  viewRef,
  onSelect,
  onMove,
  onFront,
  onMission,
  onEditStart,
  onEditEnd,
  onMenu,
  onDelete,
}: Props) {
  const cardRef = useRef<HTMLElement>(null)
  const drag = useRef<DragState | null>(null)
  const [dragging, setDragging] = useState(false)

  function commit(left: number, top: number) {
    const card = cardRef.current
    if (!card) return
    const x = Math.round(left)
    const y = Math.round(top)
    card.style.left = `${x}px`
    card.style.top = `${y}px`
    onMove(note.id, x, y, x + card.offsetWidth / 2, y + card.offsetHeight / 2)
  }

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    if (event.button !== 0 || editing) return
    if ((event.target as HTMLElement).closest("button, input, select, textarea, a")) return
    event.stopPropagation()
    const card = cardRef.current
    if (!card) return
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: note.x,
      top: note.y,
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
    const card = cardRef.current
    if (!card) return
    const zoom = viewRef.current.zoom
    card.style.left = `${state.left + dx / zoom}px`
    card.style.top = `${state.top + dy / zoom}px`
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLElement>) {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    drag.current = null
    if (!state.moved) {
      if (event.type === "pointerup") onSelect(note.id)
      return
    }
    setDragging(false)
    const zoom = viewRef.current.zoom
    commit(state.left + (event.clientX - state.startX) / zoom, state.top + (event.clientY - state.startY) / zoom)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) return
    if (event.key === "Enter") {
      event.preventDefault()
      onEditStart(note.id)
      return
    }
    if (event.key === " ") {
      event.preventDefault()
      onSelect(note.id)
      return
    }
    if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
      event.preventDefault()
      const rect = event.currentTarget.getBoundingClientRect()
      onMenu(note.id, rect.left + rect.width / 2, rect.top + rect.height / 2)
      return
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault()
      onDelete(note.id)
      return
    }
    const arrow = ARROWS[event.key]
    if (!arrow) return
    event.preventDefault()
    const step = event.shiftKey ? KEY_STEP * 4 : KEY_STEP
    onFront(note.id)
    commit(note.x + arrow[0] * step, note.y + arrow[1] * step)
  }

  const isTask = note.task !== null
  const released = note.mission === "release" && mode !== "unload" && mode !== "sort"
  const showLabels = mode === "labels" || mode === "task"
  const color = getCardColor(note.color)
  const appliedLabels = LABEL_GROUPS.flatMap((group) => {
    const option = group.options.find((o) => o.id === note.labels[group.id])
    return option ? [{ ...option, shape: group.shape }] : []
  })
  const summary = isTask ? `Task: ${note.task?.title}` : note.text.trim() ? `Card: ${note.text}` : "Blank card"

  return (
    <article
      ref={cardRef}
      data-note-card=""
      data-note-id={note.id}
      tabIndex={0}
      aria-label={summary}
      aria-describedby="board-help"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onDoubleClick={(event) => {
        if ((event.target as HTMLElement).closest("button")) return
        onEditStart(note.id)
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onMenu(note.id, event.clientX, event.clientY)
      }}
      onKeyDown={handleKeyDown}
      style={{
        left: note.x,
        top: note.y,
        width: isTask ? CARD_WIDTH + 28 : CARD_WIDTH,
        minHeight: CARD_MIN_HEIGHT,
        zIndex: dragging || editing ? 9999 : note.z,
        transform: dragging ? "rotate(0deg) scale(1.04)" : editing ? "rotate(0deg)" : `rotate(${note.rotation}deg)`,
        backgroundColor: isTask ? undefined : color.fill,
        borderBottomColor: isTask ? undefined : color.edge,
      }}
      className={clsx(
        "group absolute flex touch-none flex-col select-none outline-none",
        "transition-[transform,box-shadow,opacity] duration-150",
        "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-board",
        editing ? "cursor-text" : dragging ? "cursor-grabbing" : "cursor-grab",
        isTask ? "task-ruled rounded-md border border-line bg-card" : "rounded-sm border-b-2",
        !isTask && (color.dark ? "text-board" : "text-ink"),
        dragging || editing
          ? "shadow-[0_18px_30px_-12px_rgba(35,39,43,0.45)]"
          : "shadow-[0_1px_1px_rgba(35,39,43,0.08),0_6px_14px_-8px_rgba(35,39,43,0.35)]",
        selected && "ring-2 ring-accent ring-offset-2 ring-offset-board",
        released && "opacity-50",
      )}
    >
      {isTask ? (
        <TaskFace note={note} released={released} />
      ) : editing ? (
        <CardEditor note={note} onDone={(text) => onEditEnd(note.id, text)} />
      ) : (
        <p
          className={clsx(
            "flex-1 px-4 pt-3.5 pb-3 font-serif text-lg leading-snug text-current text-pretty break-words whitespace-pre-wrap",
            released && "line-through decoration-release/60",
          )}
        >
          {note.text}
        </p>
      )}

      {note.hashtags.length > 0 ? (
        <ul aria-label="Hashtags" className="flex flex-wrap gap-x-2 gap-y-0.5 px-4 pb-2.5 text-xs font-medium text-current/70">
          {note.hashtags.map((tag) => (
            <li key={tag}>#{tag}</li>
          ))}
        </ul>
      ) : null}

      {showLabels && appliedLabels.length > 0 ? (
        <div className="flex flex-wrap gap-1 px-4 pb-3">
          {appliedLabels.map((label) => (
            <LabelChip key={label.id} name={label.name} color={label.color} shape={label.shape} />
          ))}
        </div>
      ) : null}

      {mode === "mission" ? <MissionControls note={note} onMission={onMission} /> : null}
    </article>
  )
})

function CardEditor({ note, onDone }: { note: Note; onDone: (text: string) => void }) {
  const finished = useRef(false)

  function finish(value: string) {
    if (finished.current) return
    finished.current = true
    onDone(value)
  }

  return (
    <textarea
      aria-label="Card text"
      defaultValue={note.text}
      autoFocus
      onFocus={(e) => {
        const end = e.currentTarget.value.length
        e.currentTarget.setSelectionRange(end, end)
      }}
      onBlur={(e) => finish(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
          e.preventDefault()
          finish(e.currentTarget.value)
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
      placeholder="Write anything…"
      maxLength={280}
      className="field-sizing-content min-h-[116px] w-full flex-1 resize-none bg-transparent px-4 pt-3.5 pb-3 font-serif text-lg leading-snug text-current outline-none placeholder:text-current/40"
    />
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
        <span className="text-[10px] uppercase tracking-[0.14em] text-ink-soft">1 card = 1 task</span>
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
      {note.text.trim() ? (
        <p className="mt-2 border-t border-dashed border-line pt-1.5 text-[11px] leading-4 text-ink-soft">
          <span className="font-medium">From card:</span> <span className="italic">{note.text}</span>
        </p>
      ) : null}
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
    <div className="mt-auto flex border-t border-ink/10" role="group" aria-label="Keep or release">
      <button
        type="button"
        aria-pressed={note.mission === "keep"}
        onClick={() => onMission(note.id, "keep")}
        className={clsx(
          "flex flex-1 items-center justify-center gap-1 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
          note.mission === "keep" ? "bg-accent text-board" : "text-current/70 hover:bg-accent-soft hover:text-accent",
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
          note.mission === "release" ? "bg-release text-board" : "text-current/70 hover:bg-release/10 hover:text-release",
        )}
      >
        <X className="size-3.5" aria-hidden="true" />
        Release
      </button>
    </div>
  )
}
