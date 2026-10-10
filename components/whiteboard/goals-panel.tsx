import clsx from "clsx"
import { Plus, X } from "lucide-react"
import {
  GOAL_LEVELS,
  GOAL_VIEW_LEVELS,
  getGoalLevel,
  hasHashtag,
  countTag,
  type GoalView,
  type Note,
} from "@/lib/board-data"
import { CardList } from "./ikigai-panel"

const WINDOW_CLASS =
  "pointer-events-auto flex max-h-full w-80 shrink-0 flex-col rounded-2xl border border-line bg-card shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)]"

const CLOSE_CLASS =
  "flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"

const VIEW_TITLES: Record<GoalView, string> = {
  needs: "Needs, dreams, and wants",
  life: "Life goals",
  project: "Project goals",
  tasks: "Tasks",
  map: "Map",
}

/** A strip under the header that repeats the saved mission sentence, or says it is not written yet. */
export function MissionStrip({ missionText }: { missionText: string }) {
  const saved = missionText.length > 0
  return (
    <section
      aria-label="Mission sentence"
      className="pointer-events-auto w-fit max-w-xl rounded-xl border border-accent/30 bg-accent-soft/95 px-4 py-2.5 shadow-sm backdrop-blur"
    >
      {saved ? (
        <p className="line-clamp-2 font-serif text-base leading-snug italic text-ink text-pretty break-words">
          {`\u201C${missionText}\u201D`}
        </p>
      ) : (
        <p className="text-sm text-ink-soft">The mission is not written yet.</p>
      )}
    </section>
  )
}

/** The right window of Goals. Each drop area sets one level on the cards dropped on it. */
export function GoalsPanel({
  view,
  notes,
  hoverId,
  onClose,
  onRemoveLevel,
}: {
  view: GoalView
  notes: Note[]
  hoverId: string | null
  onClose: () => void
  onRemoveLevel: (id: string, tag: string) => void
}) {
  const levelTags = view === "map" ? [] : GOAL_VIEW_LEVELS[view]

  return (
    <aside aria-label={`${VIEW_TITLES[view]} panel`} className={WINDOW_CLASS}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.18em] text-ink-soft uppercase">Goals</p>
          <h2 className="mt-1 font-serif text-2xl leading-tight font-medium text-balance">{VIEW_TITLES[view]}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Hide goals window" className={CLOSE_CLASS}>
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {view === "map" ? (
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto border-t border-line px-2 py-2">
          <h3 className="px-3 pt-1 pb-1 text-xs font-medium tracking-[0.16em] text-ink-soft uppercase">
            Cards by level
          </h3>
          <ul className="flex flex-col">
            {GOAL_LEVELS.map((level) => {
              const count = countTag(notes, level.tag)
              return (
                <li key={level.id} className="flex items-center gap-3 rounded-lg px-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">{level.name}</span>
                    <span className="block text-xs text-ink-soft">#{level.tag}</span>
                  </span>
                  <span className="shrink-0 text-sm text-ink-soft tabular-nums">
                    {count}
                    <span className="sr-only"> {count === 1 ? "card" : "cards"}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto border-t border-line px-5 py-4">
          <p className="text-xs text-ink-soft text-pretty">
            Cards stay where they are. A new level replaces the previous one. Shift-click selects several cards.
          </p>
          {levelTags.map((tag) => {
            const level = getGoalLevel(tag)
            if (!level) return null
            const tagged = notes.filter((note) => hasHashtag(note, level.tag))
            const hovered = hoverId === level.tag
            return (
              <section key={level.id} aria-label={level.name} className="flex flex-col gap-2">
                <div
                  data-goal-area={level.tag}
                  className={clsx(
                    "flex flex-col items-center gap-1 rounded-xl border-2 border-dashed px-3 py-4 text-center transition-colors",
                    hovered ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-soft",
                  )}
                >
                  <Plus className="size-5" aria-hidden="true" />
                  <p className="text-sm font-medium">
                    Drop a card here to make it a <span className="text-ink">{level.name.toLowerCase()}</span>
                  </p>
                  <p className="text-xs">{level.description}</p>
                </div>
                <h3 className="text-xs font-medium tracking-[0.16em] text-ink-soft uppercase">
                  With #{level.tag} <span className="tabular-nums">({tagged.length})</span>
                </h3>
                <div className="-mx-3">
                  <CardList
                    notes={tagged}
                    empty="No cards yet."
                    label={`#${level.tag}`}
                    onRemove={(id) => onRemoveLevel(id, level.tag)}
                  />
                </div>
              </section>
            )
          })}
        </div>
      )}
    </aside>
  )
}
