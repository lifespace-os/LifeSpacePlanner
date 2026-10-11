"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import clsx from "clsx"
import { Hash, PencilLine, Plus, Trash2, X } from "lucide-react"
import { CARD_COLORS, getCardColor, normalizeHashtag, type CardColorId, type Note } from "@/lib/board-data"

export type MenuState =
  | { kind: "canvas"; clientX: number; clientY: number }
  | { kind: "card"; clientX: number; clientY: number; noteId: string }

const MARGIN = 8

function MenuShell({
  clientX,
  clientY,
  label,
  role,
  onClose,
  children,
}: {
  clientX: number
  clientY: number
  label: string
  role: "menu" | "dialog"
  onClose: () => void
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: clientX, top: clientY })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    setPosition({
      left: Math.max(MARGIN, Math.min(clientX, window.innerWidth - width - MARGIN)),
      top: Math.max(MARGIN, Math.min(clientY, window.innerHeight - height - MARGIN)),
    })
    el.querySelector<HTMLElement>("[data-autofocus]")?.focus()
  }, [clientX, clientY])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) onClose()
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("pointerdown", handlePointerDown, true)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      role={role}
      aria-label={label}
      onContextMenu={(e) => e.preventDefault()}
      style={position}
      className="fixed z-[90] max-h-[calc(100dvh-1rem)] min-w-52 overflow-y-auto rounded-xl border border-line bg-card p-1.5 text-sm text-ink shadow-[0_18px_40px_-16px_rgba(35,39,43,0.5)]"
    >
      {children}
    </div>
  )
}

const itemClass =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-desk focus-visible:bg-desk focus-visible:outline-none"

export function CanvasMenu({
  clientX,
  clientY,
  onCreate,
  onClose,
}: {
  clientX: number
  clientY: number
  onCreate: () => void
  onClose: () => void
}) {
  return (
    <MenuShell clientX={clientX} clientY={clientY} label="Canvas" role="menu" onClose={onClose}>
      <button type="button" role="menuitem" data-autofocus="" onClick={onCreate} className={itemClass}>
        <Plus className="size-4 text-ink-soft" aria-hidden="true" />
        Create new card
      </button>
    </MenuShell>
  )
}

