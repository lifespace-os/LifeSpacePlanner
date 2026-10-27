"use client"

import clsx from "clsx"
import { Link2, Maximize, Minus, Plus } from "lucide-react"
import { useT } from "@/components/language-provider"

const buttonClass =
  "flex size-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-desk hover:text-ink disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"

export function ZoomControls({
  zoom,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
  onReset,
  onFit,
  linksAvailable = false,
  allLinks = false,
  onToggleAllLinks,
}: {
  zoom: number
  canZoomIn: boolean
  canZoomOut: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  onFit: () => void
  linksAvailable?: boolean
  allLinks?: boolean
  onToggleAllLinks?: () => void
}) {
  const t = useT()
  const linksLabel = t("whiteboard.showEveryLine")

  return (
    <div
      role="group"
      aria-label="Zoom"
      className="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-line bg-board/95 p-1 shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)] backdrop-blur"
    >
      <button type="button" onClick={onZoomOut} disabled={!canZoomOut} aria-label="Zoom out" className={buttonClass}>
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onReset}
        aria-label={`Zoom ${Math.round(zoom * 100)} percent. Reset to 100 percent.`}
        title="Reset to 100%"
        className="h-8 min-w-14 rounded-lg px-1 text-xs font-medium text-ink tabular-nums transition-colors hover:bg-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button type="button" onClick={onZoomIn} disabled={!canZoomIn} aria-label="Zoom in" className={buttonClass}>
        <Plus className="size-4" aria-hidden="true" />
      </button>
      <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-line" />
      <button type="button" onClick={onFit} aria-label="Fit all cards" title="Fit all cards" className={buttonClass}>
        <Maximize className="size-4" aria-hidden="true" />
      </button>
      {linksAvailable && onToggleAllLinks ? (
        <button
          type="button"
          aria-pressed={allLinks}
          aria-label={linksLabel}
          title={linksLabel}
          onClick={onToggleAllLinks}
          className={clsx(
            "flex size-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            allLinks ? "bg-accent text-board" : "text-ink-soft hover:bg-desk hover:text-ink",
          )}
        >
          <Link2 className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
