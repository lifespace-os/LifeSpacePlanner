import type { Metadata } from "next"
import { PlaceholderScreen } from "@/components/placeholder-screen"

export const metadata: Metadata = { title: "Todo list — LifeSpace Planner" }

export default function TodoListPage() {
  return (
    <PlaceholderScreen
      title="Todo list"
      description="Your tasks as one plain list will live here. Coming in the next screen."
    />
  )
}
