"use client"

import { useEffect } from "react"
import { useWorkspace } from "@/components/workspace-provider"
import { msUntilNextSwitch, scheduledThemeId } from "@/lib/theme-schedule"
import { themeOf, type ThemeId } from "@/lib/themes"

function showTheme(id: ThemeId) {
  const theme = themeOf(id)
  document.documentElement.dataset.theme = theme.id
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement("meta")
    meta.name = "theme-color"
    document.head.append(meta)
  }
  meta.content = theme.colors.desk
}

/**
 * Puts the saved theme on the page. While the time of day switch is on, it also picks the day or evening
 * theme when the app opens and at each of the two times, and saves that theme as the one that is on.
 * Renders nothing, and sends no notification.
 */
export function ThemeApplier() {
  const { doc, report } = useWorkspace()
  const schedule = doc.themeSchedule
  const saved = doc.theme

  useEffect(() => {
    if (!schedule?.enabled) {
      showTheme(themeOf(saved).id)
      return
    }

    let timer: number | undefined

    function update() {
      if (!schedule?.enabled) return
      const now = new Date()
      const id = scheduledThemeId(schedule, now)
      showTheme(id)
      if (id !== themeOf(saved).id) report("theme", id)
      window.clearTimeout(timer)
      timer = window.setTimeout(update, msUntilNextSwitch(schedule, now) + 50)
    }

    update()
    window.addEventListener("focus", update)
    document.addEventListener("visibilitychange", update)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("focus", update)
      document.removeEventListener("visibilitychange", update)
    }
  }, [schedule, saved, report])

  return null
}
