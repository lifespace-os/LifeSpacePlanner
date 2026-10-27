"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Minus, Plus, X } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { mediaUrl } from "@/lib/media"

const FIT_SHARE = 0.9
const MAX_SCALE = 8
const STEP = 1.25
const PAN_STEP = 48

type Size = { w: number; h: number }
type Point = { x: number; y: number }

const BUTTON =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-line bg-card px-2.5 text-sm text-ink transition-colors hover:bg-line/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-pressed:bg-line/60"

function windowSize(): Size {
  return { w: window.innerWidth, h: window.innerHeight }
}

/**
 * The picture over the app. It opens fitted inside 90 percent of the window with its shape kept. The person can zoom
 * with the buttons, the wheel or + and -, move it by dragging, and return to the fit or to 100 percent. Escape or Close
 * leaves the card as it was.
 */
export function ImageViewer({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useLanguage()
  const [natural, setNatural] = useState<Size | null>(null)
  const [win, setWin] = useState<Size>(windowSize)
  // null means "fit to the window"; a number is the zoom where 1 is actual size.
  const [scale, setScale] = useState<number | null>(null)
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)

  const stageRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ pointerId: number; start: Point; origin: Point } | null>(null)

  const fit = natural ? Math.min(1, (win.w * FIT_SHARE) / natural.w, (win.h * FIT_SHARE) / natural.h) : 1
  const shown = scale ?? fit

  const latest = useRef({ natural, win, fit, shown, pan, onClose })
  useLayoutEffect(() => {
    latest.current = { natural, win, fit, shown, pan, onClose }
  })

  const clampPan = useCallback((point: Point, at: number): Point => {
    const { natural: size, win: frame } = latest.current
    if (!size) return { x: 0, y: 0 }
    const limitX = Math.max(0, (size.w * at - frame.w) / 2)
    const limitY = Math.max(0, (size.h * at - frame.h) / 2)
    return { x: Math.min(limitX, Math.max(-limitX, point.x)), y: Math.min(limitY, Math.max(-limitY, point.y)) }
  }, [])

  /** Zooms to `next`, keeping the point under `anchor` (measured from the window centre) where it is. */
  const zoomTo = useCallback(
    (next: number, anchor: Point = { x: 0, y: 0 }) => {
      const { fit: floor, shown: current, pan: from } = latest.current
      const target = Math.min(MAX_SCALE, Math.max(floor, next))
      if (target <= floor + 0.0001) {
        setScale(null)
        setPan({ x: 0, y: 0 })
        return
      }
      const ratio = target / current
      setScale(target)
      setPan(clampPan({ x: anchor.x - (anchor.x - from.x) * ratio, y: anchor.y - (anchor.y - from.y) * ratio }, target))
    },
    [clampPan],
  )

  useEffect(() => {
    const onResize = () => setWin(windowSize())
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  useEffect(() => {
    setPan((point) => clampPan(point, latest.current.shown))
  }, [win, clampPan])

  useEffect(() => {
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeRef.current?.focus()
    return () => {
      if (before?.isConnected) before.focus()
    }
  }, [])

  // The app underneath stays inert: every key is handled here, before it can reach the board or a window below.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      event.stopPropagation()
      if (event.key === "Escape") {
        event.preventDefault()
        latest.current.onClose()
        return
      }
      if (event.key === "Tab") {
        const items = [...(toolbarRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled)") ?? [])]
        const first = items[0]
        const last = items[items.length - 1]
        if (!first || !last) return
        const active = document.activeElement
        if (!toolbarRef.current?.contains(active)) {
          event.preventDefault()
          first.focus()
        } else if (event.shiftKey && active === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && active === last) {
          event.preventDefault()
          first.focus()
        }
        return
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const { shown: current, pan: from } = latest.current
      if (event.key === "+" || event.key === "=") {
        event.preventDefault()
        zoomTo(current * STEP)
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault()
        zoomTo(current / STEP)
      } else if (event.key === "0") {
        event.preventDefault()
        setScale(null)
        setPan({ x: 0, y: 0 })
      } else if (event.key === "1") {
        event.preventDefault()
        zoomTo(1)
      } else if (event.key.startsWith("Arrow") && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault()
        const dx = event.key === "ArrowLeft" ? PAN_STEP : event.key === "ArrowRight" ? -PAN_STEP : 0
        const dy = event.key === "ArrowUp" ? PAN_STEP : event.key === "ArrowDown" ? -PAN_STEP : 0
        setPan(clampPan({ x: from.x + dx, y: from.y + dy }, current))
      }
    }
    window.addEventListener("keydown", onKeyDown, true)
    return () => window.removeEventListener("keydown", onKeyDown, true)
  }, [zoomTo, clampPan])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    function onWheel(event: WheelEvent) {
      event.preventDefault()
      const rect = stage!.getBoundingClientRect()
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
      zoomTo(latest.current.shown * Math.exp(-delta * 0.0015), {
        x: event.clientX - (rect.left + rect.width / 2),
        y: event.clientY - (rect.top + rect.height / 2),
      })
    }
    stage.addEventListener("wheel", onWheel, { passive: false })
    return () => stage.removeEventListener("wheel", onWheel)
  }, [zoomTo])

  const actual = Math.abs(shown - 1) < 0.005
  const atFit = scale === null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("viewer.title")}
      className="fixed inset-0 z-[200] bg-board/95 text-ink"
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onPointerCancel={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
    >
      <div
        ref={stageRef}
        data-image-stage=""
        className="flex size-full touch-none items-center justify-center overflow-hidden select-none"
        style={{ cursor: dragging ? "grabbing" : atFit ? "zoom-in" : "grab" }}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          event.currentTarget.setPointerCapture(event.pointerId)
          dragRef.current = {
            pointerId: event.pointerId,
            start: { x: event.clientX, y: event.clientY },
            origin: latest.current.pan,
          }
          setDragging(true)
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current
          if (!drag || drag.pointerId !== event.pointerId) return
          setPan(
            clampPan(
              { x: drag.origin.x + event.clientX - drag.start.x, y: drag.origin.y + event.clientY - drag.start.y },
              latest.current.shown,
            ),
          )
        }}
        onPointerUp={(event) => {
          if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
          setDragging(false)
        }}
        onPointerCancel={() => {
          dragRef.current = null
          setDragging(false)
        }}
        onDoubleClick={() => (atFit ? zoomTo(Math.max(1, fit * 2)) : (setScale(null), setPan({ x: 0, y: 0 })))}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- served from the app's own media store */}
        <img
          ref={(node) => {
            if (!node?.complete || node.naturalWidth === 0) return
            const { naturalWidth: w, naturalHeight: h } = node
            setNatural((current) => (current && current.w === w && current.h === h ? current : { w, h }))
          }}
          src={mediaUrl(id)}
          alt={t("whiteboard.image.alt")}
          draggable={false}
          onLoad={(event) =>
            setNatural({ w: event.currentTarget.naturalWidth, h: event.currentTarget.naturalHeight })
          }
          className="max-w-none flex-none rounded-sm shadow-lg"
          style={{
            width: natural?.w,
            height: natural?.h,
            visibility: natural ? "visible" : "hidden",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${shown})`,
          }}
        />
      </div>

      <div
        ref={toolbarRef}
        className="absolute top-3 left-1/2 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 rounded-lg border border-line bg-board p-1.5 shadow-lg"
      >
        <button type="button" aria-label={t("viewer.zoomOut")} title={t("viewer.zoomOut")} onClick={() => zoomTo(shown / STEP)} className={BUTTON}>
          <Minus aria-hidden="true" className="size-4" />
        </button>
        <span aria-live="polite" className="min-w-12 text-center text-sm text-ink tabular-nums">
          {Math.round(shown * 100)}%
        </span>
        <button type="button" aria-label={t("viewer.zoomIn")} title={t("viewer.zoomIn")} onClick={() => zoomTo(shown * STEP)} className={BUTTON}>
          <Plus aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          aria-pressed={atFit}
          onClick={() => {
            setScale(null)
            setPan({ x: 0, y: 0 })
          }}
          className={BUTTON}
        >
          {t("viewer.fit")}
        </button>
        <button type="button" aria-pressed={actual} onClick={() => zoomTo(1)} className={BUTTON}>
          {t("viewer.actualSize")}
        </button>
        <button ref={closeRef} type="button" onClick={onClose} className={BUTTON}>
          <X aria-hidden="true" className="size-4" />
          {t("common.close")}
        </button>
      </div>
    </div>,
    document.body,
  )
}
