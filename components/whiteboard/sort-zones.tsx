"use client"

import {
  ZONE_IDS,
  ZONE_MIN_SIZE,
  ZONE_TAGS,
  hasHashtag,
  type Note,
  type Zone,
  type ZoneId,
  type Zones,
} from "@/lib/board-data"
import { AreaFrame } from "./area-frame"

const ZONE_COPY = {
  want: { title: "Want", caption: "Things you choose", tint: "bg-accent-soft/50 border-accent/40 text-accent" },
  must: {
    title: "Must",
    caption: "Things you owe",
    tint: "bg-[#f4e3d7]/60 border-[#b9773a]/45 text-[#8a5524] dark-theme:bg-[#f4e3d7]/12 dark-theme:text-ink",
  },
} as const

export function SortZones({
  notes,
  zones,
  zoom,
  onMove,
  onResize,
}: {
  notes: Note[]
  zones: Zones
  zoom: number
  onMove: (id: ZoneId, dx: number, dy: number) => void
  onResize: (id: ZoneId, zone: Zone) => void
}) {
  const outside = notes.filter((note) => !ZONE_TAGS.some((tag) => hasHashtag(note, tag))).length

  return (
    <div>
      {ZONE_IDS.map((id) => (
        <AreaFrame
          key={id}
          id={id}
          title={ZONE_COPY[id].title}
          caption={ZONE_COPY[id].caption}
          tint={ZONE_COPY[id].tint}
          count={notes.filter((note) => hasHashtag(note, id)).length}
          zone={zones[id]}
          zoom={zoom}
          minSize={ZONE_MIN_SIZE}
          onMove={(zoneId, dx, dy) => onMove(zoneId as ZoneId, dx, dy)}
          onResize={(zoneId, zone) => onResize(zoneId as ZoneId, zone)}
        />
      ))}
      <p
        aria-hidden="true"
        className="pointer-events-none absolute text-sm whitespace-nowrap uppercase tracking-[0.18em] text-ink-soft/80"
        style={{ left: zones.want.left, top: zones.want.top + zones.want.height + 24 }}
      >
        Without #want or #must · {outside}
      </p>
    </div>
  )
}
