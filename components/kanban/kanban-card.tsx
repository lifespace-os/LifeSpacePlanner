"use client"

import { useEffect, useRef, useState } from "react"
import clsx from "clsx"
import { ArrowRight, BellRing, Check, Clock, Ellipsis, Undo2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { SetShape } from "@/components/whiteboard/label-chip"
import { getLabel } from "@/lib/board-data"
import { boardLabel, columnLabel } from "@/lib/kanban-names"
import {
  KANBAN_BOARDS,
  REMIND_COLUMN_ID,
  formatDue,
  formatTimeRange,
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
  /** A sector color the filter lights this card in. Drawn only while the filter lasts; never saved on the card. */
  highlight?: string | null
  onDragStart: (cardId: string) => void
  onDragEnd: () => void
  onMoveToColumn: (cardId: string, columnId: string) => void
  onMoveToBoard: (cardId: string, boardId: KanbanBoardId) => void
  onOpen: (cardId: string) => void
  /** "results" draws the same card in the Results grid: no drag, no move menu, and the board it came from. */
  mode?: "board" | "results"
  boardName?: string
  /** On a Done card: send it to Results. In the Results grid: return it to Done. */
  onResult?: (cardId: string) => void
}

const MENU_WIDTH = 240
const MENU_MAX_HEIGHT = 352

export function KanbanCardView({
  card,
  columns,
  counts,
  done,
  dragging,
  highlight = null,
  onDragStart,
  onDragEnd,
  onMoveToColumn,
  onMoveToBoard,
  onOpen,
  mode = "board",
  boardName,
  onResult,
}: Props) {
  const { t, locale } = useLanguage()
  const inResults = mode === "results"
  const [menu, setMenu] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const label = getLabel(card.labelId)
  const timeRange = formatTimeRange(card.startTime, card.endTime, locale, {
    from: (time) => t("time.from", { time }),
    until: (time) => t("time.until", { time }),
  })

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
      draggable={!inResults}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move"
        event.dataTransfer.setData("text/plain", card.id)
        onDragStart(card.id)
      }}
      onDragEnd={onDragEnd}
      className={clsx("list-none", dragging && "opacity-40")}
    >
      <article
        onClick={() => onOpen(card.id)}
        data-highlight={highlight ?? undefined}
        style={
          highlight
            ? {
                borderColor: highlight,
                boxShadow: `0 0 0 2px ${highlight}`,
                backgroundImage: `linear-gradient(${highlight}2e, ${highlight}2e)`,
              }
            : undefined
        }
        className={clsx(
          "group relative rounded-md border border-line bg-card px-3 py-2.5 shadow-sm transition-shadow",
          !dragging && "hover:shadow-md dark-theme:hover:shadow-halo",
          inResults ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
          done && "bg-card/70",
        )}
      >
        <div className="flex items-start gap-1.5">
          {done && <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-accent" />}
          <h3 className="min-w-0 flex-1 text-sm font-medium leading-snug text-pretty">
            <button
              type="button"
              data-card-open
              aria-haspopup="dialog"
              onClick={(event) => {
                event.stopPropagation()
                onOpen(card.id)
              }}
              className={clsx(
                "w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                done ? "text-ink-soft" : "text-ink",
              )}
            >
              {card.title}
            </button>
          </h3>
          {!inResults && (
          <button
            ref={buttonRef}
            type="button"
            aria-label={t("card.moveAria", { title: card.title })}
            aria-haspopup="menu"
            aria-expanded={menu !== null}
            onClick={(event) => {
              event.stopPropagation()
              if (menu) setMenu(null)
              else openMenu()
            }}
            className="-mr-1.5 -mt-1 flex size-6 shrink-0 items-center justify-center rounded text-ink-soft opacity-60 transition-opacity hover:bg-line/50 hover:text-ink focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-accent group-hover:opacity-100"
          >
            <Ellipsis aria-hidden="true" className="size-4" />
          </button>
          )}
        </div>

        <div className="mt-2 flex h-5 items-center gap-1.5 text-xs text-ink-soft">
          {label ? (
            <>
              <SetShape shape={label.group.shape} color={label.color} />
              <span className="truncate">{label.name}</span>
              {highlight && <span className="sr-only">{t("card.highlightedSr")}</span>}
            </>
          ) : (
            <span className="italic">{t("card.noLabel")}</span>
          )}
          {boardName && (
            <span className="ml-auto shrink-0 rounded border border-line px-1.5 text-[11px] leading-4 text-ink-soft">
              <span className="sr-only">{t("card.boardSr")}</span>
              {boardName}
            </span>
          )}
        </div>

        {timeRange && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-soft">
            <Clock aria-hidden="true" className="size-3.5 shrink-0" />
            <span>
              <span className="sr-only">{t("card.timeSr")}</span>
              {timeRange}
            </span>
          </p>
        )}

        {!inResults && card.columnId === REMIND_COLUMN_ID && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-soft">
            <BellRing aria-hidden="true" className="size-3.5 shrink-0" />
            {card.remind ? (
              <time dateTime={card.remind}>{t("card.remind", { date: formatDue(card.remind, locale) })}</time>
            ) : (
              <span className="italic">{t("card.noRemind")}</span>
            )}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-line/70 pt-2 text-xs text-ink-soft">
          <span>
            <span className="sr-only">{t("card.dueSr")}</span>
            <time dateTime={card.due}>
              {card.due ? t("card.due", { date: formatDue(card.due, locale) }) : t("card.noDue")}
            </time>
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              aria-hidden="true"
              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent"
            >
              {initials(card.owner)}
            </span>
            <span className="truncate">
              <span className="sr-only">{t("card.ownerSr")}</span>
              {card.owner || t("card.noOwner")}
            </span>
          </span>
        </div>
        {onResult && (inResults || done) && (
          <button
            type="button"
            aria-label={t(inResults ? "card.resultAriaReturn" : "card.resultAriaMove", { title: card.title })}
            onClick={(event) => {
              event.stopPropagation()
              onResult(card.id)
            }}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-line px-2 py-1 text-xs font-medium text-ink transition-colors hover:bg-line/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {inResults ? (
              <>
                <Undo2 aria-hidden="true" className="size-3.5" />
                {t("card.returnToDone")}
              </>
            ) : (
              <>
                {t("card.moveToResults")}
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </>
            )}
          </button>
        )}
      </article>

      {menu && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={t("card.moveAria", { title: card.title })}
          style={{ position: "fixed", top: menu.top, left: menu.left, width: MENU_WIDTH, maxHeight: MENU_MAX_HEIGHT }}
          className="z-50 overflow-y-auto rounded-lg border border-line bg-card p-1.5 shadow-lg"
        >
          <p className="px-2 pb-1 pt-1 text-xs uppercase tracking-[0.14em] text-ink-soft">{t("card.columnHeading")}</p>
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
                <span className="truncate">{columnLabel(t, column)}</span>
                {current ? (
                  <Check aria-hidden="true" className="size-3.5 shrink-0 text-accent" />
                ) : full ? (
                  <span className="shrink-0 text-xs">{t("card.full")}</span>
                ) : null}
              </button>
            )
          })}
          <p className="mt-1 border-t border-line/70 px-2 pb-1 pt-2.5 text-xs uppercase tracking-[0.14em] text-ink-soft">
            {t("card.boardHeading")}
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
              {boardLabel(t, board.id)}
            </button>
          ))}
        </div>
      )}
    </li>
  )
}
