"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ImageIcon, RotateCcw, Trash2, X } from "lucide-react"
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

/** The trash opened from the whiteboard dock: deleted whiteboard cards, each with Restore and Delete forever. */
export function TrashPanel({ onClose }: { onClose: () => void }) {
  const { t, tn, locale } = useLanguage()
  const { trash, restore, deleteForever, emptyTrash } = useTrash()
  const [status, setStatus] = useState("")
  const [asking, setAsking] = useState<TrashItem | null>(null)
  const [askingAll, setAskingAll] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const confirming = asking !== null || askingAll
  const items = useMemo(() => newestFirst(trash), [trash])
  const day = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "long" }), [locale])

  const nameOf = (item: TrashItem) => shortWords(trashWords(item), t("trash.noWords"))

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  useEffect(() => {
    if (confirming) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [confirming, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trash-panel-title"
        className="flex max-h-[min(40rem,calc(100dvh-2rem))] w-[min(40rem,100%)] flex-col rounded-xl border border-line bg-board text-ink shadow-lg"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 pb-4 pt-5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">{t("trash.eyebrow")}</p>
            <h2 id="trash-panel-title" className="font-serif text-2xl font-medium tracking-tight">
              {t("trash.title")}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={items.length === 0}
              onClick={() => setAskingAll(true)}
              className="rounded-md border border-line bg-card px-3.5 py-1.5 text-sm text-ink transition-colors hover:bg-line/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("trash.empty")}
            </button>
            <button
              ref={closeRef}
              type="button"
              aria-label={t("common.close")}
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-line/50 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          <p className="max-w-prose text-sm leading-relaxed text-ink-soft">{t("trash.help")}</p>
          <p role="status" aria-live="polite" className="min-h-5 text-sm text-ink-soft">
            {status}
          </p>

          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-6 py-10 text-center text-sm text-ink-soft">
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
                      <span
                        aria-hidden="true"
                        className="hidden size-16 shrink-0 items-center justify-center rounded-md border border-dashed border-line text-ink-soft/60 sm:flex"
                      >
                        <ImageIcon className="size-5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-[0.14em] text-ink-soft">
                        {t("trash.deletedOn", { date: day.format(new Date(item.deletedAt)) })}
                      </p>
                      <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-snug">
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
                        className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm transition-colors hover:bg-line/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
    </div>
  )
}
