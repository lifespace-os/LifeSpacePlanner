import type { Metadata } from "next"
import { PlaceholderScreen } from "@/components/placeholder-screen"

export const metadata: Metadata = { title: "Gantt — LifeSpace Planner" }

export default function GanttPage() {
  return (
    <PlaceholderScreen
      title="Gantt"
      description="Your tasks as bars from start to due date will live here. Coming in the next screen."
    />
  )
}
