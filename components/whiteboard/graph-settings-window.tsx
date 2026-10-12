"use client"

import { X } from "lucide-react"
import { useId } from "react"
import type { GoalRing } from "@/lib/board-data"
import { graphFilterActive, type GraphFilter } from "@/lib/graph-layout"

const WINDOW_CLASS =
  "pointer-events-auto flex max-h-full w-80 shrink-0 flex-col rounded-2xl border border-line bg-card shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)]"

const CLOSE_CLASS =
  "flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"

const FIELD_CLASS =
  "w-full rounded-lg border border-line bg-board px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-accent"

const LEGEND_CLASS = "text-xs font-medium tracking-[0.16em] text-ink-soft uppercase"

function Switch({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg py-1 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-accent"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-xs text-ink-soft text-pretty">{hint}</span>
      </span>
    </label>
  )
}

/** The right window of the Graph: how the graph is drawn, and which vertices show. Nothing here changes a card. */
export function GraphSettingsWindow({
  rings,
  tags,
  filter,
  showText,
  small,
  shown,
  total,
  onFilter,
  onShowText,
  onSmall,
  onClose,
}: {
  rings: GoalRing[]
  tags: string[]
  filter: GraphFilter
  showText: boolean
  small: boolean
  shown: number
  total: number
  onFilter: (filter: GraphFilter) => void
  onShowText: (value: boolean) => void
  onSmall: (value: boolean) => void
  onClose: () => void
}) {
  const uid = useId()
  const active = graphFilterActive(filter)

  return (
    <aside aria-label="Graph settings" className={WINDOW_CLASS}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.18em] text-ink-soft uppercase">Graph</p>
          <h2 className="mt-1 font-serif text-2xl leading-tight font-medium text-balance">Drawing settings</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close the drawing settings" className={CLOSE_CLASS}>
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto border-t border-line px-5 py-4">
        <fieldset className="flex flex-col gap-1">
          <legend className={LEGEND_CLASS}>Drawing</legend>
          <Switch
            label="Show vertex text"
            hint="Write each card's text under its vertex."
            checked={showText}
            onChange={onShowText}
          />
          <Switch
            label="Make vertices smaller"
            hint="Draw every vertex at about half its size."
            checked={small}
            onChange={onSmall}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className={LEGEND_CLASS}>Filters</legend>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-ring`} className="text-sm font-medium text-ink">
              Cluster
            </label>
            <select
              id={`${uid}-ring`}
              value={filter.ringId ?? ""}
              onChange={(event) => onFilter({ ...filter, ringId: event.target.value || null })}
              className={FIELD_CLASS}
            >
              <option value="">All clusters</option>
              {rings.map((ring) => (
                <option key={ring.id} value={ring.id}>
                  {ring.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-tag`} className="text-sm font-medium text-ink">
              Cards with the hashtag
            </label>
            <select
              id={`${uid}-tag`}
              value={filter.tag ?? ""}
              onChange={(event) => onFilter({ ...filter, tag: event.target.value || null })}
              className={FIELD_CLASS}
            >
              <option value="">Any hashtag</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>
          </div>
          <p role="status" className="text-xs text-ink-soft">
            {active ? `Showing ${shown} of ${total} vertices.` : `Showing every vertex (${total}).`}
          </p>
          <button
            type="button"
            onClick={() => onFilter({ ringId: null, tag: null })}
            className="self-start rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Reset filters
          </button>
        </fieldset>
      </div>
    </aside>
  )
}
