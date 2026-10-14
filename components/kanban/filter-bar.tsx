"use client"

import { useMemo, type Dispatch, type SetStateAction } from "react"
import clsx from "clsx"
import { SetShape } from "@/components/whiteboard/label-chip"
import type { GoalRing, Note } from "@/lib/board-data"
import type { KanbanCard } from "@/lib/kanban-data"
import {
  FILTER_RINGS,
  NO_FILTER,
  filterGoalIds,
  isFiltering,
  labelsOpen,
  passesFilter,
  projectLabels,
  ringHashtags,
  type CardFilter,
  type FilterRingId,
} from "@/lib/kanban-filter"

type FilterBarProps = {
  filter: CardFilter
  onChange: Dispatch<SetStateAction<CardFilter>>
  notes: Note[]
  rings: GoalRing[]
  /** The tasks on the current board, before any filter. */
  boardCards: KanbanCard[]
  shown: number
}

const chip =
  "rounded-md border px-2.5 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
const chipOff = "border-line bg-card text-ink hover:border-ink-soft"
const chipOn = "border-ink bg-ink text-board"

function ringName(id: FilterRingId) {
  return FILTER_RINGS.find((ring) => ring.id === id)?.name ?? id
}

/** One filter in three steps: a ring, a hashtag of the cards from that ring outward, then a label of one project's tasks. */
export function FilterBar({ filter, onChange, notes, rings, boardCards, shown }: FilterBarProps) {
  const hashtags = useMemo(() => (filter.ring ? ringHashtags(filter.ring, notes, rings) : []), [filter.ring, notes, rings])

  const tagCounts = useMemo(() => {
    const result: Record<string, number> = {}
    if (!filter.ring) return result
    for (const entry of hashtags) {
      const next: CardFilter = { ring: filter.ring, tag: entry.tag, label: null }
      const kept = filterGoalIds(next, notes, rings)
      result[entry.tag] = boardCards.filter((card) => passesFilter(card, next, kept)).length
    }
    return result
  }, [filter.ring, hashtags, notes, rings, boardCards])

  const projectTasks = useMemo(() => {
    if (!labelsOpen(filter)) return []
    const kept = filterGoalIds({ ...filter, label: null }, notes, rings)
    return boardCards.filter((card) => passesFilter(card, filter, kept))
  }, [filter, notes, rings, boardCards])
  const labelGroups = useMemo(() => projectLabels(projectTasks), [projectTasks])

  const pickRing = (id: FilterRingId) =>
    onChange((current) => (current.ring === id ? NO_FILTER : { ring: id, tag: null, label: null }))
  const pickTag = (tag: string) =>
    onChange((current) => ({ ring: current.ring, tag: current.tag === tag ? null : tag, label: null }))
  const pickLabel = (id: string) => onChange((current) => ({ ...current, label: current.label === id ? null : id }))

  const isProject = filter.ring === "project"
  const tagHeading = isProject ? "Project" : "Hashtag"

  return (
    <section aria-label="Filter" className="mx-6 mb-3 rounded-lg border border-line bg-desk/60 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="w-24 shrink-0 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft">Ring</h2>
        <div role="group" aria-label="Ring" className="flex flex-wrap gap-1.5">
          {FILTER_RINGS.map((ring) => (
            <button
              key={ring.id}
              type="button"
              aria-pressed={filter.ring === ring.id}
              onClick={() => pickRing(ring.id)}
              className={clsx(chip, filter.ring === ring.id ? chipOn : chipOff)}
            >
              {ring.name}
            </button>
          ))}
        </div>
        {isFiltering(filter) && (
          <div className="ml-auto flex items-center gap-3 text-sm text-ink-soft">
            <span aria-live="polite">
              {shown} of {boardCards.length} {boardCards.length === 1 ? "task" : "tasks"}
            </span>
            <button
              type="button"
              onClick={() => onChange(NO_FILTER)}
              className="rounded-md px-1.5 py-0.5 font-medium text-ink underline underline-offset-2 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Clear filter
            </button>
          </div>
        )}
      </div>

      {filter.ring && (
        <div className="mt-2.5 flex flex-wrap items-start gap-x-3 gap-y-2">
          <h2 className="w-24 shrink-0 pt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft">{tagHeading}</h2>
          {hashtags.length === 0 ? (
            <p className="pt-0.5 text-sm text-ink-soft">
              No hashtags yet on {isProject ? "project goals" : `the cards from ${ringName(filter.ring)} outward`}. The ring alone still filters.
            </p>
          ) : (
            <div role="group" aria-label={tagHeading} className="flex min-w-0 flex-1 flex-wrap gap-1.5">
              {hashtags.map((entry) => {
                const on = filter.tag === entry.tag
                return (
                  <button
                    key={entry.tag}
                    type="button"
                    aria-pressed={on}
                    onClick={() => pickTag(entry.tag)}
                    className={clsx(chip, "flex items-center gap-1.5", on ? chipOn : chipOff)}
                  >
                    <span>#{entry.tag}</span>
                    <span className={clsx("text-xs tabular-nums", on ? "text-board/70" : "text-ink-soft")}>
                      {tagCounts[entry.tag] ?? 0}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {labelsOpen(filter) && (
        <div className="mt-2.5 flex flex-wrap items-start gap-x-3 gap-y-2">
          <h2 className="w-24 shrink-0 pt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft">Labels</h2>
          {labelGroups.length === 0 ? (
            <p className="pt-0.5 text-sm text-ink-soft">The tasks of this project carry no labels.</p>
          ) : (
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {labelGroups.map(({ group, labels }) => (
                <div key={group.id} role="group" aria-label={group.name} className="flex flex-wrap items-center gap-1.5">
                  <span className="w-44 shrink-0 text-xs text-ink-soft">{group.name}</span>
                  {labels.map((label) => {
                    const on = filter.label === label.id
                    return (
                      <button
                        key={label.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => pickLabel(label.id)}
                        style={on ? { borderColor: label.color, backgroundColor: `${label.color}2e`, boxShadow: `0 0 0 1px ${label.color}` } : undefined}
                        className={clsx(chip, "flex items-center gap-1.5", on ? "text-ink" : chipOff)}
                      >
                        <SetShape shape={label.shape} color={label.color} />
                        <span>{label.name}</span>
                        <span className="text-xs tabular-nums text-ink-soft">{label.count}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
              <p className="text-xs text-ink-soft">
                A label lights the cards in its color while the filter lasts. The cards keep their own label.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
