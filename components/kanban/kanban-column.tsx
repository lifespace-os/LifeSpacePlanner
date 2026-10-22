"use client"

import { useRef, useState } from "react"
import clsx from "clsx"
import type { KanbanColumn } from "@/lib/kanban-data"
import { useLanguage } from "@/components/language-provider"
import { columnLabel } from "@/lib/kanban-names"

type Props = {
  column: KanbanColumn
  count: number
  draggingId: string | null
  /** Called with the card the drop lands before, or null to drop at the end. */
  onDropCard: (columnId: string, beforeId: string | null) => void
  children: React.ReactNode
}

export function KanbanColumnView({ column, count, draggingId, onDropCard, children }: Props) {
  const { t, tn } = useLanguage()
  const name = columnLabel(t, column)
  const listRef = useRef<HTMLUListElement>(null)
  const [line, setLine] = useState<{ top: number; beforeId: string | null } | null>(null)
  const full = column.limit !== undefined && count >= column.limit
  const isToday = column.limit !== undefined

  const locate = (clientY: number) => {
    const list = listRef.current
    if (!list) return null
    const listRect = list.getBoundingClientRect()
    const items = [...list.querySelectorAll<HTMLElement>("[data-card-id]")].filter(
      (item) => item.dataset.cardId !== draggingId,
    )
    for (const item of items) {
      const rect = item.getBoundingClientRect()
      if (clientY < rect.top + rect.height / 2) {
        return { top: rect.top - listRect.top + list.scrollTop - 4, beforeId: item.dataset.cardId ?? null }
      }
    }
    const last = items[items.length - 1]
    const bottom = last ? last.getBoundingClientRect().bottom - listRect.top + list.scrollTop + 4 : 4
    return { top: bottom, beforeId: null }
  }

  return (
    <section
      aria-label={name}
      onDragOver={(event) => {
        if (!draggingId) return
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
        setLine(locate(event.clientY))
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setLine(null)
      }}
      onDrop={(event) => {
        if (!draggingId) return
        event.preventDefault()
        const target = locate(event.clientY)
        setLine(null)
        onDropCard(column.id, target?.beforeId ?? null)
      }}
      className={clsx(
        "flex h-full w-64 shrink-0 flex-col rounded-lg border bg-desk/60 transition-colors",
        line ? "border-accent/60 bg-accent-soft/40" : "border-line",
        isToday && !line && "border-accent/40",
      )}
    >
      <header className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
        <h2 className={clsx("min-w-0 text-balance text-sm font-semibold leading-tight", isToday ? "text-accent" : "text-ink")}>
          {name}
        </h2>
        <span
          className={clsx(
            "shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums",
            full ? "bg-accent text-board" : "bg-line/60 text-ink-soft",
          )}
          aria-label={
            column.limit !== undefined
              ? t(full ? "column.countLimitFull" : "column.countLimit", { count, limit: column.limit })
              : tn("column.count", count)
          }
        >
          {column.limit !== undefined ? `${count} / ${column.limit}` : count}
        </span>
      </header>

      <ul ref={listRef} className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3 pt-1">
        {children}
        {count === 0 && (
          <li className="list-none rounded-md border border-dashed border-line px-3 py-6 text-center text-xs text-ink-soft">
            {t("column.dropHere")}
          </li>
        )}
        {line && (
          <li
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-2 h-0.5 list-none rounded bg-accent"
            style={{ top: line.top }}
          />
        )}
      </ul>
    </section>
  )
}
