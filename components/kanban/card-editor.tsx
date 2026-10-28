"use client"

import { useEffect, useId, useRef, useState } from "react"
import { X } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { ImageViewer } from "@/components/image-viewer"
import { useKanban } from "@/components/kanban/kanban-provider"
import { useTrash } from "@/components/trash-provider"
import { WebLinksEditor } from "@/components/web-links/web-links-editor"
import { mediaUrl } from "@/lib/media"
import {
  REMIND_COLUMN_ID,
  draftIssue,
  type CardDraft,
  type CardRepeat,
  type CardStep,
  type KanbanCard,
  type RepeatMode,
  type RepeatRhythm,
} from "@/lib/kanban-data"
import type { MessageKey } from "@/lib/i18n"

const REPEAT_MODES: { id: RepeatMode; label: MessageKey }[] = [
  { id: "once", label: "editor.mode.once" },
  { id: "times", label: "editor.mode.times" },
  { id: "forever", label: "editor.mode.forever" },
]

const REPEAT_RHYTHMS: { id: RepeatRhythm; label: MessageKey }[] = [
  { id: "daily", label: "editor.rhythm.daily" },
  { id: "weekly", label: "editor.rhythm.weekly" },
  { id: "monthly", label: "editor.rhythm.monthly" },
]

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0]
const WEEKDAY_REFERENCE_SUNDAY = Date.UTC(2023, 0, 1)

function weekdayName(locale: string, day: number, style: "short" | "long") {
  return new Intl.DateTimeFormat(locale, { weekday: style, timeZone: "UTC" }).format(
    new Date(WEEKDAY_REFERENCE_SUNDAY + day * 86_400_000),
  )
}

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
  const { t } = useLanguage()
  const id = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const { setCards } = useKanban()
  const { archiveTask } = useTrash()
  const issue = draftIssue(draft)

  const removeImage = () =>
    setCards((previous) =>
      previous.map((item) => {
        if (item.id !== card.id) return item
        const { image: _image, ...rest } = item
        return rest
      }),
    )

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
            <p className="text-xs uppercase tracking-[0.14em] text-ink-soft">{t("editor.task")}</p>
            <h2 id={`${id}-heading`} className="font-serif text-xl font-medium text-ink">
              {t("editor.title")}
            </h2>
          </div>
          <button
            type="button"
            aria-label={t("common.close")}
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
                {t("editor.text")}
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

            {card.image ? <TaskPicture id={card.image} onRemove={removeImage} /> : null}

            <fieldset className="min-w-0">
              <legend className="mb-1.5 text-sm font-medium text-ink">{t("webLinks.title")}</legend>
              <WebLinksEditor links={draft.webLinks} onChange={(webLinks) => onChange({ webLinks })} />
            </fieldset>

            <StepList steps={draft.steps} onChange={(steps) => onChange({ steps })} />

            <RepeatSection repeat={draft.repeat} onChange={(repeat) => onChange({ repeat })} />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <fieldset className="min-w-0">
                <legend className="mb-1.5 text-sm font-medium text-ink">{t("editor.start")}</legend>
                <div className="flex flex-col gap-2">
                  <div>
                    <label htmlFor={`${id}-since`} className="sr-only">
                      {t("editor.startDate")}
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
                      {t("editor.startTime")}
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
                <legend className="mb-1.5 text-sm font-medium text-ink">{t("editor.end")}</legend>
                <div className="flex flex-col gap-2">
                  <div>
                    <label htmlFor={`${id}-due`} className="sr-only">
                      {t("editor.endDate")}
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
                      {t("editor.endTime")}
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

            {card.columnId === REMIND_COLUMN_ID && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="min-w-0">
                  <label htmlFor={`${id}-remind`} className="mb-1.5 block text-sm font-medium text-ink">
                    {t("editor.remind")}
                  </label>
                  <input
                    id={`${id}-remind`}
                    type="date"
                    value={draft.remind}
                    onChange={(event) => onChange({ remind: event.target.value })}
                    className={FIELD}
                  />
                </div>
                <p className="text-xs leading-relaxed text-ink-soft sm:self-end sm:pb-2">
                  {t("editor.remindNote")}
                </p>
              </div>
            )}

            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">{t("editor.linksLegend")}</legend>
              <div className="flex flex-col gap-2">
                <LinkToggle
                  label={t("editor.missionLink")}
                  hint={t("editor.missionLinkHint")}
                  color="var(--color-accent)"
                  checked={draft.missionLink}
                  onChange={(checked) => onChange({ missionLink: checked })}
                />
                <LinkToggle
                  label={t("editor.secondLine")}
                  hint={t("editor.secondLineHint")}
                  color="var(--color-tie)"
                  checked={draft.secondLine}
                  onChange={(checked) => onChange({ secondLine: checked })}
                />
              </div>
            </fieldset>

            {issue && (
              <p role="alert" className="text-sm text-accent">
                {t(issue)}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
  onClick={() => archiveTask(card.id)}
  className="rounded px-2 py-1.5 text-sm text-ink hover:bg-line/50 focus-visible:outline-2 focus-visible:outline-accent"
  >
  {t("archive.archive")}
              </button>
              <button
                type="button"
                onClick={onRevert}
                disabled={!dirty}
                className="rounded px-2 py-1.5 text-sm text-ink-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-accent disabled:invisible"
              >
                {t("editor.revert")}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-line px-3.5 py-1.5 text-sm text-ink hover:bg-line/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {t("common.close")}
              </button>
              <button
                type="submit"
                disabled={issue !== null || !dirty}
                className="rounded-md bg-ink px-3.5 py-1.5 text-sm font-medium text-board hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("common.save")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function TaskPicture({ id, onRemove }: { id: string; onRemove: () => void }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  return (
    <fieldset>
      <legend className="mb-1.5 flex w-full items-baseline justify-between gap-3 text-sm font-medium text-ink">
        <span>{t("editor.image")}</span>
        <button
          type="button"
          onClick={onRemove}
          className="rounded px-1.5 py-0.5 text-xs font-normal text-ink-soft hover:bg-line/50 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          {t("whiteboard.image.remove")}
        </button>
      </legend>
      <button
        type="button"
        aria-label={t("viewer.open")}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="flex w-full cursor-zoom-in justify-center rounded-md border border-line bg-board p-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- served from the app's own media store */}
        <img
          src={mediaUrl(id)}
          alt={t("whiteboard.image.alt")}
          draggable={false}
          className="block h-auto max-h-64 w-auto max-w-full object-contain"
        />
      </button>
      {open ? <ImageViewer id={id} onClose={() => setOpen(false)} /> : null}
    </fieldset>
  )
}

