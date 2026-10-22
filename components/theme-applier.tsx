"use client"

import { useEffect } from "react"
import { useWorkspace } from "@/components/workspace-provider"
import { themeOf } from "@/lib/themes"

/** Puts the saved theme on the page. Renders nothing. */
export function ThemeApplier() {
  const { doc } = useWorkspace()
  const theme = themeOf(doc.theme)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme.id
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement("meta")
      meta.name = "theme-color"
      document.head.append(meta)
    }
    meta.content = theme.colors.desk
  }, [theme])

  return null
}
