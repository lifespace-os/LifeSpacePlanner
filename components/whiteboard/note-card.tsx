"use client"

import { memo, useRef, useState, type RefObject } from "react"
import clsx from "clsx"
import { Check, X } from "lucide-react"
import {
  CARD_MIN_HEIGHT,
  CARD_WIDTH,
  getCardColor,
  labelSetsOf,
  type LabelSetLists,
  type MissionChoice,
  type Mode,
  type Note,
  type View,
} from "@/lib/board-data"
import { useT } from "@/components/language-provider"
import { ImageViewer } from "@/components/image-viewer"
import { beginGroupDrag, type GroupDrag, type GroupMove } from "@/lib/group-drag"
import { mediaUrl } from "@/lib/media"
import { CardLabelSets } from "./card-label-sets"

type Props = {
  note: Note
  mode: Mode
  missionSaved: boolean
  /** The labels of each Labels set, used to draw one shape per set on the face. */
  labelLists: LabelSetLists
  selected: boolean
  editing: boolean
  viewRef: RefObject<View>
  /** Ids of every selected card, read when a drag starts so the whole selection travels together. */
  selectionRef: RefObject<string[]>
  /** In the Ikigai view cards stay put: dragging one is a tagging gesture and the card returns. */
  fixed: boolean
  /** In the Markers view cards move freely, and a drop on the marker area tags them and sends them back. */
  tagTarget: boolean
  /** Number of cards in the current multi-selection that includes this card, otherwise 0. */
  multiCount: number
  onSelect: (id: string, additive: boolean) => void
  /** Returns true when a drop was taken as a tagging gesture, so the cards should return. */
  onTagDrag: (id: string, clientX: number, clientY: number, phase: "move" | "drop" | "cancel") => boolean
  /** Returns true when a drop landed on the trash bin and the cards went to Trash. */
  onBinDrag: (id: string, clientX: number, clientY: number, phase: "move" | "drop" | "cancel") => boolean
  onMove: (id: string, x: number, y: number, centerX: number, centerY: number) => void
  onMoveMany: (moves: GroupMove[]) => void
  onFront: (id: string) => void
  onMission: (id: string, choice: Exclude<MissionChoice, null>) => void
  onEditStart: (id: string) => void
  onEditEnd: (id: string, text: string) => void
  onMenu: (id: string, clientX: number, clientY: number) => void
  onDelete: (id: string) => void
}

