"use client"

import {
  BUDGET_TAGS,
  BUDGET_ZONE_IDS,
  ZONE_MIN_SIZE,
  hasHashtag,
  type BudgetZoneId,
  type BudgetZones,
  type Note,
  type Zone,
} from "@/lib/board-data"
import { AreaFrame } from "./area-frame"

export const BUDGET_COPY = {
  investment: {
    title: "Investment",
    caption: "Spending that builds something",
    tint: "bg-[#7fbf9a]/20 border-[#4f9a72]/60 text-[#2f6d4d] dark-theme:text-ink",
  },
  expense: {
    title: "Expense",
    caption: "Spending that is used up",
    tint: "bg-[#e0a07f]/20 border-[#c0704a]/60 text-[#8a4a2a] dark-theme:text-ink",
  },
} as const

export function BudgetZonesLayer({
  notes,
  zones,
  zoom,
  onMove,
  onResize,
}: {
  notes: Note[]
  zones: BudgetZones
  zoom: number
  onMove: (id: BudgetZoneId, dx: number, dy: number) => void
  onResize: (id: BudgetZoneId, zone: Zone) => void
}) {
  const outside = notes.filter((note) => !BUDGET_TAGS.some((tag) => hasHashtag(note, tag))).length

  return (
    <div>
      {BUDGET_ZONE_IDS.map((id) => (
        <AreaFrame
          key={id}
          id={id}
          title={BUDGET_COPY[id].title}
          caption={BUDGET_COPY[id].caption}
          tint={BUDGET_COPY[id].tint}
          count={notes.filter((note) => hasHashtag(note, id)).length}
          zone={zones[id]}
          zoom={zoom}
          minSize={ZONE_MIN_SIZE}
          onMove={(zoneId, dx, dy) => onMove(zoneId as BudgetZoneId, dx, dy)}
          onResize={(zoneId, zone) => onResize(zoneId as BudgetZoneId, zone)}
        />
      ))}
      <p
        aria-hidden="true"
        className="pointer-events-none absolute text-sm whitespace-nowrap uppercase tracking-[0.18em] text-ink-soft/80"
        style={{ left: zones.investment.left, top: zones.investment.top + zones.investment.height + 24 }}
      >
        Without #investment or #expense · {outside}
      </p>
    </div>
  )
}
