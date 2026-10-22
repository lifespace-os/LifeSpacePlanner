"use client"

import { useEffect, useRef } from "react"
import { useWorkspace } from "@/components/workspace-provider"
import { DEFAULT_NUDGE, NUDGE_CHECK_EVENT, NUDGE_TITLE, dueKinds, localDate, markFired } from "@/lib/nudge"

const CHECK_EVERY_MS = 30_000

/** Shows the daily system notifications. It draws nothing. */
export function NudgeRunner() {
  const { doc, report } = useWorkspace()
  const nudgeRef = useRef(doc.nudge ?? DEFAULT_NUDGE)
  nudgeRef.current = doc.nudge ?? DEFAULT_NUDGE
  const shownHere = useRef(new Set<string>())

  useEffect(() => {
    function check() {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return
      const now = new Date()
      let nudge = nudgeRef.current
      let changed = false
      for (const kind of dueKinds(nudge, now)) {
        const key = `${kind}-${localDate(now)}`
        if (shownHere.current.has(key)) continue
        try {
          const shown = new Notification(NUDGE_TITLE[kind], { tag: `lifespace-${key}` })
          shown.onclick = () => window.focus()
        } catch {
          continue
        }
        shownHere.current.add(key)
        nudge = markFired(nudge, kind, now)
        changed = true
      }
      if (changed) report("nudge", nudge)
    }

    check()
    const timer = window.setInterval(check, CHECK_EVERY_MS)
    window.addEventListener("focus", check)
    window.addEventListener(NUDGE_CHECK_EVENT, check)
    document.addEventListener("visibilitychange", check)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener("focus", check)
      window.removeEventListener(NUDGE_CHECK_EVENT, check)
      document.removeEventListener("visibilitychange", check)
    }
  }, [report])

  return null
}
