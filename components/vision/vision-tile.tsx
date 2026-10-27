"use client"

import { memo, useRef, useState } from "react"
import clsx from "clsx"
import { ImageViewer } from "@/components/image-viewer"
import { useLanguage } from "@/components/language-provider"
import { CARD_MIN_HEIGHT, CARD_WIDTH } from "@/lib/board-data"
import { mediaUrl } from "@/lib/media"
import type { VisionItem } from "@/lib/vision"

/** What a card shows here. It is read from the card each time and never stored on the board. */
export type TileFace = {
  kind: "note" | "task"
  words: string
  image: string
  /** The paper colour of a whiteboard card. A task has none and uses the card surface. */
  fill: string | undefined
  edge: string | undefined
  dark: boolean
}

type Props = {
  item: VisionItem
  face: TileFace
  z: number
  zoom: number
  onMove: (id: string, x: number, y: number) => void
  onFront: (id: string) => void
  onWords: (cardId: string, kind: TileFace["kind"], words: string) => void
}

type Gesture = { pointerId: number; startX: number; startY: number; originX: number; originY: number; moved: boolean }

const KEY_STEP = 10
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

export const VisionTile = memo(function VisionTile({ item, face, z, zoom, onMove, onFront, onWords }: Props) {
  const { t } = useLanguage()
  const gesture = useRef<Gesture | null>(null)
  const [preview, setPreview] = useState<{ x: number; y: number } | null>(null)
  const [editing, setEditing] = useState(false)
  const [viewing, setViewing] = useState(false)

  const isTask = face.kind === "task"
  const spot = preview ?? item
  const label = face.words.trim() || t("search.blankCard")
  const dragging = preview !== null

  function begin(event: React.PointerEvent<HTMLElement>) {
    if (event.button !== 0 || editing) return
    if ((event.target as HTMLElement).closest("textarea, [data-card-image]")) return
    event.stopPropagation()
    onFront(item.id)
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: item.x,
      originY: item.y,
      moved: false,
    }
  }

  function move(event: React.PointerEvent<HTMLElement>) {
    const state = gesture.current
    if (!state || state.pointerId !== event.pointerId) return
    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY
    if (!state.moved) {
      if (Math.hypot(dx, dy) < 4) return
      state.moved = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    setPreview({ x: state.originX + dx / zoom, y: state.originY + dy / zoom })
  }

  function end(event: React.PointerEvent<HTMLElement>) {
    const state = gesture.current
    if (!state || state.pointerId !== event.pointerId) return
    gesture.current = null
    if (state.moved && event.type === "pointerup") {
      onMove(
        item.id,
        state.originX + (event.clientX - state.startX) / zoom,
        state.originY + (event.clientY - state.startY) / zoom,
      )
    }
    setPreview(null)
  }

  function keyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) return
    if (event.key === "Enter") {
      event.preventDefault()
      setEditing(true)
      return
    }
    const arrow = ARROWS[event.key]
    if (!arrow) return
    event.preventDefault()
    onFront(item.id)
    onMove(item.id, item.x + arrow[0] * KEY_STEP, item.y + arrow[1] * KEY_STEP)
  }

  return (
    <article
      data-vision-tile=""
      tabIndex={0}
      aria-label={t("vision.tile", { title: label })}
      aria-describedby="vision-help"
      onPointerDown={begin}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={keyDown}
      style={{
        left: spot.x,
        top: spot.y,
        width: isTask ? CARD_WIDTH + 28 : CARD_WIDTH,
        minHeight: CARD_MIN_HEIGHT,
        zIndex: dragging || editing ? 9999 : z,
        transform: dragging ? "scale(1.04)" : undefined,
        backgroundColor: isTask ? undefined : face.fill,
        borderBottomColor: isTask ? undefined : face.edge,
      }}
      className={clsx(
        "absolute flex touch-none flex-col outline-none select-none",
        "transition-[transform,box-shadow] duration-150",
        "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-board",
        editing ? "cursor-text" : dragging ? "cursor-grabbing" : "cursor-grab",
        isTask ? "rounded-md border border-line border-t-4 border-t-accent bg-card" : "rounded-sm border-b-2",
        !isTask && (face.dark ? "text-paper-light" : "text-paper-ink"),
        dragging || editing
          ? "shadow-[0_18px_30px_-12px_rgba(35,39,43,0.45)]"
          : "shadow-[0_1px_1px_rgba(35,39,43,0.08),0_6px_14px_-8px_rgba(35,39,43,0.35)] hover:shadow-[0_2px_3px_rgba(35,39,43,0.12),0_12px_22px_-10px_rgba(35,39,43,0.5)] dark-theme:hover:shadow-halo",
      )}
    >
      <div
        data-card-image=""
        className="mx-auto mt-2 h-[110px] w-[180px] shrink-0 overflow-hidden rounded-sm bg-ink/10"
      >
        <button
          type="button"
          aria-label={t("viewer.open")}
          aria-haspopup="dialog"
          onClick={() => setViewing(true)}
          className="block size-full cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- served from the app's own media store */}
          <img
            src={mediaUrl(face.image)}
            alt={t("whiteboard.image.alt")}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="size-full object-cover"
          />
        </button>
      </div>

      {editing ? (
        <WordsEditor
          initial={face.words}
          kind={face.kind}
          onDone={(words) => {
            setEditing(false)
            onWords(item.cardId, face.kind, words)
          }}
        />
      ) : (
        <p
          onClick={() => setEditing(true)}
          className={clsx(
            "flex-1 cursor-text px-4 pt-3 pb-3.5 leading-snug text-pretty break-words whitespace-pre-wrap",
            isTask ? "text-[15px] font-medium text-ink" : "font-serif text-lg text-current",
            !face.words.trim() && "opacity-50",
          )}
        >
          {face.words.trim() ? face.words : t("vision.addWords")}
        </p>
      )}

      {viewing ? <ImageViewer id={face.image} onClose={() => setViewing(false)} /> : null}
    </article>
  )
})

function WordsEditor({
  initial,
  kind,
  onDone,
}: {
  initial: string
  kind: TileFace["kind"]
  onDone: (words: string) => void
}) {
  const finished = useRef(false)

  function finish(value: string) {
    if (finished.current) return
    finished.current = true
    onDone(value)
  }

  return (
    <textarea
      aria-label="Card text"
      defaultValue={initial}
      maxLength={kind === "note" ? 280 : 120}
      autoFocus
      onFocus={(event) => {
        const end = event.currentTarget.value.length
        event.currentTarget.setSelectionRange(end, end)
      }}
      onBlur={(event) => finish(event.currentTarget.value)}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === "Escape" || (event.key === "Enter" && (event.metaKey || event.ctrlKey))) {
          event.preventDefault()
          finish(event.currentTarget.value)
        }
      }}
      className={clsx(
        "min-h-24 w-full flex-1 resize-none bg-transparent px-4 pt-3 pb-3.5 leading-snug outline-none",
        kind === "task" ? "text-[15px] font-medium text-ink" : "font-serif text-lg text-current",
      )}
    />
  )
}