function StepList({ steps, onChange }: { steps: CardStep[]; onChange: (steps: CardStep[]) => void }) {
  const { t } = useLanguage()
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
        <span>{t("editor.steps")}</span>
        {steps.length > 0 && (
          <span className="text-xs font-normal text-ink-soft">
            {t("editor.stepsChecked", { done: finished, total: steps.length })}
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
                aria-label={t("editor.removeStep", { text: step.text })}
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
          {t("editor.newStep")}
        </label>
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          value={text}
          maxLength={200}
          placeholder={t("editor.addStepPlaceholder")}
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
          {t("editor.add")}
        </button>
      </div>
    </fieldset>
  )
}

function RepeatSection({ repeat, onChange }: { repeat: CardRepeat; onChange: (repeat: CardRepeat) => void }) {
  const { t, locale } = useLanguage()
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
      <legend className="mb-1.5 text-sm font-medium text-ink">{t("editor.repeat")}</legend>
      <div className="flex flex-col gap-3">
        <div role="radiogroup" aria-label={t("editor.repeatHow")} className="flex flex-wrap gap-x-4 gap-y-1.5">
          {REPEAT_MODES.map((mode) => (
            <label key={mode.id} className="flex cursor-pointer items-center gap-2 text-sm text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
              <input
                type="radio"
                name={`${name}-mode`}
                checked={repeat.mode === mode.id}
                onChange={() => onChange({ ...repeat, mode: mode.id })}
                className="size-4 accent-[var(--color-accent)]"
              />
              {t(mode.label)}
            </label>
          ))}
        </div>

        {repeat.mode === "times" && (
          <div className="flex items-center gap-2">
            <label htmlFor={timesId} className="text-sm text-ink">
              {t("editor.copies")}
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
            <div role="radiogroup" aria-label={t("editor.rhythmLabel")} className="flex flex-col gap-1.5">
              {REPEAT_RHYTHMS.map((rhythm) => (
                <label key={rhythm.id} className="flex cursor-pointer items-center gap-2 text-sm text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
                  <input
                    type="radio"
                    name={`${name}-rhythm`}
                    checked={repeat.rhythm === rhythm.id}
                    onChange={() => onChange({ ...repeat, rhythm: rhythm.id })}
                    className="size-4 accent-[var(--color-accent)]"
                  />
                  {t(rhythm.label)}
                </label>
              ))}
            </div>

            {repeat.rhythm === "weekly" && (
              <div role="group" aria-label={t("editor.daysLabel")} className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((day) => {
                  const on = repeat.weekdays.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={on}
                      aria-label={weekdayName(locale, day, "long")}
                      onClick={() => toggleDay(day)}
                      className={`min-w-11 rounded-md border px-2.5 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                        on ? "border-ink bg-ink text-board" : "border-line text-ink hover:bg-line/50"
                      }`}
                    >
                      {weekdayName(locale, day, "short")}
                    </button>
                  )
                })}
              </div>
            )}

            <p className="text-xs text-ink-soft">
              {t("editor.repeatNote")}
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
