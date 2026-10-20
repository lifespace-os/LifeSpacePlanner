"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import clsx from "clsx"
import { GanttBar } from "@/components/gantt/gantt-bar"
import { useGoals } from "@/components/goals-provider"
import { CardEditor } from "@/components/kanban/card-editor"
import { useKanban } from "@/components/kanban/kanban-provider"
import { useMission } from "@/components/mission-provider"
import { addDays, calendarTasks, daysBetween, shortDate, type CalendarTask } from "@/lib/calendar"
import {
  DAY_WIDTH,
  chartRange,
  describeShape,
  ladderSections,
  monthSpans,
  shapeOf,
  type DatePatch,
} from "@/lib/gantt"
import { draftOf, sameDraft } from "@/lib/kanban-data"
import { todayIso } from "@/lib/repeat"

const LABEL_WIDTH = 256

const buttonClass =
  "flex h-9 items-center justify-center rounded-md border border-line bg-card px-3 text-sm text-ink transition-colors hover:bg-line/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"

const gridStyle = (count: number) => ({
  width: count * DAY_WIDTH,
  backgroundImage: "linear-gradient(to right, var(--color-line) 1px, transparent 1px)",
  backgroundSize: `${DAY_WIDTH * 7}px 100%`,
})

export function GanttScreen() {
  const { cards, setCards, columnsByBoard, openId, openCard, closeCard, drafts, editDraft, revertDraft, saveDraft } =
    useKanban()
  const { notes } = useGoals()
  const { missionText } = useMission()
  const [today, setToday] = useState<string | null>(null)
  const [status, setStatus] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrolled = useRef(false)

  useEffect(() => setToday(todayIso()), [])

  const tasks = useMemo(() => {
    const dated = (task: CalendarTask) => shapeOf(task.card)
    return calendarTasks(cards, columnsByBoard).sort((a, b) => {
      const aShape = dated(a)
      const bShape = dated(b)
      if ((aShape.kind === "none") !== (bShape.kind === "none")) return aShape.kind === "none" ? 1 : -1
      const aDay = aShape.kind === "bar" ? aShape.from : aShape.kind === "point" ? aShape.day : ""
      const bDay = bShape.kind === "bar" ? bShape.from : bShape.kind === "point" ? bShape.day : ""
      return aDay.localeCompare(bDay) || a.card.title.localeCompare(b.card.title)
    })
  }, [cards, columnsByBoard])

  const sections = useMemo(() => {
    const byId = new Map(cards.map((card) => [card.id, card]))
    const counts = new Map<string, number>()
    for (const task of tasks) {
      const goalIds = new Set(task.ids.flatMap((id) => byId.get(id)?.goalIds ?? []))
      for (const id of goalIds) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return ladderSections(notes, counts)
  }, [notes, cards, tasks])

  const range = useMemo(() => {
    if (!today) return null
    const days = tasks.flatMap((task) => {
      const shape = shapeOf(task.card)
      return shape.kind === "bar" ? [shape.from, shape.to] : shape.kind === "point" ? [shape.day] : []
    })
    return chartRange(days, today)
  }, [tasks, today])

  const scrollToToday = (smooth: boolean) => {
    if (!today || !range || !scrollRef.current) return
    const left = daysBetween(range.start, today) * DAY_WIDTH - 120
    scrollRef.current.scrollTo({ left: Math.max(0, left), behavior: smooth ? "smooth" : "auto" })
  }

  useEffect(() => {
    if (scrolled.current || !range) return
    scrolled.current = true
    scrollToToday(false)
  })

  if (!today || !range) return <main aria-busy="true" className="min-h-[calc(100dvh-3.5rem)]" />

  const { start, count } = range
  const months = monthSpans(start, count)
  const todayLeft = LABEL_WIDTH + daysBetween(start, today) * DAY_WIDTH + DAY_WIDTH / 2
  const openCardData = openId ? (cards.find((item) => item.id === openId) ?? null) : null

  const schedule = (task: CalendarTask, patch: DatePatch, how: "move" | "stretch") => {
    setCards((previous) => previous.map((item) => (task.ids.includes(item.id) ? { ...item, ...patch } : item)))
    for (const id of task.ids) if (id in drafts) editDraft(id, patch)
    const result = describeShape(shapeOf(patch))
    setStatus(
      how === "move"
        ? `Moved “${task.card.title}” to ${result}.`
        : `Stretched “${task.card.title}” into a bar, ${result}.`,
    )
  }

  const labelCell = "sticky left-0 z-10 flex shrink-0 flex-col justify-center border-r border-line px-3 py-1.5"

  return (
    <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-4 py-5 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl font-medium tracking-tight">Gantt</h1>
          <button type="button" onClick={() => scrollToToday(true)} className={buttonClass}>
            Today
          </button>
        </div>
        <p className="text-sm text-ink-soft text-pretty">
          A bar runs from a start date to an end date. A dot has only an end date: drag it to stretch it into a bar.
        </p>
      </header>

      <p role="status" className="min-h-5 text-sm text-ink-soft">
        {status}
      </p>

      <div
        ref={scrollRef}
        role="region"
        aria-label="Gantt chart"
        tabIndex={0}
        className="max-h-[calc(100dvh-14rem)] overflow-auto rounded-xl border border-line bg-card focus-visible:outline-2 focus-visible:outline-accent"
      >
        <div className="relative" style={{ width: LABEL_WIDTH + count * DAY_WIDTH }}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 z-[5] w-px bg-accent"
            style={{ left: todayLeft }}
          />

          <div className="sticky top-0 z-20 flex border-b border-line bg-card">
            <div className={clsx(labelCell, "top-0 z-30 bg-card")} style={{ width: LABEL_WIDTH }}>
              <span className="text-xs text-ink-soft">Mission to tasks</span>
            </div>
            <div className="shrink-0" style={{ width: count * DAY_WIDTH }}>
              <div className="relative h-6 border-b border-line/60">
                {months.map((month) => (
                  <span
                    key={month.key}
                    className="absolute top-0 flex h-6 items-center border-l border-line text-xs font-medium text-ink"
                    style={{ left: month.offset * DAY_WIDTH, width: month.days * DAY_WIDTH }}
                  >
                    <span className="sticky whitespace-nowrap px-2" style={{ left: LABEL_WIDTH }}>
                      {month.label}
                    </span>
                  </span>
                ))}
              </div>
              <div className="flex h-6">
                {Array.from({ length: count }, (_, offset) => {
                  const day = addDays(start, offset)
                  return (
                    <span
                      key={day}
                      title={shortDate(day)}
                      className={clsx(
                        "flex shrink-0 items-center justify-center text-[10px]",
                        day === today ? "font-semibold text-accent" : "text-ink-soft",
                      )}
                      style={{ width: DAY_WIDTH }}
                    >
                      {Number(day.slice(8))}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>

          <SectionHeading name="Mission" />
          <div className="flex min-h-9 border-b border-line/60">
            <div className={clsx(labelCell, "bg-card")} style={{ width: LABEL_WIDTH }}>
              <p className={clsx("text-sm text-pretty", missionText ? "font-serif italic text-ink" : "text-ink-soft")}>
                {missionText ? `\u201C${missionText}\u201D` : "No mission sentence yet."}
              </p>
            </div>
            <div className="shrink-0" style={gridStyle(count)} />
          </div>

          {sections.map((section) => (
            <Fragment key={section.id}>
              <SectionHeading name={section.name} />
              {section.rows.length === 0 && (
                <div className="flex min-h-9 border-b border-line/60">
                  <div className={clsx(labelCell, "bg-card")} style={{ width: LABEL_WIDTH }}>
                    <p className="text-sm text-ink-soft">No cards on this ring yet.</p>
                  </div>
                  <div className="shrink-0" style={gridStyle(count)} />
                </div>
              )}
              {section.rows.map((row) => (
                <div key={row.id} className="flex min-h-9 border-b border-line/60">
                  <div className={clsx(labelCell, "bg-card")} style={{ width: LABEL_WIDTH }}>
                    <span className="text-[11px] uppercase tracking-wide text-ink-soft">
                      {row.levelName}
                      {row.taskCount > 0 && ` · ${row.taskCount} ${row.taskCount === 1 ? "task" : "tasks"}`}
                    </span>
                    <span className="line-clamp-2 text-sm text-pretty text-ink">{row.text}</span>
                  </div>
                  <div className="shrink-0" style={gridStyle(count)} />
                </div>
              ))}
            </Fragment>
          ))}

          <SectionHeading name="Tasks" />
          {tasks.length === 0 && (
            <div className="flex min-h-9 border-b border-line/60">
              <div className={clsx(labelCell, "bg-card")} style={{ width: LABEL_WIDTH }}>
                <p className="text-sm text-ink-soft">No tasks yet.</p>
              </div>
              <div className="shrink-0" style={gridStyle(count)} />
            </div>
          )}
          {tasks.map((task) => (
            <div key={task.id} className="flex min-h-9 border-b border-line/60">
              <div className={clsx(labelCell, "bg-card")} style={{ width: LABEL_WIDTH }}>
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => openCard(task.id)}
                  className={clsx(
                    "truncate text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    task.done ? "text-ink-soft" : "text-ink",
                  )}
                >
                  {task.card.title}
                </button>
                <span className="text-[11px] text-ink-soft">{describeShape(shapeOf(task.card))}</span>
              </div>
              <div className="relative shrink-0" style={gridStyle(count)}>
                <GanttBar task={task} start={start} onOpen={openCard} onSchedule={schedule} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {openCardData && (
        <CardEditor
          key={openCardData.id}
          card={openCardData}
          draft={drafts[openCardData.id] ?? draftOf(openCardData)}
          dirty={openCardData.id in drafts && !sameDraft(drafts[openCardData.id]!, draftOf(openCardData))}
          onChange={(patch) => editDraft(openCardData.id, patch)}
          onClose={closeCard}
          onSave={() => {
            if (saveDraft(openCardData.id)) {
              setStatus("Saved the card.")
              closeCard()
            }
          }}
          onRevert={() => revertDraft(openCardData.id)}
        />
      )}
    </main>
  )
}

function SectionHeading({ name }: { name: string }) {
  return (
    <div className="flex h-8 border-b border-line bg-accent-soft">
      <h2 className="sticky left-0 flex items-center px-3 font-serif text-sm font-medium text-ink">{name}</h2>
    </div>
  )
}
