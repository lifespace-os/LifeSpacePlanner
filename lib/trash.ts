import type { Note } from "@/lib/board-data"
import type { KanbanCard, KanbanColumn } from "@/lib/kanban-data"

/**
 * A deleted card, kept whole. A whiteboard card keeps its words, color, hashtags, links, dates, picture and its x and y.
 * A kanban task keeps the same, and its board and column.
 */
export type TrashItem =
  | { id: string; kind: "note"; deletedAt: string; note: Note }
  | { id: string; kind: "task"; deletedAt: string; card: KanbanCard }

/** The words a person wrote on the card in the trash. */
export function trashWords(item: TrashItem) {
  return (item.kind === "note" ? item.note.text : item.card.title).trim()
}

/** The picture id the card in the trash holds, if any. */
export function trashImage(item: TrashItem) {
  return item.kind === "note" ? item.note.image : item.card.image
}

/** Newest first. */
export function newestFirst(items: TrashItem[]) {
  return [...items].sort((a, b) => (a.deletedAt < b.deletedAt ? 1 : a.deletedAt > b.deletedAt ? -1 : 0))
}

/** Every picture id something in the app still points at, the trash included. */
export function imageRefs(notes: Note[], cards: KanbanCard[], trash: TrashItem[]) {
  const refs = new Set<string>()
  for (const note of notes) if (note.image) refs.add(note.image)
  for (const card of cards) if (card.image) refs.add(card.image)
  for (const item of trash) {
    const image = trashImage(item)
    if (image) refs.add(image)
  }
  return refs
}

/** The card as it returns to its board. When its column is gone it goes to the board's first column. */
export function cardForRestore(card: KanbanCard, columns: KanbanColumn[]): KanbanCard {
  if (columns.some((column) => column.id === card.columnId)) return card
  const first = columns[0]
  if (!first) return card
  const done = first.kind === "done"
  return {
    ...card,
    columnId: first.id,
    inResults: done ? card.inResults : false,
    doneAt: done ? card.doneAt : undefined,
  }
}

export function isTrashList(
  value: unknown,
  isNote: (value: unknown) => boolean,
  isCard: (value: unknown) => boolean,
): value is TrashItem[] {
  return (
    Array.isArray(value) &&
    value.every((item) => {
      if (typeof item !== "object" || item === null) return false
      const entry = item as Record<string, unknown>
      if (typeof entry.id !== "string" || typeof entry.deletedAt !== "string") return false
      if (entry.kind === "note") return isNote(entry.note)
      if (entry.kind === "task") return isCard(entry.card)
      return false
    })
  )
}
