import type { Metadata } from "next"
import { PlaceholderScreen } from "@/components/placeholder-screen"

export const metadata: Metadata = { title: "Calendar — LifeSpace Planner" }

export default function CalendarPage() {
  return (
    <PlaceholderScreen
      title="Calendar"
      description="Your dated cards, laid out by day and month, will live here. Coming in the next screen."
    />
  )
}
