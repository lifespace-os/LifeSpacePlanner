import {
  LABEL_GROUPS,
  getLabel,
  goalRingOf,
  ringTags,
  sectorTag,
  startingSectorLists,
  type GoalRing,
  type LabelGroup,
  type Note,
} from "@/lib/board-data"
import { hasMissionPath, type KanbanCard } from "@/lib/kanban-data"
import { belowIds } from "@/lib/ring-focus"

/** The rings the filter starts from. Tasks are not one: they are what the filter leaves on the board. */
export type FilterRingId = "mission" | "needs" | "life" | "project"

export const FILTER_RINGS: { id: FilterRingId; name: string }[] = [
  { id: "mission", name: "Mission" },
  { id: "needs", name: "Needs, dreams, and wants" },
  { id: "life", name: "Life goals" },
  { id: "project", name: "Project goals" },
]

/**
 * One filter in three steps: a ring, then a hashtag of the cards from that ring outward, then (for a project only)
 * a label of that project's tasks. The label only highlights; it never hides a card.
 */
export type CardFilter = { ring: FilterRingId | null; tag: string | null; label: string | null }

export const NO_FILTER: CardFilter = { ring: null, tag: null, label: null }

export function isFiltering(filter: CardFilter) {
  return filter.ring !== null
}

/** Hashtags that belong to the Labels sets or to the rings, so they are never offered as a ring hashtag. */
function reservedTags(rings: GoalRing[]) {
  const reserved = new Set(ringTags(rings).map((tag) => tag.toLowerCase()))
  for (const group of LABEL_GROUPS) for (const option of group.options) reserved.add(option.id)
  for (const list of Object.values(startingSectorLists())) for (const sector of list) reserved.add(sectorTag(sector.name))
  return reserved
}

/** The Whiteboard cards on the chosen ring and on every ring outward from it. Mission starts at the first ring. */
export function scopeNotes(ring: FilterRingId, notes: Note[], rings: GoalRing[]): Note[] {
  const start = ring === "mission" ? 0 : rings.findIndex((item) => item.id === ring)
  if (start < 0) return []
  return notes.filter((note) => goalRingOf(note, rings) >= start)
}

export type RingHashtag = { tag: string; notes: Note[] }

/** The hashtags carried by the cards from the chosen ring outward, most used first. A project is one of these on Project goals. */
export function ringHashtags(ring: FilterRingId, notes: Note[], rings: GoalRing[]): RingHashtag[] {
  const reserved = reservedTags(rings)
  const found = new Map<string, RingHashtag>()
  for (const note of scopeNotes(ring, notes, rings)) {
    const seen = new Set<string>()
    for (const raw of note.hashtags) {
      const tag = raw.toLowerCase()
      if (reserved.has(tag) || seen.has(tag)) continue
      seen.add(tag)
      const entry = found.get(tag) ?? { tag, notes: [] }
      entry.notes.push(note)
      found.set(tag, entry)
    }
  }
  return [...found.values()].sort((a, b) => b.notes.length - a.notes.length || a.tag.localeCompare(b.tag))
}

/** The ring cards the filter keeps: the chosen cards and everything below them, down to the tasks. */
export function filterGoalIds(filter: CardFilter, notes: Note[], rings: GoalRing[]): Set<string> | null {
  if (!filter.ring) return null
  const scope = scopeNotes(filter.ring, notes, rings)
  const roots = filter.tag ? scope.filter((note) => note.hashtags.some((tag) => tag.toLowerCase() === filter.tag)) : scope
  const kept = new Set<string>()
  for (const root of roots) for (const id of belowIds(root.id, notes, rings)) kept.add(id)
  return kept
}

/**
 * Whether a task stays on the board. It stays when it hangs under a kept ring card. On Mission with no hashtag it
 * also stays when it has its own path to the mission.
 */
export function passesFilter(card: KanbanCard, filter: CardFilter, keptIds: Set<string> | null) {
  if (!keptIds || !filter.ring) return true
  if (card.goalIds.some((id) => keptIds.has(id))) return true
  return filter.ring === "mission" && filter.tag === null && hasMissionPath(card)
}

/** Whether the third step is open: only a project, meaning Project goals plus one hashtag, has labels of its own. */
export function labelsOpen(filter: CardFilter) {
  return filter.ring === "project" && filter.tag !== null
}

export type ProjectLabel = {
  id: string
  name: string
  color: string
  shape: LabelGroup["shape"]
  groupId: LabelGroup["id"]
  count: number
}

export type ProjectLabelGroup = { group: LabelGroup; labels: ProjectLabel[] }

/** The labels carried by the project's tasks only, grouped as Life spheres, Happiness components, and Investment or expense. */
export function projectLabels(tasks: KanbanCard[]): ProjectLabelGroup[] {
  const counts = new Map<string, number>()
  for (const task of tasks) if (task.labelId) counts.set(task.labelId, (counts.get(task.labelId) ?? 0) + 1)
  return LABEL_GROUPS.flatMap((group) => {
    const labels = group.options.flatMap((option): ProjectLabel[] => {
      const count = counts.get(option.id) ?? 0
      return count > 0
        ? [{ id: option.id, name: option.name, color: option.color, shape: group.shape, groupId: group.id, count }]
        : []
    })
    return labels.length > 0 ? [{ group, labels }] : []
  })
}

/** The color a card is lit in while a label is chosen on a project, or null. Nothing is written to the card. */
export function highlightColor(card: KanbanCard, filter: CardFilter): string | null {
  if (!labelsOpen(filter) || !filter.label || card.labelId !== filter.label) return null
  return getLabel(card.labelId)?.color ?? null
}
