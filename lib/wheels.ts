import { LIFE_SPHERE_SETS, SCORE_MAX, sectorTag, type Note, type Sector, type SectorListId, type SphereSetId } from "@/lib/board-data"
import type { KanbanCard } from "@/lib/kanban-data"
import { allCards } from "@/lib/mission-counts"

export type WheelSlice = {
  id: string
  name: string
  color: `#${string}`
  /** How far the slice fills outward, from 0 to 1. Null draws the slice empty. */
  fill: number | null
  /** The figure written beside the name: a score such as 62% or a card count. Empty when there is none. */
  value: string
  /** The same figure in words, for screen readers. */
  spoken: string
}

export type WheelsData = {
  setName: string
  balance: WheelSlice[]
  happiness: WheelSlice[]
}

function cardsWord(count: number) {
  return `${count} ${count === 1 ? "card" : "cards"}`
}

/**
 * The wheel of balance draws the life spheres of the chosen set, filled to each saved satisfaction score.
 * The Happiness components wheel counts the cards that carry each component's hashtag, the same way the
 * Mission tile counts cards, so a task made from a card replaces its card.
 */
export function wheelsData(
  lists: Record<SectorListId, Sector[]>,
  setId: SphereSetId,
  notes: Note[],
  cards: KanbanCard[],
): WheelsData {
  const spheres = lists[setId] ?? []
  const components = lists.happiness ?? []
  const counted = allCards(notes, cards)

  const balance: WheelSlice[] = spheres.map((sector) => {
    const scored = typeof sector.score === "number"
    return {
      id: sector.id,
      name: sector.name,
      color: sector.color,
      fill: scored ? Math.min(1, Math.max(0, (sector.score ?? 0) / SCORE_MAX)) : null,
      value: scored ? `${sector.score}%` : "",
      spoken: scored ? `satisfaction ${sector.score} percent` : "no score",
    }
  })

  const counts = components.map((sector) => {
    const tag = sectorTag(sector.name)
    return counted.filter((card) => card.tags.has(tag)).length
  })
  const most = Math.max(0, ...counts)
  const happiness: WheelSlice[] = components.map((sector, index) => ({
    id: sector.id,
    name: sector.name,
    color: sector.color,
    fill: most === 0 ? null : counts[index] / most,
    value: String(counts[index]),
    spoken: cardsWord(counts[index]),
  }))

  return {
    setName: LIFE_SPHERE_SETS.find((set) => set.id === setId)?.name ?? "",
    balance,
    happiness,
  }
}
