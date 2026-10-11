"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { GOAL_NAME_MODES, GOAL_POINT_SIZE, GOAL_RING_SCALE, type GoalNameMode } from "@/lib/board-data"

const WINDOW_CLASS =
  "pointer-events-auto flex max-h-full w-80 shrink-0 flex-col rounded-2xl border border-line bg-card shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)]"

const CLOSE_CLASS =
  "flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"

const BUTTON_CLASS =
  "rounded-lg border border-line bg-card px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"

const INPUT_CLASS =
  "h-9 w-24 rounded-lg border border-line bg-card px-3 text-right text-sm text-ink tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"

function parseNumber(text: string) {
  const value = Number(text)
  return text.trim() !== "" && Number.isFinite(value) ? value : null
}

/** A number the person types. A valid number applies at once; an empty or out-of-range entry is settled when the field loses focus. */
function NumberField({
  id,
  label,
  unit,
  value,
  min,
  limit,
  onCommit,
}: {
  id: string
  label: string
  unit: string
  value: number
  min: number
  limit: number
  onCommit: (value: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          step="any"
          value={draft ?? String(value)}
          onChange={(event) => {
            setDraft(event.target.value)
            const next = parseNumber(event.target.value)
            if (next !== null && next >= min && next <= limit) onCommit(next)
          }}
          onBlur={() => {
            const next = draft === null ? null : parseNumber(draft)
            if (next !== null) onCommit(Math.min(limit, Math.max(min, next)))
            setDraft(null)
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur()
          }}
          className={INPUT_CLASS}
        />
        <span className="w-6 text-sm text-ink-soft">{unit}</span>
      </div>
    </div>
  )
}

/**
 * The left window of the Map. It shows the mission sentence, and holds the ring settings:
 * thickness, point size, when names show, every thread, and spacing the points evenly.
 */
export function GoalMapWindow({
  missionText,
  scale,
  pointSize,
  names,
  showAll,
  onWriteMission,
  onScale,
  onPointSize,
  onNames,
  onShowAll,
  onSpace,
  onClose,
}: {
  missionText: string
  scale: number
  pointSize: number
  names: GoalNameMode
  showAll: boolean
  onWriteMission: () => void
  onScale: (scale: number) => void
  onPointSize: (size: number) => void
  onNames: (names: GoalNameMode) => void
  onShowAll: (showAll: boolean) => void
  onSpace: () => void
  onClose: () => void
}) {
  const saved = missionText.length > 0

  return (
    <aside aria-label="Map window" className={WINDOW_CLASS}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.18em] text-ink-soft uppercase">Goals</p>
          <h2 className="mt-1 font-serif text-2xl leading-tight font-medium text-balance">Mission and rings</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Hide map window" className={CLOSE_CLASS}>
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto border-t border-line px-5 py-4">
        <section aria-label="Mission sentence" className="flex flex-col gap-2">
          <h3 className="text-xs font-medium tracking-[0.16em] text-ink-soft uppercase">Mission</h3>
          {saved ? (
            <p className="font-serif text-lg leading-snug text-pretty break-words text-ink italic">
              {`\u201C${missionText}\u201D`}
            </p>
          ) : (
            <button type="button" onClick={onWriteMission} className={`${BUTTON_CLASS} w-fit`}>
              Write the mission
            </button>
          )}
        </section>

        <section aria-label="Ring settings" className="flex flex-col gap-4 border-t border-line pt-4">
          <h3 className="text-xs font-medium tracking-[0.16em] text-ink-soft uppercase">Ring settings</h3>
          <NumberField
            id="goal-map-thickness"
            label="Ring thickness"
            unit="%"
            value={Math.round(scale * 1000) / 10}
            min={GOAL_RING_SCALE.min * 100}
            limit={GOAL_RING_SCALE.max * 100}
            onCommit={(value) => onScale(value / 100)}
          />
          <NumberField
            id="goal-map-point-size"
            label="Point size"
            unit="px"
            value={pointSize}
            min={GOAL_POINT_SIZE.min}
            limit={GOAL_POINT_SIZE.max}
            onCommit={onPointSize}
          />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-ink">Names</legend>
            {GOAL_NAME_MODES.map((mode) => (
              <label key={mode.id} className="flex items-center gap-2.5 text-sm text-ink">
                <input
                  type="radio"
                  name="goal-map-names"
                  checked={names === mode.id}
                  onChange={() => onNames(mode.id)}
                  className="size-4 accent-accent"
                />
                {mode.label}
              </label>
            ))}
          </fieldset>
          <label className="flex items-center gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(event) => onShowAll(event.target.checked)}
              className="size-4 accent-accent"
            />
            Show every thread
          </label>
          <button type="button" onClick={onSpace} className={`${BUTTON_CLASS} w-full`}>
            Space points evenly
          </button>
        </section>
      </div>
    </aside>
  )
}
