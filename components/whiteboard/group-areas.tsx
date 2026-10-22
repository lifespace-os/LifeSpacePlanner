"use client"

import { GROUP_MIN_SIZE, hasHashtag, type Group, type Note, type Zone } from "@/lib/board-data"
import { AreaFrame } from "./area-frame"

const GROUP_TINTS = [
  "bg-[#f3cdd1]/40 border-[#b4616b]/45 text-[#8d3f4a] dark-theme:bg-[#f3cdd1]/12 dark-theme:text-ink",
  "bg-[#d6e5c9]/45 border-[#6f8f57]/45 text-[#4b6a36] dark-theme:bg-[#d6e5c9]/12 dark-theme:text-ink",
  "bg-[#f7e8a4]/40 border-[#b49a2c]/45 text-[#7a6618] dark-theme:bg-[#f7e8a4]/12 dark-theme:text-ink",
  "bg-[#d1e2ec]/45 border-[#5a88a3]/45 text-[#3a6179] dark-theme:bg-[#d1e2ec]/12 dark-theme:text-ink",
  "bg-[#f6d4bd]/40 border-[#b9773a]/45 text-[#8a5524] dark-theme:bg-[#f6d4bd]/12 dark-theme:text-ink",
  "bg-[#e0d6ec]/45 border-[#8268a6]/45 text-[#5c447f] dark-theme:bg-[#e0d6ec]/12 dark-theme:text-ink",
]

export function GroupAreas({
  notes,
  groups,
  zoom,
  onMove,
  onResize,
}: {
  notes: Note[]
  groups: Group[]
  zoom: number
  onMove: (id: string, dx: number, dy: number) => void
  onResize: (id: string, zone: Zone) => void
}) {
  return (
    <div>
      {groups.map((group, index) => (
        <AreaFrame
          key={group.id}
          id={group.id}
          title={group.name}
          caption={`#${group.tag}`}
          tint={GROUP_TINTS[index % GROUP_TINTS.length]}
          size="small"
          count={notes.filter((note) => hasHashtag(note, group.tag)).length}
          zone={group}
          zoom={zoom}
          minSize={GROUP_MIN_SIZE}
          onMove={onMove}
          onResize={onResize}
        />
      ))}
    </div>
  )
}
