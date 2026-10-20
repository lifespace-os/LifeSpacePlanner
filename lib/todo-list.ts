import { LABEL_GROUPS, getLabel, type Note } from "@/lib/board-data"
import type { CalendarTask } from "@/lib/calendar"
import type { KanbanCard } from "@/lib/kanban-data"

export type TodoSort = "due" | "goal" | "label"

export const TODO_SORTS: { id: TodoSort; name: string }[] = [
  { id: "due", name: "Due date" },
  { id: "goal", name: "Goal" },
  { id: "label", name: "Label" },
]

export type TodoRow = {
  task: CalendarTask
  /** The text of every goal card the task hangs under, whichever copy holds the link. */
  goals: string[]
  /** The task joins the mission without a goal card between. */
  viaMission: boolean
}

const LABEL_ORDER = new Map(
  LABEL_GROUPS.flatMap((group) => group.options).map((option, index) => [option.id, index] as const),
)

function goalText(note: Note) {
  return note.text.trim() || note.task?.title || "Untitled card"
}

export function todoRows(tasks: CalendarTask[], cards: KanbanCard[], notes: Note[]): TodoRow[] {
  const byId = new Map(cards.map((card) => [card.id, card]))
  const textOf = new Map(notes.map((note) => [note.id, goalText(note)]))
  return tasks.map((task) => {
    const copies = task.ids.map((id) => byId.get(id)).filter((card): card is KanbanCard => Boolean(card))
    const goals = [...new Set(copies.flatMap((card) => card.goalIds).map((id) => textOf.get(id)).filter(Boolean))] as string[]
    const viaMission = copies.some((card) => card.missionLink || card.secondLine)
    return { task, goals, viaMission }
  })
}

/** The words the Goal column shows. */
export function goalSummary(row: TodoRow) {
  if (row.goals.length > 0) return row.goals.join(", ")
  return row.viaMission ? "The mission" : ""
}

/** Empty values come last whichever way the rows are sorted. */
function compareFilled(a: string, b: string) {
  if (!a !== !b) return a ? -1 : 1
  return a.localeCompare(b)
}

export function sortRows(rows: TodoRow[], sort: TodoSort): TodoRow[] {
  const byDue = (a: TodoRow, b: TodoRow) => compareFilled(a.task.card.due, b.task.card.due)
  const byTitle = (a: TodoRow, b: TodoRow) => a.task.card.title.localeCompare(b.task.card.title)
  const primary = {
    due: byDue,
    goal: (a: TodoRow, b: TodoRow) => compareFilled(goalSummary(a).toLowerCase(), goalSummary(b).toLowerCase()),
    label: (a: TodoRow, b: TodoRow) => {
      const aOrder = LABEL_ORDER.get(a.task.card.labelId ?? "")
      const bOrder = LABEL_ORDER.get(b.task.card.labelId ?? "")
      if (aOrder === undefined || bOrder === undefined) {
        return aOrder === bOrder ? 0 : aOrder === undefined ? 1 : -1
      }
      return aOrder - bOrder
    },
  }[sort]
  return [...rows].sort((a, b) => primary(a, b) || byDue(a, b) || byTitle(a, b))
}

export function stepsOf(card: KanbanCard) {
  const steps = card.steps ?? []
  return { steps, done: steps.filter((step) => step.done).length }
}

export function labelName(card: KanbanCard) {
  return getLabel(card.labelId)?.name ?? ""
}
