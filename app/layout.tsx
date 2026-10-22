import type { Metadata, Viewport } from "next"
import { Geist, Newsreader } from "next/font/google"
import { AppNav } from "@/components/app-nav"
import { GoalsProvider } from "@/components/goals-provider"
import { KanbanProvider } from "@/components/kanban/kanban-provider"
import { MissionProvider } from "@/components/mission-provider"
import { NudgeRunner } from "@/components/nudge-runner"
import { ThemeApplier } from "@/components/theme-applier"
import { WorkspaceProvider } from "@/components/workspace-provider"
import { themeCss } from "@/lib/themes"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", style: ["normal", "italic"] })

export const metadata: Metadata = {
  title: "LifeSpace Planner — Unload",
  description: "A calm Kaizen whiteboard: unload your thoughts, then sort, label, and turn them into tasks.",
}

export const viewport: Viewport = {
  themeColor: "#ece6da",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${newsreader.variable} bg-desk`} suppressHydrationWarning>
      <head>
        <style href="theme-variables" precedence="default">
          {themeCss()}
        </style>
      </head>
      <body className="min-h-dvh font-sans antialiased" suppressHydrationWarning>
        <WorkspaceProvider>
          <ThemeApplier />
          <MissionProvider>
            <GoalsProvider>
              <KanbanProvider>
                <AppNav />
                <NudgeRunner />
                {children}
              </KanbanProvider>
            </GoalsProvider>
          </MissionProvider>
        </WorkspaceProvider>
      </body>
    </html>
  )
}
