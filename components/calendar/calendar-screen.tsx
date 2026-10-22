"use client"

import { useEffect, useMemo, useState } from "react"
import clsx from "clsx"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { MonthGrid } from "@/components/calendar/month-grid"
import { TaskChip } from "@/components/calendar/task-chip"
import { TimeGrid } from "@/components/calendar/time-grid"
import { YearGrid } from "@/components/calendar/year-grid"
import { CardEditor } from "@/components/kanban/card-editor"
import { useKanban } from "@/components/kanban/kanban-provider"
import { useLanguage } from "@/components/language-provider"
import type { MessageKey } from "@/lib/i18n"
import {
  CALENDAR_MODES,
  calendarTasks,
  describeDrop,
  dropPatch,
  rangeTitle,
  samePatch,
  shiftFocus,
  weekDays,
  type CalendarMode,
  type DropSlot,
} from "@/lib/calendar"
import { draftOf, sameDraft } from "@/lib/kanban-data"
import { todayIso } from "@/lib/repeat"

const buttonClass =
  "flex h-9 items-center justify-center rounded-md border border-line bg-card px-3 text-sm text-ink transition-colors hover:bg-line/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"

export function CalendarScreen() {
  const { cards, setCards, columnsByBoard, openId, openCard, closeCard, drafts, editDraft, revertDraft, saveDraft } =
    useKanban()
  const { t, locale } = useLanguage()
  const [mode, setMode] = useState<CalendarMode>("month")
  const [today, setToday] = useState<string | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [status, setStatus] = useState("")

  useEffect(() => setToday(todayIso()), [])

  const tasks = useMemo(() => calendarTasks(cards, columnsByBoard), [cards, columnsByBoard])
  const openCardData = openId ? (cards.find((item) => item.id === openId) ?? null) : null

  if (!today) return <main aria-busy="true" className="min-h-[calc(100dvh-3.5rem)]" />

  const focus = picked ?? today
  const [year, month] = focus.split("-").map(Number) as [number, number]
  const undated = tasks.filter((task) => !task.first && !task.done)

  const dropTask = (taskId: string, day: string, slot: DropSlot) => {
    setDraggingId(null)
    const task = tasks.find((item) => item.id === taskId)
    if (!task) return
    const patch = dropPatch(task.card, day, slot)
    if (samePatch(task.card, patch)) return
    setCards((previous) => previous.map((item) => (task.ids.includes(item.id) ? { ...item, ...patch } : item)))
    for (const id of task.ids) if (id in drafts) editDraft(id, patch)
    const when = describeDrop(day, patch, locale, {
      from: (time) => t("time.from", { time }),
      until: (time) => t("time.until", { time }),
    })
    setStatus(t("calendar.moved", { title: task.card.title, when }))
  }

  const openDay = (day: string) => {
    setPicked(day)
    setMode("day")
  }

  const handlers = {
    draggingId,
    onOpen: openCard,
    onDragStart: setDraggingId,
    onDragEnd: () => setDraggingId(null),
  }

  return (
    <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-4 py-5 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl font-medium tracking-tight">{t("calendar.title")}</h1>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setPicked(null)} className={buttonClass}>
              {t("common.today")}
            </button>
            <button
              type="button"
              aria-label={t(`calendar.prev.${mode}` as MessageKey)}
              onClick={() => setPicked(shiftFocus(mode, focus, -1))}
              className={clsx(buttonClass, "w-9 px-0")}
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              aria-label={t(`calendar.next.${mode}` as MessageKey)}
              onClick={() => setPicked(shiftFocus(mode, focus, 1))}
              className={clsx(buttonClass, "w-9 px-0")}
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </div>
          <h2 aria-live="polite" className="font-serif text-xl text-ink-soft">
            {rangeTitle(mode, focus, locale)}
          </h2>
        </div>
        <div role="group" aria-label={t("calendar.scale")} className="flex rounded-md border border-line bg-card p-0.5">
          {CALENDAR_MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={mode === item.id}
              onClick={() => setMode(item.id)}
              className={clsx(
                "h-8 rounded px-3 text-sm focus-visible:outline-2 focus-visible:outline-accent",
                mode === item.id ? "bg-ink text-board" : "text-ink hover:bg-line/50",
              )}
            >
              {t(`calendar.mode.${item.id}` as MessageKey)}
            </button>
          ))}
        </div>
      </header>

      <p role="status" className="min-h-5 text-sm text-ink-soft">
        {status}
      </p>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <section aria-label={t(`calendar.view.${mode}` as MessageKey)} className="min-w-0 flex-1">
          {mode === "day" && <TimeGrid days={[focus]} today={today} tasks={tasks} onDropTask={dropTask} {...handlers} />}
          {mode === "week" && (
            <TimeGrid days={weekDays(focus)} today={today} tasks={tasks} onDropTask={dropTask} {...handlers} />
          )}
          {mode === "month" && (
            <MonthGrid
              year={year}
              month={month}
              today={today}
              tasks={tasks}
              onOpenDay={openDay}
              onDropTask={dropTask}
              {...handlers}
            />
          )}
          {mode === "year" && (
            <YearGrid
              year={year}
              today={today}
              tasks={tasks}
              onOpenDay={openDay}
              onOpenMonth={(first) => {
                setPicked(first)
                setMode("month")
              }}
              onDropTask={dropTask}
            />
          )}
        </section>

        <aside aria-label={t("calendar.noDateAria")} className="rounded-xl border border-line bg-card p-3 lg:w-64 lg:shrink-0">
          <h2 className="font-serif text-lg">{t("calendar.noDate")}</h2>
          <p className="mt-1 text-sm text-ink-soft text-pretty">
            {mode === "day" || mode === "week" ? t("calendar.dropHour") : t("calendar.dropDay")}
          </p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {undated.map((task) => (
              <li key={task.id}>
                <TaskChip task={task} {...handlers} />
              </li>
            ))}
          </ul>
          {undated.length === 0 && <p className="mt-3 text-sm text-ink-soft">{t("calendar.allDated")}</p>}
        </aside>
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
              setStatus(t("common.savedCard"))
              closeCard()
            }
          }}
          onRevert={() => revertDraft(openCardData.id)}
        />
      )}
    </main>
  )
}
