"use client"

import { useId, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { useWorkspace } from "@/components/workspace-provider"
import { shortDate } from "@/lib/calendar"
import {
  REVIEW_FIELDS,
  emptyReview,
  finishedTitles,
  shiftWeek,
  weekEnd,
  weekStart,
  type TaskState,
  type WeeklyReview as Review,
} from "@/lib/dashboard"
import type { MessageKey } from "@/lib/i18n"

type Draft = Omit<Review, "savedAt">

const draftOf = (review: Review | undefined): Draft =>
  review ? { finished: review.finished, moved: review.moved, keep: review.keep, change: review.change, stop: review.stop } : emptyReview()

const sameDraft = (a: Draft, b: Draft) => REVIEW_FIELDS.every((field) => a[field.id] === b[field.id])

export function WeeklyReview({ today, tasks }: { today: string; tasks: TaskState[] }) {
  const [week, setWeek] = useState(weekStart(today))
  const { t, locale } = useLanguage()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label={t("dashboard.review.prev")}
          onClick={() => setWeek(shiftWeek(week, -1))}
          className="flex size-9 items-center justify-center rounded-md border border-line bg-card text-ink-soft transition-colors hover:bg-line/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="min-w-44 text-center text-sm font-medium text-ink tabular-nums">
          {t("dashboard.review.range", { from: shortDate(week, locale), to: shortDate(weekEnd(week), locale) })}
          {week === weekStart(today) && (
            <span className="font-normal text-ink-soft"> {t("dashboard.review.thisWeek")}</span>
          )}
        </p>
        <button
          type="button"
          aria-label={t("dashboard.review.next")}
          onClick={() => setWeek(shiftWeek(week, 1))}
          className="flex size-9 items-center justify-center rounded-md border border-line bg-card text-ink-soft transition-colors hover:bg-line/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <ReviewForm key={week} week={week} tasks={tasks} />
    </div>
  )
}

function ReviewForm({ week, tasks }: { week: string; tasks: TaskState[] }) {
  const { doc, report } = useWorkspace()
  const { t, tn, locale } = useLanguage()
  const id = useId()
  const reviews = doc.reviews ?? {}
  const saved = reviews[week]
  const [draft, setDraft] = useState<Draft>(() => draftOf(saved))
  const [status, setStatus] = useState("")

  const finished = finishedTitles(tasks, week)
  const dirty = !sameDraft(draft, draftOf(saved))
  const blank = REVIEW_FIELDS.every((field) => draft[field.id].trim() === "")

  const save = () => {
    report("reviews", { ...reviews, [week]: { ...draft, savedAt: new Date().toISOString() } })
    setStatus(t("dashboard.review.saved", { date: shortDate(week, locale) }))
  }

  const addFinished = () => {
    const lines = finished.map((title) => `- ${title}`).join("\n")
    setDraft((current) => ({ ...current, finished: current.finished.trim() ? `${current.finished.trim()}\n${lines}` : lines }))
    setStatus(t("dashboard.review.addedFinished"))
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (dirty && !blank) save()
      }}
      className="flex flex-col gap-4"
    >
      {REVIEW_FIELDS.map((field) => (
        <div key={field.id} className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <label htmlFor={`${id}-${field.id}`} className="text-sm font-medium text-ink">
              {t(`dashboard.review.field.${field.id}` as MessageKey)}
            </label>
            {field.id === "finished" && finished.length > 0 && (
              <button
                type="button"
                onClick={addFinished}
                className="rounded text-xs text-accent underline underline-offset-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {tn("dashboard.review.addFinished", finished.length)}
              </button>
            )}
          </div>
          <textarea
            id={`${id}-${field.id}`}
            aria-describedby={`${id}-${field.id}-hint`}
            rows={3}
            value={draft[field.id]}
            onChange={(event) => setDraft((current) => ({ ...current, [field.id]: event.target.value }))}
            className="w-full resize-y rounded-md border border-line bg-card px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          />
          <p id={`${id}-${field.id}-hint`} className="text-xs text-ink-soft">
            {t(`dashboard.review.field.${field.id}Hint` as MessageKey)}
          </p>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!dirty || blank}
          className="h-9 rounded-md bg-accent px-4 text-sm font-medium text-card transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("dashboard.review.save")}
        </button>
        <p className="text-sm text-ink-soft">
          {saved
            ? t("dashboard.review.lastSaved", {
                date: new Date(saved.savedAt).toLocaleDateString(locale, { month: "short", day: "numeric" }),
              })
            : t("dashboard.review.notSaved")}
          {dirty && saved ? ` ${t("dashboard.review.unsaved")}` : ""}
        </p>
      </div>
      <p role="status" className="min-h-5 text-sm text-ink-soft">
        {status}
      </p>
    </form>
  )
}
