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
}

/** A card has a path to the mission when it holds the goal above or the second line to it. Saved state only, never a draft. */
export function hasMissionPath(card: KanbanCard) {
  return card.missionLink || card.secondLine
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
    a.secondLine === b.secondLine
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
  }
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

export function defaultCards(): KanbanCard[] {
  return withSchedule([
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
    card("m4", "month", "doing", "Swim twice a week", "health", "2026-10-31", "Me"),
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
  ])
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
