import { formatTimeRange, resultKey, type KanbanBoardId, type KanbanCard, type KanbanColumn } from "@/lib/kanban-data"

export type CalendarMode = "day" | "week" | "month" | "year"

export const CALENDAR_MODES: { id: CalendarMode }[] = [{ id: "day" }, { id: "week" }, { id: "month" }, { id: "year" }]

const DAY_MS = 86_400_000
const TIME_PATTERN = /^\d{2}:\d{2}$/

function utc(iso: string) {
  const [year, month, day] = iso.split("-").map(Number)
  return Date.UTC(year!, month! - 1, day!)
}

export function isoOf(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number) {
  return new Date(utc(iso) + days * DAY_MS).toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string) {
  return Math.round((utc(to) - utc(from)) / DAY_MS)
}

export function addMonths(iso: string, months: number) {
  const [year, month, day] = iso.split("-").map(Number)
  const target = new Date(Date.UTC(year!, month! - 1 + months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  return isoOf(target.getUTCFullYear(), target.getUTCMonth() + 1, Math.min(day!, lastDay))
}

/** Monday is 0 and Sunday is 6. */
function weekdayIndex(iso: string) {
  return (new Date(utc(iso)).getUTCDay() + 6) % 7
}

export function weekDays(iso: string) {
  const start = addDays(iso, -weekdayIndex(iso))
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

/** The weeks of a month, Monday first, padded with days of the months either side. */
export function monthWeeks(year: number, month: number) {
  const last = isoOf(year, month + 1, 0)
  const weeks: string[][] = []
  let start = weekDays(isoOf(year, month, 1))[0]!
  while (start <= last) {
    weeks.push(Array.from({ length: 7 }, (_, index) => addDays(start, index)))
    start = addDays(start, 7)
  }
  return weeks
}

const DEFAULT_LOCALE = "en-US"

function format(iso: string, options: Intl.DateTimeFormatOptions, locale: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale, { ...options, timeZone: "UTC" })
}

/** Short weekday names, Monday first, in the language's own words. */
export function weekdayNames(locale: string = DEFAULT_LOCALE) {
  return weekDays("2024-01-01").map((day) => format(day, { weekday: "short" }, locale))
}

export function longDate(iso: string, locale: string = DEFAULT_LOCALE) {
  return format(iso, { weekday: "long", month: "long", day: "numeric", year: "numeric" }, locale)
}

export function weekdayLong(iso: string, locale: string = DEFAULT_LOCALE) {
  return format(iso, { weekday: "long" }, locale)
}

export function shortDate(iso: string, locale: string = DEFAULT_LOCALE) {
  return format(iso, { weekday: "short", month: "short", day: "numeric" }, locale)
}

export function monthName(iso: string, locale: string = DEFAULT_LOCALE) {
  return format(iso, { month: "long" }, locale)
}

export function hourLabel(hour: number, locale: string = DEFAULT_LOCALE) {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", timeZone: "UTC" }).format(Date.UTC(2000, 0, 1, hour))
}

/** The heading over the grid for the day, week, month, or year being shown. */
export function rangeTitle(mode: CalendarMode, focus: string, locale: string = DEFAULT_LOCALE) {
  if (mode === "day") return longDate(focus, locale)
  if (mode === "year") return focus.slice(0, 4)
  if (mode === "month") return format(focus, { month: "long", year: "numeric" }, locale)
  const days = weekDays(focus)
  const first = days[0]!
  const last = days[6]!
  const monthDay = { month: "short", day: "numeric" } as const
  if (first.slice(0, 4) !== last.slice(0, 4)) {
    const withYear = { ...monthDay, year: "numeric" } as const
    return `${format(first, withYear, locale)} – ${format(last, withYear, locale)}`
  }
  if (first.slice(0, 7) !== last.slice(0, 7)) {
    return `${format(first, monthDay, locale)} – ${format(last, monthDay, locale)}, ${last.slice(0, 4)}`
  }
  return `${format(first, monthDay, locale)} – ${format(last, { day: "numeric" }, locale)}, ${last.slice(0, 4)}`
}

/** Where the arrows take the grid: a day, a week, a month, or a year at a time. */
export function shiftFocus(mode: CalendarMode, focus: string, direction: 1 | -1) {
  if (mode === "day") return addDays(focus, direction)
  if (mode === "week") return addDays(focus, 7 * direction)
  return addMonths(focus, (mode === "month" ? 1 : 12) * direction)
}

/** One task on the calendar. Copies of it on other boards are the same task and are written together. */
export type CalendarTask = {
  /** The card the calendar opens and drags. */
  id: string
  /** Every card that is this task, across boards. */
  ids: string[]
  card: KanbanCard
  done: boolean
  /** First day, yyyy-mm-dd. Empty when the task has no date. */
  first: string
  /** Last day. The same as `first` for a one-day task. */
  last: string
}

export function calendarTasks(
  cards: KanbanCard[],
  columnsByBoard: Record<KanbanBoardId, KanbanColumn[]>,
): CalendarTask[] {
  const isDone = (card: KanbanCard) =>
    columnsByBoard[card.boardId]?.find((column) => column.id === card.columnId)?.kind === "done"
  const groups = new Map<string, KanbanCard[]>()
  for (const card of cards) {
    if (card.inResults) continue
    const key = resultKey(card)
    groups.set(key, [...(groups.get(key) ?? []), card])
  }
  return [...groups.values()].map((copies) => {
    const [card] = [...copies].sort(
      (a, b) => Number(isDone(a)) - Number(isDone(b)) || Number(!a.since) - Number(!b.since),
    )
    const first = card!.since || card!.due
    const lastRaw = card!.due || card!.since
    return {
      id: card!.id,
      ids: copies.map((copy) => copy.id),
      card: card!,
      done: copies.every(isDone),
      first,
      last: lastRaw < first ? first : lastRaw,
    }
  })
}

export function coversDay(task: CalendarTask, day: string) {
  return task.first !== "" && task.first <= day && day <= task.last
}

/** A task takes an hour slot only on its first day, and only when it has a start time. */
export function isTimedOn(task: CalendarTask, day: string) {
  return TIME_PATTERN.test(task.card.startTime) && day === task.first
}

function minutesOf(time: string) {
  const [hours, minutes] = time.split(":").map(Number)
  return hours! * 60 + minutes!
}

function timeOf(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
}

/** Minutes after midnight the task covers on its first day. One hour when it has no usable end time. */
export function slotRange(task: CalendarTask) {
  const start = minutesOf(task.card.startTime)
  const end =
    TIME_PATTERN.test(task.card.endTime) && task.last === task.first ? minutesOf(task.card.endTime) : start + 60
  return { start, end: Math.min(end > start ? end : start + 60, 1440) }
}

/** Timed tasks first by start time, then the others by title. */
export function sortForDay(tasks: CalendarTask[], day: string) {
  return [...tasks].sort((a, b) => {
    const aTimed = isTimedOn(a, day)
    const bTimed = isTimedOn(b, day)
    if (aTimed !== bTimed) return aTimed ? -1 : 1
    if (aTimed && bTimed) return slotRange(a).start - slotRange(b).start
    return a.card.title.localeCompare(b.card.title)
  })
}

/** Where a task was dropped: an hour slot, the list of tasks with no time, or a day cell of the date grid. */
export type DropSlot = { kind: "hour"; hour: number } | { kind: "list" } | { kind: "day" }

export type SchedulePatch = Pick<KanbanCard, "since" | "due" | "startTime" | "endTime">

/**
 * What a drop writes. An hour slot sets the date, the start time, and an end time (the task's own length, or one hour).
 * The list of tasks with no time sets the date and clears the times. A day cell sets the date and keeps the times.
 * A task that spans several days keeps its length.
 */
export function dropPatch(card: KanbanCard, day: string, slot: DropSlot): SchedulePatch {
  const span = card.since && card.due && card.due > card.since ? daysBetween(card.since, card.due) : 0
  if (slot.kind === "hour") {
    const start = slot.hour * 60
    const own =
      span === 0 && TIME_PATTERN.test(card.startTime) && TIME_PATTERN.test(card.endTime)
        ? minutesOf(card.endTime) - minutesOf(card.startTime)
        : 0
    const length = own > 0 ? own : 60
    return {
      since: day,
      due: span > 0 ? addDays(day, span) : day,
      startTime: timeOf(start),
      endTime: span > 0 ? card.endTime : timeOf(Math.min(start + length, 1439)),
    }
  }
  const dates: Pick<SchedulePatch, "since" | "due"> = card.since
    ? { since: day, due: card.due ? addDays(day, span) : "" }
    : { since: "", due: day }
  return slot.kind === "list" ? { ...dates, startTime: "", endTime: "" } : { ...dates, startTime: card.startTime, endTime: card.endTime }
}

export function samePatch(card: KanbanCard, patch: SchedulePatch) {
  return (
    card.since === patch.since &&
    card.due === patch.due &&
    card.startTime === patch.startTime &&
    card.endTime === patch.endTime
  )
}

/** "Tue, Oct 20, 9:00 AM – 10:00 AM" for the line that tells the person what a drop wrote. */
export function describeDrop(
  day: string,
  patch: SchedulePatch,
  locale: string = DEFAULT_LOCALE,
  words?: Parameters<typeof formatTimeRange>[3],
) {
  const range = formatTimeRange(patch.startTime, patch.endTime, locale, words)
  return range ? `${shortDate(day, locale)}, ${range}` : shortDate(day, locale)
}
