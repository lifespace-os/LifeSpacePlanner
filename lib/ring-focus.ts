import { goalLinks, goalRingOf, type GoalRing, type Note } from "@/lib/board-data"

/** The cards that sit on a Map ring, from the ring nearest the mission outward. */
export function ringCardsOf(notes: Note[], rings: GoalRing[]): Note[] {
  return notes
    .filter((note) => goalRingOf(note, rings) >= 0)
    .sort((a, b) => goalRingOf(a, rings) - goalRingOf(b, rings) || a.z - b.z)
}

/**
 * A ring card and every ring card below it: the cards whose goals above lead back to it, however many rings down.
 * The goals above it are not included, so the path up to the mission stays out.
 */
export function belowIds(focusId: string, notes: Note[], rings: GoalRing[]): Set<string> {
  const byId = new Map(notes.map((note) => [note.id, note]))
  const children = new Map<string, string[]>()
  for (const note of notes) {
    for (const link of goalLinks(note, byId, rings)) {
      if (link === "mission") continue
      children.set(link, [...(children.get(link) ?? []), note.id])
    }
  }
  const found = new Set([focusId])
  const queue = [focusId]
  while (queue.length > 0) {
    for (const child of children.get(queue.shift()!) ?? []) {
      if (found.has(child)) continue
      found.add(child)
      queue.push(child)
    }
  }
  return found
}
