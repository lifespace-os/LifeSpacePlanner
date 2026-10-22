"use client"

import { useEffect } from "react"
import { useWorkspace } from "@/components/workspace-provider"
import { themeFor } from "@/lib/custom-themes"
import { msUntilNextSwitch, scheduledThemeId } from "@/lib/theme-schedule"
import { THEME_VARIABLES, themeVariables, type Theme } from "@/lib/themes"

function showTheme(theme: Theme) {
  const root = document.documentElement
  root.dataset.theme = theme.id
  root.dataset.mode = theme.mode
  if (theme.id.startsWith("custom-")) {
    // The values are checked hex colors and fixed strings, so they cannot carry CSS.
    for (const [name, value] of themeVariables(theme)) root.style.setProperty(name, value)
  } else {
    for (const name of THEME_VARIABLES) root.style.removeProperty(name)
  }
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
  const customs = doc.customThemes

  useEffect(() => {
    if (!schedule?.enabled) {
      showTheme(themeFor(saved, customs))
      return
    }

    let timer: number | undefined

    function update() {
      if (!schedule?.enabled) return
      const now = new Date()
      const theme = themeFor(scheduledThemeId(schedule, now), customs)
      showTheme(theme)
      if (theme.id !== themeFor(saved, customs).id) report("theme", theme.id)
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
  }, [schedule, saved, customs, report])

  return null
}
