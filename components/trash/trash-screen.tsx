"use client"

import { useMemo, useState } from "react"
import { ImageIcon, RotateCcw, Trash2 } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { ConfirmDialog } from "@/components/settings/confirm-dialog"
import { useTrash } from "@/components/trash-provider"
import { mediaUrl } from "@/lib/media"
import { newestFirst, trashImage, trashWords, type TrashItem } from "@/lib/trash"

const NAME_LIMIT = 60

function shortWords(words: string, fallback: string) {
  const flat = words.replace(/\s+/g, " ")
  if (!flat) return fallback
  return flat.length > NAME_LIMIT ? `${flat.slice(0, NAME_LIMIT)}…` : flat
}

export function TrashScreen() {
  const { t, tn, locale } = useLanguage()
  const { trash, restore, deleteForever, emptyTrash } = useTrash()
  const [status, setStatus] = useState("")
  const [asking, setAsking] = useState<TrashItem | null>(null)
  const [askingAll, setAskingAll] = useState(false)
  const items = useMemo(() => newestFirst(trash), [trash])
  const day = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "long" }), [locale])

  const nameOf = (item: TrashItem) => shortWords(trashWords(item), t("trash.noWords"))

  return (
    <main className="board-grain min-h-[calc(100dvh-3.5rem)] px-6 pb-16 pt-5">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">{t("trash.eyebrow")}</p>
            <h1 className="font-serif text-3xl font-medium tracking-tight text-ink">{t("nav.trash")}</h1>
          </div>
          <button
            type="button"
            disabled={items.length === 0}
            onClick={() => setAskingAll(true)}
            className="rounded-md border border-line bg-card px-3.5 py-1.5 text-sm text-ink transition-colors hover:bg-line/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("trash.empty")}
          </button>
        </div>

        <p className="max-w-prose text-sm leading-relaxed text-ink-soft">{t("trash.help")}</p>

        <p role="status" aria-live="polite" className="min-h-5 text-sm text-ink-soft">
          {status}
        </p>

        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-6 py-12 text-center text-sm text-ink-soft">
            {t("trash.emptyState")}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => {
              const image = trashImage(item)
              const name = nameOf(item)
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 rounded-lg border border-line bg-card p-4 sm:flex-row sm:items-start"
                >
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- served from the app's own media store
                    <img
                      src={mediaUrl(image)}
                      alt={t("whiteboard.image.alt")}
                      draggable={false}
                      className="size-16 shrink-0 rounded-md border border-line bg-board object-cover"
                    />
                  ) : (
                    <span aria-hidden="true" className="hidden size-16 shrink-0 items-center justify-center rounded-md border border-dashed border-line text-ink-soft/60 sm:flex">
                      <ImageIcon className="size-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-[0.14em] text-ink-soft">
                      {t(item.kind === "note" ? "trash.kind.note" : "trash.kind.task")}
                      <span aria-hidden="true"> · </span>
                      {t("trash.deletedOn", { date: day.format(new Date(item.deletedAt)) })}
                    </p>
                    <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-snug text-ink">
                      {trashWords(item) || t("trash.noWords")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      aria-label={t("trash.restoreAria", { words: name })}
                      onClick={() => {
                        restore(item.id)
                        setStatus(t("trash.restored", { words: name }))
                      }}
                      className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-ink transition-colors hover:bg-line/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      <RotateCcw aria-hidden="true" className="size-3.5" />
                      {t("trash.restore")}
                    </button>
                    <button
                      type="button"
                      aria-label={t("trash.deleteForeverAria", { words: name })}
                      onClick={() => setAsking(item)}
                      className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-release transition-colors hover:bg-release/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      <Trash2 aria-hidden="true" className="size-3.5" />
                      {t("trash.deleteForever")}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={asking !== null}
        title={t("trash.confirmOne.title")}
        confirmLabel={t("trash.deleteForever")}
        onCancel={() => setAsking(null)}
        onConfirm={() => {
          if (asking) {
            deleteForever(asking.id)
            setStatus(t("trash.deletedForever", { words: nameOf(asking) }))
          }
          setAsking(null)
        }}
      >
        {asking ? t("trash.confirmOne.body", { words: nameOf(asking) }) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={askingAll}
        title={t("trash.confirmAll.title")}
        confirmLabel={t("trash.empty")}
        onCancel={() => setAskingAll(false)}
        onConfirm={() => {
          emptyTrash()
          setStatus(t("trash.emptied"))
          setAskingAll(false)
        }}
      >
        {tn("trash.confirmAll.body", items.length)}
      </ConfirmDialog>
    </main>
  )
}
