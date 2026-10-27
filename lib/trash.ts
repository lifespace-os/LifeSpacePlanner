import type { Note } from "@/lib/board-data"
import type { KanbanCard, KanbanColumn } from "@/lib/kanban-data"

/** A deleted whiteboard card, kept whole with its words, color, hashtags, links, dates, picture and its x and y. */
export type TrashItem = { id: string; kind: "note"; deletedAt: string; note: Note }

/** A kanban task taken off its board. It keeps its board, column and whether it was on Results. */
export type ArchivedTask = { id: string; archivedAt: string; card: KanbanCard }

/** Files saved before Archived existed held kanban tasks in the trash. They are read as archived tasks. */
type LegacyTrashTask = { id: string; kind: "task"; deletedAt: string; card: KanbanCard }

export type StoredTrashItem = TrashItem | LegacyTrashTask

/** The whiteboard cards among the stored items, newest first. */
export function trashedNotes(stored: StoredTrashItem[] | undefined): TrashItem[] {
  const notes = (stored ?? []).filter((item): item is TrashItem => item.kind === "note")
  return newestFirst(notes)
}

/** The archived tasks, including tasks an older file kept in the trash, newest first and without repeats. */
export function archivedTasks(archive: ArchivedTask[] | undefined, stored: StoredTrashItem[] | undefined): ArchivedTask[] {
  const result = [...(archive ?? [])]
  for (const item of stored ?? []) {
    if (item.kind !== "task") continue
    if (result.some((entry) => entry.card.id === item.card.id)) continue
    result.push({ id: item.id, archivedAt: item.deletedAt, card: item.card })
  }
  return newestArchived(result)
}

/** The words a person wrote on the card in the trash. */
export function trashWords(item: TrashItem) {
  return item.note.text.trim()
}

/** The picture id the card in the trash holds, if any. */
export function trashImage(item: TrashItem) {
  return item.note.image
}

/** Newest first. */
export function newestFirst(items: TrashItem[]) {
  return [...items].sort((a, b) => (a.deletedAt < b.deletedAt ? 1 : a.deletedAt > b.deletedAt ? -1 : 0))
}

/** Newest first. */
export function newestArchived(items: ArchivedTask[]) {
  return [...items].sort((a, b) => (a.archivedAt < b.archivedAt ? 1 : a.archivedAt > b.archivedAt ? -1 : 0))
}

/** Every picture id something in the app still points at: cards, tasks, the trash and Archived. */
export function imageRefs(notes: Note[], cards: KanbanCard[], trash: TrashItem[], archive: ArchivedTask[]) {
  const refs = new Set<string>()
  for (const note of notes) if (note.image) refs.add(note.image)
  for (const card of cards) if (card.image) refs.add(card.image)
  for (const item of trash) {
    const image = trashImage(item)
    if (image) refs.add(image)
  }
  for (const entry of archive) if (entry.card.image) refs.add(entry.card.image)
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function isTrashList(
  value: unknown,
  isNote: (value: unknown) => boolean,
  isCard: (value: unknown) => boolean,
): value is StoredTrashItem[] {
  return (
    Array.isArray(value) &&
    value.every((item) => {
      if (!isRecord(item)) return false
      if (typeof item.id !== "string" || typeof item.deletedAt !== "string") return false
      if (item.kind === "note") return isNote(item.note)
      if (item.kind === "task") return isCard(item.card)
      return false
    })
  )
}

export function isArchiveList(value: unknown, isCard: (value: unknown) => boolean): value is ArchivedTask[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) && typeof item.id === "string" && typeof item.archivedAt === "string" && isCard(item.card),
    )
  )
}
