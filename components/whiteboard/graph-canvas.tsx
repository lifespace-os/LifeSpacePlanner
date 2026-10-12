"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { getCardColor, MAX_ZOOM, MIN_ZOOM, type GoalRing, type Note } from "@/lib/board-data"
import {
  GRAPH_LONE,
  GRAPH_VERTEX_R,
  graphVertexShown,
  layoutGraph,
  spotOf,
  type GraphFilter,
  type GraphSpot,
  type GraphVertex,
} from "@/lib/graph-layout"
import { CanvasMenu } from "./context-menu"
import { ZoomControls } from "./zoom-controls"

type GraphView = { x: number; y: number; zoom: number }

const ZOOM_STEP = 1.25

const halo: CSSProperties = {
  paintOrder: "stroke",
  stroke: "var(--color-board)",
  strokeWidth: 5,
  strokeLinejoin: "round",
}

function shorten(text: string) {
  const line = text.replace(/\s+/g, " ").trim()
  return line.length > 17 ? `${line.slice(0, 16)}\u2026` : line || "Empty card"
}

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

type VertexPress = { id: string; pointerId: number; startX: number; startY: number; dx: number; dy: number; moved: boolean }

type PanPress = { pointerId: number; startX: number; startY: number; originX: number; originY: number }

function NameField({
  x,
  y,
  initial,
  onDone,
}: {
  x: number
  y: number
  initial: string
  onDone: (text: string | null) => void
}) {
  const [draft, setDraft] = useState(initial)
  const finished = useRef(false)

  function finish(text: string | null) {
    if (finished.current) return
    finished.current = true
    onDone(text)
  }

  return (
    <foreignObject x={x - 90} y={y + GRAPH_VERTEX_R + 8} width={180} height={40} onPointerDown={(e) => e.stopPropagation()}>
      <input
        autoFocus
        value={draft}
        maxLength={120}
        aria-label="Card words"
        placeholder="Name this card"
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={() => finish(draft)}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) {
            event.preventDefault()
            finish(draft)
          } else if (event.key === "Escape") {
            event.preventDefault()
            finish(null)
          }
        }}
        className="h-9 w-full rounded-lg border border-accent bg-card px-2.5 text-center text-sm text-ink outline-none placeholder:text-ink-soft"
      />
    </foreignObject>
  )
}

/**
 * The Graph: its own canvas, separate from the whiteboard. Every Map ring is a cluster with rounded corners.
 * A card with one of that ring's hashtags is a vertex inside the cluster. A card with no ring hashtag sits alone.
 */
