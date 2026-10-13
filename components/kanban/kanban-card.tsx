"use client"

import { useEffect, useRef, useState } from "react"
import clsx from "clsx"
import { Check, Ellipsis } from "lucide-react"
import { SetShape } from "@/components/whiteboard/label-chip"
import { getLabel } from "@/lib/board-data"
import {
  KANBAN_BOARDS,
  formatDue,
  initials,
  type KanbanBoardId,
  type KanbanCard,
  type KanbanColumn,
} from "@/lib/kanban-data"

type Props = {
  card: KanbanCard
  columns: KanbanColumn[]
  /** How many cards each column holds right now, so the menu can show which ones are full. */
  counts: Record<string, number>
  done: boolean
  dragging: boolean
  onDragStart: (cardId: string) => void
  onDragEnd: () => void
  onMoveToColumn: (cardId: string, columnId: string) => void
  onMoveToBoard: (cardId: string, boardId: KanbanBoardId) => void
}

const MENU_WIDTH = 240
const MENU_MAX_HEIGHT = 352

export function KanbanCardView({
  card,
  columns,
  counts,
  done,
  dragging,
  onDragStart,
  onDragEnd,
  onMoveToColumn,
  onMoveToBoard,
}: Props) {
  const [menu, setMenu] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const label = getLabel(card.labelId)

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close()
        buttonRef.current?.focus()
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    window.addEventListener("resize", close)
    window.addEventListener("scroll", close, true)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("resize", close)
      window.removeEventListener("scroll", close, true)
    }
  }, [menu])

  useEffect(() => {
    if (menu) menuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus()
  }, [menu])

  const openMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const left = Math.min(Math.max(8, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8)
    const top = Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - MENU_MAX_HEIGHT - 8))
    setMenu({ top, left })
  }

  return (
    <li
      data-card-id={card.id}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move"
        event.dataTransfer.setData("text/plain", card.id)
        onDragStart(card.id)
      }}
      onDragEnd={onDragEnd}
      className={clsx("list-none", dragging && "opacity-40")}
    >
      <article
        className={clsx(
          "group relative cursor-grab rounded-md border border-line bg-card px-3 py-2.5 shadow-sm transition-shadow active:cursor-grabbing hover:shadow-md",
          done && "bg-card/70",
        )}
      >
        <div className="flex items-start gap-1.5">
          {done && <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-accent" />}
          <h3 className={clsx("min-w-0 flex-1 text-sm font-medium leading-snug text-pretty", done ? "text-ink-soft" : "text-ink")}>
            {card.title}
          </h3>
          <button
            ref={buttonRef}
            type="button"
            aria-label={`Move “${card.title}”`}
            aria-haspopup="menu"
            aria-expanded={menu !== null}
            onClick={() => (menu ? setMenu(null) : openMenu())}
            className="-mr-1.5 -mt-1 flex size-6 shrink-0 items-center justify-center rounded text-ink-soft opacity-60 transition-opacity hover:bg-line/50 hover:text-ink focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-accent group-hover:opacity-100"
          >
            <Ellipsis aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="mt-2 flex h-5 items-center gap-1.5 text-xs text-ink-soft">
          {label ? (
            <>
              <SetShape shape={label.group.shape} color={label.color} />
              <span className="truncate">{label.name}</span>
            </>
          ) : (
            <span className="italic">No label</span>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-line/70 pt-2 text-xs text-ink-soft">
          <span>
            <span className="sr-only">Due </span>
            <time dateTime={card.due}>{card.due ? `Due ${formatDue(card.due)}` : "No due date"}</time>
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              aria-hidden="true"
              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent"
            >
              {initials(card.owner)}
            </span>
            <span className="truncate">
              <span className="sr-only">Owner </span>
              {card.owner || "No owner"}
            </span>
          </span>
        </div>
      </article>

      {menu && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Move “${card.title}”`}
          style={{ position: "fixed", top: menu.top, left: menu.left, width: MENU_WIDTH, maxHeight: MENU_MAX_HEIGHT }}
          className="z-50 overflow-y-auto rounded-lg border border-line bg-card p-1.5 shadow-lg"
        >
          <p className="px-2 pb-1 pt-1 text-xs uppercase tracking-[0.14em] text-ink-soft">Column</p>
          {columns.map((column) => {
            const current = column.id === card.columnId
            const full = !current && column.limit !== undefined && (counts[column.id] ?? 0) >= column.limit
            return (
              <button
                key={column.id}
                type="button"
                role="menuitem"
                disabled={full}
                onClick={() => {
                  setMenu(null)
                  if (!current) onMoveToColumn(card.id, column.id)
                }}
                className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm text-ink hover:bg-line/50 focus-visible:bg-line/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:text-ink-soft/60 disabled:hover:bg-transparent"
              >
                <span className="truncate">{column.name}</span>
                {current ? (
                  <Check aria-hidden="true" className="size-3.5 shrink-0 text-accent" />
                ) : full ? (
                  <span className="shrink-0 text-xs">Full</span>
                ) : null}
              </button>
            )
          })}
          <p className="mt-1 border-t border-line/70 px-2 pb-1 pt-2.5 text-xs uppercase tracking-[0.14em] text-ink-soft">
            Board
          </p>
          {KANBAN_BOARDS.filter((board) => board.id !== card.boardId).map((board) => (
            <button
              key={board.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(null)
                onMoveToBoard(card.id, board.id)
              }}
              className="flex w-full items-center rounded px-2 py-1.5 text-left text-sm text-ink hover:bg-line/50 focus-visible:bg-line/50 focus-visible:outline-none"
            >
              {board.name}
            </button>
          ))}
        </div>
      )}
    </li>
  )
}
