export type KanbanBoardId = "all" | "year" | "month" | "week" | "day"

/** Used to pick a matching column when a card moves to another board. */
export type ColumnKind = "todo" | "progress" | "later" | "done"

export type KanbanColumn = {
  id: string
  name: string
  kind: ColumnKind
  /** How many cards the column may hold. Used for the column that holds today's work. */
  limit?: number
}

/** One line in a task's checklist. It belongs to its task, is not a card, and sits in no column. */
export type CardStep = {
  id: string
  text: string
  done: boolean
}

/** "once" never copies. "times" copies a set number more times. "forever" copies until the person turns it off. */
export type RepeatMode = "once" | "times" | "forever"

export type RepeatRhythm = "daily" | "weekly" | "monthly"

export type CardRepeat = {
  mode: RepeatMode
  /** Copies still to come when the mode is "times". */
  times: number
  rhythm: RepeatRhythm
  /** Days of the week for the weekly rhythm. 0 is Sunday, 6 is Saturday. */
  weekdays: number[]
  /** The day of the month the monthly rhythm keeps across copies. 0 means take it from the card's date. */
  monthDay: number
}

export const ONCE: CardRepeat = { mode: "once", times: 3, rhythm: "daily", weekdays: [], monthDay: 0 }

export function sameRepeat(a: CardRepeat, b: CardRepeat) {
  return (
    a.mode === b.mode &&
    a.times === b.times &&
    a.rhythm === b.rhythm &&
    a.monthDay === b.monthDay &&
    a.weekdays.length === b.weekdays.length &&
    a.weekdays.every((day, index) => day === b.weekdays[index])
  )
}

export type KanbanCard = {
  id: string
  boardId: KanbanBoardId
  columnId: string
  title: string
  labelId: string | null
  /** The day work starts, yyyy-mm-dd. Empty when unset. */
  since: string
  /** HH:mm. Empty when unset. */
  startTime: string
  /** The end date, yyyy-mm-dd. */
  due: string
  /** HH:mm. Empty when unset. */
  endTime: string
  owner: string
  /** The card has the mission as a goal above. */
  missionLink: boolean
  /** The card is joined to the mission by the second line. */
  secondLine: boolean
  /** Ids of the Whiteboard ring cards this task hangs under. Empty means it sits under none. */
  goalIds: string[]
  /** The card was moved from Done to Results. It shows there once and on no board, until it is returned to Done. */
  inResults: boolean
  /** The checklist in the task window. Missing in files saved before steps existed. */
  steps?: CardStep[]
  /** How the task repeats. Missing means once. */
  repeat?: CardRepeat
  /** Which copy in a repeating run this card is. Missing for the first, and for tasks that never repeat. */
  occurrence?: number
  /** Hashtags added in the card search window, without the #. Missing in files saved before search existed. */
  hashtags?: string[]
  /** Free lines to other cards. They set no ring and are not a path to the mission. */
  freeIds?: string[]
  /** The day to ask again, yyyy-mm-dd. Used only in "In progress, their move". It never moves the card. */
  remind?: string
  /** Set when the task was made from a whiteboard card. It keeps the marks the card had. */
  fromCard?: CardOrigin
  /** The day the task moved into Done, yyyy-mm-dd. Missing for tasks finished before dates were kept. */
  doneAt?: string
}

/** The marks a whiteboard card carried when it became a task. */
export type CardOrigin = {
  /** Want or Must, or null when the card sat in neither zone. */
  zone: "want" | "must" | null
  /** Keep or Release, or null when the card was not marked. */
  choice: "keep" | "release" | null
  /** The id of the goal ring the card sat on, or null when it was on none. */
  ringId: string | null
}

export function isCardOrigin(value: unknown): value is CardOrigin {
  if (typeof value !== "object" || value === null) return false
  const origin = value as Record<string, unknown>
  return (
    (origin.zone === null || origin.zone === "want" || origin.zone === "must") &&
    (origin.choice === null || origin.choice === "keep" || origin.choice === "release") &&
    (origin.ringId === null || typeof origin.ringId === "string")
  )
}

/** The one column whose tasks have a Remind date. */
export const REMIND_COLUMN_ID = "theirs"

/** A card has a path to the mission when it holds the goal above or the second line to it. Saved state only, never a draft. */
export function hasMissionPath(card: KanbanCard) {
  return card.missionLink || card.secondLine
}

