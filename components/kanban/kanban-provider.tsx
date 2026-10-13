"use client"

import { createContext, useCallback, useContext, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import {
  defaultCards,
  defaultColumns,
  draftIssue,
  draftOf,
  type CardDraft,
  type KanbanBoardId,
  type KanbanCard,
  type KanbanColumn,
} from "@/lib/kanban-data"

type KanbanState = {
  boardId: KanbanBoardId
  setBoardId: (boardId: KanbanBoardId) => void
  columnsByBoard: Record<KanbanBoardId, KanbanColumn[]>
  setColumnsByBoard: Dispatch<SetStateAction<Record<KanbanBoardId, KanbanColumn[]>>>
  cards: KanbanCard[]
  setCards: Dispatch<SetStateAction<KanbanCard[]>>
  /** The card whose window is showing, or null when it is hidden. */
  openId: string | null
  openCard: (cardId: string) => void
  closeCard: () => void
  /** Unsaved edits by card id. A draft stays until Save or Revert, even while the window is hidden. */
  drafts: Record<string, CardDraft>
  editDraft: (cardId: string, patch: Partial<CardDraft>) => void
  revertDraft: (cardId: string) => void
  saveDraft: (cardId: string) => boolean
}

const KanbanContext = createContext<KanbanState | null>(null)

/** Sits above the pages, so leaving Kanban for Whiteboard does not clear the boards or an open window. */
export function KanbanProvider({ children }: { children: React.ReactNode }) {
  const [boardId, setBoardId] = useState<KanbanBoardId>("all")
  const [columnsByBoard, setColumnsByBoard] = useState(defaultColumns)
  const [cards, setCards] = useState<KanbanCard[]>(defaultCards)
  const [openId, setOpenId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, CardDraft>>({})

  const openCard = useCallback((cardId: string) => setOpenId(cardId), [])
  const closeCard = useCallback(() => setOpenId(null), [])

  const editDraft = useCallback(
    (cardId: string, patch: Partial<CardDraft>) => {
      setDrafts((previous) => {
        const card = cards.find((item) => item.id === cardId)
        const base = previous[cardId] ?? (card ? draftOf(card) : null)
        return base ? { ...previous, [cardId]: { ...base, ...patch } } : previous
      })
    },
    [cards],
  )

  const revertDraft = useCallback((cardId: string) => {
    setDrafts((previous) => {
      const { [cardId]: _removed, ...rest } = previous
      return rest
    })
  }, [])

  const saveDraft = useCallback(
    (cardId: string) => {
      const draft = drafts[cardId]
      if (!draft || draftIssue(draft)) return false
      setCards((previous) =>
        previous.map((item) => (item.id === cardId ? { ...item, ...draft, title: draft.title.trim() } : item)),
      )
      revertDraft(cardId)
      return true
    },
    [drafts, revertDraft],
  )

  const value = useMemo<KanbanState>(
    () => ({
      boardId,
      setBoardId,
      columnsByBoard,
      setColumnsByBoard,
      cards,
      setCards,
      openId,
      openCard,
      closeCard,
      drafts,
      editDraft,
      revertDraft,
      saveDraft,
    }),
    [boardId, columnsByBoard, cards, openId, openCard, closeCard, drafts, editDraft, revertDraft, saveDraft],
  )

  return <KanbanContext.Provider value={value}>{children}</KanbanContext.Provider>
}

export function useKanban() {
  const value = useContext(KanbanContext)
  if (!value) throw new Error("useKanban must be used inside KanbanProvider")
  return value
}
