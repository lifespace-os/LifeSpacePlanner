"use client"

import { Fragment, useEffect, useMemo, useRef } from "react"
import clsx from "clsx"
import { DropCell } from "@/components/calendar/drop-cell"
import { TaskChip, type ChipHandlers } from "@/components/calendar/task-chip"
import {
  WEEKDAY_NAMES,
  coversDay,
  hourLabel,
  isTimedOn,
  longDate,
  slotRange,
  sortForDay,
  type CalendarTask,
  type DropSlot,
} from "@/lib/calendar"

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const DEFAULT_TOP_HOUR = 7

type Props = ChipHandlers & {
  days: string[]
  today: string
  tasks: CalendarTask[]
  onDropTask: (taskId: string, day: string, slot: DropSlot) => void
}

/** Day and Week: each day split into hours, with the tasks that have no time in a list above the hours. */
export function TimeGrid({ days, today, tasks, onDropTask, ...chip }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const topHour = useRef(DEFAULT_TOP_HOUR)

  const { bySlot, covered, untimed } = useMemo(() => {
    const bySlot = new Map<string, CalendarTask[]>()
    const covered = new Set<string>()
    const untimed = new Map<string, CalendarTask[]>()
    for (const day of days) {
      const onDay = sortForDay(tasks.filter((task) => coversDay(task, day)), day)
      untimed.set(day, onDay.filter((task) => !isTimedOn(task, day)))
      for (const task of onDay.filter((item) => isTimedOn(item, day))) {
        const { start, end } = slotRange(task)
        const startHour = Math.floor(start / 60)
        const key = `${day}|${startHour}`
        bySlot.set(key, [...(bySlot.get(key) ?? []), task])
        for (let hour = startHour + 1; hour * 60 < end; hour += 1) covered.add(`${day}|${hour}`)
      }
    }
    return { bySlot, covered, untimed }
  }, [days, tasks])

  const earliest = useMemo(() => {
    const hours = [...bySlot.keys()].map((key) => Number(key.split("|")[1]))
    return Math.min(DEFAULT_TOP_HOUR, ...hours)
  }, [bySlot])
  topHour.current = earliest

  const viewKey = `${days[0]}|${days.length}`
  useEffect(() => {
    const root = scrollRef.current
    const row = root?.querySelector<HTMLElement>(`[data-hour-row="${topHour.current}"]`)
    if (!root || !row) return
    const lists = [...root.querySelectorAll<HTMLElement>('[data-slot="list"]')]
    const stuck = 56 + Math.max(...lists.map((list) => list.offsetHeight))
    root.scrollTop = Math.max(0, row.offsetTop - stuck)
  }, [viewKey])

  const single = days.length === 1

  return (
    <div
      ref={scrollRef}
      className="relative max-h-[calc(100dvh-13rem)] min-h-[26rem] overflow-auto rounded-xl border border-line bg-card"
    >
      <div
        className={clsx("grid", !single && "min-w-[56rem]")}
        style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}
      >
        <div className="sticky top-0 z-30 h-14 border-b border-line bg-card" />
        {days.map((day, index) => {
          const isToday = day === today
          return (
            <div
              key={day}
              className="sticky top-0 z-20 flex h-14 items-center justify-center gap-2 border-b border-l border-line bg-card"
            >
              <span className="text-xs uppercase tracking-[0.14em] text-ink-soft">
                {single ? longDate(day).split(",")[0] : WEEKDAY_NAMES[index]}
              </span>
              <span
                className={clsx(
                  "flex size-8 items-center justify-center rounded-full font-serif text-lg",
                  isToday ? "bg-accent text-board" : "text-ink",
                )}
              >
                {Number(day.slice(8))}
              </span>
              {isToday && <span className="sr-only">Today</span>}
            </div>
          )
        })}

        <div className="sticky top-14 z-30 flex min-h-12 items-start justify-end border-b border-line bg-card px-2 pt-2 text-right text-[11px] leading-tight text-ink-soft">
          No time
        </div>
        {days.map((day) => (
          <DropCell
            key={day}
            data-day={day}
            data-slot="list"
            onDropTask={(taskId) => onDropTask(taskId, day, { kind: "list" })}
            className="sticky top-14 z-10 flex max-h-28 min-h-12 flex-col gap-1 overflow-y-auto border-b border-l border-line bg-card p-1"
          >
            {untimed.get(day)?.map((task) => (
              <TaskChip key={task.id} task={task} {...chip} />
            ))}
          </DropCell>
        ))}

        {HOURS.map((hour) => (
          <Fragment key={hour}>
            <div
              data-hour-row={hour}
              className="border-t border-line/70 pr-2 pt-1 text-right text-[11px] leading-tight text-ink-soft"
            >
              {hourLabel(hour)}
            </div>
            {days.map((day) => {
              const key = `${day}|${hour}`
              return (
                <DropCell
                  key={key}
                  data-day={day}
                  data-hour={hour}
                  onDropTask={(taskId) => onDropTask(taskId, day, { kind: "hour", hour })}
                  className={clsx(
                    "flex min-h-14 flex-col gap-1 border-l border-t border-line/70 p-1",
                    covered.has(key) && "bg-accent-soft/60",
                  )}
                >
                  {bySlot.get(key)?.map((task) => (
                    <TaskChip key={task.id} task={task} {...chip} />
                  ))}
                </DropCell>
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
