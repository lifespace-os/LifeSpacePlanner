"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import clsx from "clsx"
import { Maximize2, Minimize2 } from "lucide-react"
import {
  CARD_MIN_HEIGHT,
  CARD_WIDTH,
  MAX_ZOOM,
  MIN_ZOOM,
  MODES,
  SAMPLE_NOTES,
  type Bucket,
  type CardColorId,
  type LabelGroupId,
  type MissionChoice,
  type Mode,
  type Note,
  type TaskDetails,
  type View,
} from "@/lib/board-data"
import { ModeSwitcher } from "./mode-switcher"
import { ModeBar } from "./mode-bar"
import { Board } from "./board"
import { Inspector } from "./inspector"
import { CardDock } from "./card-dock"
import { ZoomControls } from "./zoom-controls"
import { CanvasMenu, CardMenu, type MenuState } from "./context-menu"

const ZOOM_STEP = 1.25
const FIT_PADDING = { top: 150, right: 60, bottom: 130, left: 60 }

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

export function Whiteboard() {
  const [notes, setNotes] = useState<Note[]>(SAMPLE_NOTES)
  const [mode, setMode] = useState<Mode>("unload")
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
    const cards = viewport.querySelectorAll<HTMLElement>("[data-note-card]")
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
    const availW = Math.max(200, viewport.clientWidth - FIT_PADDING.left - FIT_PADDING.right)
    const availH = Math.max(200, viewport.clientHeight - FIT_PADDING.top - FIT_PADDING.bottom)
    const zoom = clampZoom(Math.min(availW / (maxX - minX), availH / (maxY - minY), 1.2))
    updateView(() => ({
      zoom,
      x: FIT_PADDING.left + (availW - (maxX - minX) * zoom) / 2 - minX * zoom,
      y: FIT_PADDING.top + (availH - (maxY - minY) * zoom) / 2 - minY * zoom,
    }))
  }, [updateView])

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(fitAll)
    return () => cancelAnimationFrame(frame)
  }, [fitAll])

  const updateNote = useCallback((id: string, change: (note: Note) => Note) => {
    setNotes((prev) => prev.map((note) => (note.id === id ? change(note) : note)))
  }, [])

  const createCardAt = useCallback((worldX: number, worldY: number, color: CardColorId) => {
    idCounter.current += 1
    const id = `card-${idCounter.current}`
    setNotes((prev) => {
      const maxZ = prev.reduce((max, note) => Math.max(max, note.z), 0)
      return [
        ...prev,
        {
          id,
          text: "",
          color,
          hashtags: [],
          x: Math.round(worldX - CARD_WIDTH / 2),
          y: Math.round(worldY - CARD_MIN_HEIGHT / 2),
          rotation: Math.round((Math.random() * 4 - 2) * 10) / 10,
          z: maxZ + 1,
          bucket: null,
          mission: null,
          labels: {},
          task: null,
        },
      ]
    })
    setEditingId(id)
    setMenu(null)
  }, [])

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
    (id: string, x: number, y: number, bucket: Bucket) => updateNote(id, (note) => ({ ...note, x, y, bucket })),
    [updateNote],
  )

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

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id))
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

  const closeMenu = useCallback(() => setMenu(null), [])
  const clearSelection = useCallback(() => setSelectedId(null), [])

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
        mode={mode}
        view={view}
        viewRef={viewRef}
        viewportRef={viewportRef}
        selectedId={showInspector ? selectedId : null}
        editingId={editingId}
        onPan={pan}
        onZoomAt={zoomAt}
        onCanvasMenu={openCanvasMenu}
        onClearSelection={clearSelection}
        onSelect={setSelectedId}
        onMove={moveNote}
        onFront={bringToFront}
        onMission={setMission}
        onEditStart={startEdit}
        onEditEnd={endEdit}
        onCardMenu={openCardMenu}
        onDelete={deleteNote}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4">
        <ModeBar mode={activeMode} notes={notes} />
        <div className="pointer-events-auto flex items-center gap-2">
          <ModeSwitcher mode={mode} onChange={setMode} />
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
