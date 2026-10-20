"use client"

import { useEffect, useId, useRef, useState } from "react"
import type { IkigaiCircleId } from "@/lib/board-data"
import { CIRCLE_NAMES, SEARCH_LIMIT, type CardRef, type Detail, type Hit } from "@/lib/card-search"

const CIRCLES: IkigaiCircleId[] = ["love", "good-at", "income", "needed"]

const BUTTON =
  "rounded-md border border-line bg-card px-3 py-1.5 text-sm text-ink transition-colors hover:bg-line/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"

const FIELD =
  "w-full rounded-md border border-line bg-card px-3 py-1.5 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"

export type Feedback = { text: string; error: boolean }

type Props = {
  open: boolean
  onClose: () => void
  query: string
  onQuery: (query: string) => void
  hits: Hit[]
  chosen: Detail | null
  linkHits: (query: string) => Hit[]
  feedback: Feedback | null
  onPick: (ref: CardRef) => void
  onConvert: () => void
  onAddTag: (raw: string) => boolean
  onLinkMission: () => void
  onLinkCircle: (circle: IkigaiCircleId) => void
  onLinkCard: (ref: CardRef) => void
}

function sameRef(a: CardRef | undefined, b: CardRef | undefined) {
  return Boolean(a && b && a.kind === b.kind && a.id === b.id)
}

function HitRow({ hit, selected, onPick }: { hit: Hit; selected: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onPick}
      className="flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-line/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent aria-pressed:bg-line/60"
    >
      <span className="text-[11px] tracking-wide text-ink-soft uppercase">{hit.place}</span>
      <span className="line-clamp-2 text-sm text-ink">{hit.text}</span>
      {hit.tags.length > 0 ? (
        <span className="truncate text-xs text-ink-soft">{hit.tags.map((tag) => `#${tag}`).join(" ")}</span>
      ) : null}
    </button>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return <li className="rounded-full border border-line bg-card px-2.5 py-0.5 text-xs text-ink">{children}</li>
}

