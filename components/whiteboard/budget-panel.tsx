"use client"

import { ChevronRight } from "lucide-react"
import { BUDGET_COLORS, BUDGET_ZONE_IDS, hasHashtag, type Note } from "@/lib/board-data"

const ZONE_NAMES = { investment: "Investment", expense: "Expense" } as const

export function BudgetPanel({
  notes,
  selectedIds,
  onClose,
}: {
  notes: Note[]
  selectedIds: string[]
  onClose: () => void
}) {
  const selected = notes.filter((note) => selectedIds.includes(note.id)).length
  return (
    <aside
      aria-label="Investment or expense window"
      className="pointer-events-auto flex max-h-full w-80 shrink-0 flex-col rounded-2xl border border-line bg-card shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)]"
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <h2 className="font-serif text-2xl leading-none font-medium">Investment or expense</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide labels window"
          title="Hide window. Zones and hashtags are kept."
          className="flex size-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
      <p className="mt-1.5 px-5 text-sm text-ink-soft text-pretty">
        Drop a card into a zone. Investment replaces #expense with #investment, and Expense does the opposite. A card may
        stay outside both zones.
      </p>
      <p className="mt-3 border-t border-line px-5 pt-3 text-xs text-ink-soft" aria-live="polite">
        {selected === 0 ? "No card selected." : `${selected} ${selected === 1 ? "card" : "cards"} selected.`}
      </p>
      <ul className="px-2 py-2">
        {BUDGET_ZONE_IDS.map((id) => (
          <li key={id} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <span
              aria-hidden="true"
              className="size-4 shrink-0 rounded-full border border-line"
              style={{ backgroundColor: BUDGET_COLORS[id] }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{ZONE_NAMES[id]}</span>
              <span className="block truncate text-xs text-ink-soft">#{id}</span>
            </span>
            <span className="text-sm text-ink-soft tabular-nums">
              {notes.filter((note) => hasHashtag(note, id)).length}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
