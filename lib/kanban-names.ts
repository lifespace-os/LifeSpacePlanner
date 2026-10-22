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
