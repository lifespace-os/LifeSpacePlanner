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

export type WorkspaceLife = {
  /** yyyy-mm-dd, or an empty string before a date is entered. */
  birthDate: string
  /** How many years the weeks grid covers. */
  years: number
}

export const LIFE_YEARS_MIN = 1
export const LIFE_YEARS_MAX = 120
export const DEFAULT_LIFE: WorkspaceLife = { birthDate: "", years: 90 }

export type WorkspaceDoc = {
  version: 1
  revision: number
  missionText: string
  notes: Note[]
  rings: GoalRing[]
  kanban: WorkspaceKanban
  board: WorkspaceBoard
  /** Absent in files saved before Settings existed. */
  life?: WorkspaceLife
}

export type WorkspaceSliceKey = "missionText" | "notes" | "rings" | "kanban" | "board" | "life"

export const SAMPLE_MISSION = "I live strong and healthy, close to the people I love, with time left for what I enjoy."

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
    missionText: SAMPLE_MISSION,
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
  if (value.life !== undefined && !isLife(value.life)) return fail("The life in weeks settings in the file are not valid.")
  return { ok: true, doc: value as WorkspaceDoc }
}

function isLife(value: unknown): value is WorkspaceLife {
  if (!isRecord(value)) return false
  const dateOk = typeof value.birthDate === "string" && (value.birthDate === "" || /^\d{4}-\d{2}-\d{2}$/.test(value.birthDate))
  return dateOk && isInteger(value.years) && value.years >= LIFE_YEARS_MIN && value.years <= LIFE_YEARS_MAX
}

const SAMPLE_NOTE_TEXT = new Map(SAMPLE_NOTES.map((note) => [note.id, note.text]))
const SAMPLE_CARD_TITLE = new Map(defaultCards().map((card) => [card.id, card.title]))

/** The sample story is on the board while any of its cards is still there. */
export function sampleStoryOn(doc: WorkspaceDoc) {
  return doc.notes.some((note) => SAMPLE_NOTE_TEXT.has(note.id)) || doc.kanban.cards.some((card) => SAMPLE_CARD_TITLE.has(card.id))
}

/** A card the person added, or a sample card whose words they changed. */
export function hasWrittenCards(doc: WorkspaceDoc) {
  const noteWritten = doc.notes.some((note) => SAMPLE_NOTE_TEXT.get(note.id) !== note.text)
  const cardWritten = doc.kanban.cards.some((card) => SAMPLE_CARD_TITLE.get(card.id) !== card.title)
  return noteWritten || cardWritten
}

/** Replaces the whiteboard cards and kanban tasks with the sample story. Columns, rings and the life settings stay. */
export function withSampleStory(doc: WorkspaceDoc): WorkspaceDoc {
  const cards = defaultCards().map((card) => {
    const columns = doc.kanban.columnsByBoard[card.boardId]
    if (columns.some((column) => column.id === card.columnId)) return card
    return { ...card, columnId: columns[0]?.id ?? card.columnId }
  })
  return {
    ...doc,
    missionText: doc.missionText.trim() ? doc.missionText : SAMPLE_MISSION,
    notes: structuredClone(SAMPLE_NOTES),
    kanban: { ...doc.kanban, cards },
    board: { ...doc.board, graphSpots: {}, graphBoxes: {} },
  }
}

/** Clears the whiteboard cards and kanban tasks. A mission sentence the person wrote stays. */
export function withEmptyBoard(doc: WorkspaceDoc): WorkspaceDoc {
  return {
    ...doc,
    missionText: doc.missionText === SAMPLE_MISSION ? "" : doc.missionText,
    notes: [],
    kanban: { ...doc.kanban, cards: [] },
    board: { ...doc.board, graphSpots: {}, graphBoxes: {} },
  }
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
    Array.isArray(value.goalIds) &&
    (value.steps === undefined || (Array.isArray(value.steps) && value.steps.every(isStep))) &&
    (value.repeat === undefined || isRepeat(value.repeat)) &&
    (value.occurrence === undefined || typeof value.occurrence === "number")
  )
}

function isRepeat(value: unknown): boolean {
  return (
    isRecord(value) &&
    (value.mode === "once" || value.mode === "times" || value.mode === "forever") &&
    typeof value.times === "number" &&
    (value.rhythm === "daily" || value.rhythm === "weekly" || value.rhythm === "monthly") &&
    Array.isArray(value.weekdays) &&
    value.weekdays.every((day) => typeof day === "number") &&
    typeof value.monthDay === "number"
  )
}

function isStep(value: unknown): boolean {
  return isRecord(value) && typeof value.id === "string" && typeof value.text === "string" && typeof value.done === "boolean"
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
