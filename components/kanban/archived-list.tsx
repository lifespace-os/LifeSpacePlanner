"use client"

import { useState } from "react"
import { ImageIcon, RotateCcw, Trash2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { ConfirmDialog } from "@/components/settings/confirm-dialog"
import { useTrash } from "@/components/trash-provider"
import { useKanban } from "./kanban-provider"
import { boardLabel, columnLabel } from "@/lib/kanban-names"
import { mediaUrl } from "@/lib/media"
import type { ArchivedTask } from "@/lib/trash"

type ArchivedListProps = {
  /** The archived tasks the filter keeps, newest first. */
  entries: ArchivedTask[]
  /** Every archived task, before any filter. */
  total: number
  onStatus: (message: string) => void
}

/** Tasks taken off the boards, newest first. Restore returns one to its board, or to Results. */
export function ArchivedList({ entries, total, onStatus }: ArchivedListProps) {
  const { t, locale } = useLanguage()
  const { restoreTask, deleteArchived } = useTrash()
  const { columnsByBoard, setBoardId } = useKanban()
  const [asking, setAsking] = useState<ArchivedTask | null>(null)
  const day = new Intl.DateTimeFormat(locale, { dateStyle: "long" })

  const titleOf = (entry: ArchivedTask) => entry.card.title.trim() || t("archive.noTitle")

  const restore = (entry: ArchivedTask) => {
    const card = restoreTask(entry.id)
    if (!card) return
    const place = card.inResults
      ? t("kanban.resultsLabel")
      : `${boardLabel(t, card.boardId)}, ${
          columnsByBoard[card.boardId].find((column) => column.id === card.columnId)
            ? columnLabel(t, columnsByBoard[card.boardId].find((column) => column.id === card.columnId)!)
            : ""
        }`
    onStatus(t("archive.restoredTo", { title: titleOf(entry), place }))
    if (!card.inResults) setBoardId(card.boardId)
  }

  return (
    <section id="archived-panel" aria-label={t("archive.title")} className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
      <p className="mb-4 max-w-prose text-pretty text-sm leading-relaxed text-ink-soft">{t("archive.help")}</p>
      {total === 0 ? (
        <p className="max-w-md text-pretty text-sm text-ink-soft">{t("archive.emptyState")}</p>
      ) : entries.length === 0 ? (
        <p className="max-w-md text-pretty text-sm text-ink-soft">
          {t(total === 1 ? "resultsGrid.filtered.one" : "resultsGrid.filtered.other", { count: total })}
        </p>
      ) : (
        <ul className="flex max-w-3xl flex-col gap-3">
          {entries.map((entry) => {
            const { card } = entry
            const title = titleOf(entry)
            const column = columnsByBoard[card.boardId].find((item) => item.id === card.columnId)
            return (
              <li
                key={entry.id}
                className="flex flex-col gap-3 rounded-lg border border-line bg-card p-4 sm:flex-row sm:items-start"
              >
                {card.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- served from the app's own media store
                  <img
                    src={mediaUrl(card.image)}
                    alt={t("whiteboard.image.alt")}
                    draggable={false}
                    className="size-14 shrink-0 rounded-md border border-line bg-board object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="hidden size-14 shrink-0 items-center justify-center rounded-md border border-dashed border-line text-ink-soft/60 sm:flex"
                  >
                    <ImageIcon className="size-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-[0.14em] text-ink-soft">
                    {boardLabel(t, card.boardId)}
                    {column ? (
                      <>
                        <span aria-hidden="true"> · </span>
                        {columnLabel(t, column)}
                      </>
                    ) : null}
                    <span aria-hidden="true"> · </span>
                    {t("archive.archivedOn", { date: day.format(new Date(entry.archivedAt)) })}
                  </p>
                  <p className="mt-1 line-clamp-2 break-words text-sm font-medium leading-snug text-ink">{title}</p>
                  {card.inResults ? <p className="mt-1 text-xs text-ink-soft">{t("archive.wasOnResults")}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    aria-label={t("archive.restoreAria", { title })}
                    onClick={() => restore(entry)}
                    className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-ink transition-colors hover:bg-line/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <RotateCcw aria-hidden="true" className="size-3.5" />
                    {t("archive.restore")}
                  </button>
                  <button
                    type="button"
                    aria-label={t("archive.deleteForeverAria", { title })}
                    onClick={() => setAsking(entry)}
                    className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-release transition-colors hover:bg-release/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" />
                    {t("archive.deleteForever")}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={asking !== null}
        title={t("archive.confirm.title")}
        confirmLabel={t("archive.deleteForever")}
        onCancel={() => setAsking(null)}
        onConfirm={() => {
          if (asking) {
            deleteArchived(asking.id)
            onStatus(t("archive.deletedForever", { title: titleOf(asking) }))
          }
          setAsking(null)
        }}
      >
        {asking ? t("archive.confirm.body", { title: titleOf(asking) }) : null}
      </ConfirmDialog>
    </section>
  )
}
