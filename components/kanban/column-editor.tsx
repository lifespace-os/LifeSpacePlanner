"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, Plus, Settings2, Trash2 } from "lucide-react"
import type { KanbanColumn } from "@/lib/kanban-data"

type Props = {
  boardName: string
  columns: KanbanColumn[]
  counts: Record<string, number>
  onRename: (columnId: string, name: string) => void
  onMove: (columnId: string, direction: -1 | 1) => void
  onRemove: (columnId: string) => void
  onAdd: (name: string) => void
}

const iconButton =
  "flex size-7 shrink-0 items-center justify-center rounded text-ink-soft hover:bg-line/50 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-soft"

export function ColumnEditor({ boardName, columns, counts, onRename, onMove, onRemove, onAdd }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const rootRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  const add = () => {
    const name = draft.trim()
    if (!name) return
    onAdd(name)
    setDraft("")
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls="column-editor"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-sm text-ink-soft transition-colors hover:bg-line/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Settings2 aria-hidden="true" className="size-4" />
        Edit columns
      </button>

      {open && (
        <div
          id="column-editor"
          role="dialog"
          aria-label={`Columns on ${boardName}`}
          className="absolute right-0 top-full z-40 mt-2 w-80 rounded-lg border border-line bg-card p-3 shadow-lg"
        >
          <p className="font-serif text-lg font-medium leading-tight text-ink">Columns on {boardName}</p>
          <p className="mt-0.5 text-xs text-ink-soft">Rename, reorder, or remove. Cards in a removed column move to its neighbor.</p>

          <ol className="mt-3 flex max-h-72 flex-col gap-1.5 overflow-y-auto">
            {columns.map((column, index) => (
              <li key={column.id} className="flex items-center gap-0.5">
                <input
                  value={column.name}
                  aria-label={`Name of column ${index + 1}`}
                  onChange={(event) => onRename(column.id, event.target.value)}
                  onBlur={(event) => {
                    if (!event.target.value.trim()) onRename(column.id, "Untitled column")
                  }}
                  className="min-w-0 flex-1 rounded border border-line bg-board px-2 py-1 text-sm text-ink focus-visible:outline-2 focus-visible:outline-accent"
                />
                <button
                  type="button"
                  className={iconButton}
                  aria-label={`Move ${column.name} left`}
                  disabled={index === 0}
                  onClick={() => onMove(column.id, -1)}
                >
                  <ArrowLeft aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  className={iconButton}
                  aria-label={`Move ${column.name} right`}
                  disabled={index === columns.length - 1}
                  onClick={() => onMove(column.id, 1)}
                >
                  <ArrowRight aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  className={iconButton}
                  aria-label={`Remove ${column.name}${counts[column.id] ? `, ${counts[column.id]} cards will move` : ""}`}
                  disabled={columns.length <= 1}
                  onClick={() => onRemove(column.id)}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </li>
            ))}
          </ol>

          <form
            className="mt-3 flex items-center gap-1.5 border-t border-line/70 pt-3"
            onSubmit={(event) => {
              event.preventDefault()
              add()
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="New column name"
              aria-label="New column name"
              className="min-w-0 flex-1 rounded border border-line bg-board px-2 py-1 text-sm text-ink placeholder:text-ink-soft/70 focus-visible:outline-2 focus-visible:outline-accent"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="inline-flex items-center gap-1 rounded-md bg-ink px-2.5 py-1.5 text-sm text-board hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40"
            >
              <Plus aria-hidden="true" className="size-4" />
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
