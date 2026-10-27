"use client"

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"
import { useGoals } from "@/components/goals-provider"
import { useKanban } from "@/components/kanban/kanban-provider"
import { useWorkspace, useWorkspaceSlice } from "@/components/workspace-provider"
import { mediaUrl } from "@/lib/media"
import { cardForRestore, imageRefs, newestFirst, trashImage, type TrashItem } from "@/lib/trash"
import { newId } from "@/lib/workspace"

type TrashState = {
  /** Newest first. */
  trash: TrashItem[]
  trashNote: (noteId: string) => void
  trashTask: (cardId: string) => void
  restore: (trashId: string) => void
  deleteForever: (trashId: string) => void
  emptyTrash: () => void
}

const TrashContext = createContext<TrashState | null>(null)

function removePictures(candidates: (string | undefined)[], stillUsed: Set<string>) {
  for (const id of new Set(candidates)) {
    if (!id || stillUsed.has(id)) continue
    void fetch(mediaUrl(id), { method: "DELETE" }).catch(() => {})
  }
}

/** Holds deleted cards and tasks. They leave the whiteboard and the kanban at once and come back only by Restore. */
export function TrashProvider({ children }: { children: React.ReactNode }) {
  const { doc } = useWorkspace()
  const { notes, setNotes } = useGoals()
  const { cards, setCards, columnsByBoard, openId, closeCard, revertDraft } = useKanban()
  const [trash, setTrash] = useState<TrashItem[]>(() => newestFirst(doc.trash ?? []))
  const saved = useMemo(() => (trash.length > 0 ? trash : undefined), [trash])
  useWorkspaceSlice("trash", saved)

  const live = useRef({ notes, cards, columnsByBoard, openId, trash })
  live.current = { notes, cards, columnsByBoard, openId, trash }

  const trashNote = useCallback(
    (noteId: string) => {
      const note = live.current.notes.find((item) => item.id === noteId)
      if (!note) return
      setNotes((previous) => previous.filter((item) => item.id !== noteId))
      setTrash((previous) =>
        previous.some((item) => item.kind === "note" && item.note.id === noteId)
          ? previous
          : [{ id: newId("trash"), kind: "note", deletedAt: new Date().toISOString(), note }, ...previous],
      )
    },
    [setNotes],
  )

  const trashTask = useCallback(
    (cardId: string) => {
      const card = live.current.cards.find((item) => item.id === cardId)
      if (!card) return
      if (live.current.openId === cardId) closeCard()
      revertDraft(cardId)
      setCards((previous) => previous.filter((item) => item.id !== cardId))
      setTrash((previous) =>
        previous.some((item) => item.kind === "task" && item.card.id === cardId)
          ? previous
          : [{ id: newId("trash"), kind: "task", deletedAt: new Date().toISOString(), card }, ...previous],
      )
    },
    [closeCard, revertDraft, setCards],
  )

  const restore = useCallback(
    (trashId: string) => {
      const item = live.current.trash.find((entry) => entry.id === trashId)
      if (!item) return
      setTrash((previous) => previous.filter((entry) => entry.id !== trashId))
      if (item.kind === "note") {
        setNotes((previous) => (previous.some((note) => note.id === item.note.id) ? previous : [...previous, item.note]))
        return
      }
      const columns = live.current.columnsByBoard[item.card.boardId]
      const card = cardForRestore(item.card, columns)
      setCards((previous) => (previous.some((entry) => entry.id === card.id) ? previous : [...previous, card]))
    },
    [setCards, setNotes],
  )

  const deleteForever = useCallback((trashId: string) => {
    const { trash: current, notes: liveNotes, cards: liveCards } = live.current
    const item = current.find((entry) => entry.id === trashId)
    if (!item) return
    const rest = current.filter((entry) => entry.id !== trashId)
    setTrash(rest)
    removePictures([trashImage(item)], imageRefs(liveNotes, liveCards, rest))
  }, [])

  const emptyTrash = useCallback(() => {
    const { trash: current, notes: liveNotes, cards: liveCards } = live.current
    if (current.length === 0) return
    setTrash([])
    removePictures(current.map(trashImage), imageRefs(liveNotes, liveCards, []))
  }, [])

  const value = useMemo<TrashState>(
    () => ({ trash, trashNote, trashTask, restore, deleteForever, emptyTrash }),
    [trash, trashNote, trashTask, restore, deleteForever, emptyTrash],
  )

  return <TrashContext.Provider value={value}>{children}</TrashContext.Provider>
}

export function useTrash() {
  const value = useContext(TrashContext)
  if (!value) throw new Error("useTrash must be used inside TrashProvider")
  return value
}
