"use client"

import { useEffect, useRef, useState, type RefObject } from "react"
import clsx from "clsx"
import type { ClusterView, Group, MissionChoice, Mode, Note, View, Zone, ZoneId, Zones } from "@/lib/board-data"
import { NoteCard } from "./note-card"
import { SortZones } from "./sort-zones"
import { GroupAreas } from "./group-areas"

type PanState = { pointerId: number; lastX: number; lastY: number }

const GRID = 22

export function Board({
  notes,
  zones,
  groups,
  clusterView,
  mode,
  missionSaved,
  view,
  viewRef,
  viewportRef,
  selectedId,
  editingId,
  onZoneMove,
  onZoneResize,
  onGroupMove,
  onGroupResize,
  onPan,
  onZoomAt,
  onCanvasMenu,
  onClearSelection,
  onSelect,
  onMove,
  onFront,
  onMission,
  onEditStart,
  onEditEnd,
  onCardMenu,
  onDelete,
}: {
  notes: Note[]
  zones: Zones
  groups: Group[]
  clusterView: ClusterView
  mode: Mode
  missionSaved: boolean
  view: View
  viewRef: RefObject<View>
  viewportRef: RefObject<HTMLDivElement | null>
  selectedId: string | null
  editingId: string | null
  onZoneMove: (id: ZoneId, dx: number, dy: number) => void
  onZoneResize: (id: ZoneId, zone: Zone) => void
  onGroupMove: (id: string, dx: number, dy: number) => void
  onGroupResize: (id: string, zone: Zone) => void
  onPan: (dx: number, dy: number) => void
  onZoomAt: (factor: number, clientX: number, clientY: number) => void
  onCanvasMenu: (clientX: number, clientY: number) => void
  onClearSelection: () => void
  onSelect: (id: string) => void
  onMove: (id: string, x: number, y: number, centerX: number, centerY: number) => void
  onFront: (id: string) => void
  onMission: (id: string, choice: Exclude<MissionChoice, null>) => void
  onEditStart: (id: string) => void
  onEditEnd: (id: string, text: string) => void
  onCardMenu: (id: string, clientX: number, clientY: number) => void
  onDelete: (id: string) => void
}) {
  const pan = useRef<PanState | null>(null)
  const [panning, setPanning] = useState(false)
  const zoomAtRef = useRef(onZoomAt)
  zoomAtRef.current = onZoomAt

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    function handleWheel(event: WheelEvent) {
      if ((event.target as HTMLElement).closest("textarea")) return
      event.preventDefault()
      const intensity = event.ctrlKey ? 0.01 : 0.0015
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
      zoomAtRef.current(Math.exp(-delta * intensity), event.clientX, event.clientY)
    }
    viewport.addEventListener("wheel", handleWheel, { passive: false })
    return () => viewport.removeEventListener("wheel", handleWheel)
  }, [viewportRef])

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.button !== 1) return
    if ((event.target as HTMLElement).closest("[data-note-card], [data-zone-handle]")) return
    if (event.button === 0) onClearSelection()
    if (document.activeElement instanceof HTMLTextAreaElement) document.activeElement.blur()
    pan.current = { pointerId: event.pointerId, lastX: event.clientX, lastY: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
    setPanning(true)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const state = pan.current
    if (!state || state.pointerId !== event.pointerId) return
    onPan(event.clientX - state.lastX, event.clientY - state.lastY)
    state.lastX = event.clientX
    state.lastY = event.clientY
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (pan.current?.pointerId !== event.pointerId) return
    pan.current = null
    setPanning(false)
  }

  const gridSize = GRID * view.zoom

  return (
    <div
      ref={viewportRef}
      role="region"
      aria-label="Whiteboard canvas"
      aria-describedby="board-help"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onContextMenu={(event) => {
        event.preventDefault()
        onCanvasMenu(event.clientX, event.clientY)
      }}
      style={{
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
      }}
      className={clsx(
        "board-grain absolute inset-0 touch-none overflow-hidden select-none",
        panning ? "cursor-grabbing" : "cursor-grab",
      )}
    >
      <p id="board-help" className="sr-only">
        Drag empty space to pan and use the mouse wheel to zoom. Drag a card to move it, double-click or press Enter to
        write on it, and right-click or press Shift F10 for color and hashtags. Arrow keys move a focused card.
      </p>

      <div
        className="absolute top-0 left-0 origin-top-left will-change-transform"
        style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.zoom})` }}
      >
        {mode === "clusters" && clusterView === "wantmust" ? (
          <SortZones notes={notes} zones={zones} zoom={view.zoom} onMove={onZoneMove} onResize={onZoneResize} />
        ) : null}
        {mode === "clusters" && clusterView === "groups" ? (
          <GroupAreas notes={notes} groups={groups} zoom={view.zoom} onMove={onGroupMove} onResize={onGroupResize} />
        ) : null}

        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            mode={mode}
            missionSaved={missionSaved}
            selected={note.id === selectedId}
            editing={note.id === editingId}
            viewRef={viewRef}
            onSelect={onSelect}
            onMove={onMove}
            onFront={onFront}
            onMission={onMission}
            onEditStart={onEditStart}
            onEditEnd={onEditEnd}
            onMenu={onCardMenu}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}
