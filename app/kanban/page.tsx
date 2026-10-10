import type { Metadata } from "next"
import { PlaceholderScreen } from "@/components/placeholder-screen"

export const metadata: Metadata = { title: "Kanban — LifeSpace Planner" }

export default function KanbanPage() {
  return (
    <PlaceholderScreen
      title="Kanban"
      description="Task cards made on the whiteboard will move through columns here. Coming in the next screen."
    />
  )
}
