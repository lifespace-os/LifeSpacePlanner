"use client"

import { createContext, useContext, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import { useWorkspace, useWorkspaceSlice } from "@/components/workspace-provider"
import type { GoalRing, Note } from "@/lib/board-data"

type GoalsState = {
  notes: Note[]
  setNotes: Dispatch<SetStateAction<Note[]>>
  rings: GoalRing[]
  setRings: Dispatch<SetStateAction<GoalRing[]>>
}

const GoalsContext = createContext<GoalsState | null>(null)

/** Holds the Whiteboard's cards and Map rings above the pages, so Kanban reads the same ring cards the Map shows. */
export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const { doc } = useWorkspace()
  const [notes, setNotes] = useState<Note[]>(doc.notes)
  const [rings, setRings] = useState<GoalRing[]>(doc.rings)
  useWorkspaceSlice("notes", notes)
  useWorkspaceSlice("rings", rings)
  const value = useMemo<GoalsState>(() => ({ notes, setNotes, rings, setRings }), [notes, rings])
  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>
}

export function useGoals() {
  const value = useContext(GoalsContext)
  if (!value) throw new Error("useGoals must be used inside GoalsProvider")
  return value
}
