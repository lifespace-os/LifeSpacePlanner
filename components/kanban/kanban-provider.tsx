"use client"

import { createContext, useCallback, useContext, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import { useWorkspace, useWorkspaceSlice } from "@/components/workspace-provider"
import {
  draftIssue,
  draftOf,
  type CardDraft,
  type KanbanBoardId,
  type KanbanCard,
  type KanbanColumn,
} from "@/lib/kanban-data"
import { NO_FILTER, type CardFilter } from "@/lib/kanban-filter"

type KanbanState = {
  boardId: KanbanBoardId
  setBoardId: (boardId: KanbanBoardId) => void
  columnsByBoard: Record<KanbanBoardId, KanbanColumn[]>
  setColumnsByBoard: Dispatch<SetStateAction<Record<KanbanBoardId, KanbanColumn[]>>>
  cards: KanbanCard[]
  setCards: Dispatch<SetStateAction<KanbanCard[]>>
  /** True while the board shows only cards with a path to the mission. */
  missionOnly: boolean
  setMissionOnly: (on: boolean) => void
  /** True while the row of ring cards shows above the columns. */
  ringsOn: boolean
  setRingsOn: (on: boolean) => void
  /** True while the grid of finished cards shows in place of the board's columns. */
  resultsOn: boolean
  setResultsOn: (on: boolean) => void
  /** The ring card the board is narrowed to, or null when the whole board shows. */
  ringFocusId: string | null
  setRingFocusId: (id: string | null) => void
  /** The one filter: ring, then hashtag, then (for a project) a label. Lasts until it is cleared. */
  cardFilter: CardFilter
  setCardFilter: Dispatch<SetStateAction<CardFilter>>
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
  const { doc } = useWorkspace()
  const [boardId, setBoardId] = useState<KanbanBoardId>("all")
  const [columnsByBoard, setColumnsByBoard] = useState(doc.kanban.columnsByBoard)
  const [cards, setCards] = useState<KanbanCard[]>(doc.kanban.cards)
  const kanban = useMemo(() => ({ cards, columnsByBoard }), [cards, columnsByBoard])
  useWorkspaceSlice("kanban", kanban)
  const [missionOnly, setMissionOnly] = useState(false)
  const [ringsOn, setRingsOnState] = useState(false)
  const [resultsOn, setResultsOn] = useState(false)
  const [ringFocusId, setRingFocusId] = useState<string | null>(null)
  const [cardFilter, setCardFilter] = useState<CardFilter>(NO_FILTER)
  const [openId, setOpenId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, CardDraft>>({})

  const setRingsOn = useCallback((on: boolean) => {
    setRingsOnState(on)
    if (!on) setRingFocusId(null)
  }, [])

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
      missionOnly,
      setMissionOnly,
      ringsOn,
      setRingsOn,
      resultsOn,
      setResultsOn,
      ringFocusId,
      setRingFocusId,
      cardFilter,
      setCardFilter,
      openId,
      openCard,
      closeCard,
      drafts,
      editDraft,
      revertDraft,
      saveDraft,
    }),
    [boardId, columnsByBoard, cards, missionOnly, ringsOn, setRingsOn, resultsOn, ringFocusId, cardFilter, openId, openCard, closeCard, drafts, editDraft, revertDraft, saveDraft],
  )

  return <KanbanContext.Provider value={value}>{children}</KanbanContext.Provider>
}

export function useKanban() {
  const value = useContext(KanbanContext)
  if (!value) throw new Error("useKanban must be used inside KanbanProvider")
  return value
}
