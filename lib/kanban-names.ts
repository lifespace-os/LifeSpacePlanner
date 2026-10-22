import type { IkigaiCircleId } from "@/lib/board-data"
import { CIRCLE_KEYS, type Msg } from "@/lib/card-search"
import type { MessageKey, Translate } from "@/lib/i18n"
import type { KanbanBoardId, KanbanColumn } from "@/lib/kanban-data"

/** The English names the columns start with. A column still carrying its original name shows it in the chosen language. */
const ORIGINAL_COLUMN_NAMES: Record<string, string> = {
  backlog: "Backlog",
  week: "This week",
  tomorrow: "To do, tomorrow",
  today: "To do, today",
  mine: "In progress, my move",
  theirs: "In progress, their move",
  deferred: "Deferred",
  done: "Done",
  todo: "To do",
  doing: "In progress",
}

/** A renamed column keeps the person's own words. */
export function columnLabel(t: Translate, column: Pick<KanbanColumn, "id" | "name">) {
  const original = ORIGINAL_COLUMN_NAMES[column.id]
  return original !== undefined && column.name === original ? t(`column.${column.id}` as MessageKey) : column.name
}

export function boardLabel(t: Translate, boardId: KanbanBoardId) {
  return t(`board.${boardId}` as MessageKey)
}

/** Puts a search message into the chosen language, with circle and column names translated. */
export function searchMessage(t: Translate, message: Msg) {
  const vars: Record<string, string | number> = { ...(message.vars ?? {}) }
  if (typeof vars.circleId === "string") vars.circle = t(CIRCLE_KEYS[vars.circleId as IkigaiCircleId])
  if (typeof vars.columnId === "string") {
    vars.column = columnLabel(t, { id: vars.columnId, name: String(vars.column ?? "") })
  }
  return t(message.key, vars)
}

/** "Whiteboard" for a note, otherwise the board and the column of the task. */
export function placeLabel(
  t: Translate,
  place: { boardId: KanbanBoardId; column: Pick<KanbanColumn, "id" | "name"> | null } | null,
) {
  if (!place) return t("search.place.whiteboard")
  const board = boardLabel(t, place.boardId)
  return place.column ? `${board} · ${columnLabel(t, place.column)}` : board
}
