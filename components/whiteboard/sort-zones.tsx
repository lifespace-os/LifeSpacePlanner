import clsx from "clsx"
import { ZONES, type Note } from "@/lib/board-data"

const ZONE_COPY = {
  want: { title: "Want", caption: "Things you choose", tint: "bg-accent-soft/50 border-accent/40 text-accent" },
  must: { title: "Must", caption: "Things you owe", tint: "bg-[#f4e3d7]/60 border-[#b9773a]/45 text-[#8a5524]" },
} as const

export function SortZones({ notes }: { notes: Note[] }) {
  const outside = notes.filter((n) => n.bucket === null).length

  return (
    <div aria-hidden="true" className="pointer-events-none">
      {(["want", "must"] as const).map((id) => {
        const zone = ZONES[id]
        const copy = ZONE_COPY[id]
        const count = notes.filter((n) => n.bucket === id).length
        return (
          <div
            key={id}
            className={clsx("absolute rounded-3xl border-2 border-dashed", copy.tint)}
            style={{ left: zone.left, top: zone.top, width: zone.width, height: zone.height }}
          >
            <div className="absolute bottom-5 left-6 flex items-baseline gap-3">
              <span className="font-serif text-6xl font-medium italic">{copy.title}</span>
              <span className="text-sm uppercase tracking-[0.18em] opacity-80">
                {copy.caption} · {count}
              </span>
            </div>
          </div>
        )
      })}
      <p
        className="absolute text-sm whitespace-nowrap uppercase tracking-[0.18em] text-ink-soft/80"
        style={{ left: ZONES.want.left, top: ZONES.want.top + ZONES.want.height + 24 }}
      >
        Outside both zones · {outside}
      </p>
    </div>
  )
}
