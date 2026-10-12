"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { freeEdges, getCardColor, goalLinks, MAX_ZOOM, MIN_ZOOM, type GoalRing, type Note } from "@/lib/board-data"
import { linkIssueFor, type LinkKind } from "@/lib/card-links"
import {
  GRAPH_LONE,
  GRAPH_MISSION,
  GRAPH_MISSION_R,
  GRAPH_VERTEX_R,
  anchorSpots,
  graphVertexShown,
  layoutGraph,
  resizeBox,
  spotOf,
  type GraphBox,
  type GraphBoxMode,
  type GraphCluster,
  type GraphFilter,
  type GraphSpot,
  type GraphVertex,
} from "@/lib/graph-layout"
import { CanvasMenu } from "./context-menu"
import { GraphClusterFrame } from "./graph-cluster-frame"
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

function missionLabel(text: string) {
  const line = text.replace(/\s+/g, " ").trim()
  if (!line) return "Mission"
  return line.length > 30 ? `${line.slice(0, 29)}\u2026` : line
}

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

type VertexPress = { id: string; pointerId: number; startX: number; startY: number; dx: number; dy: number; moved: boolean }

type PanPress = { pointerId: number; startX: number; startY: number; originX: number; originY: number }

type Anchors = Record<string, { x: number; y: number }>

