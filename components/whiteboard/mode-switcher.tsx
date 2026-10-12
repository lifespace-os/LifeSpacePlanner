import clsx from "clsx"
import { MODES, type ClusterView, type GoalView, type LabelView, type Mode, type MissionView } from "@/lib/board-data"

const LABEL_CONTROLS: { id: LabelView; name: string }[] = [
  { id: "spheres", name: "Life spheres" },
  { id: "happiness", name: "Happiness components" },
  { id: "budget", name: "Investment or expense" },
]

const GOAL_CONTROLS: { id: GoalView; name: string }[] = [
  { id: "needs", name: "Needs, dreams, and wants" },
  { id: "life", name: "Life goals" },
  { id: "project", name: "Project goals" },
  { id: "tasks", name: "Tasks" },
  { id: "map", name: "Map" },
]

const CLUSTER_CONTROLS: { id: ClusterView; name: string }[] = [
  { id: "wantmust", name: "Want / Must" },
  { id: "groups", name: "Groups" },
]

const MISSION_CONTROLS: { id: MissionView; name: string }[] = [
  { id: "sentence", name: "Sentence" },
  { id: "ikigai", name: "Ikigai" },
  { id: "markers", name: "Markers" },
]

export function ModeSwitcher({
  mode,
  clusterView,
  missionView,
  goalView,
  labelView,
  wheelOnly,
  onChange,
  onClusterView,
  onMissionView,
  onGoalView,
  onLabelView,
  onWheelOnly,
}: {
  mode: Mode
  clusterView: ClusterView
  missionView: MissionView
  goalView: GoalView
  labelView: LabelView
  wheelOnly: boolean
  onWheelOnly: (on: boolean) => void
  onChange: (mode: Mode) => void
  onClusterView: (view: ClusterView) => void
  onMissionView: (view: MissionView) => void
  onGoalView: (view: GoalView) => void
  onLabelView: (view: LabelView) => void
}) {
  return (
    <div
      role="group"
      aria-label="Board mode"
      className="relative flex items-center gap-1 rounded-xl border border-line bg-board p-1 shadow-sm"
    >
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
            {active && m.id === "clusters" ? (
              <ViewControls
                label="Clusters view"
                items={CLUSTER_CONTROLS}
                current={clusterView}
                onPick={onClusterView}
              />
            ) : null}
            {active && m.id === "labels" ? (
              <ViewControls
                label="Labels view"
                items={LABEL_CONTROLS}
                current={labelView}
                onPick={onLabelView}
                align="right"
                toggle={labelView === "budget" ? undefined : { name: "Wheel view", pressed: wheelOnly, onToggle: onWheelOnly }}
              />
            ) : null}
            {active && m.id === "mission" ? (
              <ViewControls
                label="Mission view"
                items={MISSION_CONTROLS}
                current={missionView}
                onPick={onMissionView}
              />
            ) : null}
          </div>
        )
      })}
      {mode === "goals" ? (
        <ViewControls
          label="Goals view"
          items={GOAL_CONTROLS}
          current={goalView}
          onPick={onGoalView}
          align="right"
        />
      ) : null}
    </div>
  )
}

function ViewControls<T extends string>({
  label,
  items,
  current,
  onPick,
  align = "left",
  toggle,
}: {
  label: string
  items: { id: T; name: string }[]
  current: T
  onPick: (id: T) => void
  align?: "left" | "right"
  /** An extra on/off view shown as its own control below the row; it does not replace the chosen item. */
  toggle?: { name: string; pressed: boolean; onToggle: (on: boolean) => void }
}) {
  return (
    <div
      className={clsx(
        "absolute top-full z-10 mt-2 flex w-max flex-col gap-2",
        align === "right" ? "right-0 items-end" : "left-0 items-start",
      )}
    >
      <div
        role="group"
        aria-label={label}
        className="flex w-max items-center gap-1 rounded-xl border border-line bg-board p-1 shadow-sm"
      >
        {items.map((item) => {
          const active = item.id === current
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => onPick(item.id)}
              className={clsx(
                "rounded-lg px-3.5 py-2 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                active ? "bg-ink text-board shadow" : "text-ink-soft hover:bg-desk hover:text-ink",
              )}
            >
              {item.name}
            </button>
          )
        })}
      </div>
      {toggle ? (
        <button
          type="button"
          aria-pressed={toggle.pressed}
          onClick={() => toggle.onToggle(!toggle.pressed)}
          className={clsx(
            "rounded-xl border border-line px-3.5 py-2 text-sm whitespace-nowrap shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            toggle.pressed ? "bg-ink text-board" : "bg-board text-ink-soft hover:bg-desk hover:text-ink",
          )}
        >
          {toggle.name}
        </button>
      ) : null}
    </div>
  )
}
