"use client"

import { useEffect, useId, useRef } from "react"
import { X } from "lucide-react"
import { draftIssue, type CardDraft, type KanbanCard } from "@/lib/kanban-data"

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
