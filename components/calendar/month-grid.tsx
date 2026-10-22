"use client"

import clsx from "clsx"
import { DropCell } from "@/components/calendar/drop-cell"
import { TaskChip, type ChipHandlers } from "@/components/calendar/task-chip"
import { useLanguage } from "@/components/language-provider"
import {
  coversDay,
  longDate,
  monthWeeks,
  sortForDay,
  weekdayNames,
  type CalendarTask,
  type DropSlot,
} from "@/lib/calendar"

const SHOWN = 3

type Props = ChipHandlers & {
  year: number
  month: number
  today: string
  tasks: CalendarTask[]
  onOpenDay: (day: string) => void
  onDropTask: (taskId: string, day: string, slot: DropSlot) => void
}

/** Month: the same tasks on a date grid. A drop writes the date and keeps the task's times. */
export function MonthGrid({ year, month, today, tasks, onOpenDay, onDropTask, ...chip }: Props) {
  const { t, tn, locale } = useLanguage()
  const monthKey = `${year}-${String(month).padStart(2, "0")}`
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-card">
      <div className="min-w-[44rem]">
        <div className="grid grid-cols-7 border-b border-line">
          {weekdayNames(locale).map((name) => (
            <p key={name} className="px-2 py-2 text-xs uppercase tracking-[0.14em] text-ink-soft">
              {name}
            </p>
          ))}
        </div>
        {monthWeeks(year, month).map((week) => (
          <div key={week[0]} className="grid grid-cols-7">
            {week.map((day) => {
              const inMonth = day.startsWith(monthKey)
              const onDay = sortForDay(tasks.filter((task) => coversDay(task, day)), day)
              const hidden = onDay.length - SHOWN
              return (
                <DropCell
                  key={day}
                  data-day={day}
                  onDropTask={(taskId) => onDropTask(taskId, day, { kind: "day" })}
                  className={clsx(
                    "flex min-h-28 min-w-0 flex-col gap-1 border-l border-t border-line/70 p-1.5 first:border-l-0",
                    !inMonth && "bg-board/60",
                  )}
                >
                  <button
                    type="button"
                    aria-label={t("calendar.openDay", { date: longDate(day, locale) })}
                    onClick={() => onOpenDay(day)}
                    className={clsx(
                      "flex size-7 items-center justify-center self-start rounded-full font-serif text-base hover:bg-line/50 focus-visible:outline-2 focus-visible:outline-accent",
                      day === today ? "bg-accent text-board hover:bg-accent" : inMonth ? "text-ink" : "text-ink-soft/70",
                    )}
                  >
                    {Number(day.slice(8))}
                  </button>
                  {onDay.slice(0, SHOWN).map((task) => (
                    <TaskChip key={task.id} task={task} compact {...chip} />
                  ))}
                  {hidden > 0 && (
                    <button
                      type="button"
                      onClick={() => onOpenDay(day)}
                      className="self-start rounded px-1 text-xs text-ink-soft underline-offset-2 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      {t("calendar.more", { count: hidden })}
                    </button>
                  )}
                </DropCell>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
