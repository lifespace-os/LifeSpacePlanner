import clsx from "clsx"
import { ZONES, type Note } from "@/lib/board-data"

const ZONE_COPY = {
  want: { title: "Want", caption: "Things you choose", tint: "bg-accent-soft/50 border-accent/40 text-accent" },
  must: { title: "Must", caption: "Things you owe", tint: "bg-[#f4e3d7]/60 border-[#b9773a]/45 text-[#8a5524]" },
} as const

export function SortZones({ notes }: { notes: Note[] }) {
  const outside = notes.filter((n) => n.bucket === null).length

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {(["want", "must"] as const).map((id) => {
        const zone = ZONES[id]
        const copy = ZONE_COPY[id]
        const count = notes.filter((n) => n.bucket === id).length
        return (
          <div
            key={id}
            className={clsx("absolute rounded-3xl border-2 border-dashed", copy.tint)}
            style={{
              left: `${zone.left * 100}%`,
              top: `${zone.top * 100}%`,
              width: `${zone.width * 100}%`,
              height: `${zone.height * 100}%`,
            }}
          >
            <div className="absolute bottom-4 left-5 flex items-baseline gap-3">
              <span className="font-serif text-5xl font-medium italic">{copy.title}</span>
              <span className="text-xs uppercase tracking-[0.18em] opacity-80">
                {copy.caption} · {count}
              </span>
            </div>
          </div>
        )
      })}
      <p className="absolute right-6 bottom-4 text-xs uppercase tracking-[0.18em] text-ink-soft/80">
        Outside both zones · {outside}
      </p>
    </div>
  )
}
