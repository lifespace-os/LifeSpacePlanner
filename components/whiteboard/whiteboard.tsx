"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import clsx from "clsx"
import { Maximize2, Minimize2 } from "lucide-react"
import {
  CARD_MIN_HEIGHT,
  CARD_WIDTH,
  DEFAULT_GROUPS,
  DEFAULT_ZONES,
  MAX_ZOOM,
  MIN_ZOOM,
  MODES,
  SAMPLE_NOTES,
  ZONE_MIN_SIZE,
  ZONE_TAGS,
  areaTagAt,
  getIkigaiItem,
  groupAreas,
  groupTag,
  hasHashtag,
  ikigaiRegionAt,
  nextGroupRect,
  reconcile,
  retag,
  zoneAreas,
  type CardColorId,
  type ClusterView,
  type Group,
  type LabelGroupId,
  type MissionChoice,
  type MissionView,
  type Mode,
  type Note,
  type TaggedArea,
  type TaskDetails,
  type View,
  type Zone,
  type ZoneId,
  type Zones,
} from "@/lib/board-data"
import { ModeSwitcher } from "./mode-switcher"
import { ModeBar } from "./mode-bar"
import { Board } from "./board"
import { Inspector } from "./inspector"
import { ClustersPanel } from "./clusters-panel"
import { MissionWindow } from "./mission-window"
import { IkigaiPanel } from "./ikigai-panel"
import { CardDock } from "./card-dock"
import { ZoomControls } from "./zoom-controls"
import { CanvasMenu, CardMenu, type MenuState } from "./context-menu"

const ZOOM_STEP = 1.25
const NO_IDS: string[] = []
const FIT_PADDING = { top: 150, right: 60, bottom: 130, left: 60 }
const IKIGAI_FIT_PADDING = { top: 270, right: 400, bottom: 130, left: 60 }

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

