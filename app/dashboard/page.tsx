import type { Metadata } from "next"
import { PlaceholderScreen } from "@/components/placeholder-screen"

export const metadata: Metadata = { title: "Dashboard — LifeSpace Planner" }

export default function DashboardPage() {
  return (
    <PlaceholderScreen
      title="Dashboard"
      description="A quiet overview of your labels and tasks will live here. Coming in the next screen."
    />
  )
}
