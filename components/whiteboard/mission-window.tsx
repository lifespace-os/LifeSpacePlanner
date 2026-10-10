"use client"

import { useEffect, useId, useRef, useState } from "react"
import { MISSION_MAX_LENGTH } from "@/lib/board-data"

export function MissionWindow({
  initialText,
  onSave,
  onCancel,
}: {
  initialText: string
  onSave: (text: string) => void
  onCancel: () => void
}) {
  const [text, setText] = useState(initialText)
  const titleId = useId()
  const fieldId = useId()
  const fieldRef = useRef<HTMLTextAreaElement>(null)
  const trimmed = text.trim()

  useEffect(() => {
    const field = fieldRef.current
    if (!field) return
    field.focus()
    field.setSelectionRange(field.value.length, field.value.length)
  }, [])

  function save() {
    if (trimmed) onSave(trimmed.replace(/\s+/g, " "))
  }

  return (
    <div
      className="absolute inset-0 z-40 flex items-start justify-center bg-ink/15 px-4 pt-[18dvh]"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
      onWheel={(event) => event.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault()
            onCancel()
          }
        }}
        className="w-full max-w-xl rounded-2xl border border-line bg-board p-5 shadow-[0_24px_60px_-20px_rgba(35,39,43,0.55)]"
      >
        <h2 id={titleId} className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
          Mission
        </h2>
        <label htmlFor={fieldId} className="mt-1 block font-serif text-2xl leading-snug font-medium text-balance">
          My mission, in one sentence
        </label>
        <textarea
          id={fieldId}
          ref={fieldRef}
          value={text}
          rows={3}
          maxLength={MISSION_MAX_LENGTH}
          placeholder="Write it here…"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey) return
            if (event.nativeEvent.isComposing || event.keyCode === 229) return
            event.preventDefault()
            save()
          }}
          className="mt-3 w-full resize-none rounded-xl border border-line bg-desk px-4 py-3 font-serif text-xl leading-snug text-ink outline-none placeholder:text-ink-soft/60 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-ink-soft tabular-nums" aria-hidden="true">
            {text.length}/{MISSION_MAX_LENGTH}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg px-3.5 py-2 text-sm text-ink-soft transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!trimmed}
              onClick={save}
              className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-board shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save mission
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
