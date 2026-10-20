"use client"

import { useEffect, useId, useRef, useState } from "react"
import { X } from "lucide-react"
import {
  draftIssue,
  type CardDraft,
  type CardRepeat,
  type CardStep,
  type KanbanCard,
  type RepeatMode,
  type RepeatRhythm,
} from "@/lib/kanban-data"

const REPEAT_MODES: { id: RepeatMode; label: string }[] = [
  { id: "once", label: "Once" },
  { id: "times", label: "A number of times" },
  { id: "forever", label: "Until I turn it off" },
]

const REPEAT_RHYTHMS: { id: RepeatRhythm; label: string }[] = [
  { id: "daily", label: "Every day" },
  { id: "weekly", label: "Chosen days of the week" },
  { id: "monthly", label: "The same date every month" },
]

const WEEKDAYS: { day: number; short: string; long: string }[] = [
  { day: 1, short: "Mon", long: "Monday" },
  { day: 2, short: "Tue", long: "Tuesday" },
  { day: 3, short: "Wed", long: "Wednesday" },
  { day: 4, short: "Thu", long: "Thursday" },
  { day: 5, short: "Fri", long: "Friday" },
  { day: 6, short: "Sat", long: "Saturday" },
  { day: 0, short: "Sun", long: "Sunday" },
]

type Props = {
  card: KanbanCard
  draft: CardDraft
  dirty: boolean
  onChange: (patch: Partial<CardDraft>) => void
  onClose: () => void
  onSave: () => void
  onRevert: () => void
}

const FIELD =
  "w-full rounded-md border border-line bg-board px-2.5 py-1.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"