/** The same task kept on several boards is one task. Its title says so. Each copy of a repeating task is a task of its own. */
export function resultKey(card: KanbanCard) {
  const title = card.title.trim().toLowerCase()
  return card.occurrence ? `${title}#${card.occurrence}` : title
}

export type ResultEntry = {
  /** The one card Results shows for the task. Goals and mission paths of every copy are joined onto it. */
  card: KanbanCard
  boardIds: KanbanBoardId[]
}

/** The cards on Results, once per task however many boards held a copy. */
export function resultEntries(cards: KanbanCard[]): ResultEntry[] {
  const groups = new Map<string, KanbanCard[]>()
  for (const item of cards) {
    if (!item.inResults) continue
    const key = resultKey(item)
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  return [...groups.values()].map((group) => ({
    card: {
      ...group[0]!,
      goalIds: [...new Set(group.flatMap((item) => item.goalIds))],
      missionLink: group.some((item) => item.missionLink),
      secondLine: group.some((item) => item.secondLine),
    },
    boardIds: [...new Set(group.map((item) => item.boardId))],
  }))
}

/** What the card window edits. Kept apart from the card until Save writes it. */
export type CardDraft = {
  title: string
  since: string
  startTime: string
  due: string
  endTime: string
  missionLink: boolean
  secondLine: boolean
  steps: CardStep[]
  repeat: CardRepeat
  remind: string
}

export function draftOf(card: KanbanCard): CardDraft {
  return {
    title: card.title,
    since: card.since,
    startTime: card.startTime,
    due: card.due,
    endTime: card.endTime,
    missionLink: card.missionLink,
    secondLine: card.secondLine,
    steps: card.steps ?? [],
    repeat: card.repeat ?? ONCE,
    remind: card.remind ?? "",
  }
}

export function sameDraft(a: CardDraft, b: CardDraft) {
  return (
    a.title === b.title &&
    a.since === b.since &&
    a.startTime === b.startTime &&
    a.due === b.due &&
    a.endTime === b.endTime &&
    a.missionLink === b.missionLink &&
    a.secondLine === b.secondLine &&
    a.remind === b.remind &&
    sameRepeat(a.repeat, b.repeat) &&
    a.steps.length === b.steps.length &&
    a.steps.every((step, index) => {
      const other = b.steps[index]
      return other !== undefined && step.id === other.id && step.text === other.text && step.done === other.done
    })
  )
}

/** Why a draft cannot be saved, or null when it can. */
export function draftIssue(draft: CardDraft): string | null {
  if (!draft.title.trim()) return "Write the task before saving."
  if (draft.since && draft.due) {
    const start = `${draft.since}T${draft.startTime || "00:00"}`
    const end = `${draft.due}T${draft.endTime || "23:59"}`
    if (end < start) return "The end comes before the start."
  }
  const { repeat } = draft
  if (repeat.mode === "times" && !(Number.isInteger(repeat.times) && repeat.times >= 1 && repeat.times <= 365)) {
    return "Repeat between 1 and 365 times."
  }
  if (repeat.mode !== "once" && repeat.rhythm === "weekly" && repeat.weekdays.length === 0) {
    return "Choose at least one day of the week."
  }
  return null
}

export const KANBAN_BOARDS: { id: KanbanBoardId; name: string }[] = [
  { id: "all", name: "All work" },
  { id: "year", name: "Year" },
  { id: "month", name: "Month" },
  { id: "week", name: "Week" },
  { id: "day", name: "Day" },
]

export const TODAY_LIMIT = 4

function dailyColumns(): KanbanColumn[] {
  return [
    { id: "backlog", name: "Backlog", kind: "todo" },
    { id: "week", name: "This week", kind: "todo" },
    { id: "tomorrow", name: "To do, tomorrow", kind: "todo" },
    { id: "today", name: "To do, today", kind: "todo", limit: TODAY_LIMIT },
    { id: "mine", name: "In progress, my move", kind: "progress" },
    { id: "theirs", name: "In progress, their move", kind: "progress" },
    { id: "deferred", name: "Deferred", kind: "later" },
    { id: "done", name: "Done", kind: "done" },
  ]
}

function longColumns(): KanbanColumn[] {
  return [
    { id: "todo", name: "To do", kind: "todo" },
    { id: "doing", name: "In progress", kind: "progress" },
    { id: "done", name: "Done", kind: "done" },
  ]
}

export function defaultColumns(): Record<KanbanBoardId, KanbanColumn[]> {
  return {
    all: dailyColumns(),
    year: longColumns(),
    month: longColumns(),
    week: dailyColumns(),
    day: dailyColumns(),
  }
}

function card(
  id: string,
  boardId: KanbanBoardId,
  columnId: string,
  title: string,
  labelId: string | null,
  due: string,
  owner: string,
): KanbanCard {
  return {
    id,
    boardId,
    columnId,
    title,
    labelId,
    since: "",
    startTime: "",
    due,
    endTime: "",
    owner,
    missionLink: false,
    secondLine: false,
    goalIds: [],
    inResults: false,
  }
}

/**
 * Sample tasks hung under the sample project goals: n13 "Train for the half marathon" and n14 "Choose and register
 * for a race" (both #marathon, under life goal n12 and need n1), and n15 "Spend more time with Mom" (#family-time, under n4).
 */
const SAMPLE_GOALS: Record<string, string[]> = {
  y3: ["n14"],
  m4: ["n13"],
  a11: ["n13"],
  w7: ["n13"],
  d6: ["n13"],
  a19: ["n13"],
  a4: ["n15"],
  a9: ["n15"],
  w4: ["n15"],
}

/**
 * The chain n1 → n12 → n13 / n14 runs to the mission. Three of the tasks under it carry the path:
 * "Walk 30 minutes before lunch" (a11, w7, d6), "Swim twice a week" (m4), and "Run a half marathon" (y3).
 */
const SAMPLE_MISSION_PATH = new Set(["a11", "w7", "d6", "m4", "y3"])

function withGoals(cards: KanbanCard[]): KanbanCard[] {
  return cards.map((item) => {
    const goalIds = SAMPLE_GOALS[item.id]
    if (!goalIds) return item
    return { ...item, goalIds, missionLink: SAMPLE_MISSION_PATH.has(item.id) }
  })
}

/** Sample start and end times, so the card faces show them from the first load. */
const SAMPLE_SCHEDULE: Record<string, [since: string, start: string, end: string]> = {
  a8: ["2026-10-14", "10:00", "11:00"],
  a9: ["2026-10-14", "18:30", "19:00"],
  a10: ["2026-10-13", "09:00", "09:30"],
  a11: ["2026-10-13", "12:00", "12:30"],
  a12: ["2026-10-13", "14:00", "14:15"],
  a13: ["2026-10-14", "13:00", "15:00"],
  w6: ["2026-10-13", "09:00", "09:30"],
  w7: ["2026-10-13", "12:00", "12:30"],
  d4: ["2026-10-13", "09:00", "09:30"],
  d5: ["2026-10-13", "14:00", "14:15"],
  d6: ["2026-10-13", "12:00", "12:30"],
  d7: ["2026-10-13", "16:00", "16:45"],
}

function withSchedule(cards: KanbanCard[]): KanbanCard[] {
  return cards.map((item) => {
    const slot = SAMPLE_SCHEDULE[item.id]
    return slot ? { ...item, since: slot[0], startTime: slot[1], endTime: slot[2] } : item
  })
}

/** Sample Remind dates for the waiting tasks, so the board shows them from the first load. */
const SAMPLE_REMIND: Record<string, string> = {
  a15: "2026-10-15",
  w9: "2026-10-15",
  a16: "2026-10-19",
  d8: "2026-10-14",
}

function withRemind(cards: KanbanCard[]): KanbanCard[] {
  return cards.map((item) => {
    const remind = SAMPLE_REMIND[item.id]
    return remind ? { ...item, remind } : item
  })
}

/**
 * Sample tasks made from a whiteboard card, with the marks the card had, so the Dashboard flow is not empty.
 * Copies of one task on several boards share a title, so each copy carries the same marks.
 */
const SAMPLE_ORIGIN: Record<string, CardOrigin> = {
  a11: { zone: "want", choice: "keep", ringId: "tasks" },
  w7: { zone: "want", choice: "keep", ringId: "tasks" },
  d6: { zone: "want", choice: "keep", ringId: "tasks" },
  m4: { zone: "want", choice: "keep", ringId: "project" },
  y3: { zone: "want", choice: "keep", ringId: "life" },
  a4: { zone: "want", choice: "keep", ringId: "needs" },
  a10: { zone: "must", choice: "keep", ringId: null },
  w6: { zone: "must", choice: "keep", ringId: null },
  d4: { zone: "must", choice: "keep", ringId: null },
  a12: { zone: "must", choice: "release", ringId: null },
  a5: { zone: "must", choice: null, ringId: null },
  a19: { zone: "must", choice: "keep", ringId: null },
  w12: { zone: "must", choice: "keep", ringId: null },
  a20: { zone: "must", choice: null, ringId: null },
  w11: { zone: "must", choice: null, ringId: null },
  d9: { zone: null, choice: "keep", ringId: null },
}

function withOrigin(cards: KanbanCard[]): KanbanCard[] {
  return cards.map((item) => {
    const fromCard = SAMPLE_ORIGIN[item.id]
    return fromCard ? { ...item, fromCard } : item
  })
}

/** Sample finish days for the tasks already in Done. */
const SAMPLE_DONE_AT: Record<string, string> = {
  a19: "2026-10-09",
  a20: "2026-10-10",
  a21: "2026-10-11",
  w11: "2026-10-10",
  w12: "2026-10-09",
  d9: "2026-10-22",
  d10: "2026-10-20",
  m5: "2026-10-05",
  m6: "2026-10-08",
  y6: "2026-07-20",
  y7: "2026-09-30",
}

function withDoneAt(cards: KanbanCard[]): KanbanCard[] {
  return cards.map((item) => {
    const doneAt = SAMPLE_DONE_AT[item.id]
    return doneAt ? { ...item, doneAt } : item
  })
}

export function defaultCards(): KanbanCard[] {
  return withDoneAt(withOrigin(withRemind(withGoals(withSchedule([
    card("a1", "all", "backlog", "Sort the photo archive into years", "home", "2026-11-29", "Me"),
    card("a2", "all", "backlog", "Draft the savings plan for next spring", "money", "2026-12-05", "Me"),
    card("a3", "all", "backlog", "Find a weekly pottery class", "learning", "2026-11-14", "Me"),
    card("a4", "all", "backlog", "Plan a quiet weekend with Anna", "relationships", "2026-11-08", "Me"),
    card("a5", "all", "week", "Book the dentist check-up", "body", "2026-10-16", "Me"),
    card("a6", "all", "week", "Write the Q4 review notes", "work", "2026-10-17", "Me"),
    card("a7", "all", "week", "Compare two home insurance quotes", "money", "2026-10-18", "Me"),
    card("a8", "all", "tomorrow", "Prepare slides for the Thursday sync", "work", "2026-10-14", "Me"),
    card("a9", "all", "tomorrow", "Call Mum about the visit", "relationships", "2026-10-14", "Me"),
    card("a10", "all", "today", "Send the invoice to the studio", "money", "2026-10-13", "Me"),
    card("a11", "all", "today", "Walk 30 minutes before lunch", "health", "2026-10-13", "Me"),
    card("a12", "all", "today", "Reply to the landlord about the boiler", "home", "2026-10-13", "Me"),
    card("a13", "all", "mine", "Outline the onboarding guide", "work", "2026-10-15", "Me"),
    card("a14", "all", "mine", "Review the Spanish lesson notes", "learning", "2026-10-15", "Me"),
    card("a15", "all", "theirs", "Plumber to confirm the repair date", "home", "2026-10-16", "Marcus"),
    card("a16", "all", "theirs", "Accountant to return the tax draft", "money", "2026-10-21", "Dana"),
    card("a17", "all", "deferred", "Repaint the hallway", "home", "2026-12-20", "Me"),
    card("a18", "all", "deferred", "Join the evening choir", "love", "2027-01-10", "Me"),
    card("a19", "all", "done", "Renew the gym membership", "investment", "2026-10-09", "Me"),
    card("a20", "all", "done", "Back up the laptop", "safety", "2026-10-10", "Me"),
    card("a21", "all", "done", "Order winter tires", "expense", "2026-10-11", "Me"),

    card("y1", "year", "todo", "Build a six-month emergency fund", "safety", "2026-12-31", "Me"),
    card("y2", "year", "todo", "Learn conversational Spanish", "learning", "2026-12-31", "Me"),
    card("y3", "year", "todo", "Run a half marathon", "health", "2026-11-22", "Me"),
    card("y4", "year", "doing", "Move the studio into a bigger room", "work", "2026-12-15", "Me"),
    card("y5", "year", "doing", "Finish the kitchen renovation", "investment", "2026-12-01", "Marcus"),
    card("y6", "year", "done", "Take a week off with no screens", "freedom", "2026-07-20", "Me"),
    card("y7", "year", "done", "Pay off the car loan", "money", "2026-09-30", "Me"),

    card("m1", "month", "todo", "Set up a monthly budget review", "money", "2026-10-31", "Me"),
    card("m2", "month", "todo", "Declutter the wardrobe", "home", "2026-10-27", "Me"),
    card("m3", "month", "doing", "Ship the portfolio refresh", "work", "2026-10-24", "Me"),
    card("m4", "month", "doing", "Swim twice a week", "body", "2026-10-31", "Me"),
    card("m5", "month", "done", "Book the autumn trip", "freedom", "2026-10-05", "Me"),
    card("m6", "month", "done", "Finish the pottery starter course", "learning", "2026-10-08", "Me"),

    card("w1", "week", "backlog", "Sketch next week's meal plan", "health", "2026-10-23", "Me"),
    card("w2", "week", "backlog", "Tidy the shared drive", "work", "2026-10-22", "Me"),
    card("w3", "week", "week", "Draft the Q4 review notes", "work", "2026-10-17", "Me"),
    card("w4", "week", "week", "Dinner with Anna on Friday", "love", "2026-10-16", "Me"),
    card("w5", "week", "tomorrow", "Prepare slides for the Thursday sync", "work", "2026-10-14", "Me"),
    card("w6", "week", "today", "Send the invoice to the studio", "money", "2026-10-13", "Me"),
    card("w7", "week", "today", "Walk 30 minutes before lunch", "health", "2026-10-13", "Me"),
    card("w8", "week", "mine", "Outline the onboarding guide", "work", "2026-10-15", "Me"),
    card("w9", "week", "theirs", "Plumber to confirm the repair date", "home", "2026-10-16", "Marcus"),
    card("w10", "week", "deferred", "Sort the paper filing", "home", "2026-10-30", "Me"),
    card("w11", "week", "done", "Back up the laptop", "safety", "2026-10-10", "Me"),
    card("w12", "week", "done", "Renew the gym membership", "investment", "2026-10-09", "Me"),

    card("d1", "day", "backlog", "Stretch routine before bed", "body", "2026-10-20", "Me"),
    card("d2", "day", "week", "Plan Thursday's agenda", "work", "2026-10-15", "Me"),
    card("d3", "day", "tomorrow", "Pack the gym bag tonight", "health", "2026-10-14", "Me"),
    card("d4", "day", "today", "Send the invoice to the studio", "money", "2026-10-13", "Me"),
    card("d5", "day", "today", "Reply to the landlord about the boiler", "home", "2026-10-13", "Me"),
    card("d6", "day", "today", "Walk 30 minutes before lunch", "health", "2026-10-13", "Me"),
    card("d7", "day", "mine", "Read the lesson on Spanish verbs", "learning", "2026-10-13", "Me"),
    card("d8", "day", "theirs", "Wait for Dana's tax draft", "money", "2026-10-13", "Dana"),
    card("d9", "day", "done", "Water the plants", "home", "2026-10-13", "Me"),
    card("d10", "day", "done", "Morning pages", "freedom", "2026-10-13", "Me"),
  ])))))
}

/** Format HH:mm as "9:00 AM". */
export function formatTime(time: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) return time
  const hour = Number(match[1])
  const suffix = hour >= 12 ? "PM" : "AM"
  return `${hour % 12 === 0 ? 12 : hour % 12}:${match[2]} ${suffix}`
}

