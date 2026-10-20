import type { Metadata } from "next"
import { GanttScreen } from "@/components/gantt/gantt-screen"

export const metadata: Metadata = { title: "Gantt — LifeSpace Planner" }

export default function GanttPage() {
  return <GanttScreen />
}