export function Whiteboard() {
  const [notes, setNotes] = useState<Note[]>(SAMPLE_NOTES)
  const [zones, setZones] = useState<Zones>(DEFAULT_ZONES)
  const [groups, setGroups] = useState<Group[]>(DEFAULT_GROUPS)
  const [clusterView, setClusterView] = useState<ClusterView>("wantmust")
  const [mode, setMode] = useState<Mode>("unload")
  const [missionText, setMissionText] = useState("")
  const [missionOpen, setMissionOpen] = useState(false)
  const [missionView, setMissionView] = useState<MissionView>("sentence")
  const [ikigaiActive, setIkigaiActive] = useState<string | null>(null)
  const [dropHover, setDropHover] = useState<string | null>(null)
  const [multiIds, setMultiIds] = useState<string[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dockColor, setDockColor] = useState<CardColorId>("butter")
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [focusMode, setFocusMode] = useState(false)
  const [view, setViewState] = useState<View>({ x: 0, y: 0, zoom: 1 })

  const rootRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<View>(view)
  const idCounter = useRef(0)

  const ikigaiOn = mode === "mission" && missionView === "ikigai"
  const ikigaiOnRef = useRef(ikigaiOn)
  const ikigaiActiveRef = useRef(ikigaiActive)
  const multiRef = useRef(multiIds)
  ikigaiOnRef.current = ikigaiOn
  ikigaiActiveRef.current = ikigaiActive
  multiRef.current = multiIds

  const updateView = useCallback((change: (prev: View) => View) => {
    const next = change(viewRef.current)
    viewRef.current = next
    setViewState(next)
  }, [])

  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect()
    const v = viewRef.current
    const sx = clientX - (rect?.left ?? 0)
    const sy = clientY - (rect?.top ?? 0)
    return { x: (sx - v.x) / v.zoom, y: (sy - v.y) / v.zoom }
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
      setMenu(null)
    },
    [updateView],
  )

  const zoomAtCenter = useCallback(
    (factor: number) => {
      const rect = viewportRef.current?.getBoundingClientRect()
      if (!rect) return
      zoomAt(factor, rect.left + rect.width / 2, rect.top + rect.height / 2)
    },
    [zoomAt],
  )

  const pan = useCallback(
    (dx: number, dy: number) => updateView((v) => ({ ...v, x: v.x + dx, y: v.y + dy })),
    [updateView],
  )

  const fitAll = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const cards = viewport.querySelectorAll<HTMLElement>("[data-note-card], [data-zone]")
    if (cards.length === 0) {
      updateView(() => ({ x: viewport.clientWidth / 2, y: viewport.clientHeight / 2, zoom: 1 }))
      return
    }
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const card of cards) {
      minX = Math.min(minX, card.offsetLeft)
      minY = Math.min(minY, card.offsetTop)
      maxX = Math.max(maxX, card.offsetLeft + card.offsetWidth)
      maxY = Math.max(maxY, card.offsetTop + card.offsetHeight)
    }
    const padding = viewport.querySelector("[data-ikigai]") ? IKIGAI_FIT_PADDING : FIT_PADDING
    const availW = Math.max(200, viewport.clientWidth - padding.left - padding.right)
    const availH = Math.max(200, viewport.clientHeight - padding.top - padding.bottom)
    const zoom = clampZoom(Math.min(availW / (maxX - minX), availH / (maxY - minY), 1.2))
    updateView(() => ({
      zoom,
      x: padding.left + (availW - (maxX - minX) * zoom) / 2 - minX * zoom,
      y: padding.top + (availH - (maxY - minY) * zoom) / 2 - minY * zoom,
    }))
  }, [updateView])

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(fitAll)
    return () => cancelAnimationFrame(frame)
  }, [fitAll])

  const visibleLayer = mode === "clusters" ? clusterView : ikigaiOn ? "ikigai" : null
  useEffect(() => {
    if (!visibleLayer) return
    const frame = requestAnimationFrame(fitAll)
    return () => cancelAnimationFrame(frame)
  }, [visibleLayer, fitAll])

  const layer = useMemo<{ areas: TaggedArea[]; tags: string[] } | null>(() => {
    if (mode !== "clusters") return null
    if (clusterView === "wantmust") return { areas: zoneAreas(zones), tags: ZONE_TAGS }
    return { areas: groupAreas(groups), tags: groups.map((g) => g.tag) }
  }, [mode, clusterView, zones, groups])

  const updateNote = useCallback((id: string, change: (note: Note) => Note) => {
    setNotes((prev) => prev.map((note) => (note.id === id ? change(note) : note)))
  }, [])

  const createCardAt = useCallback(
    (worldX: number, worldY: number, color: CardColorId) => {
      idCounter.current += 1
      const id = `card-${idCounter.current}`
      const area = layer ? areaTagAt(layer.areas, worldX, worldY) : null
      setNotes((prev) => {
        const maxZ = prev.reduce((max, note) => Math.max(max, note.z), 0)
        const card: Note = {
          id,
          text: "",
          color,
          hashtags: [],
          x: Math.round(worldX - CARD_WIDTH / 2),
          y: Math.round(worldY - CARD_MIN_HEIGHT / 2),
          rotation: Math.round((Math.random() * 4 - 2) * 10) / 10,
          z: maxZ + 1,
          mission: null,
          labels: {},
          task: null,
        }
        return [...prev, layer ? retag(card, layer.tags, area) : card]
      })
      setEditingId(id)
      setMenu(null)
    },
    [layer],
  )

  const dropFromDock = useCallback(
    (clientX: number, clientY: number) => {
      const rect = viewportRef.current?.getBoundingClientRect()
      if (!rect || clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return
      const point = screenToWorld(clientX, clientY)
      createCardAt(point.x, point.y, dockColor)
    },
    [createCardAt, dockColor, screenToWorld],
  )

  const placeAtCenter = useCallback(() => {
    const rect = viewportRef.current?.getBoundingClientRect()
    if (!rect) return
    const point = screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2)
    createCardAt(point.x, point.y, dockColor)
  }, [createCardAt, dockColor, screenToWorld])

  const moveNote = useCallback(
    (id: string, x: number, y: number, centerX: number, centerY: number) =>
      updateNote(id, (note) => {
        const moved = { ...note, x, y }
        if (!layer) return moved
        const from = areaTagAt(layer.areas, centerX - (x - note.x), centerY - (y - note.y))
        const to = areaTagAt(layer.areas, centerX, centerY)
        return reconcile(moved, layer.tags, from, to)
      }),
    [layer, updateNote],
  )

  const cardCenters = useCallback(() => {
    const centers = new Map<string, { x: number; y: number }>()
    viewportRef.current?.querySelectorAll<HTMLElement>("[data-note-id]").forEach((el) => {
      centers.set(el.dataset.noteId ?? "", { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 })
    })
    return centers
  }, [])

  /** Re-tags cards after an area moves or resizes. Cards sitting in `carryTag` travel with the area (dx, dy). */
  const reshapeAreas = useCallback(
    (tags: string[], prevAreas: TaggedArea[], nextAreas: TaggedArea[], carryTag: string | null, dx: number, dy: number) => {
      const centers = cardCenters()
      setNotes((prev) =>
        prev.map((note) => {
          const center = centers.get(note.id)
          if (!center) return note
          const from = areaTagAt(prevAreas, center.x, center.y)
          const carried = carryTag !== null && from === carryTag
          const shifted = carried ? { ...note, x: note.x + dx, y: note.y + dy } : note
          const to = areaTagAt(nextAreas, center.x + (carried ? dx : 0), center.y + (carried ? dy : 0))
          return reconcile(shifted, tags, from, to)
        }),
      )
    },
    [cardCenters],
  )

  const moveZone = useCallback(
    (id: ZoneId, dx: number, dy: number) => {
      const next: Zones = { ...zones, [id]: { ...zones[id], left: zones[id].left + dx, top: zones[id].top + dy } }
      setZones(next)
      reshapeAreas(ZONE_TAGS, zoneAreas(zones), zoneAreas(next), id, dx, dy)
    },
    [reshapeAreas, zones],
  )

  const resizeZone = useCallback(
    (id: ZoneId, zone: Zone) => {
      const next: Zones = {
        ...zones,
        [id]: {
          ...zone,
          width: Math.max(ZONE_MIN_SIZE.width, zone.width),
          height: Math.max(ZONE_MIN_SIZE.height, zone.height),
        },
      }
      setZones(next)
      reshapeAreas(ZONE_TAGS, zoneAreas(zones), zoneAreas(next), null, 0, 0)
    },
    [reshapeAreas, zones],
  )

  const moveGroup = useCallback(
    (id: string, dx: number, dy: number) => {
      const next = groups.map((g) => (g.id === id ? { ...g, left: g.left + dx, top: g.top + dy } : g))
      const tag = groups.find((g) => g.id === id)?.tag ?? null
      setGroups(next)
      reshapeAreas(next.map((g) => g.tag), groupAreas(groups), groupAreas(next), tag, dx, dy)
    },
    [groups, reshapeAreas],
  )

  const resizeGroup = useCallback(
    (id: string, zone: Zone) => {
      const next = groups.map((g) => (g.id === id ? { ...g, ...zone } : g))
      setGroups(next)
      reshapeAreas(next.map((g) => g.tag), groupAreas(groups), groupAreas(next), null, 0, 0)
    },
    [groups, reshapeAreas],
  )

  const addGroup = useCallback(
    (name: string) => {
      const tag = groupTag(name)
      if (!tag || groups.some((g) => g.tag === tag)) return
      const group: Group = { id: tag, name, tag, ...nextGroupRect(groups) }
      setGroups([...groups, group])
      updateView((v) => {
        const rect = viewportRef.current
        if (!rect) return v
        return {
          ...v,
          x: rect.clientWidth / 2 - (group.left + group.width / 2) * v.zoom,
          y: rect.clientHeight / 2 - (group.top + group.height / 2) * v.zoom,
        }
      })
    },
    [groups, updateView],
  )

  const removeGroup = useCallback((id: string) => setGroups((prev) => prev.filter((g) => g.id !== id)), [])

  const bringToFront = useCallback((id: string) => {
    setNotes((prev) => {
      const maxZ = prev.reduce((max, note) => Math.max(max, note.z), 0)
      const target = prev.find((note) => note.id === id)
      if (!target || target.z === maxZ) return prev
      return prev.map((note) => (note.id === id ? { ...note, z: maxZ + 1 } : note))
    })
  }, [])

  const setMission = useCallback(
    (id: string, choice: Exclude<MissionChoice, null>) =>
      updateNote(id, (note) => ({ ...note, mission: note.mission === choice ? null : choice })),
    [updateNote],
  )

  const toggleLabel = useCallback(
    (id: string, group: LabelGroupId, optionId: string) =>
      updateNote(id, (note) => {
        const labels = { ...note.labels }
        if (labels[group] === optionId) delete labels[group]
        else labels[group] = optionId
        return { ...note, labels }
      }),
    [updateNote],
  )

  const saveTask = useCallback(
    (id: string, task: TaskDetails | null) => updateNote(id, (note) => ({ ...note, task })),
    [updateNote],
  )

  const selectCard = useCallback((id: string, additive: boolean) => {
    if (ikigaiOnRef.current) {
      setMultiIds((prev) => (additive ? (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]) : [id]))
      return
    }
    setSelectedId(id)
  }, [])

  const tagCards = useCallback((ids: string[], tag: string) => {
    setNotes((prev) =>
      prev.map((note) =>
        ids.includes(note.id) && !hasHashtag(note, tag) ? { ...note, hashtags: [...note.hashtags, tag] } : note,
      ),
    )
  }, [])

  const untagCard = useCallback((id: string, tag: string) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id
          ? { ...note, hashtags: note.hashtags.filter((t) => t.toLowerCase() !== tag.toLowerCase()) }
          : note,
      ),
    )
  }, [])

  /** What sits under the pointer while a card is dragged: the side panel, a step or move, or a diagram region. */
  const ikigaiTargetAt = useCallback(
    (clientX: number, clientY: number): string | null => {
      const top = document.elementsFromPoint(clientX, clientY).find((el) => !el.closest("[data-note-card]"))
      if (!top) return null
      if (top.closest("[data-ikigai-drop]")) return "panel"
      const item = top.closest<HTMLElement>("[data-ikigai-item]")?.dataset.ikigaiItem
      if (item) return item
      if (!viewportRef.current?.contains(top)) return null
      const point = screenToWorld(clientX, clientY)
      return ikigaiRegionAt(point.x, point.y)
    },
    [screenToWorld],
  )

  const handleTagDrag = useCallback(
    (id: string, clientX: number, clientY: number, phase: "move" | "drop" | "cancel") => {
      if (phase === "cancel") {
        setDropHover(null)
        return
      }
      const target = ikigaiTargetAt(clientX, clientY)
      if (phase === "move") {
        setDropHover((prev) => (prev === target ? prev : target))
        return
      }
      setDropHover(null)
      const item = getIkigaiItem(target === "panel" ? ikigaiActiveRef.current : target)
      if (!item) return
      const ids = multiRef.current.includes(id) ? multiRef.current : [id]
      tagCards(ids, item.tag)
      if (ids.length > 1) setMultiIds([])
      if (target !== "panel") setIkigaiActive(item.id)
    },
    [ikigaiTargetAt, tagCards],
  )

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id))
    setMultiIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev))
    setSelectedId((current) => (current === id ? null : current))
    setEditingId((current) => (current === id ? null : current))
    setMenu(null)
  }, [])

  const startEdit = useCallback((id: string) => {
    setMenu(null)
    setEditingId(id)
  }, [])

  const endEdit = useCallback(
    (id: string, text: string) => {
      updateNote(id, (note) => ({ ...note, text: text.trimEnd() }))
      setEditingId((current) => (current === id ? null : current))
    },
    [updateNote],
  )

  const openCardMenu = useCallback((noteId: string, clientX: number, clientY: number) => {
    setMenu({ kind: "card", noteId, clientX, clientY })
  }, [])

  const openCanvasMenu = useCallback((clientX: number, clientY: number) => {
    setMenu({ kind: "canvas", clientX, clientY })
  }, [])

  const changeMode = useCallback(
    (next: Mode) => {
      setMode(next)
      setMenu(null)
      setMultiIds([])
      setDropHover(null)
      setMissionOpen(next === "mission" && missionView === "sentence" && missionText.length === 0)
    },
    [missionText, missionView],
  )

  const changeMissionView = useCallback(
    (next: MissionView) => {
      setMissionView(next)
      setMenu(null)
      setMultiIds([])
      setDropHover(null)
      setMissionOpen(next === "sentence" && missionText.length === 0)
    },
    [missionText],
  )

  const closeIkigaiPanel = useCallback(() => setIkigaiActive(null), [])

  const saveMission = useCallback((text: string) => {
    setMissionText(text)
    setMissionOpen(false)
  }, [])

  const openMission = useCallback(() => {
    setMenu(null)
    setMissionOpen(true)
  }, [])

  const closeMission = useCallback(() => setMissionOpen(false), [])

  const closeMenu = useCallback(() => setMenu(null), [])
  const clearSelection = useCallback(() => {
    setSelectedId(null)
    setMultiIds((prev) => (prev.length > 0 ? [] : prev))
  }, [])

  const toggleFocusMode = useCallback(() => {
    const root = rootRef.current
    if (!focusMode) {
      setFocusMode(true)
      root?.requestFullscreen?.().catch(() => {})
    } else {
      setFocusMode(false)
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
  }, [focusMode])

  useEffect(() => {
    function handleFullscreenChange() {
      if (!document.fullscreenElement) setFocusMode(false)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const activeMode = MODES.find((m) => m.id === mode) ?? MODES[0]
  const ikigaiItem = getIkigaiItem(ikigaiActive)
  const showInspector = mode === "labels" || mode === "task"
  const selectedNote = notes.find((note) => note.id === selectedId) ?? null
  const menuNote = menu?.kind === "card" ? notes.find((note) => note.id === menu.noteId) ?? null : null

  return (
    <main
      ref={rootRef}
      className={clsx(
        "relative overflow-hidden bg-board",
        focusMode ? "fixed inset-0 z-50 h-dvh" : "h-[calc(100dvh-3.5rem)]",
      )}
    >
      <Board
        notes={notes}
        zones={zones}
        groups={groups}
        clusterView={clusterView}
        mode={mode}
        missionSaved={missionText.length > 0}
        view={view}
        viewRef={viewRef}
        viewportRef={viewportRef}
        selectedId={showInspector ? selectedId : null}
        multiIds={ikigaiOn ? multiIds : NO_IDS}
        editingId={editingId}
        ikigai={
          ikigaiOn
            ? { activeId: ikigaiActive, hoverId: dropHover && dropHover !== "panel" ? dropHover : null, onPick: setIkigaiActive }
            : null
        }
        onZoneMove={moveZone}
        onZoneResize={resizeZone}
        onGroupMove={moveGroup}
        onGroupResize={resizeGroup}
        onPan={pan}
        onZoomAt={zoomAt}
        onCanvasMenu={openCanvasMenu}
        onClearSelection={clearSelection}
        onSelect={selectCard}
        onTagDrag={handleTagDrag}
        onMove={moveNote}
        onFront={bringToFront}
        onMission={setMission}
        onEditStart={startEdit}
        onEditEnd={endEdit}
        onCardMenu={openCardMenu}
        onDelete={deleteNote}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4">
        <ModeBar
          mode={activeMode}
          notes={notes}
          clusterView={clusterView}
          missionView={missionView}
          missionText={missionText}
          onClusterViewChange={setClusterView}
          onMissionViewChange={changeMissionView}
          onEditMission={openMission}
        />
        <div className="pointer-events-auto flex items-center gap-2">
          <ModeSwitcher mode={mode} onChange={changeMode} />
          <button
            type="button"
            onClick={toggleFocusMode}
            aria-pressed={focusMode}
            aria-label={focusMode ? "Exit full screen" : "Open full screen"}
            title={focusMode ? "Exit full screen" : "Full screen"}
            className="flex size-11 items-center justify-center rounded-xl border border-line bg-board text-ink-soft shadow-sm transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {focusMode ? (
              <Minimize2 className="size-4" aria-hidden="true" />
            ) : (
              <Maximize2 className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mode === "clusters" ? (
        <div className="pointer-events-none absolute top-[7.5rem] right-4 bottom-24 flex">
          <ClustersPanel
            groups={groups}
            notes={notes}
            onAddGroup={addGroup}
            onRemoveGroup={removeGroup}
            onNewCard={placeAtCenter}
          />
        </div>
      ) : null}

      {ikigaiOn && ikigaiItem ? (
        <div className="pointer-events-none absolute top-[11.5rem] right-4 bottom-24 flex">
          <IkigaiPanel
            item={ikigaiItem}
            notes={notes}
            dropOver={dropHover === "panel"}
            onClose={closeIkigaiPanel}
            onRemoveTag={untagCard}
          />
        </div>
      ) : null}

      {showInspector ? (
        <div className="pointer-events-none absolute top-[11.5rem] right-4 bottom-24 flex">
          <Inspector mode={mode} note={selectedNote} onToggleLabel={toggleLabel} onSaveTask={saveTask} />
        </div>
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
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <CardDock color={dockColor} onColorChange={setDockColor} onDrop={dropFromDock} onPlaceCenter={placeAtCenter} />
        </div>
        <span aria-hidden="true" />
      </div>

      {missionOpen && mode === "mission" ? (
        <MissionWindow initialText={missionText} onSave={saveMission} onCancel={closeMission} />
      ) : null}

      {menu?.kind === "canvas" ? (
        <CanvasMenu
          clientX={menu.clientX}
          clientY={menu.clientY}
          onClose={closeMenu}
          onCreate={() => {
            const point = screenToWorld(menu.clientX, menu.clientY)
            createCardAt(point.x, point.y, dockColor)
          }}
        />
      ) : null}

      {menuNote && menu?.kind === "card" ? (
        <CardMenu
          key={menuNote.id}
          clientX={menu.clientX}
          clientY={menu.clientY}
          note={menuNote}
          onClose={closeMenu}
          onColor={(color) => updateNote(menuNote.id, (note) => ({ ...note, color }))}
          onAddHashtag={(tag) =>
            updateNote(menuNote.id, (note) =>
              note.hashtags.some((t) => t.toLowerCase() === tag.toLowerCase())
                ? note
                : { ...note, hashtags: [...note.hashtags, tag] },
            )
          }
          onRemoveHashtag={(tag) =>
            updateNote(menuNote.id, (note) => ({ ...note, hashtags: note.hashtags.filter((t) => t !== tag) }))
          }
          onEdit={() => startEdit(menuNote.id)}
          onDelete={() => deleteNote(menuNote.id)}
        />
      ) : null}
    </main>
  )
}
