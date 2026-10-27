"use client"

import { useEffect, useRef, useState, type RefObject } from "react"
import clsx from "clsx"
import {
  getIkigaiItem,
  ikigaiRegionAt,
  type ClusterView,
  type GoalNameMode,
  type IkigaiCenter,
  type Group,
  type GoalRing,
  type LabelSetLists,
  type MissionChoice,
  type Mode,
  type Note,
  type View,
  type BudgetZoneId,
  type BudgetZones,
  type Zone,
  type ZoneId,
  type Zones,
} from "@/lib/board-data"
import type { GroupMove } from "@/lib/group-drag"
import { NoteCard } from "./note-card"
import { SelectionBox } from "./selection-box"
import { SortZones } from "./sort-zones"
import { BudgetZonesLayer } from "./budget-zones"
import { GroupAreas } from "./group-areas"
import { IkigaiCircles, IkigaiLabels } from "./ikigai-diagram"
import { GoalMapLayer, type GoalMapCommit } from "./goal-map"
import { SectorWheel, type SectorWheelBoardState } from "./sector-wheel"
import { BoardLinks, type BoardLinkState } from "./board-links"

type PanState = {
  pointerId: number
  button: number
  /** True when the drag started on the circles: it moves the circle group instead of the canvas. */
  group: boolean
  /** True when Shift was held on empty canvas: the drag draws a selection rectangle instead of panning. */
  marquee: boolean
  startX: number
  startY: number
  lastX: number
  lastY: number
  moved: boolean
}

export type IkigaiBoardState = {
  center: IkigaiCenter
  activeId: string | null
  hoverId: string | null
  onPick: (id: string) => void
  onMoveGroup: (dx: number, dy: number) => void
}

export type GoalMapBoardState = {
  center: IkigaiCenter
  /** The rings in order from the mission outward: the main rings and any the person added. */
  rings: GoalRing[]
  /** Factor on the ring widths, set by the thickness control. */
  scale: number
  /** Point diameter in world units, typed in the left window. */
  pointSize: number
  names: GoalNameMode
  selectedId: string | null
  showAllThreads: boolean
  /** The ring the list zoomed to, or null for the whole map. Only that ring's points show. */
  focusRing: number | null
  toWorld: (clientX: number, clientY: number) => { x: number; y: number }
  onSelect: (id: string) => void
  onMenu: (id: string, clientX: number, clientY: number) => void
  onCommit: (id: string, change: GoalMapCommit) => void
  /** The Mission circle in the center: opens the window with the sentence, or the mission field when it is empty. */
  onMission: () => void
}

const GRID = 22

