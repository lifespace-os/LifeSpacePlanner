import {
  BUDGET_ZONE_GAP,
  BUDGET_ZONE_SIZE,
  BUILT_IN_RINGS,
  DEFAULT_GROUPS,
  DEFAULT_ZONES,
  SAMPLE_NOTES,
  startingSectorLists,
  type BudgetZones,
  type GoalRing,
  type Group,
  type Note,
  type Sector,
  type SectorListId,
  type SphereSetId,
  type Zones,
} from "@/lib/board-data"
import type { GraphBox, GraphSpot } from "@/lib/graph-layout"
import {
  KANBAN_BOARDS,
  defaultCards,
  defaultColumns,
  type ColumnKind,
  type KanbanBoardId,
  type KanbanCard,
  type KanbanColumn,
} from "@/lib/kanban-data"

/** One address for the workspace. A later server can answer the same path. */
export const WORKSPACE_URL = "/api/workspace"

export type WorkspaceBoard = {
  zones: Zones
  budgetZones: BudgetZones
  groups: Group[]
  sectorLists: Record<SectorListId, Sector[]>
  sphereSetId: SphereSetId
  graphSpots: Record<string, GraphSpot>
  graphBoxes: Record<string, GraphBox>
}

export type WorkspaceKanban = {
  cards: KanbanCard[]
  columnsByBoard: Record<KanbanBoardId, KanbanColumn[]>
}

export type WorkspaceDoc = {
  version: 1
  revision: number
  missionText: string
  notes: Note[]
  rings: GoalRing[]
  kanban: WorkspaceKanban
  board: WorkspaceBoard
}

export type WorkspaceSliceKey = "missionText" | "notes" | "rings" | "kanban" | "board"

const BOARD_IDS = KANBAN_BOARDS.map((board) => board.id)
const COLUMN_KINDS: ColumnKind[] = ["todo", "progress", "later", "done"]
const SPHERE_SETS: SphereSetId[] = ["five", "seven", "eight", "ten"]
const SECTOR_LISTS: SectorListId[] = ["five", "seven", "eight", "ten", "happiness"]

export function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

/** The cards and places shown before anything has been saved. */
export function demoWorkspace(): WorkspaceDoc {
  return {
    version: 1,
    revision: 0,
    missionText: "",
    notes: structuredClone(SAMPLE_NOTES),
    rings: structuredClone(BUILT_IN_RINGS),
    kanban: { cards: defaultCards(), columnsByBoard: defaultColumns() },
    board: {
      zones: structuredClone(DEFAULT_ZONES),
      budgetZones: {
        investment: { left: 0, top: 0, ...BUDGET_ZONE_SIZE },
        expense: { left: BUDGET_ZONE_SIZE.width + BUDGET_ZONE_GAP, top: 0, ...BUDGET_ZONE_SIZE },
      },
      groups: structuredClone(DEFAULT_GROUPS),
      sectorLists: startingSectorLists(),
      sphereSetId: "five",
      graphSpots: {},
      graphBoxes: {},
    },
  }
}

export function parseWorkspace(value: unknown): { ok: true; doc: WorkspaceDoc } | { ok: false; reason: string } {
  if (!isRecord(value)) return fail("The workspace file is not an object.")
  if (value.version !== 1) return fail("The workspace file needs version 1.")
  if (!isInteger(value.revision)) return fail("The workspace file is missing a revision.")
  if (typeof value.missionText !== "string") return fail("The workspace file is missing the mission sentence.")
  if (!isNoteList(value.notes)) return fail("The workspace file is missing the whiteboard cards.")
  if (!isRingList(value.rings)) return fail("The workspace file is missing the goal rings.")
  if (!isKanban(value.kanban)) return fail("The workspace file is missing the kanban.")
  if (!isBoard(value.board)) return fail("The workspace file is missing the board layout.")
  return { ok: true, doc: value as WorkspaceDoc }
}

function fail(reason: string) {
  return { ok: false as const, reason }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value)
}

function isZone(value: unknown): boolean {
  if (!isRecord(value)) return false
  return ["left", "top", "width", "height"].every((key) => typeof value[key] === "number" && Number.isFinite(value[key]))
}

function isNoteList(value: unknown): value is Note[] {
  return Array.isArray(value) && value.every(isNote)
}

function isNote(value: unknown): boolean {
  if (!isRecord(value)) return false
  return (
    typeof value.id === "string" &&
    typeof value.text === "string" &&
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    Array.isArray(value.hashtags)
  )
}

function isRingList(value: unknown): value is GoalRing[] {
  return (
    Array.isArray(value) &&
    value.every(
      (ring) =>
        isRecord(ring) &&
        typeof ring.id === "string" &&
        typeof ring.name === "string" &&
        Array.isArray(ring.tags) &&
        ring.tags.every((tag) => typeof tag === "string") &&
        typeof ring.width === "number" &&
        typeof ring.custom === "boolean",
    )
  )
}

function isKanban(value: unknown): value is WorkspaceKanban {
  if (!isRecord(value) || !Array.isArray(value.cards) || !isRecord(value.columnsByBoard)) return false
  if (!value.cards.every(isCard)) return false
  const columns = value.columnsByBoard
  return BOARD_IDS.every((id) => {
    const list = columns[id]
    return Array.isArray(list) && list.every(isColumn)
  })
}

function isCard(value: unknown): boolean {
  if (!isRecord(value)) return false
  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.columnId === "string" &&
    BOARD_IDS.some((id) => id === value.boardId) &&
    Array.isArray(value.goalIds)
  )
}

function isColumn(value: unknown): boolean {
  if (!isRecord(value)) return false
  return typeof value.id === "string" && typeof value.name === "string" && COLUMN_KINDS.some((kind) => kind === value.kind)
}

function isBoard(value: unknown): value is WorkspaceBoard {
  if (!isRecord(value)) return false
  if (!isRecord(value.zones) || !isZone(value.zones.want) || !isZone(value.zones.must)) return false
  if (!isRecord(value.budgetZones) || !isZone(value.budgetZones.investment) || !isZone(value.budgetZones.expense)) return false
  if (!Array.isArray(value.groups) || !value.groups.every(isGroup)) return false
  if (!isRecord(value.sectorLists)) return false
  const sectorLists = value.sectorLists
  if (!SECTOR_LISTS.every((id) => {
    const list = sectorLists[id]
    return Array.isArray(list) && list.every(isSector)
  })) {
    return false
  }
  if (!SPHERE_SETS.some((id) => id === value.sphereSetId)) return false
  if (!isSpotMap(value.graphSpots) || !isBoxMap(value.graphBoxes)) return false
  return true
}

function isGroup(value: unknown): boolean {
  return isRecord(value) && isZone(value) && typeof value.id === "string" && typeof value.name === "string" && typeof value.tag === "string"
}

function isSector(value: unknown): boolean {
  if (!isRecord(value)) return false
  return typeof value.id === "string" && typeof value.name === "string" && typeof value.color === "string"
}

function isSpotMap(value: unknown): value is Record<string, GraphSpot> {
  if (!isRecord(value)) return false
  return Object.values(value).every((spot) => isRecord(spot) && typeof spot.home === "string" && typeof spot.x === "number" && typeof spot.y === "number")
}

function isBoxMap(value: unknown): value is Record<string, GraphBox> {
  if (!isRecord(value)) return false
  return Object.values(value).every(
    (box) => isRecord(box) && ["x", "y", "width", "height"].every((key) => typeof box[key] === "number" && Number.isFinite(box[key])),
  )
}