export function GraphCanvas({
  notes,
  rings,
  spots,
  selectedId,
  onSelect,
  onSpot,
  onMenu,
  onRename,
  onAddCard,
  filter,
  showText,
  small,
}: {
  notes: Note[]
  rings: GoalRing[]
  filter: GraphFilter
  showText: boolean
  small: boolean
  spots: Record<string, GraphSpot>
  selectedId: string | null
  onSelect: (id: string | null) => void
  onSpot: (id: string, spot: GraphSpot) => void
  onMenu: (id: string, clientX: number, clientY: number) => void
  onRename: (id: string, text: string) => void
  onAddCard: () => string
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [view, setViewState] = useState<GraphView>({ x: 0, y: 0, zoom: 1 })
  const viewRef = useRef(view)
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ clientX: number; clientY: number; x: number; y: number } | null>(null)
  const vertexPress = useRef<VertexPress | null>(null)
  const panPress = useRef<PanPress | null>(null)
  const dragResolved = useRef<GraphVertex | null>(null)
  const fitted = useRef(false)

  const layout = useMemo(() => layoutGraph(notes, rings, spots, drag), [notes, rings, spots, drag])
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  const byId = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes])
  const ringName = useMemo(() => new Map(layout.clusters.map((c) => [c.id, c.name])), [layout.clusters])

  const setView = useCallback((next: GraphView) => {
    viewRef.current = next
    setViewState(next)
  }, [])

  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const measure = () => setSize({ width: frame.clientWidth, height: frame.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  const fit = useCallback(() => {
    if (size.width === 0 || size.height === 0) return
    const { bounds } = layoutRef.current
    const w = bounds.right - bounds.left + 120
    const h = bounds.bottom - bounds.top + 120
    const zoom = clampZoom(Math.min(size.width / w, size.height / h, 1))
    setView({
      zoom,
      x: size.width / 2 - ((bounds.left + bounds.right) / 2) * zoom,
      y: size.height / 2 - ((bounds.top + bounds.bottom) / 2) * zoom,
    })
  }, [size.width, size.height, setView])

  useLayoutEffect(() => {
    if (fitted.current || size.width === 0) return
    fitted.current = true
    fit()
  }, [size.width, fit])

  const zoomAt = useCallback(
    (factor: number, sx: number, sy: number) => {
      const v = viewRef.current
      const zoom = clampZoom(v.zoom * factor)
      if (zoom === v.zoom) return
      const wx = (sx - v.x) / v.zoom
      const wy = (sy - v.y) / v.zoom
      setView({ zoom, x: sx - wx * zoom, y: sy - wy * zoom })
      setMenu(null)
    },
    [setView],
  )

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    function handleWheel(event: WheelEvent) {
      event.preventDefault()
      const rect = frame!.getBoundingClientRect()
      zoomAt(Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0015)), event.clientX - rect.left, event.clientY - rect.top)
    }
    frame.addEventListener("wheel", handleWheel, { passive: false })
    return () => frame.removeEventListener("wheel", handleWheel)
  }, [zoomAt])

  function toWorld(clientX: number, clientY: number) {
    const rect = frameRef.current?.getBoundingClientRect()
    const v = viewRef.current
    return { x: (clientX - (rect?.left ?? 0) - v.x) / v.zoom, y: (clientY - (rect?.top ?? 0) - v.y) / v.zoom }
  }

  function handleCanvasPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (event.button !== 0 && event.button !== 1) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    panPress.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: viewRef.current.x,
      originY: viewRef.current.y,
    }
    onSelect(null)
  }

  function handleCanvasPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const press = panPress.current
    if (!press || press.pointerId !== event.pointerId) return
    setView({
      ...viewRef.current,
      x: press.originX + event.clientX - press.startX,
      y: press.originY + event.clientY - press.startY,
    })
  }

  function handleCanvasPointerUp(event: React.PointerEvent<SVGSVGElement>) {
    if (panPress.current?.pointerId !== event.pointerId) return
    panPress.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function handleVertexDown(event: React.PointerEvent<SVGGElement>, vertex: GraphVertex) {
    if (event.button !== 0) return
    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const world = toWorld(event.clientX, event.clientY)
    vertexPress.current = {
      id: vertex.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dx: world.x - vertex.x,
      dy: world.y - vertex.y,
      moved: false,
    }
  }

  function handleVertexMove(event: React.PointerEvent<SVGGElement>, id: string) {
    const press = vertexPress.current
    if (!press || press.id !== id || press.pointerId !== event.pointerId) return
    if (!press.moved && Math.hypot(event.clientX - press.startX, event.clientY - press.startY) < 4) return
    press.moved = true
    const world = toWorld(event.clientX, event.clientY)
    setDrag({ id, x: world.x - press.dx, y: world.y - press.dy })
  }

  useEffect(() => {
    if (!drag) {
      dragResolved.current = null
      return
    }
    dragResolved.current = layout.vertices.find((v) => v.id === drag.id) ?? null
  }, [drag, layout.vertices])

  function handleVertexUp(event: React.PointerEvent<SVGGElement>, id: string) {
    const press = vertexPress.current
    if (!press || press.id !== id || press.pointerId !== event.pointerId) return
    vertexPress.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    const resolved = dragResolved.current
    dragResolved.current = null
    setDrag(null)
    if (!press.moved || !resolved) {
      onSelect(id)
      return
    }
    onSpot(id, spotOf(layoutRef.current, resolved))
  }

  function handleVertexKey(event: React.KeyboardEvent<SVGGElement>, id: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onSelect(id)
    } else if (event.key === "F2") {
      event.preventDefault()
      setEditingId(id)
    } else if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) {
      event.preventDefault()
      const box = event.currentTarget.getBoundingClientRect()
      onMenu(id, box.left + box.width / 2, box.top + box.height / 2)
    }
  }

  function addCardHere() {
    if (!menu) return
    const id = onAddCard()
    onSpot(id, { home: GRAPH_LONE, x: menu.x, y: menu.y })
    onSelect(id)
    setEditingId(id)
    setMenu(null)
  }

  const k = Math.max(1, Math.min(1.8, 0.8 / view.zoom))
  const radius = GRAPH_VERTEX_R * (small ? 0.55 : 1)
  const shownVertices = layout.vertices.filter((v) => {
    const note = byId.get(v.id)
    return note ? graphVertexShown(note, v.home, filter) : false
  })
  const shownClusters = layout.clusters.filter((c) => filter.ringId === null || c.id === filter.ringId)
  const editing = editingId ? shownVertices.find((v) => v.id === editingId) : null

  return (
    <section
      aria-label="Graph"
      className="absolute inset-x-0 top-[11rem] bottom-0 overflow-hidden bg-board"
      onContextMenu={(event) => event.preventDefault()}
    >
      <div ref={frameRef} className="absolute inset-0 touch-none">
        <svg
          width={size.width}
          height={size.height}
          role="group"
          aria-label={`Graph. ${layout.clusters.length} clusters, one for each Map ring, and ${layout.vertices.length} cards.`}
          className="absolute inset-0 cursor-grab select-none active:cursor-grabbing"
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerCancel={() => {
            panPress.current = null
          }}
          onContextMenu={(event) => {
            event.preventDefault()
            const world = toWorld(event.clientX, event.clientY)
            setMenu({ clientX: event.clientX, clientY: event.clientY, x: world.x, y: world.y })
          }}
        >
          <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
            {shownClusters.map((cluster) => (
              <g key={cluster.id} data-graph-cluster={cluster.id}>
                <rect
                  x={cluster.x}
                  y={cluster.y}
                  width={cluster.width}
                  height={cluster.height}
                  rx={36}
                  ry={36}
                  fill="var(--color-accent)"
                  fillOpacity={0.05 + cluster.ring * 0.025}
                  stroke="var(--color-accent)"
                  strokeOpacity={0.55}
                  strokeWidth={2.5 * Math.min(k, 1.6)}
                />
                <text
                  x={cluster.x + 28}
                  y={cluster.y + 36}
                  fontSize={20 * Math.min(k, 1.4)}
                  fontWeight={600}
                  fill="var(--color-ink)"
                  pointerEvents="none"
                >
                  {cluster.name}
                </text>
                <text
                  x={cluster.x + 28}
                  y={cluster.y + 58}
                  fontSize={14 * Math.min(k, 1.4)}
                  fill="var(--color-ink-soft)"
                  pointerEvents="none"
                >
                  {cluster.tags.map((tag) => `#${tag}`).join(" ")}
                </text>
              </g>
            ))}

            {filter.ringId === null ? (
              <text
                x={layout.loneOrigin.x}
                y={layout.loneOrigin.y - 22}
                fontSize={17 * Math.min(k, 1.4)}
                fill="var(--color-ink-soft)"
                pointerEvents="none"
                style={halo}
              >
                Cards with no ring hashtag
              </text>
            ) : null}

            {shownVertices.map((vertex) => {
              const note = byId.get(vertex.id)
              if (!note) return null
              const selected = selectedId === vertex.id
              const active = selected || hoverId === vertex.id || drag?.id === vertex.id
              const color = getCardColor(note.color)
              const home = ringName.get(vertex.home)
              return (
                <g
                  key={vertex.id}
                  data-graph-vertex={vertex.id}
                  data-graph-home={vertex.home}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                  aria-label={`${shorten(note.text)}, ${home ?? "no ring hashtag"}`}
                  className="pointer-events-auto cursor-grab outline-none active:cursor-grabbing"
                  onPointerEnter={() => setHoverId(vertex.id)}
                  onPointerLeave={() => setHoverId((current) => (current === vertex.id ? null : current))}
                  onFocus={() => setHoverId(vertex.id)}
                  onBlur={() => setHoverId((current) => (current === vertex.id ? null : current))}
                  onPointerDown={(event) => handleVertexDown(event, vertex)}
                  onPointerMove={(event) => handleVertexMove(event, vertex.id)}
                  onPointerUp={(event) => handleVertexUp(event, vertex.id)}
                  onPointerCancel={() => {
                    vertexPress.current = null
                    setDrag(null)
                  }}
                  onDoubleClick={() => setEditingId(vertex.id)}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onMenu(vertex.id, event.clientX, event.clientY)
                  }}
                  onKeyDown={(event) => handleVertexKey(event, vertex.id)}
                >
                  <title>{shorten(note.text)}</title>
                  <circle cx={vertex.x} cy={vertex.y} r={radius * 1.7} fill="transparent" />
                  <circle
                    cx={vertex.x}
                    cy={vertex.y}
                    r={radius * (active ? 1.5 : 1.2)}
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth={selected ? 4 : 3}
                    strokeOpacity={selected ? 1 : active ? 0.6 : 0}
                  />
                  <circle
                    cx={vertex.x}
                    cy={vertex.y}
                    r={radius}
                    fill={color.fill}
                    stroke="var(--color-ink)"
                    strokeWidth={2.5}
                  />
                </g>
              )
            })}

            {shownVertices.map((vertex) => {
              const note = byId.get(vertex.id)
              if (!note || editingId === vertex.id || !showText) return null
              return (
                <text
                  key={vertex.id}
                  data-graph-label={vertex.id}
                  x={vertex.x}
                  y={vertex.y + radius + 20}
                  textAnchor="middle"
                  fontSize={15}
                  fill="var(--color-ink)"
                  pointerEvents="none"
                  style={halo}
                >
                  {shorten(note.text)}
                </text>
              )
            })}

            {editing && byId.get(editing.id) ? (
              <NameField
                key={editing.id}
                x={editing.x}
                y={editing.y}
                initial={byId.get(editing.id)?.text ?? ""}
                onDone={(text) => {
                  if (text !== null) onRename(editing.id, text.trim())
                  setEditingId(null)
                }}
              />
            ) : null}
          </g>
        </svg>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4">
        <ZoomControls
          zoom={view.zoom}
          canZoomIn={view.zoom < MAX_ZOOM}
          canZoomOut={view.zoom > MIN_ZOOM}
          onZoomIn={() => zoomAt(ZOOM_STEP, size.width / 2, size.height / 2)}
          onZoomOut={() => zoomAt(1 / ZOOM_STEP, size.width / 2, size.height / 2)}
          onReset={() => zoomAt(1 / viewRef.current.zoom, size.width / 2, size.height / 2)}
          onFit={fit}
        />
      </div>

      {menu ? (
        <CanvasMenu
          clientX={menu.clientX}
          clientY={menu.clientY}
          label="Add a new card"
          onClose={() => setMenu(null)}
          onCreate={addCardHere}
        />
      ) : null}
    </section>
  )
}
