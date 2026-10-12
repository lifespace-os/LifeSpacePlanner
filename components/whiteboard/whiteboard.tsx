"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import clsx from "clsx"
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react"
import {
  BUDGET_TAGS,
  BUILT_IN_RINGS,
  insertRing,
  stripRingTags,
  type GoalRing,
  LABEL_SET_IDS,
  labelSetLists,
  writeLabelSet,
  BUDGET_ZONE_GAP,
  BUDGET_ZONE_SIZE,
  arrangeCards,
  type CardSpot,
  budgetAreas,
  type BudgetZoneId,
  type BudgetZones,
  CARD_MIN_HEIGHT,
  CARD_WIDTH,
  DEFAULT_GOAL_PLAN,
  DEFAULT_GROUPS,
  DEFAULT_ZONES,
  GOAL_LEVELS,
  GOAL_POINT_SIZE,
  GOAL_RING_SCALE,
  IKIGAI_GAP,
  goalLevelOf,
  goalLinks,
  goalMapEdges,
  goalRingOf,
  IKIGAI_SIZE,
  MAX_ZOOM,
  MIN_ZOOM,
  MODES,
  SAMPLE_NOTES,
  WHEEL_REACH,
  ZONE_MIN_SIZE,
  ZONE_TAGS,
  areaTagAt,
  sectorTag,
  getCardColor,
  getGoalLevel,
  getIkigaiItem,
  getMarker,
  groupAreas,
  groupTag,
  hasHashtag,
  ikigaiRegionAt,
  nextGroupRect,
  opensGoalPanel,
  reconcile,
  retag,
  setGoalLevel,
  spaceGoalPoints,
  zoneAreas,
  type CardColorId,
  type ClusterView,
  type GoalNameMode,
  type GoalView,
  type Group,
  type IkigaiCenter,
  type LabelView,
  type MissionChoice,
  type MissionView,
  type Mode,
  type Note,
  type TaggedArea,
  type View,
  type Zone,
  type ZoneId,
  type Zones,
} from "@/lib/board-data"
import type { GroupMove } from "@/lib/group-drag"
import { ModeSwitcher } from "./mode-switcher"
import { ModeBar } from "./mode-bar"
import { Board } from "./board"
import { TaskPanel, type CardPlan } from "./task-panel"
import { ClustersPanel } from "./clusters-panel"
import { LabelsPanel } from "./labels-panel"
import { BudgetPanel } from "./budget-panel"
import { useSectors } from "./use-sectors"
import type { WheelPoint } from "./sector-wheel"
import { MissionReadWindow, MissionWindow } from "./mission-window"
import { IkigaiPanel } from "./ikigai-panel"
import { MarkersPanel, MarkersWindow } from "./markers-panel"
import { GoalsPanel } from "./goals-panel"
import type { GoalMapCommit } from "./goal-map"
import { GoalMapWindow } from "./goal-map-window"
import { GraphCanvas } from "./graph-canvas"
import { GraphSettingsWindow } from "./graph-settings-window"
import { GraphVertexWindow } from "./graph-vertex-window"
import { GRAPH_LONE, NO_GRAPH_FILTER, graphVertexShown, type GraphFilter, type GraphSpot } from "@/lib/graph-layout"
import { GoalCardPanel, type GoalDraft } from "./goal-card-panel"
import { IkigaiStepsWindow } from "./ikigai-guide"
import { CardDock } from "./card-dock"
import { ZoomControls } from "./zoom-controls"
import { CanvasMenu, CardMenu, type MenuState } from "./context-menu"

const ZOOM_STEP = 1.25
const NO_IDS: string[] = []
const FIT_PADDING = { top: 150, right: 60, bottom: 130, left: 60 }
const IKIGAI_FIT_PADDING = { top: 270, right: 400, bottom: 130, left: 400 }
const WHEEL_FIT_PADDING = { top: 200, right: 400, bottom: 130, left: 60 }
const MAP_FIT_PADDING = { top: 200, right: 400, bottom: 110, left: 40 }

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

