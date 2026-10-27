"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import clsx from "clsx"
import { useGoals } from "@/components/goals-provider"
import { useKanban } from "@/components/kanban/kanban-provider"
import { useLanguage } from "@/components/language-provider"
import { useVision } from "@/components/vision/vision-provider"
import { VisionTile, type TileFace } from "@/components/vision/vision-tile"
import { ZoomControls } from "@/components/whiteboard/zoom-controls"
import { getCardColor, MAX_ZOOM, MIN_ZOOM, type View } from "@/lib/board-data"
import { resultKey } from "@/lib/kanban-data"

const ZOOM_STEP = 1.25
const GRID = 22
const FIT_PADDING = { top: 90, right: 60, bottom: 110, left: 60 }

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

type Pan = { pointerId: number; lastX: number; lastY: number }

export function VisionScreen() {
  const { t } = useLanguage()
  const { notes, setNotes } = useGoals()
  const { cards, setCards } = useKanban()
  const { items, qualifying, move, bringToFront } = useVision()

  const [view, setViewState] = useState<View>({ x: 0, y: 0, zoom: 1 })
  const [panning, setPanning] = useState(false)
  const viewRef = useRef(view)
  const viewportRef = useRef<HTMLDivElement>(null)
  const pan = useRef<Pan | null>(null)
  const fitted = useRef(false)

  const updateView = useCallback((change: (previous: View) => View) => {
    const next = change(viewRef.current)
    viewRef.current = next
    setViewState(next)
  }, [])

  const zoomAt = useCallback(
    (factor: number, clientX: number, clientY: number) => {
      const rect = viewportRef.current?.getBoundingClientRect()
      const sx = clientX - (rect?.left ?? 0)
      const sy = clientY - (rect?.top ?? 0)
      updateView((v) => {
        const zoom = clampZoom(v.zoom * factor)
        if (zoom === v.zoom) return v
        const wx = (sx - v.x) / v.zoom
        const wy = (sy - v.y) / v.zoom
        return { zoom, x: sx - wx * zoom, y: sy - wy * zoom }
      })
    },
    [updateView],
  )

  const zoomAtCenter = useCallback(
    (factor: number) => {
      const rect = viewportRef.current?.getBoundingClientRect()
      if (rect) zoomAt(factor, rect.left + rect.width / 2, rect.top + rect.height / 2)
    },
    [zoomAt],
  )

  const fitAll = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const tiles = viewport.querySelectorAll<HTMLElement>("[data-vision-tile]")
    if (tiles.length === 0) {
      updateView(() => ({ x: viewport.clientWidth / 2, y: viewport.clientHeight / 2, zoom: 1 }))
      return
    }
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const tile of tiles) {
      minX = Math.min(minX, tile.offsetLeft)
      minY = Math.min(minY, tile.offsetTop)
      maxX = Math.max(maxX, tile.offsetLeft + tile.offsetWidth)
      maxY = Math.max(maxY, tile.offsetTop + tile.offsetHeight)
    }
    const availW = Math.max(200, viewport.clientWidth - FIT_PADDING.left - FIT_PADDING.right)
    const availH = Math.max(200, viewport.clientHeight - FIT_PADDING.top - FIT_PADDING.bottom)
    const zoom = clampZoom(Math.min(availW / (maxX - minX), availH / (maxY - minY), 1))
    updateView(() => ({
      zoom,
      x: FIT_PADDING.left + (availW - (maxX - minX) * zoom) / 2 - minX * zoom,
      y: FIT_PADDING.top + (availH - (maxY - minY) * zoom) / 2 - minY * zoom,
    }))
  }, [updateView])

  const faces = useMemo(() => {
    const map = new Map<string, TileFace>()
    for (const note of notes) {
      if (!qualifying.has(note.id) || !note.image) continue
      const color = getCardColor(note.color)
      map.set(note.id, {
        kind: "note",
        words: note.text,
        image: note.image,
        fill: color.fill,
        edge: color.edge,
        dark: color.dark,
      })
    }
    for (const card of cards) {
      if (!qualifying.has(card.id) || !card.image) continue
      map.set(card.id, { kind: "task", words: card.title, image: card.image, fill: undefined, edge: undefined, dark: false })
    }
    return map
  }, [notes, cards, qualifying])

  const tiles = useMemo(
    () => items.flatMap((item, index) => (faces.has(item.cardId) ? [{ item, face: faces.get(item.cardId)!, z: index + 1 }] : [])),
    [items, faces],
  )

  useEffect(() => {
    if (fitted.current || tiles.length === 0) return
    fitted.current = true
    fitAll()
  }, [tiles.length, fitAll])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    function handleWheel(event: WheelEvent) {
      if ((event.target as HTMLElement).closest("textarea")) return
      event.preventDefault()
      const intensity = event.ctrlKey ? 0.01 : 0.0015
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
      zoomAt(Math.exp(-delta * intensity), event.clientX, event.clientY)
    }
    viewport.addEventListener("wheel", handleWheel, { passive: false })
    return () => viewport.removeEventListener("wheel", handleWheel)
  }, [zoomAt])

  const setWords = useCallback(
    (cardId: string, kind: TileFace["kind"], words: string) => {
      const next = words.trim()
      if (!next) return
      if (kind === "note") {
        setNotes((previous) => previous.map((note) => (note.id === cardId && note.text !== next ? { ...note, text: next } : note)))
        return
      }
      setCards((previous) => {
        const task = previous.find((card) => card.id === cardId)
        if (!task || task.title === next) return previous
        const key = resultKey(task)
        return previous.map((card) => (resultKey(card) === key ? { ...card, title: next } : card))
      })
    },
    [setNotes, setCards],
  )

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.button !== 1) return
    if ((event.target as HTMLElement).closest("[data-vision-tile], [data-board-control]")) return
    if (document.activeElement instanceof HTMLTextAreaElement) document.activeElement.blur()
    pan.current = { pointerId: event.pointerId, lastX: event.clientX, lastY: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
    setPanning(true)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const state = pan.current
    if (!state || state.pointerId !== event.pointerId) return
    const dx = event.clientX - state.lastX
    const dy = event.clientY - state.lastY
    state.lastX = event.clientX
    state.lastY = event.clientY
    updateView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }))
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (pan.current?.pointerId !== event.pointerId) return
    pan.current = null
    setPanning(false)
  }

  const gridSize = GRID * view.zoom

  return (
    <main className="relative h-[calc(100dvh-3.5rem)] overflow-hidden bg-board">
      <div
        ref={viewportRef}
        role="region"
        aria-label={t("vision.canvas")}
        aria-describedby="vision-help"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        style={{ backgroundSize: `${gridSize}px ${gridSize}px`, backgroundPosition: `${view.x}px ${view.y}px` }}
        className={clsx(
          "board-grain absolute inset-0 touch-none overflow-hidden select-none",
          panning ? "cursor-grabbing" : "cursor-grab",
        )}
      >
        <p id="vision-help" className="sr-only">
          {t("vision.help")}
        </p>
        <div
          className="absolute top-0 left-0 origin-top-left will-change-transform"
          style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.zoom})` }}
        >
          {tiles.map(({ item, face, z }) => (
            <VisionTile
              key={item.id}
              item={item}
              face={face}
              z={z}
              zoom={view.zoom}
              onMove={move}
              onFront={bringToFront}
              onWords={setWords}
            />
          ))}
        </div>
      </div>

      <h1 className="pointer-events-none absolute top-4 left-5 font-serif text-xl font-medium tracking-tight text-ink-soft">
        {t("vision.title")}
      </h1>

      {tiles.length === 0 ? (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-ink-soft">
          {t("vision.empty")}
        </p>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4">
        <ZoomControls
          zoom={view.zoom}
          canZoomIn={view.zoom < MAX_ZOOM}
          canZoomOut={view.zoom > MIN_ZOOM}
          onZoomIn={() => zoomAtCenter(ZOOM_STEP)}
          onZoomOut={() => zoomAtCenter(1 / ZOOM_STEP)}
          onReset={() => zoomAtCenter(1 / view.zoom)}
          onFit={fitAll}
        />
      </div>
    </main>
  )
}
