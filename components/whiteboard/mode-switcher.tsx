import clsx from "clsx"
import { MODES, type ClusterView, type Mode, type MissionView } from "@/lib/board-data"

const CLUSTER_CONTROLS: { id: ClusterView; name: string }[] = [
  { id: "wantmust", name: "Want / Must" },
  { id: "groups", name: "Groups" },
]

const MISSION_CONTROLS: { id: MissionView; name: string }[] = [
  { id: "sentence", name: "Sentence" },
  { id: "ikigai", name: "Ikigai" },
]

export function ModeSwitcher({
  mode,
  clusterView,
  missionView,
  onChange,
  onClusterView,
  onMissionView,
}: {
  mode: Mode
  clusterView: ClusterView
  missionView: MissionView
  onChange: (mode: Mode) => void
  onClusterView: (view: ClusterView) => void
  onMissionView: (view: MissionView) => void
}) {
  return (
    <div role="group" aria-label="Board mode" className="flex items-center gap-1 rounded-xl border border-line bg-board p-1 shadow-sm">
      {MODES.map((m, index) => {
        const active = m.id === mode
        return (
          <div key={m.id} className="relative">
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onChange(m.id)}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                active ? "bg-ink text-board shadow" : "text-ink-soft hover:bg-desk hover:text-ink",
              )}
            >
              <span
                aria-hidden="true"
                className={clsx(
                  "flex size-5 items-center justify-center rounded-full text-[11px] font-medium tabular-nums",
                  active ? "bg-board text-ink" : "border border-line",
                )}
              >
                {index + 1}
              </span>
              {m.name}
            </button>
            {m.id === "clusters" ? (
              <ViewControls
                label="Clusters view"
                items={CLUSTER_CONTROLS}
                current={mode === "clusters" ? clusterView : null}
                onPick={onClusterView}
              />
            ) : null}
            {m.id === "mission" ? (
              <ViewControls
                label="Mission view"
                items={MISSION_CONTROLS}
                current={mode === "mission" ? missionView : null}
                onPick={onMissionView}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function ViewControls<T extends string>({
  label,
  items,
  current,
  onPick,
}: {
  label: string
  items: { id: T; name: string }[]
  current: T | null
  onPick: (id: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="absolute top-full left-0 mt-2 flex w-full min-w-max flex-col gap-1">
      {items.map((item) => {
        const active = item.id === current
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            onClick={() => onPick(item.id)}
            className={clsx(
              "rounded-lg border px-3 py-1.5 text-left text-sm shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              active
                ? "border-ink bg-ink text-board"
                : "border-line bg-board text-ink-soft hover:bg-desk hover:text-ink",
            )}
          >
            {item.name}
          </button>
        )
      })}
    </div>
  )
}
