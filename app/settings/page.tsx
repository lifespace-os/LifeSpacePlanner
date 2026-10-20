import type { Metadata } from "next"
import { SettingsScreen } from "@/components/settings/settings-screen"

export const metadata: Metadata = { title: "Settings — LifeSpace Planner" }

export default function SettingsPage() {
  return <SettingsScreen />
}