export function Board({
  notes,
  zones,
  groups,
  clusterView,
  mode,
  missionSaved,
  labelLists,
  view,
  viewRef,
  viewportRef,
  selectedIds,
  selectionRef,
  editingId,
  ikigai,
  goalMap,
  wheel,
  budget,
  links,
  tagOnly,
  onZoneMove,
  onZoneResize,
  onGroupMove,
  onGroupResize,
  onPan,
  onZoomAt,
  onCanvasMenu,
  onClearSelection,
  onSelect,
  onMarquee,
  onTagDrag,
  onBinDrag,
  onMove,
  onMoveMany,
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
  labelLists: LabelSetLists
  view: View
  viewRef: RefObject<View>
  viewportRef: RefObject<HTMLDivElement | null>
  selectedIds: string[]
  selectionRef: RefObject<string[]>
  editingId: string | null
  ikigai: IkigaiBoardState | null
  /** Set only while Goals > Map is open. The rings are not drawn anywhere else. */
  goalMap: GoalMapBoardState | null
  /** Set only while a Labels view is open. The wheel sits to the right of the cards and is a drop target. */
  wheel: SectorWheelBoardState | null
  /** Set only in Labels > Investment and Expense. The two zones tag cards like Want and Must do. */
  budget: {
    zones: BudgetZones
    onMove: (id: BudgetZoneId, dx: number, dy: number) => void
    onResize: (id: BudgetZoneId, zone: Zone) => void
  } | null
  /** Set only on the free boards: the link handle on the selected card and the goal-above lines. */
  links: BoardLinkState | null
  /** Markers view: cards move freely, and a drop on the marker area tags them and sends them back. */
  tagOnly: boolean
  onZoneMove: (id: ZoneId, dx: number, dy: number) => void
  onZoneResize: (id: ZoneId, zone: Zone) => void
  onGroupMove: (id: string, dx: number, dy: number) => void
  onGroupResize: (id: string, zone: Zone) => void
  onPan: (dx: number, dy: number) => void
  onZoomAt: (factor: number, clientX: number, clientY: number) => void
  onCanvasMenu: (clientX: number, clientY: number) => void
  onClearSelection: () => void
  onSelect: (id: string, additive: boolean) => void
  onMarquee: (ids: string[]) => void
  onTagDrag: (id: string, clientX: number, clientY: number, phase: "move" | "drop" | "cancel") => boolean
  onBinDrag: (id: string, clientX: number, clientY: number, phase: "move" | "drop" | "cancel") => boolean
  onMove: (id: string, x: number, y: number, centerX: number, centerY: number) => void
  onMoveMany: (moves: GroupMove[]) => void
  onFront: (id: string) => void
  onMission: (id: string, choice: Exclude<MissionChoice, null>) => void
  onEditStart: (id: string) => void
  onEditEnd: (id: string, text: string) => void
  onCardMenu: (id: string, clientX: number, clientY: number) => void
  onDelete: (id: string) => void
}) {
  const pan = useRef<PanState | null>(null)
  const [panning, setPanning] = useState(false)
  const [marquee, setMarquee] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
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
    if ((event.target as HTMLElement).closest("[data-note-card], [data-zone-handle], [data-board-control]")) return
    if (document.activeElement instanceof HTMLTextAreaElement) document.activeElement.blur()
    const marquee = event.button === 0 && event.shiftKey
    let group = false
    const rect = viewportRef.current?.getBoundingClientRect()
    if (ikigai && event.button === 0 && !marquee && rect) {
      const v = viewRef.current
      group =
        ikigaiRegionAt(
          (event.clientX - rect.left - v.x) / v.zoom,
          (event.clientY - rect.top - v.y) / v.zoom,
          ikigai.center,
        ) !== null
    }
    pan.current = {
      pointerId: event.pointerId,
      button: event.button,
      group,
      marquee,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setPanning(true)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const state = pan.current
    if (!state || state.pointerId !== event.pointerId) return
    if (!state.moved && Math.hypot(event.clientX - state.startX, event.clientY - state.startY) >= 4) state.moved = true
    const dx = event.clientX - state.lastX
    const dy = event.clientY - state.lastY
    if (state.marquee) {
      const rect = viewportRef.current?.getBoundingClientRect()
      if (state.moved && rect) {
        setMarquee({
          left: Math.min(state.startX, event.clientX) - rect.left,
          top: Math.min(state.startY, event.clientY) - rect.top,
          width: Math.abs(event.clientX - state.startX),
          height: Math.abs(event.clientY - state.startY),
        })
      }
    } else if (state.group && ikigai) {
      if (state.moved) ikigai.onMoveGroup(dx / viewRef.current.zoom, dy / viewRef.current.zoom)
    } else {
      onPan(dx, dy)
    }
    state.lastX = event.clientX
    state.lastY = event.clientY
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    const state = pan.current
    if (!state || state.pointerId !== event.pointerId) return
    pan.current = null
    setPanning(false)
    setMarquee(null)
    const released = event.type === "pointerup"
    if (state.marquee) {
      if (!released || !state.moved) return
      const left = Math.min(state.startX, event.clientX)
      const right = Math.max(state.startX, event.clientX)
      const top = Math.min(state.startY, event.clientY)
      const bottom = Math.max(state.startY, event.clientY)
      const inside: string[] = []
      viewportRef.current?.querySelectorAll<HTMLElement>("[data-note-card]").forEach((card) => {
        const box = card.getBoundingClientRect()
        if (box.right >= left && box.left <= right && box.bottom >= top && box.top <= bottom) {
          inside.push(card.dataset.noteId ?? "")
        }
      })
      onMarquee(inside)
      return
    }
    if (state.button === 0 && released && !state.moved) onClearSelection()
    if (!ikigai || state.moved || state.button !== 0 || !released) return
    const rect = viewportRef.current?.getBoundingClientRect()
    if (!rect) return
    const v = viewRef.current
    const region = ikigaiRegionAt(
      (event.clientX - rect.left - v.x) / v.zoom,
      (event.clientY - rect.top - v.y) / v.zoom,
      ikigai.center,
    )
    if (region) ikigai.onPick(region)
  }

  const activeItem = getIkigaiItem(ikigai?.activeId)
  const hoverItem = getIkigaiItem(ikigai?.hoverId)
  const activeLens = activeItem?.lens ?? null
  const hoverLens = hoverItem?.lens ?? null
  const activeRegion = activeItem && !activeLens ? activeItem.region : null
  const hoverRegion = hoverItem && !hoverLens ? hoverItem.region : null

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
        marquee ? "cursor-crosshair" : panning ? "cursor-grabbing" : "cursor-grab",
      )}
    >
      <p id="board-help" className="sr-only">
        Drag empty space to pan and use the mouse wheel to zoom. Hold Shift and drag empty space to select cards in a
        rectangle, or Shift-click a card to add or remove it from the selection. Drag a card to move it, double-click or
        press Enter to write on it, and right-click or press Shift F10 for color and hashtags. Arrow keys move a focused
        card.
      </p>

      <div
        className="absolute top-0 left-0 origin-top-left will-change-transform"
        style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.zoom})` }}
      >
        {mode === "clusters" && clusterView === "wantmust" ? (
          <SortZones notes={notes} zones={zones} zoom={view.zoom} onMove={onZoneMove} onResize={onZoneResize} />
        ) : null}
        {budget ? (
          <BudgetZonesLayer
            notes={notes}
            zones={budget.zones}
            zoom={view.zoom}
            onMove={budget.onMove}
            onResize={budget.onResize}
          />
        ) : null}
        {mode === "clusters" && clusterView === "groups" ? (
          <GroupAreas notes={notes} groups={groups} zoom={view.zoom} onMove={onGroupMove} onResize={onGroupResize} />
        ) : null}

        {ikigai ? (
          <IkigaiCircles
            center={ikigai.center}
            activeRegion={activeRegion}
            hoverRegion={hoverRegion}
            activeLens={activeLens}
            hoverLens={hoverLens}
          />
        ) : null}

        {wheel ? <SectorWheel wheel={wheel} /> : null}

        {goalMap ? (
          <GoalMapLayer
            center={goalMap.center}
              notes={notes}
              rings={goalMap.rings}
              scale={goalMap.scale}
              pointSize={goalMap.pointSize}
              names={goalMap.names}
              onMission={goalMap.onMission}
            zoom={view.zoom}
            selectedId={goalMap.selectedId}
            showAllThreads={goalMap.showAllThreads}
            focusRing={goalMap.focusRing}
            toWorld={goalMap.toWorld}
            onSelect={goalMap.onSelect}
            onMenu={goalMap.onMenu}
            onCommit={goalMap.onCommit}
          />
        ) : wheel?.cardsHidden ? null : (
          <>
            <SelectionBox
              notes={notes}
              ids={selectedIds}
              viewRef={viewRef}
              fixed={ikigai !== null}
              tagTarget={tagOnly}
              onMoveMany={onMoveMany}
              onTagDrag={onTagDrag}
              onBinDrag={onBinDrag}
            />

            {notes.map((note) => {
              const inSelection = selectedIds.includes(note.id)
              return (
                <NoteCard
                  key={note.id}
                  note={note}
                  mode={mode}
                  missionSaved={missionSaved}
                  labelLists={labelLists}
                  selected={inSelection}
                  editing={note.id === editingId}
                  viewRef={viewRef}
                  selectionRef={selectionRef}
                  fixed={ikigai !== null}
                  tagTarget={tagOnly}
                  multiCount={inSelection ? selectedIds.length : 0}
                  onSelect={onSelect}
                  onTagDrag={onTagDrag}
                  onBinDrag={onBinDrag}
                  onMove={onMove}
                  onMoveMany={onMoveMany}
                  onFront={onFront}
                  onMission={onMission}
                  onEditStart={onEditStart}
                  onEditEnd={onEditEnd}
                  onMenu={onCardMenu}
                  onDelete={onDelete}
                />
              )
            })}

            {links ? <BoardLinks notes={notes} links={links} zoom={view.zoom} /> : null}
          </>
        )}

        {ikigai ? (
          <IkigaiLabels
            center={ikigai.center}
            notes={notes}
            activeRegion={activeRegion}
            activeLens={activeLens}
            lensTag={activeItem?.tag ?? ""}
          />
        ) : null}
      </div>

      {marquee ? (
        <div
          aria-hidden="true"
          data-marquee=""
          style={marquee}
          className="pointer-events-none absolute z-10 rounded-sm border border-accent bg-accent/10"
        />
      ) : null}
    </div>
  )
}
