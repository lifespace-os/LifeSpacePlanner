import clsx from "clsx"
import type { ClusterView, MODES, Note } from "@/lib/board-data"

type ModeInfo = (typeof MODES)[number]

const panelClass =
  "pointer-events-auto max-w-md rounded-2xl border border-line bg-board/95 px-4 py-3 shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)] backdrop-blur"

const CLUSTER_VIEWS: { id: ClusterView; name: string; hint: string }[] = [
  {
    id: "wantmust",
    name: "Want / Must",
    hint: "Drop a card in Want for #want or in Must for #must. Moving it out removes the hashtag.",
  },
  {
    id: "groups",
    name: "Groups",
    hint: "Drop a card in a group to give it that group's hashtag. Moving it out removes it.",
  },
]

export function ModeBar({
  mode,
  notes,
  clusterView,
  missionText,
  onClusterViewChange,
  onEditMission,
}: {
  mode: ModeInfo
  notes: Note[]
  clusterView: ClusterView
  missionText: string
  onClusterViewChange: (view: ClusterView) => void
  onEditMission: () => void
}) {
  if (mode.id === "mission") return <MissionStrip notes={notes} missionText={missionText} onEditMission={onEditMission} />

  const activeView = CLUSTER_VIEWS.find((v) => v.id === clusterView) ?? CLUSTER_VIEWS[0]

  return (
    <div className={panelClass}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">
        Whiteboard <span aria-hidden="true">·</span> {notes.length} cards
      </p>
      <h1 className="font-serif text-3xl leading-tight font-medium tracking-tight">{mode.name}</h1>
      {mode.id === "clusters" ? (
        <>
          <div
            role="group"
            aria-label="Clusters view"
            className="mt-2 inline-flex items-center gap-1 rounded-lg border border-line bg-desk p-0.5"
          >
            {CLUSTER_VIEWS.map((v) => {
              const active = v.id === clusterView
              return (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onClusterViewChange(v.id)}
                  className={clsx(
                    "rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
                    active ? "bg-ink text-board shadow-sm" : "text-ink-soft hover:text-ink",
                  )}
                >
                  {v.name}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-sm text-ink-soft text-pretty">{activeView.hint}</p>
        </>
      ) : (
        <p className="mt-0.5 text-sm text-ink-soft text-pretty">{mode.hint}</p>
      )}
    </div>
  )
}

function MissionStrip({
  notes,
  missionText,
  onEditMission,
}: {
  notes: Note[]
  missionText: string
  onEditMission: () => void
}) {
  const kept = notes.filter((n) => n.mission === "keep").length
  const released = notes.filter((n) => n.mission === "release").length
  const open = notes.length - kept - released
  const saved = missionText.length > 0

  return (
    <figure className={`${panelClass} max-w-xl border-accent/30 bg-accent-soft/95`}>
      <figcaption className="flex items-center justify-between gap-4 text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
        <h1>Mission</h1>
        <span className="text-ink-soft">{saved ? "Step 2 of 2" : "Step 1 of 2"}</span>
      </figcaption>
      {saved ? (
        <>
          <blockquote className="mt-1 font-serif text-xl leading-snug italic text-ink text-pretty break-words">{`\u201C${missionText}\u201D`}</blockquote>
          <p className="mt-1.5 text-sm text-ink-soft text-pretty">Mark each card Keep or Release against this sentence.</p>
          <div className="mt-2 flex items-center justify-between gap-4">
            <p className="text-sm text-ink-soft tabular-nums">
              {kept} kept <span aria-hidden="true">·</span> {released} released <span aria-hidden="true">·</span> {open} open
            </p>
            <button
              type="button"
              onClick={onEditMission}
              className="rounded-md border border-line bg-board px-2.5 py-1 text-sm text-ink transition-colors hover:bg-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Change sentence
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 font-serif text-xl leading-snug text-ink-soft text-pretty">No mission sentence yet.</p>
          <button
            type="button"
            onClick={onEditMission}
            className="mt-2 rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-board shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Write mission
          </button>
        </>
      )}
    </figure>
  )
}
