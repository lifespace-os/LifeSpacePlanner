"use client"

import { useId, useState } from "react"
import { Plus, StickyNote, X } from "lucide-react"
import { ZONE_TAGS, groupTag, hasHashtag, type Group, type Note } from "@/lib/board-data"

export function ClustersPanel({
  groups,
  notes,
  onAddGroup,
  onRemoveGroup,
  onNewCard,
}: {
  groups: Group[]
  notes: Note[]
  onAddGroup: (name: string) => void
  onRemoveGroup: (id: string) => void
  onNewCard: () => void
}) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()
  const errorId = useId()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    const tag = groupTag(trimmed)
    if (!tag) {
      setError("Give the group a name.")
      return
    }
    if (ZONE_TAGS.includes(tag) || groups.some((g) => g.tag === tag)) {
      setError("A group with that hashtag already exists.")
      return
    }
    onAddGroup(trimmed)
    setName("")
    setError(null)
  }

  return (
    <aside
      aria-label="Groups"
      className="pointer-events-auto flex max-h-full w-80 shrink-0 flex-col rounded-2xl border border-line bg-card shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)]"
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <h2 className="font-serif text-2xl leading-none font-medium">Groups</h2>
        <button
          type="button"
          onClick={onNewCard}
          className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink transition-colors hover:bg-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <StickyNote className="size-4" aria-hidden="true" />
          New card
        </button>
      </div>
      <p className="mt-1.5 px-5 text-sm text-ink-soft text-pretty">
        Drag a card into a group to give it that hashtag. Cards can stay ungrouped.
      </p>

      <ul className="mt-3 min-h-0 flex-1 overflow-y-auto border-t border-line px-2 py-2">
        {groups.length === 0 ? (
          <li className="px-3 py-4 text-sm text-ink-soft">No groups yet. Add one below.</li>
        ) : null}
        {groups.map((group) => {
          const count = notes.filter((note) => hasHashtag(note, group.tag)).length
          return (
            <li key={group.id} className="group flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-desk">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{group.name}</p>
                <p className="truncate text-xs text-ink-soft">#{group.tag}</p>
              </div>
              <span className="text-sm text-ink-soft tabular-nums" aria-label={`${count} cards`}>
                {count}
              </span>
              <button
                type="button"
                onClick={() => onRemoveGroup(group.id)}
                aria-label={`Remove group ${group.name}`}
                title="Remove group. Cards keep their hashtag."
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-board hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>

      <form onSubmit={submit} className="border-t border-line p-4" noValidate>
        <label htmlFor={inputId} className="text-xs font-medium uppercase tracking-[0.16em] text-ink-soft">
          Add a group
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id={inputId}
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
            maxLength={40}
            autoComplete="off"
            placeholder="e.g. Home projects"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="min-w-0 flex-1 rounded-lg border border-line bg-board px-3 py-2 text-sm text-ink placeholder:text-ink-soft/70 focus-visible:outline-2 focus-visible:outline-accent"
          />
          <button
            type="submit"
            className="flex items-center gap-1 rounded-lg bg-ink px-3 py-2 text-sm text-board transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add
          </button>
        </div>
        {error ? (
          <p id={errorId} role="alert" className="mt-1.5 text-sm text-[#8d3f4a]">
            {error}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-ink-soft text-pretty">Removing a group keeps its hashtag on the cards.</p>
      </form>
    </aside>
  )
}