export function Whiteboard() {
  const [notes, setNotes] = useState<Note[]>(SAMPLE_NOTES)
  const [zones, setZones] = useState<Zones>(DEFAULT_ZONES)
  const [budgetZones, setBudgetZones] = useState<BudgetZones>({
    investment: { left: 0, top: 0, ...BUDGET_ZONE_SIZE },
    expense: { left: BUDGET_ZONE_SIZE.width + BUDGET_ZONE_GAP, top: 0, ...BUDGET_ZONE_SIZE },
  })
  const [groups, setGroups] = useState<Group[]>(DEFAULT_GROUPS)
  const [clusterView, setClusterView] = useState<ClusterView>("wantmust")
  const [groupsOpen, setGroupsOpen] = useState(true)
  const [labelsOpen, setLabelsOpen] = useState(true)
  const sectorState = useSectors(setNotes)
  const labelView = sectorState.view
  const labelLists = useMemo(
    () => labelSetLists(sectorState.sphereSectors, sectorState.happinessSectors),
    [sectorState.sphereSectors, sectorState.happinessSectors],
  )
  const { dropOnSector, setOpenSectorId } = sectorState
  const { sectorCounts, sectorPoints } = useMemo(() => {
    const counts: Record<string, number> = {}
    const points: Record<string, WheelPoint[]> = {}
    for (const sector of sectorState.sectors) {
      const tag = sectorTag(sector.name)
      const attached = notes.filter((note) => hasHashtag(note, tag))
      counts[sector.id] = attached.length
      points[sector.id] = attached.map((note) => ({
        id: note.id,
        text: note.text,
        fill: getCardColor(note.color).fill,
      }))
    }
    return { sectorCounts: counts, sectorPoints: points }
  }, [notes, sectorState.sectors])
  const openSectorWindow = useCallback(
    (id: string) => {
      setOpenSectorId(id)
      setLabelsOpen(true)
    },
    [setOpenSectorId],
  )
  const [mode, setMode] = useState<Mode>("unload")
  const [missionText, setMissionText] = useState("")
  const [missionOpen, setMissionOpen] = useState(false)
  const [missionReadOpen, setMissionReadOpen] = useState(false)
  const [missionView, setMissionView] = useState<MissionView>("sentence")
  const [ikigaiActive, setIkigaiActive] = useState<string | null>(null)
  const [ikigaiCenter, setIkigaiCenter] = useState<IkigaiCenter>({ x: 0, y: 0 })
  const [goalMapCenter, setGoalMapCenter] = useState<IkigaiCenter | null>(null)
  const [wheelCenter, setWheelCenter] = useState<IkigaiCenter | null>(null)
  const [stepsOpen, setStepsOpen] = useState(true)
  const [detailsOpen, setDetailsOpen] = useState(true)
  const [markerActive, setMarkerActive] = useState<string | null>(null)
  const [markersListOpen, setMarkersListOpen] = useState(true)
  const [markersPanelOpen, setMarkersPanelOpen] = useState(true)
  const [goalView, setGoalView] = useState<GoalView>("needs")
  const [goalsPanelOpen, setGoalsPanelOpen] = useState(true)
  const [mapSelected, setMapSelected] = useState<string | null>(null)
  const [graphSpots, setGraphSpots] = useState<Record<string, GraphSpot>>({})
  const [graphSelected, setGraphSelected] = useState<string | null>(null)
  const [graphMissionOpen, setGraphMissionOpen] = useState(false)
  const [allBoardLinks, setAllBoardLinks] = useState(false)
  const [linkNotice, setLinkNotice] = useState<string | null>(null)
  const [graphShowText, setGraphShowText] = useState(true)
  const [graphSmall, setGraphSmall] = useState(false)
  const [graphFilter, setGraphFilter] = useState<GraphFilter>(NO_GRAPH_FILTER)
  const [mapFocus, setMapFocus] = useState<number | null>(null)
  const [mapScale, setMapScale] = useState(GOAL_RING_SCALE.initial)
  const [rings, setRings] = useState<GoalRing[]>(BUILT_IN_RINGS)
  const ringsRef = useRef(rings)
  ringsRef.current = rings
  const [mapAllThreads, setMapAllThreads] = useState(false)
  const [mapPointSize, setMapPointSize] = useState(GOAL_POINT_SIZE.initial)
  const [mapNames, setMapNames] = useState<GoalNameMode>("pointer")
  const [mapWindowOpen, setMapWindowOpen] = useState(true)
  const [goalCard, setGoalCard] = useState<{ id: string; fresh: boolean } | null>(null)
  const [dropHover, setDropHover] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>(NO_IDS)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dockColor, setDockColor] = useState<CardColorId>("butter")
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [focusMode, setFocusMode] = useState(false)
  const [view, setViewState] = useState<View>({ x: 0, y: 0, zoom: 1 })

  const rootRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<View>(view)
  const idCounter = useRef(0)
  const ikigaiPlaced = useRef(false)

  const ikigaiOn = mode === "mission" && missionView === "ikigai"
  const markersOn = mode === "mission" && missionView === "markers"
  const goalsOn = mode === "goals"
  const goalsDropOn = goalsOn
  const mapOn = goalsOn && goalView === "map"
  const graphOn = goalsOn && goalView === "graph"
  const goalFormOn = goalsOn && (goalView === "life" || goalView === "project")
  const boardLinksOn =
    mode === "unload" ||
    mode === "task" ||
    mode === "mission" ||
    (goalsOn && (goalView === "needs" || goalView === "life" || goalView === "project" || goalView === "tasks"))
  const notesRef = useRef(notes)
  notesRef.current = notes
  const ikigaiOnRef = useRef(ikigaiOn)
  const ikigaiActiveRef = useRef(ikigaiActive)
  const selectionRef = useRef(selectedIds)
  ikigaiOnRef.current = ikigaiOn
  ikigaiActiveRef.current = ikigaiActive
  selectionRef.current = selectedIds
  const goalMapCenterRef = useRef(goalMapCenter)
  const mapScaleRef = useRef(mapScale)
  const mapFocusRef = useRef(mapFocus)
  goalMapCenterRef.current = goalMapCenter
  mapScaleRef.current = mapScale
  mapFocusRef.current = mapFocus

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
    const cards = viewport.querySelectorAll<HTMLElement>("[data-note-card], [data-zone], [data-wheel]")
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
    const padding = viewport.querySelector("[data-wheel]")
      ? WHEEL_FIT_PADDING
      : viewport.querySelector("[data-ikigai]")
        ? IKIGAI_FIT_PADDING
        : FIT_PADDING
    const availW = Math.max(200, viewport.clientWidth - padding.left - padding.right)
    const availH = Math.max(200, viewport.clientHeight - padding.top - padding.bottom)
    const zoom = clampZoom(Math.min(availW / (maxX - minX), availH / (maxY - minY), 1.2))
    updateView(() => ({
      zoom,
      x: padding.left + (availW - (maxX - minX) * zoom) / 2 - minX * zoom,
      y: padding.top + (availH - (maxY - minY) * zoom) / 2 - minY * zoom,
    }))
  }, [updateView])

  /** Fits the Map, or one ring of it, into the free space between the header, the list, and the dock. */
  const fitMap = useCallback(
    (ring: number | null) => {
      const viewport = viewportRef.current
      const center = goalMapCenterRef.current
      if (!viewport || !center) return
      const edges = goalMapEdges(mapScaleRef.current, ringsRef.current)
      const radius = ring === null ? edges[edges.length - 1] : edges[ring + 1]
      const availW = Math.max(200, viewport.clientWidth - MAP_FIT_PADDING.left - MAP_FIT_PADDING.right)
      const availH = Math.max(200, viewport.clientHeight - MAP_FIT_PADDING.top - MAP_FIT_PADDING.bottom)
      const zoom = clampZoom(Math.min(availW, availH) / (radius * 2))
      updateView(() => ({
        zoom,
        x: MAP_FIT_PADDING.left + availW / 2 - center.x * zoom,
        y: MAP_FIT_PADDING.top + availH / 2 - center.y * zoom,
      }))
    },
    [updateView],
  )

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(fitAll)
    return () => cancelAnimationFrame(frame)
  }, [fitAll])

  useLayoutEffect(() => {
    if (!ikigaiOn || ikigaiPlaced.current) return
    const viewport = viewportRef.current
    if (!viewport) return
    ikigaiPlaced.current = true
    let right = -Infinity
    let top = Infinity
    let bottom = -Infinity
    viewport.querySelectorAll<HTMLElement>("[data-note-card]").forEach((card) => {
      right = Math.max(right, card.offsetLeft + card.offsetWidth)
      top = Math.min(top, card.offsetTop)
      bottom = Math.max(bottom, card.offsetTop + card.offsetHeight)
    })
    if (right === -Infinity) {
      const rect = viewport.getBoundingClientRect()
      const open = screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2)
      setIkigaiCenter({ x: Math.round(open.x), y: Math.round(open.y) })
      return
    }
    setIkigaiCenter({ x: Math.round(right + IKIGAI_GAP + IKIGAI_SIZE / 2), y: Math.round((top + bottom) / 2) })
  }, [ikigaiOn, screenToWorld])

  const moveIkigaiGroup = useCallback(
    (dx: number, dy: number) => setIkigaiCenter((center) => ({ x: center.x + dx, y: center.y + dy })),
    [],
  )

  useLayoutEffect(() => {
    if (!mapOn || goalMapCenter) return
    const viewport = viewportRef.current
    if (!viewport) return
    let right = -Infinity
    let top = Infinity
    let bottom = -Infinity
    viewport.querySelectorAll<HTMLElement>("[data-note-card]").forEach((card) => {
      right = Math.max(right, card.offsetLeft + card.offsetWidth)
      top = Math.min(top, card.offsetTop)
      bottom = Math.max(bottom, card.offsetTop + card.offsetHeight)
    })
    if (ikigaiPlaced.current) {
      right = Math.max(right, ikigaiCenter.x + IKIGAI_SIZE / 2)
      top = Math.min(top, ikigaiCenter.y - IKIGAI_SIZE / 2)
      bottom = Math.max(bottom, ikigaiCenter.y + IKIGAI_SIZE / 2)
    }
    if (right === -Infinity) {
      const rect = viewport.getBoundingClientRect()
      const open = screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2)
      setGoalMapCenter({ x: Math.round(open.x), y: Math.round(open.y) })
      return
    }
    const edges = goalMapEdges(mapScaleRef.current, ringsRef.current)
    setGoalMapCenter({ x: Math.round(right + IKIGAI_GAP + edges[edges.length - 1]), y: Math.round((top + bottom) / 2) })
  }, [mapOn, goalMapCenter, ikigaiCenter, screenToWorld])

  useLayoutEffect(() => {
    if (mode !== "labels" || labelView === "budget" || wheelCenter) return
    const viewport = viewportRef.current
    if (!viewport) return
    let right = -Infinity
    let top = Infinity
    let bottom = -Infinity
    viewport.querySelectorAll<HTMLElement>("[data-note-card]").forEach((card) => {
      right = Math.max(right, card.offsetLeft + card.offsetWidth)
      top = Math.min(top, card.offsetTop)
      bottom = Math.max(bottom, card.offsetTop + card.offsetHeight)
    })
    if (right === -Infinity) {
      const rect = viewport.getBoundingClientRect()
      const open = screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2)
      setWheelCenter({ x: Math.round(open.x), y: Math.round(open.y) })
      return
    }
    setWheelCenter({ x: Math.round(right + IKIGAI_GAP + WHEEL_REACH), y: Math.round((top + bottom) / 2) })
  }, [mode, labelView, wheelCenter, screenToWorld])

  const budgetOn = mode === "labels" && labelView === "budget"
  const wheelOn = mode === "labels" && !budgetOn && wheelCenter !== null
  const visibleLayer =
    mode === "clusters"
      ? clusterView
      : ikigaiOn
        ? "ikigai"
        : mapOn && goalMapCenter
          ? "map"
          : budgetOn
            ? "budget"
            : wheelOn
              ? "wheel"
              : null
  useEffect(() => {
    if (!visibleLayer) return
    const frame = requestAnimationFrame(() => (visibleLayer === "map" ? fitMap(mapFocusRef.current) : fitAll()))
    return () => cancelAnimationFrame(frame)
  }, [visibleLayer, fitAll, fitMap])

  useEffect(() => {
    if (!mapOn || !goalMapCenter) return
    const frame = requestAnimationFrame(() => fitMap(mapFocusRef.current))
    return () => cancelAnimationFrame(frame)
  }, [rings, mapOn, goalMapCenter, fitMap])

  useEffect(() => {
    if (mapOn) return
    setMapFocus(null)
    setMapSelected(null)
  }, [mapOn])

  const layer = useMemo<{ areas: TaggedArea[]; tags: string[] } | null>(() => {
    if (budgetOn) return { areas: budgetAreas(budgetZones), tags: BUDGET_TAGS }
    if (mode !== "clusters") return null
    if (clusterView === "wantmust") return { areas: zoneAreas(zones), tags: ZONE_TAGS }
    return { areas: groupAreas(groups), tags: groups.map((g) => g.tag) }
  }, [budgetOn, budgetZones, mode, clusterView, zones, groups])

  const layoutKey = mode === "clusters" ? `clusters:${clusterView}` : budgetOn ? "labels:budget" : null
  const [layout, setLayout] = useState<{ key: string | null; spots: Record<string, CardSpot> }>({ key: null, spots: {} })
  if (layout.key !== layoutKey) {
    setLayout({ key: layoutKey, spots: layoutKey && layer ? arrangeCards(notes, layer.areas) : {} })
  }
  const layoutOn = layoutKey !== null && layout.key === layoutKey
  const layoutRef = useRef<Record<string, CardSpot> | null>(null)
  layoutRef.current = layoutOn ? layout.spots : null
  const displayNotes = useMemo(
    () => (layoutOn ? notes.map((note) => (layout.spots[note.id] ? { ...note, ...layout.spots[note.id] } : note)) : notes),
    [layoutOn, layout.spots, notes],
  )

  const graphTags = useMemo(
    () => [...new Set(notes.flatMap((note) => note.hashtags.map((t) => t.toLowerCase())))].sort((a, b) => a.localeCompare(b)),
    [notes],
  )
  const graphShown = useMemo(
    () =>
      notes.filter((note) => {
        const ring = goalRingOf(note, rings)
        return graphVertexShown(note, ring >= 0 ? rings[ring].id : GRAPH_LONE, graphFilter)
      }).length,
    [notes, rings, graphFilter],
  )
  const graphNote = graphSelected ? (notes.find((note) => note.id === graphSelected) ?? null) : null

  const selectGraphVertex = useCallback((id: string | null) => {
    setGraphSelected(id)
    if (id) setMapWindowOpen(true)
  }, [])

  const updateNote = useCallback((id: string, change: (note: Note) => Note) => {
    setNotes((prev) => prev.map((note) => (note.id === id ? change(note) : note)))
  }, [])

  const setFreeLine = useCallback((a: string, b: string, on: boolean) => {
    setNotes((prev) =>
      prev.map((note) => {
        const ids = note.freeIds ?? []
        if (on) {
          if (note.id !== a || ids.includes(b)) return note
          return { ...note, freeIds: [...ids, b] }
        }
        if ((note.id === a && ids.includes(b)) || (note.id === b && ids.includes(a))) {
          return { ...note, freeIds: ids.filter((id) => id !== a && id !== b) }
        }
        return note
      }),
    )
  }, [])

  const createCardAt = useCallback(
    (worldX: number, worldY: number, color: CardColorId) => {
      idCounter.current += 1
      const id = `card-${idCounter.current}`
      const area = layer ? areaTagAt(layer.areas, worldX, worldY) : null
      const levelTag = goalFormOn ? (goalView === "life" ? "life-goal" : "project-goal") : null
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
        if (levelTag) return [...prev, setGoalLevel(card, levelTag, ringsRef.current)]
        return [...prev, layer ? retag(card, layer.tags, area) : card]
      })
      if (levelTag) {
        setGoalCard({ id, fresh: true })
        setGoalsPanelOpen(true)
      } else {
        setEditingId(id)
      }
      setMenu(null)
    },
    [layer, goalFormOn, goalView],
  )

  const createGraphCard = useCallback(() => {
    idCounter.current += 1
    const id = `card-${idCounter.current}`
    const rect = viewportRef.current?.getBoundingClientRect()
    const center = screenToWorld((rect?.left ?? 0) + (rect?.width ?? 0) / 2, (rect?.top ?? 0) + (rect?.height ?? 0) / 2)
    setNotes((prev) => {
      const maxZ = prev.reduce((max, note) => Math.max(max, note.z), 0)
      const card: Note = {
        id,
        text: "",
        color: dockColor,
        hashtags: [],
        x: Math.round(center.x - CARD_WIDTH / 2),
        y: Math.round(center.y - CARD_MIN_HEIGHT / 2),
        rotation: 0,
        z: maxZ + 1,
        mission: null,
        labels: {},
        task: null,
      }
      return [...prev, card]
    })
    return id
  }, [dockColor, screenToWorld])

  const saveGraphSpot = useCallback((id: string, spot: GraphSpot) => {
    setGraphSpots((prev) => ({ ...prev, [id]: spot }))
  }, [])

  useEffect(() => {
    if (!goalFormOn) {
      setGoalCard(null)
      return
    }
    if (selectedIds.length !== 1) return
    const note = notesRef.current.find((n) => n.id === selectedIds[0])
    if (!note || !opensGoalPanel(note)) return
    setGoalCard((prev) => (prev?.id === note.id ? prev : { id: note.id, fresh: false }))
  }, [goalFormOn, selectedIds])

  const saveGoalCard = useCallback(
    (id: string, draft: GoalDraft) => {
      updateNote(id, (note) => ({ ...note, text: draft.text, parentIds: draft.parentIds, goalPlan: draft.plan }))
      setGoalCard((prev) => (prev?.id === id ? { id, fresh: false } : prev))
    },
    [updateNote],
  )

  const splitGoalCard = useCallback(
    (id: string, draft: GoalDraft, secondText: string) => {
      idCounter.current += 1
      const siblingId = `card-${idCounter.current}`
      setNotes((prev) => {
        const source = prev.find((note) => note.id === id)
        if (!source) return prev
        const maxZ = prev.reduce((max, note) => Math.max(max, note.z), 0)
        const sibling: Note = {
          ...source,
          id: siblingId,
          text: secondText,
          x: source.x + CARD_WIDTH + 24,
          z: maxZ + 1,
          rotation: Math.round((Math.random() * 4 - 2) * 10) / 10,
          labels: {},
          task: null,
          mapAngle: null,
          parentIds: draft.parentIds,
          goalPlan: { ...DEFAULT_GOAL_PLAN, ground: draft.plan.ground, ownChoice: draft.plan.ownChoice, oneResult: true, split: true },
        }
        const updated = prev.map((note) =>
          note.id === id ? { ...note, text: draft.text, parentIds: draft.parentIds, goalPlan: draft.plan } : note,
        )
        return [...updated, sibling]
      })
      setGoalCard((prev) => (prev?.id === id ? { id, fresh: false } : prev))
    },
    [],
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
    (id: string, x: number, y: number, centerX: number, centerY: number) => {
      const spots = layoutRef.current
      if (spots) setLayout((prev) => ({ ...prev, spots: { ...prev.spots, [id]: { x, y } } }))
      updateNote(id, (note) => {
        const before = spots?.[id] ?? note
        const moved = spots ? note : { ...note, x, y }
        if (!layer) return moved
        const from = areaTagAt(layer.areas, centerX - (x - before.x), centerY - (y - before.y))
        const to = areaTagAt(layer.areas, centerX, centerY)
        return reconcile(moved, layer.tags, from, to)
      })
    },
    [layer, updateNote],
  )

  const moveNotes = useCallback(
    (moves: GroupMove[]) => {
      const byId = new Map(moves.map((move) => [move.id, move]))
      const spots = layoutRef.current
      if (spots) {
        setLayout((prev) => {
          const next = { ...prev.spots }
          for (const move of moves) next[move.id] = { x: move.x, y: move.y }
          return { ...prev, spots: next }
        })
      }
      setNotes((prev) =>
        prev.map((note) => {
          const move = byId.get(note.id)
          if (!move) return note
          const before = spots?.[note.id] ?? note
          const moved = spots ? note : { ...note, x: move.x, y: move.y }
          if (!layer) return moved
          const from = areaTagAt(layer.areas, move.centerX - (move.x - before.x), move.centerY - (move.y - before.y))
          const to = areaTagAt(layer.areas, move.centerX, move.centerY)
          return reconcile(moved, layer.tags, from, to)
        }),
      )
    },
    [layer],
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
      const spots = layoutRef.current
      if (spots && carryTag !== null) {
        setLayout((prev) => {
          const next = { ...prev.spots }
          for (const note of notesRef.current) {
            const center = centers.get(note.id)
            if (!center || areaTagAt(prevAreas, center.x, center.y) !== carryTag) continue
            const at = prev.spots[note.id] ?? note
            next[note.id] = { x: at.x + dx, y: at.y + dy }
          }
          return { ...prev, spots: next }
        })
      }
      setNotes((prev) =>
        prev.map((note) => {
          const center = centers.get(note.id)
          if (!center) return note
          const from = areaTagAt(prevAreas, center.x, center.y)
          const carried = carryTag !== null && from === carryTag
          const shifted = carried && !spots ? { ...note, x: note.x + dx, y: note.y + dy } : note
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

  const moveBudgetZone = useCallback(
    (id: BudgetZoneId, dx: number, dy: number) => {
      const next: BudgetZones = {
        ...budgetZones,
        [id]: { ...budgetZones[id], left: budgetZones[id].left + dx, top: budgetZones[id].top + dy },
      }
      setBudgetZones(next)
      reshapeAreas(BUDGET_TAGS, budgetAreas(budgetZones), budgetAreas(next), id, dx, dy)
    },
    [budgetZones, reshapeAreas],
  )

  const resizeBudgetZone = useCallback(
    (id: BudgetZoneId, zone: Zone) => {
      const next: BudgetZones = {
        ...budgetZones,
        [id]: {
          ...zone,
          width: Math.max(ZONE_MIN_SIZE.width, zone.width),
          height: Math.max(ZONE_MIN_SIZE.height, zone.height),
        },
      }
      setBudgetZones(next)
      reshapeAreas(BUDGET_TAGS, budgetAreas(budgetZones), budgetAreas(next), null, 0, 0)
    },
    [budgetZones, reshapeAreas],
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

  /**
   * Writes what the Make a task window saved. Each part is optional, so saving the fields leaves the
   * sets alone and the other way round. The card keeps its place.
   */
  const saveCard = useCallback(
    (id: string, plan: CardPlan) =>
      updateNote(id, (note) => {
        const base = plan.setLevel ? setGoalLevel(note, "task", ringsRef.current) : note
        let hashtags = base.hashtags
        for (const setId of LABEL_SET_IDS) {
          const chosen = plan.sets?.[setId]
          if (!chosen) continue
          hashtags = writeLabelSet(hashtags, labelLists[setId], chosen).hashtags
        }
        let task = base.task
        const details = plan.details ?? base.details ?? null
        if (plan.details && task) task = { ...task, ...plan.details }
        if (plan.task === "make" && plan.details) task = { ...plan.details, labelId: task?.labelId ?? null }
        if (plan.task === "remove") task = null
        return { ...base, hashtags, details, task }
      }),
    [updateNote, labelLists],
  )

  const selectCard = useCallback((id: string, additive: boolean) => {
    setSelectedIds((prev) => (additive ? (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]) : [id]))
  }, [])

  const selectInside = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const next = [...prev, ...ids.filter((id) => !prev.includes(id))]
      return next.length === prev.length ? prev : next
    })
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

  /** A point was dragged along its ring. Dropping it on another ring also changes the level of the card. */
  const commitMapPoint = useCallback(
    (id: string, change: GoalMapCommit) =>
      updateNote(id, (note) => ({
        ...(change.level ? setGoalLevel(note, change.level, ringsRef.current) : note),
        mapAngle: change.angle,
      })),
    [updateNote],
  )

  const focusMapRing = useCallback(
    (ring: number | null) => {
      setMapFocus(ring)
      setMapSelected((current) => {
        if (ring === null || !current) return current
        const note = notes.find((n) => n.id === current)
        return note && goalRingOf(note, ringsRef.current) === ring ? current : null
      })
      fitMap(ring)
    },
    [fitMap, notes],
  )

  const addMapRing = useCallback((name: string, afterId: string) => {
    setRings((prev) => insertRing(prev, name, afterId) ?? prev)
    setMapFocus(null)
  }, [])

  /** Removing an added ring takes its hashtag off the cards. The main rings never come here. */
  const removeMapRing = useCallback((id: string) => {
    const ring = ringsRef.current.find((r) => r.id === id)
    if (!ring || !ring.custom) return
    setNotes((prev) => stripRingTags(prev, ring))
    setRings((prev) => prev.filter((r) => r.id !== id))
    setMapFocus(null)
    setMapSelected(null)
  }, [])

  /** What sits under the pointer while a card is dragged: the side panel, a step or move, or a diagram region. */
  const ikigaiTargetAt = useCallback(
    (clientX: number, clientY: number): string | null => {
      const top = document.elementsFromPoint(clientX, clientY).find((el) => !el.closest("[data-note-card], [data-selection-box]"))
      if (!top) return null
      if (goalsDropOn) return top.closest<HTMLElement>("[data-goal-area]")?.dataset.goalArea ?? null
      if (markersOn) {
        if (top.closest("[data-marker-drop]")) return "panel"
        return top.closest<HTMLElement>("[data-marker-item]")?.dataset.markerItem ?? null
      }
      if (mode === "labels") {
        if (top.closest("[data-sector-drop]")) return "panel"
        return top.closest<HTMLElement>("[data-sector-item]")?.dataset.sectorItem ?? null
      }
      if (top.closest("[data-ikigai-drop]")) return "panel"
      const item = top.closest<HTMLElement>("[data-ikigai-item]")?.dataset.ikigaiItem
      if (item) return item
      if (!viewportRef.current?.contains(top)) return null
      const point = screenToWorld(clientX, clientY)
      return ikigaiRegionAt(point.x, point.y, ikigaiCenter)
    },
    [goalsDropOn, ikigaiCenter, markersOn, mode, screenToWorld],
  )

  const handleTagDrag = useCallback(
    (id: string, clientX: number, clientY: number, phase: "move" | "drop" | "cancel"): boolean => {
      if (phase === "cancel") {
        setDropHover(null)
        return false
      }
      const target = ikigaiTargetAt(clientX, clientY)
      if (phase === "move") {
        setDropHover((prev) => (prev === target ? prev : target))
        return false
      }
      setDropHover(null)
      const ids = selectionRef.current.includes(id) ? selectionRef.current : [id]
      if (goalsDropOn) {
        const level = getGoalLevel(target)
        if (!level) return false
        setNotes((prev) => prev.map((note) => (ids.includes(note.id) ? setGoalLevel(note, level.tag, ringsRef.current) : note)))
        return true
      }
      if (markersOn) {
        const marker = getMarker(target === "panel" ? markerActive : target)
        if (!marker) return false
        tagCards(ids, marker.tag)
        if (target !== "panel") setMarkerActive(marker.id)
        setSelectedIds(NO_IDS)
        return true
      }
      if (mode === "labels") {
        const sectorId = target === "panel" ? sectorState.openSector?.id : target
        return sectorId ? dropOnSector(ids, sectorId) : false
      }
      const item = getIkigaiItem(target === "panel" ? ikigaiActiveRef.current : target)
      if (!item) return false
      tagCards(ids, item.tag)
      if (target !== "panel") setIkigaiActive(item.id)
      return true
    },
    [dropOnSector, goalsDropOn, ikigaiTargetAt, markerActive, markersOn, mode, sectorState.openSector, tagCards],
  )

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id))
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev))
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
      setDropHover(null)
      setMissionReadOpen(false)
      setMissionOpen(next === "mission" && missionView === "sentence" && missionText.length === 0)
    },
    [missionText, missionView],
  )

  const changeMissionView = useCallback(
    (next: MissionView) => {
      setMissionView(next)
      setMenu(null)
      setDropHover(null)
      setMissionOpen(next === "sentence" && missionText.length === 0)
    },
    [missionText],
  )

  const openClusterView = useCallback(
    (next: ClusterView) => {
      setClusterView(next)
      if (mode !== "clusters") changeMode("clusters")
    },
    [mode, changeMode],
  )

  const { setView: setLabelView } = sectorState
  const openLabelView = useCallback(
    (next: LabelView) => {
      setLabelView(next)
      setLabelsOpen(true)
      if (mode !== "labels") changeMode("labels")
    },
    [mode, changeMode, setLabelView],
  )

  const openMissionView = useCallback(
    (next: MissionView) => {
      setMode("mission")
      changeMissionView(next)
      if (next === "sentence") setMissionOpen(true)
    },
    [changeMissionView],
  )

  const openGoalView = useCallback((next: GoalView) => {
    setMode("goals")
    setGoalView(next)
    setMenu(null)
    setDropHover(null)
    setMissionOpen(false)
    setMissionReadOpen(false)
  }, [])

  const hideSteps = useCallback(() => setStepsOpen(false), [])
  const hideDetails = useCallback(() => setDetailsOpen(false), [])

  const saveMission = useCallback((text: string) => {
    setMissionText(text)
    setMissionOpen(false)
  }, [])

  const closeMission = useCallback(() => setMissionOpen(false), [])
  const openGraphMission = useCallback(() => setGraphMissionOpen(true), [])
  const closeGraphMission = useCallback(() => setGraphMissionOpen(false), [])
  const saveGraphMission = useCallback((text: string) => {
    setMissionText(text)
    setGraphMissionOpen(false)
  }, [])
  const closeMissionRead = useCallback(() => setMissionReadOpen(false), [])

  const pressMissionButton = useCallback(() => {
    if (missionText.length > 0) setMissionReadOpen(true)
    else openMissionView("sentence")
  }, [missionText, openMissionView])

  const writeMapMission = useCallback(() => openMissionView("sentence"), [openMissionView])

  const pressMapMission = useCallback(() => {
    if (missionText.length > 0) setMapWindowOpen(true)
    else openMissionView("sentence")
  }, [missionText, openMissionView])

  const spaceMapPoints = useCallback(
    () => setNotes((prev) => spaceGoalPoints(prev, mapScale, mapPointSize, rings)),
    [mapScale, mapPointSize, rings],
  )

  const closeMenu = useCallback(() => setMenu(null), [])
  const clearSelection = useCallback(() => {
    setSelectedIds((prev) => (prev.length > 0 ? NO_IDS : prev))
    setMapSelected(null)
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
  const showInspector = mode === "task"
  const selectedNote = selectedIds.length === 1 ? (notes.find((note) => note.id === selectedIds[0]) ?? null) : null
  const menuNote = menu?.kind === "card" ? notes.find((note) => note.id === menu.noteId) ?? null : null
  const goalFormCandidate = goalFormOn && goalCard ? (notes.find((note) => note.id === goalCard.id) ?? null) : null
  const goalFormNote = goalFormCandidate && opensGoalPanel(goalFormCandidate) ? goalFormCandidate : null

  return (
    <main
      ref={rootRef}
      className={clsx(
        "relative overflow-hidden bg-board",
        focusMode ? "fixed inset-0 z-50 h-dvh" : "h-[calc(100dvh-3.5rem)]",
      )}
    >
      <Board
        notes={displayNotes}
        zones={zones}
        groups={groups}
        clusterView={clusterView}
        mode={mode}
        missionSaved={missionText.length > 0}
        labelLists={labelLists}
        view={view}
        viewRef={viewRef}
        viewportRef={viewportRef}
        selectedIds={selectedIds}
        selectionRef={selectionRef}
        editingId={editingId}
        ikigai={
          ikigaiOn
            ? {
                center: ikigaiCenter,
                activeId: ikigaiActive,
                hoverId: dropHover && dropHover !== "panel" ? dropHover : null,
                onPick: setIkigaiActive,
                onMoveGroup: moveIkigaiGroup,
              }
            : null
        }
        goalMap={
          mapOn && goalMapCenter
            ? {
                center: goalMapCenter,
                rings,
                scale: mapScale,
                pointSize: mapPointSize,
                names: mapNames,
                selectedId: mapSelected,
                showAllThreads: mapAllThreads,
                focusRing: mapFocus,
                toWorld: screenToWorld,
                onSelect: setMapSelected,
                onMenu: openCardMenu,
                onCommit: commitMapPoint,
                onMission: pressMapMission,
              }
            : null
        }
        wheel={
          wheelOn && wheelCenter
            ? {
                center: wheelCenter,
                title: labelView === "happiness" ? "Happiness components" : "Life spheres",
                sectors: sectorState.sectors,
                counts: sectorCounts,
                points: sectorPoints,
                scoring: labelView === "spheres",
                cardsHidden: sectorState.wheelOnly,
                hoverId: dropHover && dropHover !== "panel" ? dropHover : null,
                openId: sectorState.openSector?.id ?? null,
                onOpen: openSectorWindow,
              }
            : null
        }
        budget={budgetOn ? { zones: budgetZones, onMove: moveBudgetZone, onResize: resizeBudgetZone } : null}
  links={
  boardLinksOn
  ? {
  rings,
  selectedId: selectedIds.length === 1 && editingId !== selectedIds[0] ? selectedIds[0] : null,
  all: allBoardLinks,
  missionText,
  toWorld: screenToWorld,
  onLinks: (id, parentIds) => updateNote(id, (note) => ({ ...note, parentIds })),
  onFree: setFreeLine,
  onNotice: setLinkNotice,
  }
  : null
  }
        tagOnly={markersOn || goalsDropOn || (mode === "labels" && !budgetOn)}
        onZoneMove={moveZone}
        onZoneResize={resizeZone}
        onGroupMove={moveGroup}
        onGroupResize={resizeGroup}
        onPan={pan}
        onZoomAt={zoomAt}
        onCanvasMenu={openCanvasMenu}
        onClearSelection={clearSelection}
        onSelect={selectCard}
        onMarquee={selectInside}
        onTagDrag={handleTagDrag}
        onMove={moveNote}
        onMoveMany={moveNotes}
        onFront={bringToFront}
        onMission={setMission}
        onEditStart={startEdit}
        onEditEnd={endEdit}
        onCardMenu={openCardMenu}
        onDelete={deleteNote}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4">
        <ModeBar
          key={`${mode}:${mode === "clusters" ? clusterView : mode === "mission" ? missionView : mode === "goals" ? goalView : mode === "labels" ? labelView : ""}`}
          mode={activeMode}
          notes={notes}
          clusterView={clusterView}
          missionView={missionView}
          goalView={goalView}
          labelView={labelView}
  missionText={missionText}
  onMissionButton={pressMissionButton}
  />
  <div className="pointer-events-auto flex items-center gap-2">
          <ModeSwitcher
            mode={mode}
            clusterView={clusterView}
            missionView={missionView}
            goalView={goalView}
            labelView={labelView}
            onChange={(next) => (next === "goals" ? openGoalView(goalView) : changeMode(next))}
            onClusterView={openClusterView}
            onMissionView={openMissionView}
            onGoalView={openGoalView}
            onLabelView={openLabelView}
          />
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

      {mode === "clusters" && clusterView === "groups" ? (
        <>
          <div
            inert={!groupsOpen}
            aria-hidden={!groupsOpen}
            className={`pointer-events-none absolute top-[11.5rem] right-4 bottom-24 flex transition-transform duration-300 ease-out motion-reduce:transition-none ${
              groupsOpen ? "translate-x-0" : "translate-x-[calc(100%+1.5rem)]"
            }`}
          >
            <ClustersPanel
              groups={groups}
              notes={notes}
              onAddGroup={addGroup}
              onRemoveGroup={removeGroup}
              onNewCard={placeAtCenter}
              onClose={() => setGroupsOpen(false)}
            />
          </div>
          {groupsOpen ? null : (
            <button
              type="button"
              onClick={() => setGroupsOpen(true)}
              aria-label="Show Groups panel"
              title="Show Groups panel"
              className="pointer-events-auto absolute top-[11.5rem] right-0 flex h-24 w-9 items-center justify-center rounded-l-xl border border-r-0 border-line bg-card text-ink-soft shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)] transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
          )}
        </>
      ) : null}

      {ikigaiOn ? (
        <>
          <div
            inert={!stepsOpen}
            aria-hidden={!stepsOpen}
            className={`pointer-events-none absolute top-[11.5rem] bottom-24 left-4 flex transition-transform duration-300 ease-out motion-reduce:transition-none ${
              stepsOpen ? "translate-x-0" : "-translate-x-[calc(100%+1.5rem)]"
            }`}
          >
            <IkigaiStepsWindow
              notes={notes}
              activeId={ikigaiActive}
              hoverId={dropHover && dropHover !== "panel" ? dropHover : null}
              onPick={setIkigaiActive}
              onClose={hideSteps}
            />
          </div>
          {stepsOpen ? null : (
            <button
              type="button"
              onClick={() => setStepsOpen(true)}
              aria-label="Show steps window"
              title="Show steps window"
              className="pointer-events-auto absolute top-[11.5rem] left-0 flex h-24 w-9 items-center justify-center rounded-r-xl border border-l-0 border-line bg-card text-ink-soft shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)] transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          )}

          <div
            inert={!detailsOpen}
            aria-hidden={!detailsOpen}
            className={`pointer-events-none absolute top-[11.5rem] right-4 bottom-24 flex transition-transform duration-300 ease-out motion-reduce:transition-none ${
              detailsOpen ? "translate-x-0" : "translate-x-[calc(100%+1.5rem)]"
            }`}
          >
            <IkigaiPanel
              item={ikigaiItem}
              notes={notes}
              dropOver={dropHover === "panel"}
              onClose={hideDetails}
              onRemoveTag={untagCard}
            />
          </div>
          {detailsOpen ? null : (
            <button
              type="button"
              onClick={() => setDetailsOpen(true)}
              aria-label="Show details window"
              title="Show details window"
              className="pointer-events-auto absolute top-[11.5rem] right-0 flex h-24 w-9 items-center justify-center rounded-l-xl border border-r-0 border-line bg-card text-ink-soft shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)] transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
          )}
        </>
      ) : null}

      {markersOn ? (
        <>
          <div
            inert={!markersListOpen}
            aria-hidden={!markersListOpen}
            className={`pointer-events-none absolute top-[11.5rem] bottom-24 left-4 flex transition-transform duration-300 ease-out motion-reduce:transition-none ${
              markersListOpen ? "translate-x-0" : "-translate-x-[calc(100%+1.5rem)]"
            }`}
          >
            <MarkersWindow
              notes={notes}
              activeId={markerActive}
              hoverId={dropHover && dropHover !== "panel" ? dropHover : null}
              onPick={setMarkerActive}
              onClose={() => setMarkersListOpen(false)}
            />
          </div>
          {markersListOpen ? null : (
            <button
              type="button"
              onClick={() => setMarkersListOpen(true)}
              aria-label="Show markers window"
              title="Show markers window"
              className="pointer-events-auto absolute top-[11.5rem] left-0 flex h-24 w-9 items-center justify-center rounded-r-xl border border-l-0 border-line bg-card text-ink-soft shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)] transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          )}

          <div
            inert={!markersPanelOpen}
            aria-hidden={!markersPanelOpen}
            className={`pointer-events-none absolute top-[11.5rem] right-4 bottom-24 flex transition-transform duration-300 ease-out motion-reduce:transition-none ${
              markersPanelOpen ? "translate-x-0" : "translate-x-[calc(100%+1.5rem)]"
            }`}
          >
            <MarkersPanel
              marker={getMarker(markerActive)}
              notes={notes}
              dropOver={dropHover === "panel"}
              onClose={() => setMarkersPanelOpen(false)}
              onRemoveTag={untagCard}
            />
          </div>
          {markersPanelOpen ? null : (
            <button
              type="button"
              onClick={() => setMarkersPanelOpen(true)}
              aria-label="Show details window"
              title="Show details window"
              className="pointer-events-auto absolute top-[11.5rem] right-0 flex h-24 w-9 items-center justify-center rounded-l-xl border border-r-0 border-line bg-card text-ink-soft shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)] transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
          )}
        </>
      ) : null}

      {graphOn ? (
        <GraphCanvas
          notes={notes}
          rings={rings}
          spots={graphSpots}
          selectedId={graphSelected}
          filter={graphFilter}
          showText={graphShowText}
          small={graphSmall}
          missionText={missionText}
          onMission={openGraphMission}
          onLinks={(id, parentIds) => updateNote(id, (note) => ({ ...note, parentIds }))}
          onFree={setFreeLine}
          onSelect={selectGraphVertex}
          onSpot={saveGraphSpot}
          onMenu={openCardMenu}
          onRename={(id, text) => updateNote(id, (note) => ({ ...note, text }))}
          onAddCard={createGraphCard}
        />
      ) : null}

      {goalsOn ? (
        <>
          <div className="pointer-events-none absolute top-[11.5rem] bottom-24 left-4 flex min-h-0 flex-col items-start gap-3">
            {goalFormNote && goalCard ? (
              <GoalCardPanel
                key={`${goalFormNote.id}:${goalFormNote.text}:${(goalFormNote.parentIds ?? []).join(",")}:${goalCard.fresh}`}
                note={goalFormNote}
                notes={notes}
                rings={rings}
                missionText={missionText}
                fresh={goalCard.fresh}
                tagColors={sectorState.tagColors}
                onSave={saveGoalCard}
                onSplit={splitGoalCard}
                onClose={() => setGoalCard(null)}
              />
            ) : null}
          </div>
          {mapOn || graphOn ? (
            <>
              <div
                inert={!mapWindowOpen}
                aria-hidden={!mapWindowOpen}
                className={`pointer-events-none absolute top-[11.5rem] bottom-24 left-4 flex transition-transform duration-300 ease-out motion-reduce:transition-none ${
                  mapWindowOpen ? "translate-x-0" : "-translate-x-[calc(100%+1.5rem)]"
                }`}
              >
                {graphOn && graphNote ? (
                  <GraphVertexWindow
                    key={graphNote.id}
                    note={graphNote}
                    notes={notes}
                    rings={rings}
                    tagColors={sectorState.tagColors}
                    onUpdate={updateNote}
                    onClose={() => setGraphSelected(null)}
                  />
                ) : (
                <GoalMapWindow
                  missionText={missionText}
                  scale={mapScale}
                  pointSize={mapPointSize}
                  names={mapNames}
                  showAll={mapAllThreads}
                  onWriteMission={writeMapMission}
                  onScale={setMapScale}
                  onPointSize={setMapPointSize}
                  onNames={setMapNames}
                  onShowAll={setMapAllThreads}
                  onSpace={spaceMapPoints}
                  onClose={() => setMapWindowOpen(false)}
                />
                )}
              </div>
              {mapWindowOpen ? null : (
                <button
                  type="button"
                  onClick={() => setMapWindowOpen(true)}
                  aria-label="Show map window"
                  title="Show map window"
                  className="pointer-events-auto absolute top-[11.5rem] left-0 flex h-24 w-9 items-center justify-center rounded-r-xl border border-l-0 border-line bg-card text-ink-soft shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)] transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <ChevronRight className="size-5" aria-hidden="true" />
                </button>
              )}
            </>
          ) : null}
          <div
            inert={!goalsPanelOpen}
            aria-hidden={!goalsPanelOpen}
            className={`pointer-events-none absolute top-[11.5rem] right-4 bottom-24 flex transition-transform duration-300 ease-out motion-reduce:transition-none ${
              goalsPanelOpen ? "translate-x-0" : "translate-x-[calc(100%+1.5rem)]"
            }`}
          >
            {graphOn ? (
              <GraphSettingsWindow
                rings={rings}
                tags={graphTags}
                filter={graphFilter}
                showText={graphShowText}
                small={graphSmall}
                shown={graphShown}
                total={notes.length}
                onFilter={setGraphFilter}
                onShowText={setGraphShowText}
                onSmall={setGraphSmall}
                onClose={() => setGoalsPanelOpen(false)}
              />
            ) : (
            <GoalsPanel
              view={goalView}
              notes={notes}
              rings={rings}
              missionText={missionText}
              hoverId={dropHover}
              focusRing={mapFocus}
              selectedId={mapSelected}
              onFocusRing={focusMapRing}
              onSelectPoint={setMapSelected}
              onAddRing={addMapRing}
              onRemoveRing={removeMapRing}
              onClose={() => setGoalsPanelOpen(false)}
              onRemoveLevel={untagCard}
            />
            )}
          </div>
          {goalsPanelOpen ? null : (
            <button
              type="button"
              onClick={() => setGoalsPanelOpen(true)}
              aria-label="Show goals window"
              title="Show goals window"
              className="pointer-events-auto absolute top-[11.5rem] right-0 flex h-24 w-9 items-center justify-center rounded-l-xl border border-r-0 border-line bg-card text-ink-soft shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)] transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
          )}
        </>
      ) : null}

      {mode === "labels" ? (
        <>
          <div
            inert={!labelsOpen}
            aria-hidden={!labelsOpen}
            className={`pointer-events-none absolute top-[11.5rem] right-4 bottom-24 flex transition-transform duration-300 ease-out motion-reduce:transition-none ${
              labelsOpen ? "translate-x-0" : "translate-x-[calc(100%+1.5rem)]"
            }`}
          >
            {labelView === "budget" ? (
              <BudgetPanel
                notes={notes}
                selectedIds={selectedIds}
                onClose={() => setLabelsOpen(false)}
              />
            ) : (
            <LabelsPanel
              view={labelView}
              setId={sectorState.setId}
              sectors={sectorState.sectors}
              notes={notes}
              selectedIds={selectedIds}
              usedByOtherView={sectorState.usedByOtherView}
              openSector={sectorState.openSector}
  dropOver={dropHover === "panel"}
  wheelOnly={sectorState.wheelOnly}
  onWheelOnly={sectorState.setWheelOnly}
  onOpenSector={(id) => (id ? openSectorWindow(id) : sectorState.closeSector())}
              onSetId={sectorState.setSetId}
              onAdd={sectorState.addSector}
              onRename={sectorState.renameSector}
              onRemove={sectorState.removeSector}
              onToggle={sectorState.setOnCards}
              onScore={sectorState.setScore}
              onClose={() => setLabelsOpen(false)}
            />
            )}
          </div>
          {labelsOpen ? null : (
            <button
              type="button"
              onClick={() => setLabelsOpen(true)}
              aria-label="Show labels window"
              title="Show labels window"
              className="pointer-events-auto absolute top-[11.5rem] right-0 flex h-24 w-9 items-center justify-center rounded-l-xl border border-r-0 border-line bg-card text-ink-soft shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)] transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
          )}
        </>
      ) : null}

      {showInspector ? (
        <div className="pointer-events-none absolute top-[11.5rem] right-4 bottom-24 flex">
          <TaskPanel
            note={selectedNote}
            notes={notes}
            missionText={missionText}
            labelLists={labelLists}
            onSave={saveCard}
          />
        </div>
      ) : null}

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 ${graphOn ? "hidden" : ""}`}
      >
        <ZoomControls
          zoom={view.zoom}
          canZoomIn={view.zoom < MAX_ZOOM}
          canZoomOut={view.zoom > MIN_ZOOM}
          onZoomIn={() => zoomAtCenter(ZOOM_STEP)}
          onZoomOut={() => zoomAtCenter(1 / ZOOM_STEP)}
          onReset={() => zoomAtCenter(1 / view.zoom)}
          onFit={() => (mapOn && goalMapCenter ? fitMap(mapFocus) : fitAll())}
        />
        {mapOn || graphOn ? null : (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <CardDock color={dockColor} onColorChange={setDockColor} onDrop={dropFromDock} onPlaceCenter={placeAtCenter} />
          </div>
        )}
        {boardLinksOn ? (
          <div className="pointer-events-none flex max-w-72 flex-col items-end gap-2">
            {linkNotice ? (
              <p
                role="status"
                className="pointer-events-auto rounded-lg border border-line bg-board/95 px-3 py-2 text-xs leading-relaxed text-ink shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)] backdrop-blur"
              >
                {linkNotice}
              </p>
            ) : null}
            <button
              type="button"
              aria-pressed={allBoardLinks}
              onClick={() => setAllBoardLinks((on) => !on)}
              className={clsx(
                "pointer-events-auto rounded-xl border px-3 py-2 text-xs font-medium shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)] backdrop-blur transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                allBoardLinks ? "border-accent bg-accent text-board" : "border-line bg-board/95 text-ink-soft hover:bg-desk hover:text-ink",
              )}
            >
              Show every line
            </button>
          </div>
        ) : (
          <span aria-hidden="true" />
        )}
      </div>

      {missionOpen && mode === "mission" ? (
        <MissionWindow initialText={missionText} onSave={saveMission} onCancel={closeMission} />
      ) : null}

      {graphMissionOpen && graphOn ? (
  <MissionWindow initialText={missionText} onSave={saveGraphMission} onCancel={closeGraphMission} />
  ) : null}
  
  {missionReadOpen && goalsOn && missionText.length > 0 ? (
        <MissionReadWindow text={missionText} onClose={closeMissionRead} />
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
          dockColor={dockColor}
          tagColors={sectorState.tagColors}
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
          goalAbove={
  goalRingOf(menuNote, rings) < 0
  ? undefined
  : {
  values: goalLinks(menuNote, new Map(notes.map((n) => [n.id, n])), rings),
  options: [
  { id: "mission", label: "The mission" },
  ...notes
  .filter((n) => n.id !== menuNote.id && goalRingOf(n, rings) >= 0 && goalRingOf(n, rings) < goalRingOf(menuNote, rings))
  .map((n) => ({ id: n.id, label: n.text.trim().slice(0, 48) || "Untitled card" })),
  ],
  onChange: (values) => updateNote(menuNote.id, (note) => ({ ...note, parentIds: values })),
  }
  }
  fields={{
            text: menuNote.text,
            onText: (text) => updateNote(menuNote.id, (note) => ({ ...note, text })),
            level: goalLevelOf(menuNote, rings) ?? "",
            levels: GOAL_LEVELS.map((level) => ({ tag: level.tag, name: level.name })),
            onLevel: (tag) => updateNote(menuNote.id, (note) => setGoalLevel(note, tag, rings)),
          }}
          showEditWords={!mapOn && !graphOn}
          onEdit={() => startEdit(menuNote.id)}
          onDelete={() => deleteNote(menuNote.id)}
        />
      ) : null}
    </main>
  )
}
