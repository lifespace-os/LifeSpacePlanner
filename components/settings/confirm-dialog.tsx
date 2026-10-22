"use client"

import { useEffect, useId, useRef } from "react"
import { useT } from "@/components/language-provider"

type ConfirmDialogProps = {
  open: boolean
  title: string
  children: React.ReactNode
  confirmLabel: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, children, confirmLabel, busy = false, onConfirm, onCancel }: ConfirmDialogProps) {
  const t = useT()
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onCancel()
      }}
      className="m-auto w-[min(26rem,calc(100vw-3rem))] rounded-xl border border-line bg-board p-6 text-ink shadow-lg backdrop:bg-ink/40"
    >
      <h2 id={titleId} className="font-serif text-xl font-medium tracking-tight text-balance">
        {title}
      </h2>
      <div className="mt-2 text-sm leading-relaxed text-pretty text-ink-soft">{children}</div>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          autoFocus
          disabled={busy}
          onClick={onCancel}
          className="rounded-md border border-line bg-card px-4 py-2 text-sm text-ink transition-colors hover:bg-line/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="rounded-md bg-release px-4 py-2 text-sm text-board transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
        >
          {busy ? t("common.working") : confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
