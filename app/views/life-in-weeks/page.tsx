import type { Metadata } from "next"
import { LifeScreen } from "@/components/life/life-screen"

export const metadata: Metadata = { title: "Life in weeks — LifeSpace Planner" }

export default function LifeInWeeksPage() {
  return <LifeScreen />
}
