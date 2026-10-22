import { BUILT_IN_RINGS, getGoalLevel, goalLevelOf, goalRingOf, type Note } from "@/lib/board-data"
import { addDays, daysBetween, monthName, shortDate, weekDays } from "@/lib/calendar"
import type { Translate } from "@/lib/i18n"
import type { KanbanCard } from "@/lib/kanban-data"

export const DAY_WIDTH = 28
const MIN_DAYS = 56

/** A task with a start and an end date is a bar. With only an end date it is a point. With neither it is not drawn. */
export type TaskShape =
  | { kind: "bar"; from: string; to: string }
  | { kind: "point"; day: string }
  | { kind: "none" }

export function shapeOf(card: Pick<KanbanCard, "since" | "due">): TaskShape {
  if (card.since && card.due) {
    return card.since <= card.due ? { kind: "bar", from: card.since, to: card.due } : { kind: "bar", from: card.due, to: card.since }
  }
  return card.due ? { kind: "point", day: card.due } : { kind: "none" }
}

export type DatePatch = Pick<KanbanCard, "since" | "due">

/** Moving a bar shifts both dates by the same number of days. */
export function movePatch(shape: Extract<TaskShape, { kind: "bar" }>, days: number): DatePatch {
  return { since: addDays(shape.from, days), due: addDays(shape.to, days) }
}

/** Stretching a point keeps its day fixed and gives it a start (dragged left) or a later end (dragged right). */
export function stretchPatch(anchor: string, days: number): DatePatch {
  if (days < 0) return { since: addDays(anchor, days), due: anchor }
  if (days > 0) return { since: anchor, due: addDays(anchor, days) }
  return { since: "", due: anchor }
}

/** The first Monday on or before the earliest date, and how many days the chart covers. */
export function chartRange(days: string[], today: string) {
  const sorted = [...days, today].sort()
  const start = weekDays(addDays(sorted[0]!, -7))[0]!
  const end = addDays(sorted[sorted.length - 1]!, 21)
  const count = Math.ceil(Math.max(MIN_DAYS, daysBetween(start, end) + 1) / 7) * 7
  return { start, count }
}

export function monthSpans(start: string, count: number, locale = "en-US") {
  const spans: { key: string; label: string; offset: number; days: number }[] = []
  for (let offset = 0; offset < count; offset += 1) {
    const day = addDays(start, offset)
    const key = day.slice(0, 7)
    const last = spans[spans.length - 1]
    if (last?.key === key) last.days += 1
    else spans.push({ key, label: `${monthName(day, locale)} ${day.slice(0, 4)}`, offset, days: 1 })
  }
  return spans
}

export function describeShape(shape: TaskShape, t: Translate, locale = "en-US") {
  if (shape.kind === "bar") {
    if (shape.from === shape.to) return shortDate(shape.from, locale)
    return t("gantt.shape.range", { from: shortDate(shape.from, locale), to: shortDate(shape.to, locale) })
  }
  if (shape.kind === "point") return t("gantt.shape.point", { day: shortDate(shape.day, locale) })
  return t("gantt.shape.none")
}

/** `levelTag` and an empty `text` are translated by the screen: the tag names a goal level, the empty text means no title. */
export type GoalRow = { id: string; levelTag: string | null; text: string; taskCount: number }

export type LadderSection = { id: string; name: string; rows: GoalRow[] }

/** The goal rows between the mission and the tasks, ring by ring from the mission outward. */
export function ladderSections(notes: Note[], taskCounts: Map<string, number>): LadderSection[] {
  return BUILT_IN_RINGS.filter((ring) => ring.id !== "tasks").map((ring, index) => {
    const order = (note: Note) => ring.tags.indexOf(goalLevelOf(note) ?? "")
    const rows = notes
      .filter((note) => goalRingOf(note) === index)
      .sort((a, b) => order(a) - order(b) || a.z - b.z)
      .map((note) => ({
        id: note.id,
        levelTag: getGoalLevel(goalLevelOf(note))?.tag ?? null,
        text: note.text.trim() || note.task?.title || "",
        taskCount: taskCounts.get(note.id) ?? 0,
      }))
    return { id: ring.id, name: ring.name, rows }
  })
}
