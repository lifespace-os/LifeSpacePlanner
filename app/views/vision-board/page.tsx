import type { Metadata } from "next"
import { VisionScreen } from "@/components/vision/vision-screen"

export const metadata: Metadata = { title: "Vision board — LifeSpace Planner" }

export default function VisionBoardPage() {
  return <VisionScreen />
}
