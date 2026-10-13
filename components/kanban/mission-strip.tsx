"use client"

import Link from "next/link"
import clsx from "clsx"

type MissionStripProps = {
  missionText: string
  filtering: boolean
  shown: number
  total: number
  onToggle: () => void
}

/** The saved mission sentence above the board. Pressing it keeps only the cards with a path to the mission. */
export function MissionStrip({ missionText, filtering, shown, total, onToggle }: MissionStripProps) {
  if (!missionText) {
    return (
      <p className="mx-6 mb-3 text-sm text-ink-soft">
        No mission sentence yet. Write it in Mission on the{" "}
        <Link href="/" className="font-medium text-ink underline underline-offset-2 hover:text-accent">
          Whiteboard
        </Link>
        .
      </p>
    )
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={filtering}
      aria-label={
        filtering
          ? `Mission: ${missionText}. Showing ${shown} of ${total} cards with a path to it. Press to show the whole board.`
          : `Mission: ${missionText}. Press to show only the cards with a path to it.`
      }
      className={clsx(
        "mx-6 mb-3 flex items-center justify-between gap-4 rounded-lg border px-4 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        filtering ? "border-accent bg-accent-soft" : "border-accent/30 bg-accent-soft/60 hover:bg-accent-soft",
      )}
    >
      <span className="min-w-0">
        <span className="block text-[11px] uppercase tracking-[0.18em] text-ink-soft">Mission</span>
        <span className="block text-pretty font-serif text-lg leading-snug text-ink">{`\u201C${missionText}\u201D`}</span>
      </span>
      <span className="shrink-0 text-right text-sm text-ink-soft" aria-hidden="true">
        {filtering ? (
          <>
            <span className="block font-medium text-ink">{`${shown} of ${total} cards`}</span>
            <span className="block">Press to show all</span>
          </>
        ) : (
          "Press to show only cards with a path to it"
        )}
      </span>
    </button>
  )
}
