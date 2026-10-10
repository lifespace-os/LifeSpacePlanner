import { MISSION, type MODES, type Note } from "@/lib/board-data"

type ModeInfo = (typeof MODES)[number]

const panelClass =
  "pointer-events-auto max-w-md rounded-2xl border border-line bg-board/95 px-4 py-3 shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)] backdrop-blur"

export function ModeBar({ mode, notes }: { mode: ModeInfo; notes: Note[] }) {
  if (mode.id === "mission") return <MissionStrip notes={notes} />

  return (
    <div className={panelClass}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">
        Whiteboard <span aria-hidden="true">·</span> {notes.length} cards
      </p>
      <h1 className="font-serif text-3xl leading-tight font-medium tracking-tight">{mode.name}</h1>
      <p className="mt-0.5 text-sm text-ink-soft text-pretty">{mode.hint}</p>
    </div>
  )
}

function MissionStrip({ notes }: { notes: Note[] }) {
  const kept = notes.filter((n) => n.mission === "keep").length
  const released = notes.filter((n) => n.mission === "release").length
  const open = notes.length - kept - released

  return (
    <figure className={`${panelClass} border-accent/30 bg-accent-soft/95`}>
      <figcaption className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
        <h1 className="inline">Mission</h1>
      </figcaption>
      <blockquote className="mt-1 font-serif text-xl leading-snug italic text-ink text-pretty">{`\u201C${MISSION}\u201D`}</blockquote>
      <p className="mt-1.5 text-sm text-ink-soft tabular-nums">
        {kept} kept <span aria-hidden="true">·</span> {released} released <span aria-hidden="true">·</span> {open} open
      </p>
    </figure>
  )
}
