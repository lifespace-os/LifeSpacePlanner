import { ONCE, type CardRepeat, type KanbanCard } from "@/lib/kanban-data"

const DAY_MS = 86_400_000

function parts(iso: string) {
  const [year, month, day] = iso.split("-").map(Number)
  return { year: year!, month: month!, day: day! }
}

function utc(iso: string) {
  const { year, month, day } = parts(iso)
  return Date.UTC(year, month - 1, day)
}

function addDays(iso: string, days: number) {
  return new Date(utc(iso) + days * DAY_MS).toISOString().slice(0, 10)
}

function daysBetween(from: string, to: string) {
  return Math.round((utc(to) - utc(from)) / DAY_MS)
}

function weekdayOf(iso: string) {
  return new Date(utc(iso)).getUTCDay()
}

function lastDayOf(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function isoOf(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10)
}

/** Today in the person's own time zone, yyyy-mm-dd. */
export function todayIso(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

/** The first date after `from` that fits the rhythm. `anchorDay` is the day of the month the monthly rhythm keeps. */
export function nextDate(from: string, repeat: CardRepeat, anchorDay: number) {
  if (repeat.rhythm === "weekly" && repeat.weekdays.length > 0) {
    for (let step = 1; step <= 7; step += 1) {
      const candidate = addDays(from, step)
      if (repeat.weekdays.includes(weekdayOf(candidate))) return candidate
    }
  }
  if (repeat.rhythm === "monthly") {
    const { year, month } = parts(from)
    for (let ahead = 0; ahead <= 1; ahead += 1) {
      const target = new Date(Date.UTC(year, month - 1 + ahead, 1))
      const y = target.getUTCFullYear()
      const m = target.getUTCMonth() + 1
      const candidate = isoOf(y, m, Math.min(anchorDay, lastDayOf(y, m)))
      if (candidate > from) return candidate
    }
  }
  return addDays(from, 1)
}

/**
 * The one next copy of a task that has just moved to Done, or null when it does not repeat.
 * It carries the same title, links and steps (unchecked), with its dates moved to the next date in the rhythm,
 * counted from the card's own date or today, whichever is later.
 */
export function nextCopy(card: KanbanCard, today: string, id: string): KanbanCard | null {
  const repeat = card.repeat
  if (!repeat || repeat.mode === "once") return null
  const base = card.due || card.since || today
  const from = base > today ? base : today
  const anchorDay = repeat.monthDay || parts(base).day
  const next = nextDate(from, repeat, anchorDay)
  const shift = daysBetween(base, next)
  const left = repeat.mode === "times" ? repeat.times - 1 : repeat.times
  const copyRepeat: CardRepeat =
    repeat.mode === "times" && left < 1
      ? { ...repeat, mode: "once", monthDay: anchorDay }
      : { ...repeat, times: left, monthDay: anchorDay }
  return {
    ...card,
    id,
    inResults: false,
    since: card.since ? addDays(card.since, shift) : "",
    due: card.due ? addDays(card.due, shift) : card.since ? "" : next,
    remind: card.remind ? addDays(card.remind, shift) : undefined,
    fromCard: undefined,
    doneAt: undefined,
    steps: card.steps?.map((step) => ({ ...step, done: false })),
    repeat: copyRepeat,
    occurrence: (card.occurrence ?? 0) + 1,
  }
}

/** The finished card stays in Done. The repeat moves on to its copy, so moving it out and back does not copy it again. */
export function finishedCard(card: KanbanCard): KanbanCard {
  return { ...card, repeat: { ...(card.repeat ?? ONCE), mode: "once" } }
}
