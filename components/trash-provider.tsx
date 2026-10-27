"use client"

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"
import { useGoals } from "@/components/goals-provider"
import { useKanban } from "@/components/kanban/kanban-provider"
import { useWorkspace, useWorkspaceSlice } from "@/components/workspace-provider"
import type { KanbanCard } from "@/lib/kanban-data"
import { mediaUrl } from "@/lib/media"
import {
  archivedTasks,
  cardForRestore,
  imageRefs,
  newestArchived,
  trashImage,
  trashedNotes,
  type ArchivedTask,
  type TrashItem,
} from "@/lib/trash"
import { newId } from "@/lib/workspace"

type TrashState = {
  /** Deleted whiteboard cards, newest first. */
  trash: TrashItem[]
  /** Kanban tasks taken off their boards, newest first. */
  archive: ArchivedTask[]
  trashNote: (noteId: string) => void
  restore: (trashId: string) => void
  deleteForever: (trashId: string) => void
  emptyTrash: () => void
  archiveTask: (cardId: string) => void
  /** Puts the task back on its board and returns it, or returns null when it is no longer archived. */
  restoreTask: (archiveId: string) => KanbanCard | null
  deleteArchived: (archiveId: string) => void
}

const TrashContext = createContext<TrashState | null>(null)

function removePictures(candidates: (string | undefined)[], stillUsed: Set<string>) {
  for (const id of new Set(candidates)) {
    if (!id || stillUsed.has(id)) continue
    void fetch(mediaUrl(id), { method: "DELETE" }).catch(() => {})
  }
}

/**
 * Holds deleted whiteboard cards (the Trash) and archived kanban tasks (Archived). Both leave their screens at once
 * and come back only by Restore. A picture file is removed only when nothing else points at it.
 */
export function TrashProvider({ children }: { children: React.ReactNode }) {
  const { doc } = useWorkspace()
  const { notes, setNotes } = useGoals()
  const { cards, setCards, columnsByBoard, openId, closeCard, revertDraft } = useKanban()
  const [trash, setTrash] = useState<TrashItem[]>(() => trashedNotes(doc.trash))
  const [archive, setArchive] = useState<ArchivedTask[]>(() => archivedTasks(doc.archive, doc.trash))
  const savedTrash = useMemo(() => (trash.length > 0 ? trash : undefined), [trash])
  const savedArchive = useMemo(() => (archive.length > 0 ? archive : undefined), [archive])
  useWorkspaceSlice("trash", savedTrash)
  useWorkspaceSlice("archive", savedArchive)

  const live = useRef({ notes, cards, columnsByBoard, openId, trash, archive })
  live.current = { notes, cards, columnsByBoard, openId, trash, archive }

  const trashNote = useCallback(
    (noteId: string) => {
      const note = live.current.notes.find((item) => item.id === noteId)
      if (!note) return
      setNotes((previous) => previous.filter((item) => item.id !== noteId))
      setTrash((previous) =>
        previous.some((item) => item.note.id === noteId)
          ? previous
          : [{ id: newId("trash"), kind: "note", deletedAt: new Date().toISOString(), note }, ...previous],
      )
    },
    [setNotes],
  )

  const restore = useCallback(
    (trashId: string) => {
      const item = live.current.trash.find((entry) => entry.id === trashId)
      if (!item) return
      setTrash((previous) => previous.filter((entry) => entry.id !== trashId))
      setNotes((previous) => (previous.some((note) => note.id === item.note.id) ? previous : [...previous, item.note]))
    },
    [setNotes],
  )

  const deleteForever = useCallback((trashId: string) => {
    const { trash: current, notes: liveNotes, cards: liveCards, archive: liveArchive } = live.current
    const item = current.find((entry) => entry.id === trashId)
    if (!item) return
    const rest = current.filter((entry) => entry.id !== trashId)
    setTrash(rest)
    removePictures([trashImage(item)], imageRefs(liveNotes, liveCards, rest, liveArchive))
  }, [])

  const emptyTrash = useCallback(() => {
    const { trash: current, notes: liveNotes, cards: liveCards, archive: liveArchive } = live.current
    if (current.length === 0) return
    setTrash([])
    removePictures(current.map(trashImage), imageRefs(liveNotes, liveCards, [], liveArchive))
  }, [])

  const archiveTask = useCallback(
    (cardId: string) => {
      const card = live.current.cards.find((item) => item.id === cardId)
      if (!card) return
      if (live.current.openId === cardId) closeCard()
      revertDraft(cardId)
      setCards((previous) => previous.filter((item) => item.id !== cardId))
      setArchive((previous) =>
        previous.some((entry) => entry.card.id === cardId)
          ? previous
          : newestArchived([{ id: newId("archive"), archivedAt: new Date().toISOString(), card }, ...previous]),
      )
    },
    [closeCard, revertDraft, setCards],
  )

  const restoreTask = useCallback(
    (archiveId: string) => {
      const entry = live.current.archive.find((item) => item.id === archiveId)
      if (!entry) return null
      const card = cardForRestore(entry.card, live.current.columnsByBoard[entry.card.boardId])
      setArchive((previous) => previous.filter((item) => item.id !== archiveId))
      setCards((previous) => (previous.some((item) => item.id === card.id) ? previous : [...previous, card]))
      return card
    },
    [setCards],
  )

  const deleteArchived = useCallback((archiveId: string) => {
    const { trash: liveTrash, notes: liveNotes, cards: liveCards, archive: current } = live.current
    const entry = current.find((item) => item.id === archiveId)
    if (!entry) return
    const rest = current.filter((item) => item.id !== archiveId)
    setArchive(rest)
    removePictures([entry.card.image], imageRefs(liveNotes, liveCards, liveTrash, rest))
  }, [])

  const value = useMemo<TrashState>(
    () => ({ trash, archive, trashNote, restore, deleteForever, emptyTrash, archiveTask, restoreTask, deleteArchived }),
    [trash, archive, trashNote, restore, deleteForever, emptyTrash, archiveTask, restoreTask, deleteArchived],
  )

  return <TrashContext.Provider value={value}>{children}</TrashContext.Provider>
}

export function useTrash() {
  const value = useContext(TrashContext)
  if (!value) throw new Error("useTrash must be used inside TrashProvider")
  return value
}
