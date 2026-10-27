/** One card placed on the Vision board. It points at a whiteboard card or a kanban task; the card itself is never copied. */
export type VisionItem = {
  id: string
  /** The id of the whiteboard card or kanban task this tile shows. A card sits on the board at most once. */
  cardId: string
  x: number
  y: number
  width: number
  height: number
  /** Only the picture, or the paper colour when there is none. */
  hideWords: boolean
}

export const VISION_MIN = { width: 120, height: 90 }
export const VISION_MAX = { width: 720, height: 720 }
export const VISION_DEFAULT = { width: 220, height: 180 }
export const VISION_GAP = 24
export const VISION_STEP = 10

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

export function isVisionList(value: unknown): value is VisionItem[] {
  if (!Array.isArray(value)) return false
  const cards = new Set<string>()
  for (const item of value) {
    if (typeof item !== "object" || item === null) return false
    const entry = item as Record<string, unknown>
    if (typeof entry.id !== "string" || typeof entry.cardId !== "string") return false
    if (!["x", "y", "width", "height"].every((key) => isFiniteNumber(entry[key]))) return false
    if (typeof entry.hideWords !== "boolean") return false
    if (cards.has(entry.cardId)) return false
    cards.add(entry.cardId)
  }
  return true
}

/** Drops the tiles whose card is gone for good. A card in the trash or the archive is still alive. */
export function pruneVision(items: VisionItem[], liveCardIds: Set<string>) {
  return items.filter((item) => liveCardIds.has(item.cardId))
}

/** Moves a tile to the card that replaced the old one, when a card and a task are turned into each other. */
export function followCard(items: VisionItem[], fromId: string, toId: string) {
  if (fromId === toId || items.some((item) => item.cardId === toId)) return items
  if (!items.some((item) => item.cardId === fromId)) return items
  return items.map((item) => (item.cardId === fromId ? { ...item, cardId: toId } : item))
}

export function clampBox(box: Pick<VisionItem, "x" | "y" | "width" | "height">) {
  return {
    x: Math.max(0, Math.round(box.x)),
    y: Math.max(0, Math.round(box.y)),
    width: Math.min(VISION_MAX.width, Math.max(VISION_MIN.width, Math.round(box.width))),
    height: Math.min(VISION_MAX.height, Math.max(VISION_MIN.height, Math.round(box.height))),
  }
}

/** The first free place in a grid of default-sized tiles, reading left to right. */
export function nextSpot(items: VisionItem[], columns = 4) {
  const stepX = VISION_DEFAULT.width + VISION_GAP
  const stepY = VISION_DEFAULT.height + VISION_GAP
  for (let index = 0; index < 400; index += 1) {
    const x = VISION_GAP + (index % columns) * stepX
    const y = VISION_GAP + Math.floor(index / columns) * stepY
    const taken = items.some(
      (item) =>
        x < item.x + item.width && x + VISION_DEFAULT.width > item.x && y < item.y + item.height && y + VISION_DEFAULT.height > item.y,
    )
    if (!taken) return { x, y }
  }
  return { x: VISION_GAP, y: VISION_GAP }
}
