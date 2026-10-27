"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useGoals } from "@/components/goals-provider"
import { useKanban } from "@/components/kanban/kanban-provider"
import { useWorkspace, useWorkspaceSlice } from "@/components/workspace-provider"
import { followCard, nextSpot, pruneVision, qualifiesForVision, trimVision, type VisionItem } from "@/lib/vision"
import { liveCardIds, newId } from "@/lib/workspace"

type VisionState = {
  /** Every saved place, including those of cards that do not qualify right now. */
  items: VisionItem[]
  /** The ids of the cards that belong on the board now: they have an image and #dream or #want. */
  qualifying: Set<string>
  move: (id: string, x: number, y: number) => void
  bringToFront: (id: string) => void
  /** Called when a card is deleted for good, so no place is left pointing at nothing. */
  removeCard: (cardId: string) => void
  /** Called when a card and a task are turned into each other, so the place follows the card. */
  followCard: (fromId: string, toId: string) => void
}

const VisionContext = createContext<VisionState | null>(null)

/**
 * Holds the saved places of the Vision board above the pages. Which cards show is not stored: a card shows when it
 * exists, has an image, and has #dream or #want. Only its place is saved, apart from the Whiteboard and the Kanban.
 */
export function VisionProvider({ children }: { children: React.ReactNode }) {
  const { doc } = useWorkspace()
  const { notes } = useGoals()
  const { cards } = useKanban()
  const [items, setItems] = useState<VisionItem[]>(() => trimVision(pruneVision(doc.vision ?? [], liveCardIds(doc))))
  const saved = useMemo(() => (items.length > 0 ? items : undefined), [items])
  useWorkspaceSlice("vision", saved)

  const qualifyingList = useMemo(
    () => [
      ...notes.filter((note) => qualifiesForVision(note.hashtags, note.image)).map((note) => note.id),
      ...cards.filter((card) => qualifiesForVision(card.hashtags, card.image)).map((card) => card.id),
    ],
    [notes, cards],
  )
  const qualifyingKey = qualifyingList.join("|")
  const qualifying = useMemo(() => new Set(qualifyingList), [qualifyingList])

  useEffect(() => {
    setItems((previous) => {
      const placed = new Set(previous.map((item) => item.cardId))
      const missing = qualifyingList.filter((id) => !placed.has(id))
      if (missing.length === 0) return previous
      const next = [...previous]
      for (const cardId of missing) next.push({ id: newId("vision"), cardId, ...nextSpot(next) })
      return next
    })
    // The key stands for the list; the list itself changes identity on every card edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qualifyingKey])

  const move = useCallback((id: string, x: number, y: number) => {
    setItems((previous) =>
      previous.map((item) => (item.id === id ? { ...item, x: Math.round(x), y: Math.round(y) } : item)),
    )
  }, [])

  const bringToFront = useCallback((id: string) => {
    setItems((previous) => {
      const index = previous.findIndex((item) => item.id === id)
      if (index < 0 || index === previous.length - 1) return previous
      return [...previous.slice(0, index), ...previous.slice(index + 1), previous[index]]
    })
  }, [])

  const removeCard = useCallback((cardId: string) => {
    setItems((previous) =>
      previous.some((item) => item.cardId === cardId) ? previous.filter((item) => item.cardId !== cardId) : previous,
    )
  }, [])

  const follow = useCallback((fromId: string, toId: string) => {
    setItems((previous) => followCard(previous, fromId, toId))
  }, [])

  const value = useMemo<VisionState>(
    () => ({ items, qualifying, move, bringToFront, removeCard, followCard: follow }),
    [items, qualifying, move, bringToFront, removeCard, follow],
  )

  return <VisionContext.Provider value={value}>{children}</VisionContext.Provider>
}

export function useVision() {
  const value = useContext(VisionContext)
  if (!value) throw new Error("useVision must be used inside VisionProvider")
  return value
}
