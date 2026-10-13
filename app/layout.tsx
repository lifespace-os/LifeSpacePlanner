import type { Metadata, Viewport } from "next"
import { Geist, Newsreader } from "next/font/google"
import { AppNav } from "@/components/app-nav"
import { KanbanProvider } from "@/components/kanban/kanban-provider"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", style: ["normal", "italic"] })

export const metadata: Metadata = {
  title: "LifeSpace Planner — Unload",
  description: "A calm Kaizen whiteboard: unload your thoughts, then sort, label, and turn them into tasks.",
}

export const viewport: Viewport = {
  themeColor: "#ece6da",
  colorScheme: "light",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${newsreader.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <KanbanProvider>
          <AppNav />
          {children}
        </KanbanProvider>
      </body>
    </html>
  )
}
