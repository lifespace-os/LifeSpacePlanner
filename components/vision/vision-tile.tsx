"use client"

import { memo, useRef, useState } from "react"
import clsx from "clsx"
import { Eye, EyeOff, X } from "lucide-react"
import { ImageViewer } from "@/components/image-viewer"
import { useLanguage } from "@/components/language-provider"
import { mediaUrl } from "@/lib/media"
import { clampBox, type VisionItem } from "@/lib/vision"

/** What a tile shows. It is read from the card each time and never stored on the board. */
export type TileFace = {
  words: string
  image: string | undefined
  /** The paper colour of a whiteboard card. A task has none and uses the card surface. */
  fill: string | undefined
  edge: string | undefined
  dark: boolean
}

type Box = Pick<VisionItem, "x" | "y" | "width" | "height">

type Props = {
  item: VisionItem
  face: TileFace
  z: number
  onBox: (id: string, box: Box) => void
  onFront: (id: string) => void
  onToggleWords: (id: string) => void
  onRemove: (id: string) => void
}

type Gesture = {
  pointerId: number
  mode: "move" | "resize"
  startX: number
  startY: number
  origin: Box
  moved: boolean
}

const KEY_STEP = 10
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

const ICON_BUTTON =
  "flex size-7 items-center justify-center rounded-md bg-board/90 text-ink shadow-sm transition-colors hover:bg-board focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"

export const VisionTile = memo(function VisionTile({ item, face, z, onBox, onFront, onToggleWords, onRemove }: Props) {
  const { t } = useLanguage()
  const gesture = useRef<Gesture | null>(null)
  const [preview, setPreview] = useState<Box | null>(null)
  const [dragging, setDragging] = useState(false)
  const [viewing, setViewing] = useState(false)

  const box = preview ?? item
  const showPicture = Boolean(face.image)
  const showWords = !item.hideWords && face.words.trim().length > 0
  const label = face.words.trim() || t("search.blankCard")

  function begin(event: React.PointerEvent<HTMLElement>, mode: Gesture["mode"]) {
    if (event.button !== 0) return
    event.stopPropagation()
    onFront(item.id)
    gesture.current = {
      pointerId: event.pointerId,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      origin: { x: item.x, y: item.y, width: item.width, height: item.height },
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
      setDragging(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    setPreview(
      clampBox(
        state.mode === "move"
          ? { ...state.origin, x: state.origin.x + dx, y: state.origin.y + dy }
          : { ...state.origin, width: state.origin.width + dx, height: state.origin.height + dy },
      ),
    )
  }

  function end(event: React.PointerEvent<HTMLElement>) {
    const state = gesture.current
    if (!state || state.pointerId !== event.pointerId) return
    gesture.current = null
    setDragging(false)
    if (state.moved && event.type === "pointerup") {
      const dx = event.clientX - state.startX
      const dy = event.clientY - state.startY
      onBox(
        item.id,
        state.mode === "move"
          ? { ...state.origin, x: state.origin.x + dx, y: state.origin.y + dy }
          : { ...state.origin, width: state.origin.width + dx, height: state.origin.height + dy },
      )
    }
    setPreview(null)
  }

  function keyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) return
    const arrow = ARROWS[event.key]
    if (!arrow) return
    event.preventDefault()
    onFront(item.id)
    onBox(
      item.id,
      event.shiftKey
        ? { ...item, width: item.width + arrow[0] * KEY_STEP, height: item.height + arrow[1] * KEY_STEP }
        : { ...item, x: item.x + arrow[0] * KEY_STEP, y: item.y + arrow[1] * KEY_STEP },
    )
  }

  return (
    <article
      tabIndex={0}
      aria-label={t("vision.tile", { title: label })}
      aria-describedby="vision-help"
      onPointerDown={(event) => begin(event, "move")}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={keyDown}
      style={{
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        zIndex: dragging ? 9999 : z,
        backgroundColor: face.fill,
        borderBottomColor: face.edge,
      }}
      className={clsx(
        "group absolute flex touch-none flex-col overflow-hidden rounded-sm border-b-2 outline-none select-none",
        face.fill === undefined && "border border-line bg-card",
        face.fill !== undefined && (face.dark ? "text-paper-light" : "text-paper-ink"),
        dragging
          ? "cursor-grabbing shadow-[0_18px_30px_-12px_rgba(35,39,43,0.45)]"
          : "cursor-grab shadow-[0_1px_1px_rgba(35,39,43,0.08),0_6px_14px_-8px_rgba(35,39,43,0.35)] hover:shadow-[0_2px_3px_rgba(35,39,43,0.12),0_12px_22px_-10px_rgba(35,39,43,0.5)] dark-theme:hover:shadow-halo",
        "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-board",
      )}
    >
      {showPicture ? (
        <button
          type="button"
          aria-label={t("viewer.open")}
          aria-haspopup="dialog"
          onClick={() => setViewing(true)}
          className="block min-h-0 w-full flex-1 cursor-zoom-in bg-ink/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- served from the app's own media store */}
          <img
            src={mediaUrl(face.image!)}
            alt={t("whiteboard.image.alt")}
            loading="lazy"
            decoding="async"
            draggable={false}
            className="size-full object-cover"
          />
        </button>
      ) : null}

      {showWords ? (
        <p
          className={clsx(
            "overflow-hidden px-3 py-2 text-pretty break-words",
            showPicture ? "max-h-[45%] shrink-0 text-sm leading-snug" : "flex-1 font-serif text-lg leading-snug",
          )}
        >
          {face.words}
        </p>
      ) : null}

      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          aria-pressed={item.hideWords}
          aria-label={item.hideWords ? t("vision.showWords") : t("vision.hideWords")}
          title={item.hideWords ? t("vision.showWords") : t("vision.hideWords")}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onToggleWords(item.id)}
          className={ICON_BUTTON}
        >
          {item.hideWords ? <Eye aria-hidden="true" className="size-4" /> : <EyeOff aria-hidden="true" className="size-4" />}
        </button>
        <button
          type="button"
          aria-label={t("vision.removeTile")}
          title={t("vision.removeTile")}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onRemove(item.id)}
          className={ICON_BUTTON}
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      <span
        role="presentation"
        title={t("vision.resize")}
        onPointerDown={(event) => begin(event, "resize")}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className="absolute right-0 bottom-0 size-5 cursor-nwse-resize touch-none opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      >
        <svg viewBox="0 0 20 20" aria-hidden="true" className="size-full text-ink drop-shadow">
          <path d="M18 8L8 18M18 13L13 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
      </span>

      {viewing && face.image ? <ImageViewer id={face.image} onClose={() => setViewing(false)} /> : null}
    </article>
  )
})
