"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { useWorkspace, useWorkspaceSlice } from "@/components/workspace-provider"
import {
  VISION_DEFAULT,
  clampBox,
  followCard,
  nextSpot,
  pruneVision,
  type VisionItem,
} from "@/lib/vision"
import { liveCardIds, newId } from "@/lib/workspace"

type Box = Pick<VisionItem, "x" | "y" | "width" | "height">

type VisionState = {
  items: VisionItem[]
  /** Places a card on the board in the next free spot. Returns false when it is already there. */
  addCard: (cardId: string) => boolean
  setBox: (id: string, box: Box) => void
  toggleWords: (id: string) => void
  /** Takes a tile off the board. The card itself stays where it is. */
  removeTile: (id: string) => void
  /** Called when a card is deleted for good, so no tile is left pointing at nothing. */
  removeCard: (cardId: string) => void
  /** Called when a card and a task are turned into each other, so the tile follows the card. */
  followCard: (fromId: string, toId: string) => void
  bringToFront: (id: string) => void
}

const VisionContext = createContext<VisionState | null>(null)

/** Holds the Vision board above the pages. Each tile points at a card; the card is the one source of its words and picture. */
export function VisionProvider({ children }: { children: React.ReactNode }) {
  const { doc } = useWorkspace()
  const [items, setItems] = useState<VisionItem[]>(() => pruneVision(doc.vision ?? [], liveCardIds(doc)))
  const saved = useMemo(() => (items.length > 0 ? items : undefined), [items])
  useWorkspaceSlice("vision", saved)

  const addCard = useCallback(
    (cardId: string) => {
      if (items.some((item) => item.cardId === cardId)) return false
      const spot = nextSpot(items)
      setItems((previous) =>
        previous.some((item) => item.cardId === cardId)
          ? previous
          : [...previous, { id: newId("vision"), cardId, ...spot, ...VISION_DEFAULT, hideWords: false }],
      )
      return true
    },
    [items],
  )

  const setBox = useCallback((id: string, box: Box) => {
    const next = clampBox(box)
    setItems((previous) => previous.map((item) => (item.id === id ? { ...item, ...next } : item)))
  }, [])

  const toggleWords = useCallback((id: string) => {
    setItems((previous) => previous.map((item) => (item.id === id ? { ...item, hideWords: !item.hideWords } : item)))
  }, [])

  const removeTile = useCallback((id: string) => {
    setItems((previous) => previous.filter((item) => item.id !== id))
  }, [])

  const removeCard = useCallback((cardId: string) => {
    setItems((previous) => (previous.some((item) => item.cardId === cardId) ? previous.filter((item) => item.cardId !== cardId) : previous))
  }, [])

  const follow = useCallback((fromId: string, toId: string) => {
    setItems((previous) => followCard(previous, fromId, toId))
  }, [])

  const bringToFront = useCallback((id: string) => {
    setItems((previous) => {
      const index = previous.findIndex((item) => item.id === id)
      if (index < 0 || index === previous.length - 1) return previous
      return [...previous.slice(0, index), ...previous.slice(index + 1), previous[index]]
    })
  }, [])

  const value = useMemo<VisionState>(
    () => ({ items, addCard, setBox, toggleWords, removeTile, removeCard, followCard: follow, bringToFront }),
    [items, addCard, setBox, toggleWords, removeTile, removeCard, follow, bringToFront],
  )

  return <VisionContext.Provider value={value}>{children}</VisionContext.Provider>
}

export function useVision() {
  const value = useContext(VisionContext)
  if (!value) throw new Error("useVision must be used inside VisionProvider")
  return value
}