type DragState = {
  pointerId: number
  startX: number
  startY: number
  group: GroupDrag | null
  moved: boolean
}

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
  missionSaved,
  labelLists,
  selected,
  editing,
  viewRef,
  selectionRef,
  fixed,
  tagTarget,
  multiCount,
  onSelect,
  onTagDrag,
  onBinDrag,
  onMove,
  onMoveMany,
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
      group: null,
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
      const root = cardRef.current?.parentElement
      if (!root) return
      const selection = selectionRef.current
      const inSelection = selection.includes(note.id)
      if (!inSelection) onSelect(note.id, false)
      state.group = beginGroupDrag(root, inSelection ? selection : [note.id])
    }
    const zoom = viewRef.current.zoom
    state.group?.apply(dx / zoom, dy / zoom)
    if (fixed || tagTarget) onTagDrag(note.id, event.clientX, event.clientY, "move")
    onBinDrag(note.id, event.clientX, event.clientY, "move")
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLElement>) {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    drag.current = null
    if (!state.moved) {
      if (event.type === "pointerup") onSelect(note.id, event.shiftKey)
      return
    }
    setDragging(false)
    const dropped = event.type === "pointerup"
    if (onBinDrag(note.id, event.clientX, event.clientY, dropped ? "drop" : "cancel")) {
      state.group?.reset()
      return
    }
    if (fixed) {
      state.group?.reset()
      onTagDrag(note.id, event.clientX, event.clientY, dropped ? "drop" : "cancel")
      return
    }
    if (tagTarget && onTagDrag(note.id, event.clientX, event.clientY, dropped ? "drop" : "cancel")) {
      state.group?.reset()
      return
    }
    const zoom = viewRef.current.zoom
    const dx = dropped ? (event.clientX - state.startX) / zoom : 0
    const dy = dropped ? (event.clientY - state.startY) / zoom : 0
    if (state.group) onMoveMany(state.group.commit(dx, dy))
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
      onSelect(note.id, event.shiftKey)
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
    if (!arrow || fixed) return
    event.preventDefault()
    const step = event.shiftKey ? KEY_STEP * 4 : KEY_STEP
    onFront(note.id)
    commit(note.x + arrow[0] * step, note.y + arrow[1] * step)
  }

  const isTask = note.task !== null
  const released = note.mission === "release" && mode !== "unload" && mode !== "clusters"
  const color = getCardColor(note.color)
  const labelSets = labelSetsOf(note, labelLists)
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
        if ((event.target as HTMLElement).closest("button, [data-card-image]")) return
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
        "data-[image-drop]:outline-2 data-[image-drop]:outline-dashed data-[image-drop]:outline-offset-2 data-[image-drop]:outline-ink",
        editing ? "cursor-text" : dragging ? "cursor-grabbing" : "cursor-grab",
        isTask ? "rounded-md border border-line border-t-4 border-t-accent bg-card" : "rounded-sm border-b-2",
        !isTask && (color.dark ? "text-paper-light" : "text-paper-ink"),
        dragging || editing
          ? "shadow-[0_18px_30px_-12px_rgba(35,39,43,0.45)]"
          : "shadow-[0_1px_1px_rgba(35,39,43,0.08),0_6px_14px_-8px_rgba(35,39,43,0.35)] hover:shadow-[0_2px_3px_rgba(35,39,43,0.12),0_12px_22px_-10px_rgba(35,39,43,0.5)] dark-theme:hover:shadow-halo",
        selected && "ring-2 ring-accent ring-offset-2 ring-offset-board",
        released && "opacity-50",
      )}
    >
      {note.image ? <CardPicture id={note.image} /> : null}

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

      <CardLabelSets sets={labelSets} />

      <div className="mt-auto flex px-3 pb-2.5">
        <button
          type="button"
          aria-label={
            note.hashtags.length > 0
              ? `Tags, ${note.hashtags.length} ${note.hashtags.length === 1 ? "hashtag" : "hashtags"}. Open the card window`
              : "Tags. Open the card window"
          }
          aria-haspopup="dialog"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            onMenu(note.id, rect.left, rect.bottom + 6)
          }}
          className="inline-flex h-6 items-center gap-1 rounded-full border border-current/25 px-2.5 text-xs font-medium text-current/80 transition-colors hover:bg-current/10 hover:text-current focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        >
          Tags
          {note.hashtags.length > 0 ? <span className="tabular-nums">{note.hashtags.length}</span> : null}
        </button>
      </div>

      {mode === "mission" && missionSaved && !fixed && !tagTarget ? <MissionControls note={note} onMission={onMission} /> : null}

      {dragging && multiCount > 1 ? (
        <span className="absolute -top-3 -right-3 flex h-7 min-w-7 items-center justify-center rounded-full bg-accent px-2 text-sm font-medium text-board tabular-nums shadow-md">
          {multiCount}
        </span>
      ) : null}
    </article>
  )
})

/** The saved picture, cropped to fill a fixed frame so the card never grows to the original. */
function CardPicture({ id }: { id: string }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  return (
    <div
      data-card-image=""
      className="mx-auto mt-2 h-[110px] w-[180px] shrink-0 overflow-hidden rounded-sm bg-ink/10"
    >
      <button
        type="button"
        aria-label={t("viewer.open")}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="block size-full cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- served from the app's own media store */}
        <img
          src={mediaUrl(id)}
          alt={t("whiteboard.image.alt")}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="size-full object-cover"
        />
      </button>
      {open ? <ImageViewer id={id} onClose={() => setOpen(false)} /> : null}
    </div>
  )
}

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
  const owner = task.owner.trim()

  return (
    <div className="flex flex-col gap-2.5 px-3.5 pt-3 pb-2">
      <p
        className={clsx(
          "font-sans text-[15px] leading-snug font-semibold text-ink text-pretty break-words",
          released && "line-through decoration-release/60",
        )}
      >
        {task.title}
      </p>
      <dl className="flex gap-4 text-xs">
        <div className="flex flex-col gap-0.5">
          <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-soft">Since</dt>
          <dd className="font-medium text-ink tabular-nums">{task.since ? formatDue(task.since) : "Not set"}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-soft">Due</dt>
          <dd className="font-medium text-ink tabular-nums">{task.due ? formatDue(task.due) : "Not set"}</dd>
        </div>
        <div className="ml-auto flex min-w-0 flex-col items-end gap-0.5">
          <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-soft">Owner</dt>
          <dd className="flex min-w-0 items-center gap-1.5 font-medium text-ink">
            <span
              aria-hidden="true"
              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-board"
            >
              {owner ? owner.charAt(0).toUpperCase() : "?"}
            </span>
            <span className="truncate">{owner || "Unassigned"}</span>
          </dd>
        </div>
      </dl>
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
