"use client"

import clsx from "clsx"
import { Check } from "lucide-react"
import { TASK_DRAG_TYPE } from "@/components/calendar/drop-cell"
import { useLanguage } from "@/components/language-provider"
import { SetShape } from "@/components/whiteboard/label-chip"
import { getLabel } from "@/lib/board-data"
import type { CalendarTask } from "@/lib/calendar"
import { formatTime, formatTimeRange } from "@/lib/kanban-data"

export type ChipHandlers = {
  draggingId: string | null
  onOpen: (cardId: string) => void
  onDragStart: (cardId: string) => void
  onDragEnd: () => void
}

type Props = ChipHandlers & {
  task: CalendarTask
  /** "month" is one line. The others show the time range under the title. */
  compact?: boolean
}

export function TaskChip({ task, compact = false, draggingId, onOpen, onDragStart, onDragEnd }: Props) {
  const { card } = task
  const label = getLabel(card.labelId)
  const { t, locale } = useLanguage()
  const range = formatTimeRange(card.startTime, card.endTime, locale, {
    from: (time) => t("time.from", { time }),
    until: (time) => t("time.until", { time }),
  })
  return (
    <div
      draggable={!task.done}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move"
        event.dataTransfer.setData(TASK_DRAG_TYPE, task.id)
        event.dataTransfer.setData("text/plain", card.title)
        onDragStart(task.id)
      }}
      onDragEnd={onDragEnd}
      className={clsx(
        "flex items-start gap-1.5 rounded-md border border-line bg-board px-2 py-1 shadow-sm",
        task.done ? "bg-card/70" : "cursor-grab active:cursor-grabbing",
        draggingId === null && "transition-shadow hover:shadow-md",
        draggingId === task.id && "opacity-40",
      )}
    >
      <span className="mt-[3px] flex size-3 shrink-0 items-center justify-center">
        {task.done ? (
          <Check aria-hidden="true" className="size-3 text-accent" />
        ) : label ? (
          <SetShape shape={label.group.shape} color={label.color} />
        ) : (
          <span aria-hidden="true" className="size-2 rounded-full border border-ink-soft/60" />
        )}
      </span>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => onOpen(task.id)}
        className={clsx(
          "min-w-0 flex-1 text-left text-xs leading-snug focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          task.done ? "text-ink-soft" : "text-ink",
        )}
      >
        {compact ? (
          <span className="block truncate">
            {card.startTime && <span className="text-ink-soft">{formatTime(card.startTime, locale)} </span>}
            {card.title}
          </span>
        ) : (
          <>
            <span className="block text-pretty">{card.title}</span>
            {range && <span className="block text-[11px] text-ink-soft">{range}</span>}
          </>
        )}
      </button>
    </div>
  )
}
