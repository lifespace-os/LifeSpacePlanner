import clsx from "clsx"
import { Plus, X } from "lucide-react"
import { MARKERS, countMarkers, countTag, hasHashtag, type Marker, type Note } from "@/lib/board-data"
import { CardList } from "./ikigai-panel"

const WINDOW_CLASS =
  "pointer-events-auto flex max-h-full w-80 shrink-0 flex-col rounded-2xl border border-line bg-card shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)]"

const CLOSE_CLASS =
  "flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"

/** The ten markers in a window on the left edge. Each row is a drop target and shows how many cards carry it. */
export function MarkersWindow({
  notes,
  activeId,
  hoverId,
  onPick,
  onClose,
}: {
  notes: Note[]
  activeId: string | null
  hoverId: string | null
  onPick: (id: string) => void
  onClose: () => void
}) {
  return (
    <aside aria-label="Markers" className={WINDOW_CLASS}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.18em] text-ink-soft uppercase">Mission</p>
          <h2 className="mt-1 font-serif text-2xl leading-tight font-medium text-balance">Markers</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Hide markers window" className={CLOSE_CLASS}>
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <ul className="mt-3 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto border-t border-line px-2 py-2">
        {MARKERS.map((marker) => {
          const active = marker.id === activeId
          const hovered = marker.id === hoverId
          const count = countTag(notes, marker.tag)
          return (
            <li key={marker.id}>
              <button
                type="button"
                data-marker-item={marker.id}
                aria-pressed={active}
                onClick={() => onPick(marker.id)}
                className={clsx(
                  "flex w-full items-center gap-3 rounded-xl border-2 px-3 py-1.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  active
                    ? "border-accent bg-accent-soft"
                    : hovered
                      ? "border-dashed border-accent bg-accent-soft/60"
                      : "border-transparent hover:bg-desk",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-snug font-medium text-pretty text-ink">{marker.name}</span>
                  <span className="block text-xs text-ink-soft">#{marker.tag}</span>
                </span>
                <span className="shrink-0 text-xs text-ink-soft tabular-nums">
                  {count}
                  <span className="sr-only"> {count === 1 ? "card" : "cards"}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

/** The chosen marker: a short description, the drop area, and the cards that carry it. Same shape as the Ikigai details window. */
export function MarkersPanel({
  marker,
  notes,
  dropOver,
  onClose,
  onRemoveTag,
}: {
  marker: Marker | null
  notes: Note[]
  dropOver: boolean
  onClose: () => void
  onRemoveTag: (id: string, tag: string) => void
}) {
  if (!marker) {
    return (
      <aside aria-label="Marker details" className={WINDOW_CLASS}>
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-[0.18em] text-ink-soft uppercase">Markers</p>
            <h2 className="mt-1 font-serif text-2xl leading-tight font-medium text-balance">Details</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Hide details window" className={CLOSE_CLASS}>
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <p className="px-5 pt-2 pb-5 text-sm leading-relaxed text-ink-soft text-pretty">
          Choose a marker in the left window. Its description, drop area, and tagged cards appear here.
        </p>
      </aside>
    )
  }

  const tagged = notes.filter((note) => hasHashtag(note, marker.tag))
  const tag = `#${marker.tag}`

  return (
    <aside aria-label={`${marker.name} panel`} className={WINDOW_CLASS}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.18em] text-ink-soft uppercase">Marker</p>
          <h2 className="mt-1 font-serif text-2xl leading-tight font-medium text-balance">{marker.name}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Hide details window" className={CLOSE_CLASS}>
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <p className="mt-2 px-5 text-sm leading-relaxed text-ink-soft text-pretty">{marker.description}</p>

      <div
        data-marker-drop=""
        className={clsx(
          "mx-5 mt-4 flex flex-col items-center gap-1 rounded-xl border-2 border-dashed px-3 py-5 text-center transition-colors",
          dropOver ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-soft",
        )}
      >
        <Plus className="size-5" aria-hidden="true" />
        <p className="text-sm font-medium">
          Drop a card here to add <span className="text-ink">{tag}</span>
        </p>
      </div>
      <p className="mt-2 px-5 text-xs text-ink-soft text-pretty">
        The card stays where it is. Shift-click selects several cards. Dropping the selection tags all of them.
      </p>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto border-t border-line px-2 py-2">
        <h3 className="px-3 pt-1 pb-1 text-xs font-medium tracking-[0.16em] text-ink-soft uppercase">
          With {tag} <span className="tabular-nums">({tagged.length})</span>
        </h3>
        <CardList
          notes={tagged}
          empty="No cards yet."
          label={tag}
          onRemove={(id) => onRemoveTag(id, marker.tag)}
          suffix={(note) => (
            <span className="shrink-0 text-xs text-ink-soft tabular-nums">
              {countMarkers(note)} of {MARKERS.length}
              <span className="sr-only"> markers</span>
            </span>
          )}
        />
      </div>
    </aside>
  )
}
