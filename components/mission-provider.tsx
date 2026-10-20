"use client"

import { createContext, useContext, useMemo, useState } from "react"
import { useWorkspace, useWorkspaceSlice } from "@/components/workspace-provider"

type MissionState = {
  /** The saved mission sentence, or an empty string before one is written. */
  missionText: string
  setMissionText: (text: string) => void
}

const MissionContext = createContext<MissionState | null>(null)

/** Sits above the pages, so the sentence written in Mission is the same one Kanban shows. */
export function MissionProvider({ children }: { children: React.ReactNode }) {
  const { doc } = useWorkspace()
  const [missionText, setMissionText] = useState(doc.missionText)
  useWorkspaceSlice("missionText", missionText)
  const value = useMemo<MissionState>(() => ({ missionText, setMissionText }), [missionText])
  return <MissionContext.Provider value={value}>{children}</MissionContext.Provider>
}

export function useMission() {
  const value = useContext(MissionContext)
  if (!value) throw new Error("useMission must be used inside MissionProvider")
  return value
}
