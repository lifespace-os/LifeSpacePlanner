import { normalizeHashtag, type Note } from "@/lib/board-data"
import type { KanbanCard } from "@/lib/kanban-data"

export const TAG_SUGGESTION_LIMIT = 8

/** Every tag on a whiteboard card or a kanban task, once each, in the spelling first met. */
export function collectTags(notes: Note[], cards: KanbanCard[]): string[] {
  const seen = new Map<string, string>()
  const take = (tag: string) => {
    const key = tag.toLowerCase()
    if (tag && !seen.has(key)) seen.set(key, tag)
  }
  for (const note of notes) note.hashtags.forEach(take)
  for (const card of cards) (card.hashtags ?? []).forEach(take)
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

/** Tags whose beginning is what was typed, ignoring case. A tag the card already carries is left out. */
export function suggestTags(all: string[], typed: string, own: string[]): string[] {
  const start = normalizeHashtag(typed).toLowerCase()
  if (!start) return []
  const taken = new Set(own.map((tag) => tag.toLowerCase()))
  return all
    .filter((tag) => tag.toLowerCase().startsWith(start) && !taken.has(tag.toLowerCase()))
    .slice(0, TAG_SUGGESTION_LIMIT)
}
