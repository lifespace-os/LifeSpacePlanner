import type { Metadata } from "next"
import { KanbanScreen } from "@/components/kanban/kanban-screen"

export const metadata: Metadata = {
  title: "Kanban — LifeSpace Planner",
  description: "Move tasks across All work, Year, Month, Week, and Day boards.",
}

export default function KanbanPage() {
  return <KanbanScreen />
}
