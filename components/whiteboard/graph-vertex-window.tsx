"use client"

import clsx from "clsx"
import { Plus, X } from "lucide-react"
import { useId, useState } from "react"
import {
  CARD_COLORS,
  getCardColor,
  goalLinks,
  goalRingOf,
  hasHashtag,
  isCustomColor,
  normalizeHashtag,
  ringTags,
  setGoalLevel,
  type CardColorId,
  type GoalRing,
  type Note,
} from "@/lib/board-data"

const WINDOW_CLASS =
  "pointer-events-auto flex max-h-full w-80 shrink-0 flex-col rounded-2xl border border-line bg-card shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)]"

const CLOSE_CLASS =
  "flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"

const FIELD_CLASS =
  "w-full rounded-lg border border-line bg-board px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-accent"

const LEGEND_CLASS = "text-xs font-medium tracking-[0.16em] text-ink-soft uppercase"

/**
 * The left window of the Graph while a vertex is selected: its color, text, hashtags, and the goals above it.
 * A ring hashtag moves the vertex into that ring's cluster. Taking the ring hashtag off moves it back outside.
 */
export function GraphVertexWindow({
  note,
  notes,
  rings,
  tagColors,
  onUpdate,
  onClose,
}: {
  note: Note
  notes: Note[]
  rings: GoalRing[]
  tagColors?: Record<string, string>
  onUpdate: (id: string, change: (note: Note) => Note) => void
  onClose: () => void
}) {
  const uid = useId()
  const [draftTag, setDraftTag] = useState("")

  const byId = new Map(notes.map((n) => [n.id, n]))
  const ring = goalRingOf(note, rings)
  const links = goalLinks(note, byId, rings)
  const ringTagSet = new Set(ringTags(rings))
  const above = notes.filter((n) => n.id !== note.id && goalRingOf(n, rings) >= 0 && goalRingOf(n, rings) < ring)
  const color = getCardColor(note.color)

  function addTag(raw: string) {
    const tag = normalizeHashtag(raw)
    if (!tag || hasHashtag(note, tag)) return
    if (ringTagSet.has(tag.toLowerCase())) {
      onUpdate(note.id, (n) => setGoalLevel(n, tag.toLowerCase(), rings))
    } else {
      onUpdate(note.id, (n) => ({ ...n, hashtags: [...n.hashtags, tag] }))
    }
    setDraftTag("")
  }

  function removeTag(tag: string) {
    const wasRing = ringTagSet.has(tag.toLowerCase())
    onUpdate(note.id, (n) => ({
      ...n,
      hashtags: n.hashtags.filter((t) => t.toLowerCase() !== tag.toLowerCase()),
      ...(wasRing && goalRingOf({ ...n, hashtags: n.hashtags.filter((t) => t.toLowerCase() !== tag.toLowerCase()) }, rings) < 0
        ? { mapAngle: null, parentIds: [] }
        : {}),
    }))
  }

  function toggleParent(id: string) {
    const next = links.includes(id) ? links.filter((p) => p !== id) : [...links, id]
    onUpdate(note.id, (n) => ({ ...n, parentIds: next }))
  }

  function pickColor(id: CardColorId) {
    onUpdate(note.id, (n) => ({ ...n, color: id }))
  }

  return (
    <aside aria-label="Vertex window" className={WINDOW_CLASS}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.18em] text-ink-soft uppercase">Graph</p>
          <h2 className="mt-1 font-serif text-2xl leading-tight font-medium text-balance">Vertex</h2>
          <p className="mt-1 text-xs text-ink-soft">{ring >= 0 ? `In the cluster ${rings[ring].name}` : "Outside every cluster"}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close the vertex settings" className={CLOSE_CLASS}>
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto border-t border-line px-5 py-4">
        <fieldset className="flex flex-col gap-2">
          <legend className={LEGEND_CLASS}>Color</legend>
          <div role="radiogroup" aria-label="Color" className="flex flex-wrap items-center gap-2">
            {CARD_COLORS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={note.color === preset.id}
                aria-label={preset.name}
                title={preset.name}
                onClick={() => pickColor(preset.id)}
                style={{ backgroundColor: preset.fill }}
                className={clsx(
                  "size-7 rounded-full border border-ink/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  note.color === preset.id && "ring-2 ring-accent ring-offset-2 ring-offset-card",
                )}
              />
            ))}
            <label
              className={clsx(
                "relative flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-ink/50 text-ink-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                isCustomColor(note.color) && "ring-2 ring-accent ring-offset-2 ring-offset-card",
              )}
              style={isCustomColor(note.color) ? { backgroundColor: color.fill } : undefined}
              title="Custom color"
            >
              {isCustomColor(note.color) ? null : <Plus className="size-3.5" aria-hidden="true" />}
              <span className="sr-only">Custom color</span>
              <input
                type="color"
                value={color.fill}
                onChange={(event) => pickColor(event.target.value as CardColorId)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor={`${uid}-text`} className={LEGEND_CLASS}>
            Text
          </label>
          <textarea
            id={`${uid}-text`}
            value={note.text}
            maxLength={280}
            rows={3}
            onChange={(event) => onUpdate(note.id, (n) => ({ ...n, text: event.target.value }))}
            placeholder="Write on this card"
            className={clsx(FIELD_CLASS, "resize-none")}
          />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className={LEGEND_CLASS}>Tags</legend>
          {note.hashtags.length > 0 ? (
            <ul aria-label="Tags on this card" className="flex flex-wrap gap-1.5">
              {note.hashtags.map((tag) => {
                const isRing = ringTagSet.has(tag.toLowerCase())
                const bg = tagColors?.[tag.toLowerCase()]
                return (
                  <li key={tag}>
                    <span
                      style={bg ? { backgroundColor: bg } : undefined}
                      className={clsx(
                        "flex items-center gap-1 rounded-full py-0.5 pr-1 pl-2.5 text-xs",
                        bg ? "text-ink" : "bg-desk text-ink-soft",
                        isRing && "outline-1 outline-accent",
                      )}
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        aria-label={`Remove #${tag}`}
                        className="flex size-5 items-center justify-center rounded-full hover:bg-card/70 focus-visible:outline-2 focus-visible:outline-accent"
                      >
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-xs text-ink-soft">No tags yet.</p>
          )}
          <form
            aria-label="Add a tag"
            onSubmit={(event) => {
              event.preventDefault()
              addTag(draftTag)
            }}
            className="flex gap-2"
          >
            <input
              value={draftTag}
              onChange={(event) => setDraftTag(event.target.value)}
              maxLength={25}
              aria-label="New tag"
              placeholder="Add a tag"
              className={FIELD_CLASS}
            />
            <button
              type="submit"
              disabled={!normalizeHashtag(draftTag)}
              aria-label="Add the tag"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink text-board focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </form>
          <div>
            <p className="mb-1.5 text-xs text-ink-soft text-pretty">A ring tag puts the vertex in that ring&apos;s cluster.</p>
            <ul aria-label="Ring tags" className="flex flex-wrap gap-1.5">
              {rings.flatMap((r) =>
                r.tags.map((tag) => {
                  const on = hasHashtag(note, tag)
                  return (
                    <li key={`${r.id}:${tag}`}>
                      <button
                        type="button"
                        aria-pressed={on}
                        title={r.name}
                        onClick={() => (on ? removeTag(tag) : addTag(tag))}
                        className={clsx(
                          "rounded-full border px-2.5 py-0.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-accent",
                          on ? "border-accent bg-accent-soft text-ink" : "border-line text-ink-soft hover:bg-desk hover:text-ink",
                        )}
                      >
                        #{tag}
                      </button>
                    </li>
                  )
                }),
              )}
            </ul>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-1">
          <legend className={LEGEND_CLASS}>Goals above</legend>
          {ring < 0 ? (
            <p className="text-xs text-ink-soft text-pretty">Give the vertex a ring tag to choose the goals above it.</p>
          ) : (
            <>
              <p className="text-xs text-ink-soft text-pretty">
                Choose one or more. A goal may be on any ring closer to the center, or be the mission.
              </p>
              <div className="mt-1 flex max-h-48 flex-col overflow-y-auto">
                {[{ id: "mission", label: "The mission" }, ...above.map((n) => ({ id: n.id, label: n.text.trim().slice(0, 48) || "Untitled card" }))].map(
                  (option) => (
                    <label
                      key={option.id}
                      className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm text-ink transition-colors hover:bg-desk has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
                    >
                      <input
                        type="checkbox"
                        checked={links.includes(option.id)}
                        onChange={() => toggleParent(option.id)}
                        className="mt-0.5 size-4 shrink-0 accent-accent"
                      />
                      <span className="min-w-0 text-pretty break-words">{option.label}</span>
                    </label>
                  ),
                )}
              </div>
            </>
          )}
        </fieldset>
      </div>
    </aside>
  )
}
