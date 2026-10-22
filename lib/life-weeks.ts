import { daysBetween } from "@/lib/calendar"
import { LIFE_YEARS_MAX, LIFE_YEARS_MIN } from "@/lib/workspace"

export const WEEKS_PER_YEAR = 52

export type LifeGrid = {
  years: number
  total: number
  /** Weeks completed since birth. These squares are filled. */
  lived: number
  /** Weeks after the current one. These squares are empty. */
  left: number
  /** The square of the week in progress, or null once the grid has been lived through. */
  current: number | null
}

/**
 * The grid for a date of birth and a number of years, or null when either is missing or unusable.
 * Week n starts n times seven days after the birth date.
 */
export function lifeGrid(birthDate: string, years: number, today: string): LifeGrid | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || birthDate > today) return null
  if (!Number.isInteger(years) || years < LIFE_YEARS_MIN || years > LIFE_YEARS_MAX) return null

  const total = years * WEEKS_PER_YEAR
  const elapsed = Math.floor(daysBetween(birthDate, today) / 7)
  if (elapsed >= total) return { years, total, lived: total, left: 0, current: null }
  return { years, total, lived: elapsed, left: total - elapsed - 1, current: elapsed }
}
