"use client"

import clsx from "clsx"
import { DropCell } from "@/components/calendar/drop-cell"
import { useLanguage } from "@/components/language-provider"
import { getLabel } from "@/lib/board-data"
import {
  coversDay,
  isoOf,
  longDate,
  monthName,
  monthWeeks,
  weekdayNames,
  type CalendarTask,
  type DropSlot,
} from "@/lib/calendar"

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)
const DOTS = 4

type Props = {
  year: number
  today: string
  tasks: CalendarTask[]
  onOpenDay: (day: string) => void
  onOpenMonth: (firstOfMonth: string) => void
  onDropTask: (taskId: string, day: string, slot: DropSlot) => void
}

/** Year: twelve small months. A day with tasks shows one mark per task, in the task's label color. */
export function YearGrid({ year, today, tasks, onOpenDay, onOpenMonth, onDropTask }: Props) {
  const { locale } = useLanguage()
  const names = weekdayNames(locale)
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {MONTHS.map((month) => {
        const first = isoOf(year, month, 1)
        const monthKey = first.slice(0, 7)
        return (
          <section key={month} className="rounded-xl border border-line bg-card p-3">
            <h3 className="mb-2 font-serif text-lg">
              <button
                type="button"
                onClick={() => onOpenMonth(first)}
                className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-accent"
              >
                {monthName(first, locale)}
              </button>
            </h3>
            <div className="grid grid-cols-7 text-center text-[11px] uppercase text-ink-soft">
              {names.map((name, index) => (
                <span key={index}>{name.slice(0, 2)}</span>
              ))}
            </div>
            {monthWeeks(year, month).map((week) => (
              <div key={week[0]} className="grid grid-cols-7">
                {week.map((day) => {
                  if (!day.startsWith(monthKey)) return <div key={day} />
                  const onDay = tasks.filter((task) => coversDay(task, day))
                  const summary = onDay.length
                    ? `${longDate(day, locale)}: ${onDay.map((task) => task.card.title).join(", ")}`
                    : longDate(day, locale)
                  return (
                    <DropCell
                      key={day}
                      data-day={day}
                      onDropTask={(taskId) => onDropTask(taskId, day, { kind: "day" })}
                      className="flex min-h-11 flex-col items-center rounded p-0.5"
                    >
                      <button
                        type="button"
                        title={summary}
                        aria-label={summary}
                        onClick={() => onOpenDay(day)}
                        className={clsx(
                          "flex size-6 items-center justify-center rounded-full text-xs hover:bg-line/50 focus-visible:outline-2 focus-visible:outline-accent",
                          day === today ? "bg-accent text-board hover:bg-accent" : "text-ink",
                        )}
                      >
                        {Number(day.slice(8))}
                      </button>
                      {onDay.length > 0 && (
                        <span aria-hidden="true" className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                          {onDay.slice(0, DOTS).map((task) => (
                            <span
                              key={task.id}
                              className="size-1.5 rounded-full ring-1 ring-ink/30"
                              style={{ backgroundColor: getLabel(task.card.labelId)?.color ?? "transparent" }}
                            />
                          ))}
                        </span>
                      )}
                    </DropCell>
                  )
                })}
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}
