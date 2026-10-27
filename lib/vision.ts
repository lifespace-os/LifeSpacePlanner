/**
 * The saved place of one card on the Vision board. It points at a whiteboard card or a kanban task; the card itself is
 * never copied. The place is kept even while the card does not qualify, so it returns there when it does again.
 */
export type VisionItem = {
  id: string
  /** The id of the whiteboard card or kanban task. A card has at most one place. */
  cardId: string
  x: number
  y: number
}

/** A card belongs on the board when it has an image and either of these hashtags. */
export const VISION_TAGS = ["dream", "want"] as const

/** The room one card takes when a new card is placed in open space. */
export const VISION_SLOT = { width: 224, height: 300 }
export const VISION_GAP = 24

export function qualifiesForVision(hashtags: readonly string[] | undefined, image: string | undefined) {
  if (!image) return false
  return (hashtags ?? []).some((tag) => (VISION_TAGS as readonly string[]).includes(tag.toLowerCase()))
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

/** Accepts files saved before the board became infinite: their size and words flag are simply ignored. */
export function isVisionList(value: unknown): value is VisionItem[] {
  if (!Array.isArray(value)) return false
  const cards = new Set<string>()
  for (const item of value) {
    if (typeof item !== "object" || item === null) return false
    const entry = item as Record<string, unknown>
    if (typeof entry.id !== "string" || typeof entry.cardId !== "string") return false
    if (!isFiniteNumber(entry.x) || !isFiniteNumber(entry.y)) return false
    if (cards.has(entry.cardId)) return false
    cards.add(entry.cardId)
  }
  return true
}

/** Keeps only what a place needs, dropping the size and words flag older files carried. */
export function trimVision(items: VisionItem[]): VisionItem[] {
  return items.map(({ id, cardId, x, y }) => ({ id, cardId, x: Math.round(x), y: Math.round(y) }))
}

/** Drops the places whose card is gone for good. A card in the trash or the archive is still alive. */
export function pruneVision(items: VisionItem[], liveCardIds: Set<string>) {
  return items.filter((item) => liveCardIds.has(item.cardId))
}

/** Moves a place to the card that replaced the old one, when a card and a task are turned into each other. */
export function followCard(items: VisionItem[], fromId: string, toId: string) {
  if (fromId === toId || items.some((item) => item.cardId === toId)) return items
  if (!items.some((item) => item.cardId === fromId)) return items
  return items.map((item) => (item.cardId === fromId ? { ...item, cardId: toId } : item))
}

/** The first free slot, reading left to right, that touches no saved place, including those of cards not shown now. */
export function nextSpot(items: VisionItem[], columns = 5) {
  const stepX = VISION_SLOT.width + VISION_GAP
  const stepY = VISION_SLOT.height + VISION_GAP
  for (let index = 0; index < 600; index += 1) {
    const x = (index % columns) * stepX
    const y = Math.floor(index / columns) * stepY
    const taken = items.some(
      (item) =>
        x < item.x + VISION_SLOT.width &&
        x + VISION_SLOT.width > item.x &&
        y < item.y + VISION_SLOT.height &&
        y + VISION_SLOT.height > item.y,
    )
    if (!taken) return { x, y }
  }
  return { x: 0, y: 0 }
}
