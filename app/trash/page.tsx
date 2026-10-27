import type { Metadata } from "next"
import { TrashScreen } from "@/components/trash/trash-screen"

export const metadata: Metadata = { title: "Trash — LifeSpace Planner" }

export default function TrashPage() {
  return <TrashScreen />
}
