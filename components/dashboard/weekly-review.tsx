"use client"

import { useId, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
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

type Draft = Omit<Review, "savedAt">

const draftOf = (review: Review | undefined): Draft =>
  review ? { finished: review.finished, moved: review.moved, keep: review.keep, change: review.change, stop: review.stop } : emptyReview()

const sameDraft = (a: Draft, b: Draft) => REVIEW_FIELDS.every((field) => a[field.id] === b[field.id])

export function WeeklyReview({ today, tasks }: { today: string; tasks: TaskState[] }) {
  const [week, setWeek] = useState(weekStart(today))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label="Previous week"
          onClick={() => setWeek(shiftWeek(week, -1))}
          className="flex size-9 items-center justify-center rounded-md border border-line bg-card text-ink-soft transition-colors hover:bg-line/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="min-w-44 text-center text-sm font-medium text-ink tabular-nums">
          {shortDate(week)} to {shortDate(weekEnd(week))}
          {week === weekStart(today) && <span className="font-normal text-ink-soft"> (this week)</span>}
        </p>
        <button
          type="button"
          aria-label="Next week"
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
    setStatus(`Saved the review for the week of ${shortDate(week)}.`)
  }

  const addFinished = () => {
    const lines = finished.map((title) => `- ${title}`).join("\n")
    setDraft((current) => ({ ...current, finished: current.finished.trim() ? `${current.finished.trim()}\n${lines}` : lines }))
    setStatus("Added the tasks finished this week.")
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
              {field.label}
            </label>
            {field.id === "finished" && finished.length > 0 && (
              <button
                type="button"
                onClick={addFinished}
                className="rounded text-xs text-accent underline underline-offset-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Add the {finished.length} finished {finished.length === 1 ? "task" : "tasks"}
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
            {field.hint}
          </p>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!dirty || blank}
          className="h-9 rounded-md bg-accent px-4 text-sm font-medium text-card transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save review
        </button>
        <p className="text-sm text-ink-soft">
          {saved ? `Last saved ${new Date(saved.savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}.` : "Not saved yet."}
          {dirty && saved ? " You have changes that are not saved." : ""}
        </p>
      </div>
      <p role="status" className="min-h-5 text-sm text-ink-soft">
        {status}
      </p>
    </form>
  )
}