type BoxPress = {
  id: string
  mode: GraphBoxMode
  pointerId: number
  startX: number
  startY: number
  world: { x: number; y: number }
  startBox: GraphBox
  anchors: Anchors
  box: GraphBox | null
  moved: boolean
}

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
  boxes,
  selectedId,
  onSelect,
  onSpot,
  onBox,
  onMenu,
  onRename,
  onAddCard,
  onMission,
  onLinks,
  onFree,
  missionText,
  filter,
  showText,
  small,
}: {
  notes: Note[]
  rings: GoalRing[]
  missionText: string
  onMission: () => void
  onLinks: (id: string, parentIds: string[]) => void
  onFree: (a: string, b: string, on: boolean) => void
  filter: GraphFilter
  showText: boolean
  small: boolean
  spots: Record<string, GraphSpot>
  boxes: Record<string, GraphBox>
  selectedId: string | null
  onSelect: (id: string | null) => void
  onSpot: (id: string, spot: GraphSpot) => void
  onBox: (id: string, box: GraphBox) => void
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
  const [linking, setLinking] = useState<{ from: string; kind: LinkKind; x: number; y: number } | null>(null)
  const [hoverLink, setHoverLink] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const linkPress = useRef<number | null>(null)
  const [menu, setMenu] = useState<{ clientX: number; clientY: number; x: number; y: number } | null>(null)
  const vertexPress = useRef<VertexPress | null>(null)
  const panPress = useRef<PanPress | null>(null)
  const dragResolved = useRef<GraphVertex | null>(null)
  const fitted = useRef(false)

  const [boxDrag, setBoxDrag] = useState<{ id: string; mode: GraphBoxMode; box: GraphBox; anchors: Anchors } | null>(null)
  const boxPress = useRef<BoxPress | null>(null)

  const liveBoxes = useMemo(() => (boxDrag ? { ...boxes, [boxDrag.id]: boxDrag.box } : boxes), [boxes, boxDrag])
  const liveSpots = useMemo(
    () => (boxDrag && boxDrag.mode !== "move" ? anchorSpots(spots, boxDrag.id, boxDrag.box, boxDrag.anchors) : spots),
    [spots, boxDrag],
  )
  const layout = useMemo(
    () => layoutGraph(notes, rings, liveSpots, drag, liveBoxes),
    [notes, rings, liveSpots, drag, liveBoxes],
  )
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

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 3800)
    return () => window.clearTimeout(timer)
  }, [notice])

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

  function handleBoxDown(event: React.PointerEvent<SVGElement>, cluster: GraphCluster, mode: GraphBoxMode) {
    if (event.button !== 0) return
    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const anchors: Anchors = {}
    if (mode !== "move") {
      for (const v of layoutRef.current.vertices) if (v.home === cluster.id) anchors[v.id] = { x: v.x, y: v.y }
    }
    boxPress.current = {
      id: cluster.id,
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      world: toWorld(event.clientX, event.clientY),
      startBox: { x: cluster.x, y: cluster.y, width: cluster.width, height: cluster.height },
      anchors,
      box: null,
      moved: false,
    }
  }

  function handleBoxMove(event: React.PointerEvent<SVGElement>) {
    const press = boxPress.current
    if (!press || press.pointerId !== event.pointerId) return
    if (!press.moved && Math.hypot(event.clientX - press.startX, event.clientY - press.startY) < 4) return
    press.moved = true
    const world = toWorld(event.clientX, event.clientY)
    const box = resizeBox(press.startBox, press.mode, world.x - press.world.x, world.y - press.world.y)
    press.box = box
    setBoxDrag({ id: press.id, mode: press.mode, box, anchors: press.anchors })
  }

  function handleBoxUp(event: React.PointerEvent<SVGElement>) {
    const press = boxPress.current
    if (!press || press.pointerId !== event.pointerId) return
    boxPress.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    setBoxDrag(null)
    if (!press.moved || !press.box) {
      if (press.mode === "move") onSelect(null)
      return
    }
    onBox(press.id, press.box)
    if (press.mode === "move") return
    const settled = layoutGraph(
      notes,
      rings,
      anchorSpots(spots, press.id, press.box, press.anchors),
      null,
      { ...boxes, [press.id]: press.box },
    )
    for (const v of settled.vertices) if (v.home === press.id) onSpot(v.id, spotOf(settled, v))
  }

  function handleBoxCancel() {
    boxPress.current = null
    setBoxDrag(null)
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
    dragResolved.current = drag.id === GRAPH_MISSION ? layout.mission : (layout.vertices.find((v) => v.id === drag.id) ?? null)
  }, [drag, layout.vertices, layout.mission])

  function handleVertexUp(event: React.PointerEvent<SVGGElement>, id: string) {
    const press = vertexPress.current
    if (!press || press.id !== id || press.pointerId !== event.pointerId) return
    vertexPress.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    const resolved = dragResolved.current
    dragResolved.current = null
    setDrag(null)
    if (!press.moved || !resolved) {
      if (id === GRAPH_MISSION) {
        onSelect(null)
        onMission()
      } else {
        onSelect(id)
      }
      return
    }
    onSpot(id, spotOf(layoutRef.current, resolved))
  }

  function handleVertexKey(event: React.KeyboardEvent<SVGGElement>, id: string) {
    if (id === GRAPH_MISSION) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        onSelect(null)
        onMission()
      }
      return
    }
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
  const mission = layout.mission
  const missionActive = hoverId === GRAPH_MISSION || drag?.id === GRAPH_MISSION
  const missionWritten = missionText.trim().length > 0

  const shownById = new Map(shownVertices.map((v) => [v.id, v]))
  const links = shownVertices.flatMap((from) => {
    const note = byId.get(from.id)
    if (!note) return []
    return goalLinks(note, byId, rings).flatMap((toId) => {
      const to = toId === GRAPH_MISSION ? mission : shownById.get(toId)
      return to ? [{ id: `${from.id}>${toId}`, fromId: from.id, toId, from, to }] : []
    })
  })

  const freeLines = freeEdges(notes).flatMap((edge) => {
    const from = shownById.get(edge.fromId)
    const to = edge.toId === GRAPH_MISSION ? mission : shownById.get(edge.toId)
    return from && to ? [{ ...edge, from, to }] : []
  })

  function nameOf(id: string) {
    return id === GRAPH_MISSION ? missionLabel(missionText) : shorten(byId.get(id)?.text ?? "")
  }

  function linkIssue(kind: LinkKind, fromId: string, toId: string): string | null {
    return linkIssueFor(kind, fromId, toId, byId, rings)
  }

  function removeFree(a: string, b: string) {
    onFree(a, b, false)
    setHoverLink(null)
    setNotice(`Removed the free line between ${nameOf(a)} and ${nameOf(b)}.`)
  }

  function targetAt(point: { x: number; y: number }, fromId: string): string | null {
    let best: string | null = null
    let bestDistance = Infinity
    const missionDistance = Math.hypot(point.x - mission.x, point.y - mission.y)
    if (missionDistance <= GRAPH_MISSION_R * 1.3) {
      best = GRAPH_MISSION
      bestDistance = missionDistance
    }
    for (const v of shownVertices) {
      if (v.id === fromId) continue
      const distance = Math.hypot(point.x - v.x, point.y - v.y)
      if (distance <= radius * 1.7 && distance < bestDistance) {
        best = v.id
        bestDistance = distance
      }
    }
    return best
  }

  function removeLink(fromId: string, toId: string) {
    const note = byId.get(fromId)
    if (!note) return
    onLinks(
      fromId,
      goalLinks(note, byId, rings).filter((id) => id !== toId),
    )
    setHoverLink(null)
    setNotice(`Removed the link from ${nameOf(fromId)} to ${nameOf(toId)}.`)
  }

  function handleHandleDown(event: React.PointerEvent<SVGGElement>, fromId: string, kind: LinkKind) {
    if (event.button !== 0) return
    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    linkPress.current = event.pointerId
    setNotice(null)
    setLinking({ from: fromId, kind, ...toWorld(event.clientX, event.clientY) })
  }

  function handleHandleMove(event: React.PointerEvent<SVGGElement>) {
    if (linkPress.current !== event.pointerId) return
    const point = toWorld(event.clientX, event.clientY)
    setLinking((current) => (current ? { ...current, ...point } : current))
  }

  function handleHandleUp(event: React.PointerEvent<SVGGElement>, fromId: string, kind: LinkKind) {
    if (linkPress.current !== event.pointerId) return
    linkPress.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    const target = targetAt(toWorld(event.clientX, event.clientY), fromId)
    setLinking(null)
    if (!target) return
    const issue = linkIssue(kind, fromId, target)
    if (issue) {
      setNotice(issue)
      return
    }
    if (kind === "free") {
      onFree(fromId, target, true)
      setNotice(`Joined ${nameOf(fromId)} and ${nameOf(target)} with a free line.`)
      return
    }
    const note = byId.get(fromId)
    if (!note) return
    onLinks(fromId, [...goalLinks(note, byId, rings), target])
    setNotice(`Linked ${nameOf(fromId)} to ${nameOf(target)}.`)
  }

  const handleVertex = selectedId && editingId !== selectedId ? (shownById.get(selectedId) ?? null) : null
  const linkTarget = linking ? targetAt(linking, linking.from) : null
  const linkSource = linking ? (shownById.get(linking.from) ?? null) : null
  const linkEnd = linkTarget ? (linkTarget === GRAPH_MISSION ? mission : (shownById.get(linkTarget) ?? null)) : null

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
              <GraphClusterFrame
                key={cluster.id}
                cluster={cluster}
                k={k}
                zoom={view.zoom}
                active={boxDrag?.id === cluster.id}
                onDown={handleBoxDown}
                onMove={handleBoxMove}
                onUp={handleBoxUp}
                onCancel={handleBoxCancel}
              />
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

            <g>
              {freeLines.map((line) => {
                const hot = hoverLink === line.id
                return (
                  <g
                    key={line.id}
                    data-graph-free={line.id}
                    data-graph-free-line={`${line.fromId}~${line.toId}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove the free line between ${nameOf(line.fromId)} and ${nameOf(line.toId)}`}
                    className="cursor-pointer outline-none"
                    onPointerDown={(event) => event.stopPropagation()}
                    onPointerEnter={() => setHoverLink(line.id)}
                    onPointerLeave={() => setHoverLink((current) => (current === line.id ? null : current))}
                    onFocus={() => setHoverLink(line.id)}
                    onBlur={() => setHoverLink((current) => (current === line.id ? null : current))}
                    onClick={() => removeFree(line.fromId, line.toId)}
                    onContextMenu={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " " || event.key === "Delete" || event.key === "Backspace") {
                        event.preventDefault()
                        removeFree(line.fromId, line.toId)
                      }
                    }}
                  >
                    <title>Click to remove this free line</title>
                    <line
                      x1={line.from.x}
                      y1={line.from.y}
                      x2={line.to.x}
                      y2={line.to.y}
                      stroke="transparent"
                      strokeWidth={Math.max(14, 18 / view.zoom)}
                      strokeLinecap="round"
                      pointerEvents="stroke"
                    />
                    <line
                      x1={line.from.x}
                      y1={line.from.y}
                      x2={line.to.x}
                      y2={line.to.y}
                      stroke="var(--color-tie)"
                      strokeOpacity={hot ? 1 : 0.8}
                      strokeWidth={(hot ? 4.5 : 2.5) * Math.min(k, 1.6)}
                      strokeDasharray={hot ? `${8 * Math.min(k, 1.6)} ${6 * Math.min(k, 1.6)}` : undefined}
                      strokeLinecap="round"
                      pointerEvents="none"
                    />
                  </g>
                )
              })}
              {links.map((link) => {
                const hot = hoverLink === link.id
                const toMission = link.toId === GRAPH_MISSION
                return (
                  <g
                    key={link.id}
                    data-graph-link={link.id}
                    data-graph-mission-line={toMission ? link.fromId : undefined}
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove the link from ${nameOf(link.fromId)} to ${nameOf(link.toId)}`}
                    className="cursor-pointer outline-none"
                    onPointerDown={(event) => event.stopPropagation()}
                    onPointerEnter={() => setHoverLink(link.id)}
                    onPointerLeave={() => setHoverLink((current) => (current === link.id ? null : current))}
                    onFocus={() => setHoverLink(link.id)}
                    onBlur={() => setHoverLink((current) => (current === link.id ? null : current))}
                    onClick={() => removeLink(link.fromId, link.toId)}
                    onContextMenu={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " " || event.key === "Delete" || event.key === "Backspace") {
                        event.preventDefault()
                        removeLink(link.fromId, link.toId)
                      }
                    }}
                  >
                    <title>Click to remove this link</title>
                    <line
                      x1={link.from.x}
                      y1={link.from.y}
                      x2={link.to.x}
                      y2={link.to.y}
                      stroke="transparent"
                      strokeWidth={Math.max(14, 18 / view.zoom)}
                      strokeLinecap="round"
                      pointerEvents="stroke"
                    />
                    <line
                      x1={link.from.x}
                      y1={link.from.y}
                      x2={link.to.x}
                      y2={link.to.y}
                      stroke="var(--color-accent)"
                      strokeOpacity={hot ? 1 : toMission ? 0.8 : 0.6}
                      strokeWidth={(hot ? 4.5 : 2.5) * Math.min(k, 1.6)}
                      strokeDasharray={hot ? `${8 * Math.min(k, 1.6)} ${6 * Math.min(k, 1.6)}` : undefined}
                      strokeLinecap="round"
                      pointerEvents="none"
                    />
                  </g>
                )
              })}
            </g>

            <g
              data-graph-mission={mission.id}
              role="button"
              tabIndex={0}
              aria-label={missionWritten ? `Mission: ${missionText}. Open the mission field.` : "Mission, not written yet. Open the mission field."}
              className="pointer-events-auto cursor-grab outline-none active:cursor-grabbing"
              onPointerEnter={() => setHoverId(GRAPH_MISSION)}
              onPointerLeave={() => setHoverId((current) => (current === GRAPH_MISSION ? null : current))}
              onFocus={() => setHoverId(GRAPH_MISSION)}
              onBlur={() => setHoverId((current) => (current === GRAPH_MISSION ? null : current))}
              onPointerDown={(event) => handleVertexDown(event, mission)}
              onPointerMove={(event) => handleVertexMove(event, GRAPH_MISSION)}
              onPointerUp={(event) => handleVertexUp(event, GRAPH_MISSION)}
              onPointerCancel={() => {
                vertexPress.current = null
                setDrag(null)
              }}
              onContextMenu={(event) => {
                event.preventDefault()
                event.stopPropagation()
              }}
              onKeyDown={(event) => handleVertexKey(event, GRAPH_MISSION)}
            >
              <title>{missionWritten ? missionText : "Mission"}</title>
              <circle cx={mission.x} cy={mission.y} r={GRAPH_MISSION_R * 1.5} fill="transparent" />
              <circle
                cx={mission.x}
                cy={mission.y}
                r={GRAPH_MISSION_R * (missionActive ? 1.25 : 1.12)}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={3}
                strokeOpacity={missionActive ? 0.7 : 0.35}
              />
              <circle
                cx={mission.x}
                cy={mission.y}
                r={GRAPH_MISSION_R}
                fill="var(--color-card)"
                stroke="var(--color-accent)"
                strokeWidth={4}
              />
              <circle cx={mission.x} cy={mission.y} r={GRAPH_MISSION_R * 0.4} fill="var(--color-accent)" />
              <text
                x={mission.x}
                y={mission.y + GRAPH_MISSION_R + 28}
                textAnchor="middle"
                fontSize={18}
                fontWeight={600}
                fill="var(--color-ink)"
                pointerEvents="none"
                style={halo}
              >
                {missionLabel(missionText)}
              </text>
            </g>

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

            {linking && linkSource ? (
              <g aria-hidden="true" pointerEvents="none">
                {shownVertices
                  .filter((v) => v.id !== linking.from && !linkIssue(linking.kind, linking.from, v.id))
                  .map((v) => (
                    <circle
                      key={v.id}
                      cx={v.x}
                      cy={v.y}
                      r={radius * 1.6}
                      fill="none"
                      stroke={linking.kind === "free" ? "var(--color-tie)" : "var(--color-accent)"}
                      strokeWidth={3}
                      strokeDasharray="6 5"
                      strokeOpacity={linkTarget === v.id ? 1 : 0.45}
                    />
                  ))}
                {!linkIssue(linking.kind, linking.from, GRAPH_MISSION) ? (
                  <circle
                    cx={mission.x}
                    cy={mission.y}
                    r={GRAPH_MISSION_R * 1.35}
                    fill="none"
                    stroke={linking.kind === "free" ? "var(--color-tie)" : "var(--color-accent)"}
                    strokeWidth={3}
                    strokeDasharray="8 6"
                    strokeOpacity={linkTarget === GRAPH_MISSION ? 1 : 0.45}
                  />
                ) : null}
                <line
                  x1={linkSource.x}
                  y1={linkSource.y}
                  x2={linkEnd ? linkEnd.x : linking.x}
                  y2={linkEnd ? linkEnd.y : linking.y}
                  stroke={linking.kind === "free" ? "var(--color-tie)" : "var(--color-accent)"}
                  strokeWidth={3 * Math.min(k, 1.6)}
                  strokeDasharray={`${8 * Math.min(k, 1.6)} ${6 * Math.min(k, 1.6)}`}
                  strokeLinecap="round"
                />
              </g>
            ) : null}

            {handleVertex
              ? (["goal", "free"] as const).map((kind) => {
                  const side = kind === "goal" ? 1 : -1
                  const hx = handleVertex.x + side * (radius * 1.5 + 10) * 0.7071
                  const hy = handleVertex.y - (radius * 1.5 + 10) * 0.7071
                  const active = linking?.kind === kind
                  return (
                    <g
                      key={kind}
                      data-graph-handle={kind === "goal" ? handleVertex.id : undefined}
                      data-graph-free-handle={kind === "free" ? handleVertex.id : undefined}
                      aria-hidden="true"
                      className="pointer-events-auto cursor-crosshair"
                      onPointerDown={(event) => handleHandleDown(event, handleVertex.id, kind)}
                      onPointerMove={handleHandleMove}
                      onPointerUp={(event) => handleHandleUp(event, handleVertex.id, kind)}
                      onPointerCancel={() => {
                        linkPress.current = null
                        setLinking(null)
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                      }}
                    >
                      <title>
                        {kind === "goal"
                          ? "Drag onto a card or the Mission to add a goal above"
                          : "Drag onto any card or the Mission to join them with a free line"}
                      </title>
                      <circle cx={hx} cy={hy} r={16} fill="transparent" />
                      <circle
                        cx={hx}
                        cy={hy}
                        r={active ? 9 : 7}
                        fill={kind === "goal" ? "var(--color-accent)" : "var(--color-tie)"}
                        stroke="var(--color-card)"
                        strokeWidth={2.5}
                      />
                    </g>
                  )
                })
              : null}

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

      {notice ? (
        <p
          role="status"
          className="pointer-events-none absolute bottom-4 left-1/2 max-w-[28rem] -translate-x-1/2 rounded-xl border border-line bg-card px-4 py-2 text-center text-sm text-balance text-ink shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)]"
        >
          {notice}
        </p>
      ) : null}

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
