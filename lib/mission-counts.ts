import type { IkigaiRegionId, Note } from "@/lib/board-data"
import { resultKey, type KanbanCard } from "@/lib/kanban-data"

export const MISSION_REGIONS: IkigaiRegionId[] = [
  "love",
  "good-at",
  "income",
  "needed",
  "passion",
  "profession",
  "work",
  "vocation",
  "ikigai",
]

export type MissionCounts = {
  /** Cards that carry the hashtag of each circle, overlap, and the center. A card with two hashtags counts in both. */
  regions: Record<IkigaiRegionId, number>
  keep: number
  release: number
  none: number
  total: number
}

export type Counted = { tags: Set<string>; choice: "keep" | "release" | null }

/**
 * Every whiteboard card and every task. A task made from a card replaces that card, so nothing counts twice.
 * Copies of one task kept on several boards count once, the way the Kanban counts them.
 */
export function allCards(notes: Note[], cards: KanbanCard[]): Counted[] {
  const counted: Counted[] = notes.map((note) => ({
    tags: new Set((note.hashtags ?? []).map((tag) => tag.toLowerCase())),
    choice: note.mission,
  }))
  const tasks = new Map<string, Counted>()
  for (const card of cards) {
    const key = resultKey(card)
    const tags = (card.hashtags ?? []).map((tag) => tag.toLowerCase())
    const before = tasks.get(key)
    if (before) {
      for (const tag of tags) before.tags.add(tag)
      continue
    }
    tasks.set(key, { tags: new Set(tags), choice: card.fromCard?.choice ?? null })
  }
  return [...counted, ...tasks.values()]
}

export function missionCounts(notes: Note[], cards: KanbanCard[]): MissionCounts {
  const regions = Object.fromEntries(MISSION_REGIONS.map((id) => [id, 0])) as Record<IkigaiRegionId, number>
  let keep = 0
  let release = 0
  let none = 0
  const list = allCards(notes, cards)
  for (const card of list) {
    for (const id of MISSION_REGIONS) if (card.tags.has(id)) regions[id] += 1
    if (card.choice === "keep") keep += 1
    else if (card.choice === "release") release += 1
    else none += 1
  }
  return { regions, keep, release, none, total: list.length }
}