/** "9:00 AM – 9:30 AM", "from 9:00 AM", "until 9:30 AM", or "" when neither is set. */
export function formatTimeRange(startTime: string, endTime: string) {
  if (startTime && endTime) return `${formatTime(startTime)} – ${formatTime(endTime)}`
  if (startTime) return `from ${formatTime(startTime)}`
  if (endTime) return `until ${formatTime(endTime)}`
  return ""
}

/** Format a yyyy-mm-dd date as "Oct 16" without depending on the viewer's time zone. */
export function formatDue(due: string) {
  if (!due) return ""
  const date = new Date(`${due}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return due
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
}

export function initials(owner: string) {
  const parts = owner.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("")
}

/** Pick the column a card lands in on another board: same kind first, then any to-do column, skipping full ones. */
export function matchColumn(
  columns: KanbanColumn[],
  cards: KanbanCard[],
  boardId: KanbanBoardId,
  kind: ColumnKind,
): KanbanColumn | null {
  const isOpen = (column: KanbanColumn) =>
    column.limit === undefined ||
    cards.filter((c) => c.boardId === boardId && c.columnId === column.id).length < column.limit
  const order: ColumnKind[] = kind === "done" ? ["done"] : [kind, "todo", "progress"]
  for (const wanted of order) {
    const found = columns.find((column) => column.kind === wanted && isOpen(column))
    if (found) return found
  }
  return columns.find(isOpen) ?? columns[0] ?? null
}