function Actions({
  chosen,
  linkHits,
  onConvert,
  onAddTag,
  onLinkMission,
  onLinkCircle,
  onLinkCard,
}: Pick<Props, "linkHits" | "onConvert" | "onAddTag" | "onLinkMission" | "onLinkCircle" | "onLinkCard"> & { chosen: Detail }) {
  const [tagDraft, setTagDraft] = useState("")
  const [linkQuery, setLinkQuery] = useState("")
  const tagId = useId()
  const linkId = useId()
  const candidates = linkQuery.trim() ? linkHits(linkQuery).filter((hit) => !sameRef(hit.ref, chosen.ref)).slice(0, 6) : []
  const isNote = chosen.ref.kind === "note"

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[11px] font-medium tracking-[0.18em] text-ink-soft uppercase">{chosen.place}</p>
        <p className="mt-1 font-serif text-lg leading-snug text-balance text-ink">{chosen.text}</p>
        {chosen.tags.length > 0 || chosen.mission || chosen.linked.length > 0 ? (
          <ul aria-label="Hashtags and links" className="mt-3 flex flex-wrap gap-1.5">
            {chosen.tags.map((tag) => (
              <Chip key={tag}>#{tag}</Chip>
            ))}
            {chosen.mission ? <Chip>Mission</Chip> : null}
            {chosen.linked.map((hit) => (
              <Chip key={`${hit.ref.kind}-${hit.ref.id}`}>
                <span className="inline-block max-w-40 truncate align-bottom">{hit.text}</span>
              </Chip>
            ))}
          </ul>
        ) : null}
      </div>

      <section aria-labelledby={`${tagId}-turn`} className="flex flex-col gap-2">
        <h3 id={`${tagId}-turn`} className="text-sm font-medium text-ink">
          {isNote ? "Kanban task" : "Whiteboard card"}
        </h3>
        <div>
          <button type="button" onClick={onConvert} className={BUTTON}>
            {isNote ? "Turn into a kanban task" : "Turn back into a whiteboard card"}
          </button>
        </div>
      </section>

      <section aria-labelledby={`${tagId}-tag`} className="flex flex-col gap-2">
        <h3 id={`${tagId}-tag`} className="text-sm font-medium text-ink">
          Add a hashtag
        </h3>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (onAddTag(tagDraft)) setTagDraft("")
          }}
        >
          <input
            id={tagId}
            value={tagDraft}
            onChange={(event) => setTagDraft(event.target.value)}
            aria-labelledby={`${tagId}-tag`}
            placeholder="#hashtag"
            maxLength={25}
            className={FIELD}
          />
          <button type="submit" className={BUTTON}>
            Add
          </button>
        </form>
      </section>

      <section aria-labelledby={`${linkId}-head`} className="flex flex-col gap-3">
        <h3 id={`${linkId}-head`} className="text-sm font-medium text-ink">
          Link
        </h3>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onLinkMission} className={BUTTON}>
            Mission
          </button>
          {CIRCLES.map((circle) => (
            <button key={circle} type="button" onClick={() => onLinkCircle(circle)} className={BUTTON}>
              {CIRCLE_NAMES[circle]}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <input
            id={linkId}
            value={linkQuery}
            onChange={(event) => setLinkQuery(event.target.value)}
            aria-label="Find another card to link"
            placeholder="Another card: type a word or #tag"
            className={FIELD}
          />
          {candidates.length > 0 ? (
            <ul className="flex flex-col rounded-md border border-line bg-card">
              {candidates.map((hit) => (
                <li key={`${hit.ref.kind}-${hit.ref.id}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onLinkCard(hit.ref)
                      setLinkQuery("")
                    }}
                    className="flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-line/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                  >
                    <span className="text-[11px] tracking-wide text-ink-soft uppercase">{hit.place}</span>
                    <span className="line-clamp-1 text-sm text-ink">{hit.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : linkQuery.trim() ? (
            <p className="text-xs text-ink-soft">No other card matches.</p>
          ) : null}
        </div>
      </section>
    </div>
  )
}

/** The window opened from the header search. It sits in the centre of the screen. */
export function CardWindow({ open, onClose, query, onQuery, hits, chosen, feedback, onPick, ...actions }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const shown = hits.slice(0, SEARCH_LIMIT)

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
      onClose={onClose}
      className="m-auto max-h-[min(40rem,calc(100dvh-3rem))] w-[min(46rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-xl border border-line bg-board p-0 text-ink shadow-lg backdrop:bg-ink/40 open:flex"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 id={titleId} className="font-serif text-xl font-medium tracking-tight">
          Find a card
        </h2>
        <button type="button" onClick={onClose} className={BUTTON}>
          Close
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="flex min-h-0 flex-col gap-2 border-b border-line p-3 md:w-64 md:shrink-0 md:border-r md:border-b-0">
          <input
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            aria-label="Search cards"
            placeholder="Search cards or #tag"
            autoFocus
            className={FIELD}
          />
          <div aria-live="polite" className="min-h-0 flex-1 overflow-y-auto">
            {!query.trim() ? (
              <p className="px-3 py-2 text-sm text-ink-soft">Type a word or a #hashtag to find whiteboard cards and kanban tasks.</p>
            ) : shown.length === 0 ? (
              <p className="px-3 py-2 text-sm text-ink-soft">No card matches.</p>
            ) : (
              <ul className="flex max-h-48 flex-col gap-0.5 md:max-h-none">
                {shown.map((hit) => (
                  <li key={`${hit.ref.kind}-${hit.ref.id}`}>
                    <HitRow hit={hit} selected={sameRef(hit.ref, chosen?.ref)} onPick={() => onPick(hit.ref)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {chosen ? (
            <Actions key={`${chosen.ref.kind}-${chosen.ref.id}`} chosen={chosen} {...actions} />
          ) : (
            <p className="text-sm text-ink-soft">Choose a card to turn it, add a hashtag, or link it.</p>
          )}
          {feedback ? (
            <p role="status" className={feedback.error ? "mt-4 text-sm text-release" : "mt-4 text-sm text-ink-soft"}>
              {feedback.text}
            </p>
          ) : null}
        </div>
      </div>
    </dialog>
  )
}
