import { BUILT_IN_RINGS, goalRingOf, type GoalRing, type Note } from "@/lib/board-data"
import { addDays, weekDays } from "@/lib/calendar"
import { resultKey, type CardOrigin, type KanbanBoardId, type KanbanCard, type KanbanColumn } from "@/lib/kanban-data"
import { belowIds, ringCardsOf } from "@/lib/ring-focus"

/** The Want or Must zone, the Keep or Release mark, and the goal ring a whiteboard card has right now. */
export function originOf(note: Note, rings: GoalRing[] = BUILT_IN_RINGS): CardOrigin {
  const tags = note.hashtags.map((tag) => tag.toLowerCase())
  const zone = tags.includes("must") ? "must" : tags.includes("want") ? "want" : null
  return { zone, choice: note.mission, ringId: rings[goalRingOf(note, rings)]?.id ?? null }
}

type ColumnsByBoard = Record<KanbanBoardId, KanbanColumn[]>

/** One task. Copies kept on several boards count once, the way the Kanban counts them. */
export type TaskState = {
  key: string
  title: string
  finished: boolean
  inResults: boolean
  doneAt: string | null
  fromCard: CardOrigin | null
  goalIds: string[]
}

export function taskStates(cards: KanbanCard[], columnsByBoard: ColumnsByBoard): TaskState[] {
  const tasks = new Map<string, TaskState>()
  for (const card of cards) {
    const key = resultKey(card)
    const kind = columnsByBoard[card.boardId]?.find((column) => column.id === card.columnId)?.kind
    const finished = card.inResults || kind === "done"
    const before = tasks.get(key)
    const doneAt = finished ? (card.doneAt ?? null) : null
    tasks.set(key, {
      key,
      title: before?.title ?? card.title,
      finished: (before?.finished ?? false) || finished,
      inResults: (before?.inResults ?? false) || card.inResults,
      doneAt: before?.doneAt && doneAt ? (before.doneAt > doneAt ? before.doneAt : doneAt) : (before?.doneAt ?? doneAt),
      fromCard: before?.fromCard ?? card.fromCard ?? null,
      goalIds: [...(before?.goalIds ?? []), ...card.goalIds],
    })
  }
  return [...tasks.values()]
}

export type FinishedCounts = { today: number; week: number; month: number; all: number; undated: number }

/** Finished tasks, in Done or on Results. Tasks and nothing else: no hours, no tasks that were only started. */
export function finishedCounts(tasks: TaskState[], today: string): FinishedCounts {
  const week = weekDays(today)
  const first = week[0]
  const last = week[week.length - 1]
  const result: FinishedCounts = { today: 0, week: 0, month: 0, all: 0, undated: 0 }
  for (const task of tasks) {
    if (!task.finished) continue
    result.all += 1
    if (!task.doneAt) {
      result.undated += 1
      continue
    }
    if (task.doneAt === today) result.today += 1
    if (task.doneAt >= first && task.doneAt <= last) result.week += 1
    if (task.doneAt.slice(0, 7) === today.slice(0, 7)) result.month += 1
  }
  return result
}

export type FlowStep = { id: string; name: string; count: number; share: number }

export type Flow = {
  steps: FlowStep[]
  released: { count: number; share: number }
  /** The share of Unload that reached Results. */
  effectiveness: number
}

/**
 * Unload is every card on the whiteboard plus every task made from a card. The other steps count how many of those
 * reached them. A card may skip a step, so each step stands on its own against Unload.
 */
export function flowOf(notes: Note[], rings: GoalRing[], tasks: TaskState[]): Flow {
  const made = tasks.filter((task) => task.fromCard)
  const marks = [...notes.map((note) => originOf(note, rings)), ...made.map((task) => task.fromCard as CardOrigin)]
  const unload = marks.length
  const share = (count: number) => (unload === 0 ? 0 : count / unload)
  const counts: [string, string, number][] = [
    ["unload", "Unload", unload],
    ["zone", "Want or Must", marks.filter((mark) => mark.zone !== null).length],
    ["keep", "Keep", marks.filter((mark) => mark.choice === "keep").length],
    ["ring", "On a goal ring", marks.filter((mark) => mark.ringId !== null).length],
    ["task", "Task on the Kanban", made.length],
    ["done", "Done", made.filter((task) => task.finished).length],
    ["results", "Results", made.filter((task) => task.inResults).length],
  ]
  const released = marks.filter((mark) => mark.choice === "release").length
  return {
    steps: counts.map(([id, name, count]) => ({ id, name, count, share: share(count) })),
    released: { count: released, share: share(released) },
    effectiveness: share(made.filter((task) => task.inResults).length),
  }
}

/** Done and total tasks under each ring card, copies counted once. */
export function goalTaskCounts(tasks: TaskState[], notes: Note[], rings: GoalRing[]): Record<string, { done: number; total: number }> {
  const result: Record<string, { done: number; total: number }> = {}
  for (const note of ringCardsOf(notes, rings)) {
    const subtree = belowIds(note.id, notes, rings)
    let done = 0
    let total = 0
    for (const task of tasks) {
      if (!task.goalIds.some((id) => subtree.has(id))) continue
      total += 1
      if (task.finished) done += 1
    }
    result[note.id] = { done, total }
  }
  return result
}

export type WeeklyReview = {
  finished: string
  moved: string
  keep: string
  change: string
  stop: string
  savedAt: string
}

/** Reviews by the Monday of their week, yyyy-mm-dd. */
export type WeeklyReviews = Record<string, WeeklyReview>

export const REVIEW_FIELDS: { id: Exclude<keyof WeeklyReview, "savedAt">; label: string; hint: string }[] = [
  { id: "finished", label: "What was finished", hint: "The tasks and small wins of this week." },
  { id: "moved", label: "What moved to another day", hint: "What did not fit, and where it goes now." },
  { id: "keep", label: "What to keep", hint: "A habit or a way of working that helped." },
  { id: "change", label: "What to change", hint: "One thing to do differently next week." },
  { id: "stop", label: "What to stop", hint: "Something that costs more than it gives." },
]

export function emptyReview(): Omit<WeeklyReview, "savedAt"> {
  return { finished: "", moved: "", keep: "", change: "", stop: "" }
}

export function isReviews(value: unknown): value is WeeklyReviews {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  return Object.entries(value).every(([week, review]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || typeof review !== "object" || review === null) return false
    const item = review as Record<string, unknown>
    return [...REVIEW_FIELDS.map((field) => field.id), "savedAt"].every((key) => typeof item[key] === "string")
  })
}

export function weekStart(iso: string) {
  return weekDays(iso)[0]
}

export function weekEnd(iso: string) {
  return weekDays(iso)[6]
}

export function shiftWeek(iso: string, direction: 1 | -1) {
  return addDays(weekStart(iso), 7 * direction)
}

/** The titles of the tasks finished in the week that starts on the given Monday. */
export function finishedTitles(tasks: TaskState[], monday: string) {
  const sunday = addDays(monday, 6)
  return tasks.filter((task) => task.finished && task.doneAt && task.doneAt >= monday && task.doneAt <= sunday).map((task) => task.title)
}

export function percent(share: number) {
  return `${Math.round(share * 100)}%`
}