export function CardEditor({ card, draft, dirty, onChange, onClose, onSave, onRevert }: Props) {
  const id = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const issue = draftIssue(draft)

  useEffect(() => {
    titleRef.current?.focus()
    const cardId = card.id
    return () => {
      document.querySelector<HTMLElement>(`[data-card-id="${cardId}"] [data-card-open]`)?.focus()
    }
  }, [card.id])

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation()
      onClose()
      return
    }
    if (event.key !== "Tab") return
    const focusable = [
      ...(dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input, textarea, [href]") ?? []),
    ]
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-heading`}
        data-card-window={card.id}
        onKeyDown={onKeyDown}
        className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-lg border border-line bg-card shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-ink-soft">Task</p>
            <h2 id={`${id}-heading`} className="font-serif text-xl font-medium text-ink">
              Edit card
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-mr-1.5 flex size-8 items-center justify-center rounded text-ink-soft hover:bg-line/50 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            if (!issue) onSave()
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
            <div>
              <label htmlFor={`${id}-text`} className="mb-1.5 block text-sm font-medium text-ink">
                Text
              </label>
              <textarea
                id={`${id}-text`}
                ref={titleRef}
                rows={3}
                value={draft.title}
                onChange={(event) => onChange({ title: event.target.value })}
                className={`${FIELD} resize-none leading-snug`}
              />
            </div>

            <StepList steps={draft.steps} onChange={(steps) => onChange({ steps })} />

            <RepeatSection repeat={draft.repeat} onChange={(repeat) => onChange({ repeat })} />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <fieldset className="min-w-0">
                <legend className="mb-1.5 text-sm font-medium text-ink">Start</legend>
                <div className="flex flex-col gap-2">
                  <div>
                    <label htmlFor={`${id}-since`} className="sr-only">
                      Start date
                    </label>
                    <input
                      id={`${id}-since`}
                      type="date"
                      value={draft.since}
                      onChange={(event) => onChange({ since: event.target.value })}
                      className={FIELD}
                    />
                  </div>
                  <div>
                    <label htmlFor={`${id}-start-time`} className="sr-only">
                      Start time
                    </label>
                    <input
                      id={`${id}-start-time`}
                      type="time"
                      value={draft.startTime}
                      onChange={(event) => onChange({ startTime: event.target.value })}
                      className={FIELD}
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="min-w-0">
                <legend className="mb-1.5 text-sm font-medium text-ink">End</legend>
                <div className="flex flex-col gap-2">
                  <div>
                    <label htmlFor={`${id}-due`} className="sr-only">
                      End date
                    </label>
                    <input
                      id={`${id}-due`}
                      type="date"
                      value={draft.due}
                      onChange={(event) => onChange({ due: event.target.value })}
                      className={FIELD}
                    />
                  </div>
                  <div>
                    <label htmlFor={`${id}-end-time`} className="sr-only">
                      End time
                    </label>
                    <input
                      id={`${id}-end-time`}
                      type="time"
                      value={draft.endTime}
                      onChange={(event) => onChange({ endTime: event.target.value })}
                      className={FIELD}
                    />
                  </div>
                </div>
              </fieldset>
            </div>

            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">Links to the mission</legend>
              <div className="flex flex-col gap-2">
                <LinkToggle
                  label="Link to the mission"
                  hint="The mission is a goal above this task."
                  color="var(--color-accent)"
                  checked={draft.missionLink}
                  onChange={(checked) => onChange({ missionLink: checked })}
                />
                <LinkToggle
                  label="Second line"
                  hint="A free line to the mission. No ring is needed."
                  color="var(--color-tie)"
                  checked={draft.secondLine}
                  onChange={(checked) => onChange({ secondLine: checked })}
                />
              </div>
            </fieldset>

            {issue && (
              <p role="alert" className="text-sm text-accent">
                {issue}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
            <button
              type="button"
              onClick={onRevert}
              disabled={!dirty}
              className="rounded px-2 py-1.5 text-sm text-ink-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-accent disabled:invisible"
            >
              Revert changes
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-line px-3.5 py-1.5 text-sm text-ink hover:bg-line/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={issue !== null || !dirty}
                className="rounded-md bg-ink px-3.5 py-1.5 text-sm font-medium text-board hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function StepList({ steps, onChange }: { steps: CardStep[]; onChange: (steps: CardStep[]) => void }) {
  const [text, setText] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const finished = steps.filter((step) => step.done).length

  const addStep = () => {
    const clean = text.trim()
    if (!clean) return
    onChange([...steps, { id: crypto.randomUUID(), text: clean, done: false }])
    setText("")
    inputRef.current?.focus()
  }

  const toggleStep = (stepId: string) =>
    onChange(steps.map((step) => (step.id === stepId ? { ...step, done: !step.done } : step)))

  const removeStep = (stepId: string) => {
    onChange(steps.filter((step) => step.id !== stepId))
    inputRef.current?.focus()
  }

  return (
    <fieldset>
      <legend className="mb-1.5 flex w-full items-baseline justify-between gap-3 text-sm font-medium text-ink">
        <span>Steps</span>
        {steps.length > 0 && (
          <span className="text-xs font-normal text-ink-soft">
            {finished} of {steps.length} checked
          </span>
        )}
      </legend>
      {steps.length > 0 && (
        <ul className="mb-2 flex flex-col gap-1">
          {steps.map((step) => (
            <li key={step.id} className="flex items-start gap-2.5 rounded-md border border-line px-2.5 py-1.5">
              <input
                type="checkbox"
                checked={step.done}
                onChange={() => toggleStep(step.id)}
                aria-label={step.text}
                className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)]"
              />
              <span className={`min-w-0 flex-1 break-words text-sm leading-snug ${step.done ? "text-ink-soft line-through" : "text-ink"}`}>
                {step.text}
              </span>
              <button
                type="button"
                aria-label={`Remove step: ${step.text}`}
                onClick={() => removeStep(step.id)}
                className="-mr-1 flex size-6 shrink-0 items-center justify-center rounded text-ink-soft hover:bg-line/50 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <label htmlFor={inputId} className="sr-only">
          New step
        </label>
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          value={text}
          maxLength={200}
          placeholder="Add a step"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.nativeEvent.isComposing || event.keyCode === 229) return
            event.preventDefault()
            addStep()
          }}
          className={FIELD}
        />
        <button
          type="button"
          onClick={addStep}
          disabled={!text.trim()}
          className="shrink-0 rounded-md border border-line px-3 py-1.5 text-sm text-ink hover:bg-line/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </fieldset>
  )
}

function RepeatSection({ repeat, onChange }: { repeat: CardRepeat; onChange: (repeat: CardRepeat) => void }) {
  const name = useId()
  const timesId = useId()
  const repeating = repeat.mode !== "once"

  const toggleDay = (day: number) =>
    onChange({
      ...repeat,
      weekdays: repeat.weekdays.includes(day) ? repeat.weekdays.filter((item) => item !== day) : [...repeat.weekdays, day].sort(),
    })

  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink">Repeat</legend>
      <div className="flex flex-col gap-3">
        <div role="radiogroup" aria-label="How often the task repeats" className="flex flex-wrap gap-x-4 gap-y-1.5">
          {REPEAT_MODES.map((mode) => (
            <label key={mode.id} className="flex cursor-pointer items-center gap-2 text-sm text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
              <input
                type="radio"
                name={`${name}-mode`}
                checked={repeat.mode === mode.id}
                onChange={() => onChange({ ...repeat, mode: mode.id })}
                className="size-4 accent-[var(--color-accent)]"
              />
              {mode.label}
            </label>
          ))}
        </div>

        {repeat.mode === "times" && (
          <div className="flex items-center gap-2">
            <label htmlFor={timesId} className="text-sm text-ink">
              Copies to come
            </label>
            <input
              id={timesId}
              type="number"
              min={1}
              max={365}
              inputMode="numeric"
              value={repeat.times || ""}
              onChange={(event) => onChange({ ...repeat, times: Number(event.target.value) })}
              className={`${FIELD} w-24`}
            />
          </div>
        )}

        {repeating && (
          <div className="flex flex-col gap-2">
            <div role="radiogroup" aria-label="The rhythm" className="flex flex-col gap-1.5">
              {REPEAT_RHYTHMS.map((rhythm) => (
                <label key={rhythm.id} className="flex cursor-pointer items-center gap-2 text-sm text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
                  <input
                    type="radio"
                    name={`${name}-rhythm`}
                    checked={repeat.rhythm === rhythm.id}
                    onChange={() => onChange({ ...repeat, rhythm: rhythm.id })}
                    className="size-4 accent-[var(--color-accent)]"
                  />
                  {rhythm.label}
                </label>
              ))}
            </div>

            {repeat.rhythm === "weekly" && (
              <div role="group" aria-label="Days of the week" className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((weekday) => {
                  const on = repeat.weekdays.includes(weekday.day)
                  return (
                    <button
                      key={weekday.day}
                      type="button"
                      aria-pressed={on}
                      aria-label={weekday.long}
                      onClick={() => toggleDay(weekday.day)}
                      className={`min-w-11 rounded-md border px-2.5 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                        on ? "border-ink bg-ink text-board" : "border-line text-ink hover:bg-line/50"
                      }`}
                    >
                      {weekday.short}
                    </button>
                  )
                })}
              </div>
            )}

            <p className="text-xs text-ink-soft">
              When this task moves to Done, one next copy appears in the column it left. The finished card stays in Done.
            </p>
          </div>
        )}
      </div>
    </fieldset>
  )
}

function LinkToggle({
  label,
  hint,
  color,
  checked,
  onChange,
}: {
  label: string
  hint: string
  color: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line px-3 py-2.5 hover:bg-line/30 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)]"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-ink">{label}</span>
        <span className="block text-xs text-ink-soft">{hint}</span>
      </span>
      <svg aria-hidden="true" width="36" height="10" className="mt-1 shrink-0">
        <line x1="2" y1="5" x2="34" y2="5" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity={checked ? 1 : 0.35} />
      </svg>
    </label>
  )
}
