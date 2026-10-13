"use client"

import { createContext, useContext, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import { BUILT_IN_RINGS, SAMPLE_NOTES, type GoalRing, type Note } from "@/lib/board-data"

type GoalsState = {
  notes: Note[]
  setNotes: Dispatch<SetStateAction<Note[]>>
  rings: GoalRing[]
  setRings: Dispatch<SetStateAction<GoalRing[]>>
}

const GoalsContext = createContext<GoalsState | null>(null)

/** Holds the Whiteboard's cards and Map rings above the pages, so Kanban reads the same ring cards the Map shows. */
export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<Note[]>(SAMPLE_NOTES)
  const [rings, setRings] = useState<GoalRing[]>(BUILT_IN_RINGS)
  const value = useMemo<GoalsState>(() => ({ notes, setNotes, rings, setRings }), [notes, rings])
  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>
}

export function useGoals() {
  const value = useContext(GoalsContext)
  if (!value) throw new Error("useGoals must be used inside GoalsProvider")
  return value
}