export function CardMenu({
  clientX,
  clientY,
  note,
  dockColor,
  onColor,
  onAddHashtag,
  onRemoveHashtag,
  goalAbove,
  tagColors,
  fields,
  showEditWords,
  onEdit,
  onDelete,
  onClose,
}: {
  clientX: number
  clientY: number
  note: Note
  /** Labels hashtags show in the color of their sector or zone. Other hashtags keep the plain look. */
  tagColors?: Record<string, string>
  /** The color new cards start with. A sector drop can replace a card's color, and this puts it back. */
  dockColor: CardColorId
  onColor: (color: CardColorId) => void
  onAddHashtag: (tag: string) => void
  onRemoveHashtag: (tag: string) => void
  /** Present only for a card that has a goal level. An empty value means no link. */
  goalAbove?: { value: string; options: { id: string; label: string }[]; onChange: (value: string) => void }
  /** The words and the level of the card, edited in the window. An empty level means no level. */
  fields: {
    text: string
    onText: (text: string) => void
    level: string
    levels: { tag: string; name: string }[]
    onLevel: (tag: string) => void
  }
  /** Off on the Map, where the card is hidden and cannot be edited in place. */
  showEditWords: boolean
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState("")

  function submitTag(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const tag = normalizeHashtag(draft)
    if (!tag) return
    onAddHashtag(tag)
    setDraft("")
  }

  return (
    <MenuShell clientX={clientX} clientY={clientY} label="Card options" role="dialog" onClose={onClose}>
      <div className="w-64 p-1.5">
        <div className="mb-4">
          <label
            htmlFor="card-menu-text"
            className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-soft"
          >
            Text
          </label>
          <textarea
            id="card-menu-text"
            data-autofocus=""
            value={fields.text}
            onChange={(e) => fields.onText(e.target.value)}
            maxLength={280}
            rows={3}
            className="mt-2 w-full resize-none rounded-md border border-line bg-board px-2 py-1.5 text-sm text-ink focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/30"
          />
        </div>
        <p id="card-menu-color" className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-soft">
          Color
        </p>
        <div role="radiogroup" aria-labelledby="card-menu-color" className="mt-2 flex items-center gap-1.5">
          {CARD_COLORS.map((option) => {
            const active = option.id === note.color
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={option.name}
                title={option.name}
                data-autofocus={active ? "" : undefined}
                onClick={() => onColor(option.id)}
                className={clsx(
                  "size-7 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  active && "ring-2 ring-ink ring-offset-2 ring-offset-card",
                )}
                style={{ backgroundColor: option.fill, borderColor: option.edge }}
              />
            )
          })}
        </div>
        <button
          type="button"
          disabled={note.color === dockColor}
          onClick={() => onColor(dockColor)}
          className="mt-2.5 flex items-center gap-2 rounded-md border border-line px-2 py-1 text-xs text-ink transition-colors hover:bg-desk focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span
            aria-hidden="true"
            className="size-3 rounded-full border border-ink/20"
            style={{ backgroundColor: getCardColor(dockColor).fill }}
          />
          Restore dock color
        </button>

        <div className="mt-4">
          <label
            htmlFor="card-menu-level"
            className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-soft"
          >
            Level
          </label>
          <select
            id="card-menu-level"
            value={fields.level}
            onChange={(e) => fields.onLevel(e.target.value)}
            className="mt-2 h-8 w-full rounded-md border border-line bg-board px-2 text-sm text-ink focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/30"
          >
            <option value="">No level</option>
            {fields.levels.map((level) => (
              <option key={level.tag} value={level.tag}>
                {level.name}
              </option>
            ))}
          </select>
        </div>

        {goalAbove ? (
          <div className="mt-4">
            <label
              htmlFor="card-menu-goal-above"
              className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-soft"
            >
              Goal above
            </label>
            <select
              id="card-menu-goal-above"
              value={goalAbove.value}
              onChange={(e) => goalAbove.onChange(e.target.value)}
              className="mt-2 h-8 w-full rounded-md border border-line bg-board px-2 text-sm text-ink focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/30"
            >
              <option value="">No goal above</option>
              {goalAbove.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <form onSubmit={submitTag} className="mt-4">
          <label
            htmlFor="card-menu-hashtag"
            className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-soft"
          >
            Hashtag
          </label>
          <div className="mt-2 flex items-center gap-1.5">
            <div className="relative flex-1">
              <Hash
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-soft"
                aria-hidden="true"
              />
              <input
                id="card-menu-hashtag"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
                }}
                placeholder="health"
                autoComplete="off"
                maxLength={30}
                className="h-8 w-full rounded-md border border-line bg-board pr-2 pl-7 text-sm text-ink placeholder:text-ink-soft/60 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/30"
              />
            </div>
            <button
              type="submit"
              disabled={!normalizeHashtag(draft)}
              className="h-8 rounded-md bg-ink px-2.5 text-xs font-medium text-board transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Add
            </button>
          </div>
        </form>

        {note.hashtags.length > 0 ? (
          <ul aria-label="Hashtags on this card" className="mt-2 flex flex-wrap gap-1">
            {note.hashtags.map((tag) => (
              <li key={tag}>
                <button
                  type="button"
                  onClick={() => onRemoveHashtag(tag)}
                  aria-label={`Remove hashtag ${tag}`}
                  style={tagColors?.[tag.toLowerCase()] ? { backgroundColor: tagColors[tag.toLowerCase()] } : undefined}
                  className={clsx(
                    "inline-flex items-center gap-1 rounded-full border py-0.5 pr-1.5 pl-2 text-xs font-medium transition-colors hover:border-release/40 hover:text-release focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
                    tagColors?.[tag.toLowerCase()] ? "border-ink/15 text-ink" : "border-line bg-board text-ink-soft",
                  )}
                >
                  #{tag}
                  <X className="size-3" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="mt-1.5 border-t border-line pt-1.5">
        {showEditWords ? (
          <button type="button" onClick={onEdit} className={itemClass}>
            <PencilLine className="size-4 text-ink-soft" aria-hidden="true" />
            Edit words
          </button>
        ) : null}
        <button type="button" onClick={onDelete} className={clsx(itemClass, "text-release hover:bg-release/10")}>
          <Trash2 className="size-4" aria-hidden="true" />
          Remove card
        </button>
      </div>
    </MenuShell>
  )
}
