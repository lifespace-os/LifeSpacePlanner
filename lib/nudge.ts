export type NudgeKind = "morning" | "evening"

export type WorkspaceNudge = {
  /** HH:MM, 24 hour, local time. */
  morning: string
  evening: string
  /** yyyy-mm-dd of the last day each notification was shown. */
  firedMorning?: string
  firedEvening?: string
}

export const DEFAULT_NUDGE: WorkspaceNudge = { morning: "08:00", evening: "21:00" }

export const NUDGE_KINDS: NudgeKind[] = ["morning", "evening"]

export const NUDGE_TITLE_KEY = {
  morning: "nudge.morning",
  evening: "nudge.evening",
} as const satisfies Record<NudgeKind, string>

/** Asks the runner to look again now, for example right after notifications are allowed. */
export const NUDGE_CHECK_EVENT = "lifespace:nudge-check"

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

export function isTime(value: unknown): value is string {
  return typeof value === "string" && TIME.test(value)
}

export function isNudge(value: unknown): value is WorkspaceNudge {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  const dateOk = (date: unknown) => date === undefined || (typeof date === "string" && DATE.test(date))
  return isTime(record.morning) && isTime(record.evening) && dateOk(record.firedMorning) && dateOk(record.firedEvening)
}

export function localDate(now: Date) {
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

function minutesOfTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

function minutesOfDay(now: Date) {
  return now.getHours() * 60 + now.getMinutes()
}

function firedField(kind: NudgeKind) {
  return kind === "morning" ? "firedMorning" : "firedEvening"
}

/** The notifications whose time has come today and that have not been shown today. Past ones included, for a late open. */
export function dueKinds(nudge: WorkspaceNudge, now: Date): NudgeKind[] {
  const today = localDate(now)
  return NUDGE_KINDS.filter((kind) => nudge[firedField(kind)] !== today && minutesOfTime(nudge[kind]) <= minutesOfDay(now))
}

export function markFired(nudge: WorkspaceNudge, kind: NudgeKind, now: Date): WorkspaceNudge {
  return { ...nudge, [firedField(kind)]: localDate(now) }
}

/**
 * Sets one time. A time that has already passed today is treated as passed, so editing the field
 * does not fire a notification on the spot. A time later today still fires when it arrives.
 */
export function withTime(nudge: WorkspaceNudge, kind: NudgeKind, time: string, now: Date): WorkspaceNudge {
  const next = { ...nudge, [kind]: time }
  if (minutesOfTime(time) <= minutesOfDay(now)) return markFired(next, kind, now)
  return next
}
