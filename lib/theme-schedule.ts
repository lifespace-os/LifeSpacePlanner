import { isThemeKey, type ThemeKey } from "@/lib/themes"

export type ThemeSchedule = {
  /** Off keeps the theme that is on. */
  enabled: boolean
  /** The theme from dayTime until eveningTime. */
  day: ThemeKey
  /** The theme from eveningTime until dayTime. */
  evening: ThemeKey
  /** HH:MM, 24 hour, local time. */
  dayTime: string
  eveningTime: string
}

export const DEFAULT_THEME_SCHEDULE: ThemeSchedule = {
  enabled: false,
  day: "morning-paper",
  evening: "evening",
  dayTime: "07:00",
  eveningTime: "19:00",
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

export function isScheduleTime(value: unknown): value is string {
  return typeof value === "string" && TIME.test(value)
}

export function isThemeSchedule(value: unknown): value is ThemeSchedule {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.enabled === "boolean" &&
    isThemeKey(record.day) &&
    isThemeKey(record.evening) &&
    isScheduleTime(record.dayTime) &&
    isScheduleTime(record.eveningTime)
  )
}

function minutesOfTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

/** The theme the schedule wants at this moment. Equal times leave the day theme on. */
export function scheduledThemeId(schedule: ThemeSchedule, now: Date): ThemeKey {
  const at = now.getHours() * 60 + now.getMinutes()
  const day = minutesOfTime(schedule.dayTime)
  const evening = minutesOfTime(schedule.eveningTime)
  if (day === evening) return schedule.day
  const inDay = day < evening ? at >= day && at < evening : at >= day || at < evening
  return inDay ? schedule.day : schedule.evening
}

/** Milliseconds until the next time either theme starts. */
export function msUntilNextSwitch(schedule: ThemeSchedule, now: Date) {
  let soonest = Infinity
  for (const time of [schedule.dayTime, schedule.eveningTime]) {
    const [hours, minutes] = time.split(":").map(Number)
    const next = new Date(now)
    next.setHours(hours, minutes, 0, 0)
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)
    soonest = Math.min(soonest, next.getTime() - now.getTime())
  }
  return soonest
}
