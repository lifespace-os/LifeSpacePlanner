import { LABEL_SET_IDS, LABEL_SET_NAMES, type LabelSetId, type LabelSetLists, type Note } from "@/lib/board-data"
import type { KanbanCard } from "@/lib/kanban-data"
import { allCards } from "@/lib/mission-counts"

export type LabelShareSlice = {
  id: string
  name: string
  /** The color of the sector or zone. Null is the grey slice of cards without a label of the group. */
  color: `#${string}` | null
  count: number
  /** Share of the ring, from 0 to 100, rounded to a whole number. */
  percent: number
}

export type LabelShareGroup = {
  id: LabelSetId
  name: string
  /** Every hashtag of the group, in the order of the Labels mode, then the grey slice. A hashtag nobody carries has count 0. */
  slices: LabelShareSlice[]
  cards: number
}

/**
 * One ring per Labels set. A slice is one hashtag of the set and counts every whiteboard card and task that carries it,
 * the same cards the Mission tile counts. A card with two hashtags of one set counts in both slices; a card with none
 * is the grey slice. Shares are taken from the ring, so each ring adds up to 100.
 */
export function labelShares(lists: LabelSetLists, notes: Note[], cards: KanbanCard[]): LabelShareGroup[] {
  const counted = allCards(notes, cards)

  return LABEL_SET_IDS.map((id) => {
    const options = lists[id] ?? []
    const counts = options.map((option) => {
      const tag = option.tag.toLowerCase()
      return counted.filter((card) => card.tags.has(tag)).length
    })
    const none = counted.filter((card) => !options.some((option) => card.tags.has(option.tag.toLowerCase()))).length
    const ring = counts.reduce((sum, count) => sum + count, none)
    const percentOf = (count: number) => (ring === 0 ? 0 : Math.round((count / ring) * 100))

    const slices: LabelShareSlice[] = [
      ...options.map((option, index) => ({
        id: option.tag,
        name: option.name,
        color: option.color,
        count: counts[index],
        percent: percentOf(counts[index]),
      })),
      { id: "none", name: "No label", color: null, count: none, percent: percentOf(none) },
    ]

    return { id, name: LABEL_SET_NAMES[id], slices, cards: counted.length }
  })
}
