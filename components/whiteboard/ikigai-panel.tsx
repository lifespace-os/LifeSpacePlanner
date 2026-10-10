import clsx from "clsx"
import { Plus, X } from "lucide-react"
import { getCardColor, getIkigaiItem, hasHashtag, type IkigaiItem, type Note } from "@/lib/board-data"

function CardList({
  notes,
  empty,
  label,
  onRemove,
}: {
  notes: Note[]
  empty: string
  label?: string
  onRemove?: (id: string) => void
}) {
  if (notes.length === 0) return <p className="px-3 py-2 text-sm text-ink-soft">{empty}</p>
  return (
    <ul className="flex flex-col">
      {notes.map((note) => (
        <li key={note.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-desk">
          <span
            aria-hidden="true"
            className="size-3.5 shrink-0 rounded-sm border border-ink/15"
            style={{ backgroundColor: getCardColor(note.color).fill }}
          />
          <span className="min-w-0 flex-1 text-sm leading-snug text-ink">
            <span className="line-clamp-2 break-words">{note.text.trim() || "Blank card"}</span>
          </span>
          {onRemove ? (
            <button
              type="button"
              onClick={() => onRemove(note.id)}
              aria-label={`Remove ${label} from ${note.text.trim() || "blank card"}`}
              title={`Remove ${label}`}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-board hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

export function IkigaiPanel({
  item,
  notes,
  dropOver,
  onClose,
  onRemoveTag,
}: {
  item: IkigaiItem | null
  notes: Note[]
  dropOver: boolean
  onClose: () => void
  onRemoveTag: (id: string, tag: string) => void
}) {
  if (!item) {
    return (
      <aside
        aria-label="Ikigai details"
        className="pointer-events-auto flex max-h-full w-80 shrink-0 flex-col rounded-2xl border border-line bg-card shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)]"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-[0.18em] text-ink-soft uppercase">Ikigai</p>
            <h2 className="mt-1 font-serif text-2xl leading-tight font-medium text-balance">Details</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Hide details window"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <p className="px-5 pt-2 pb-5 text-sm leading-relaxed text-ink-soft text-pretty">
          Choose a step in the left window, or click a circle. Its description, drop area, and tagged cards appear here.
        </p>
      </aside>
    )
  }

  const tagged = notes.filter((note) => hasHashtag(note, item.tag))
  const candidates = item.parents
    ? notes.filter(
        (note) => !hasHashtag(note, item.tag) && hasHashtag(note, item.parents![0]) && hasHashtag(note, item.parents![1]),
      )
    : []
  const related = item.kind === "move" ? getIkigaiItem(item.region) : null
  const tag = `#${item.tag}`

  return (
    <aside
      aria-label={`${item.name} panel`}
      className="pointer-events-auto flex max-h-full w-80 shrink-0 flex-col rounded-2xl border border-line bg-card shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)]"
    >
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.18em] text-ink-soft uppercase">
            {item.step ? `Step ${item.step}` : item.kind === "move" ? "Move toward the center" : "Center"}
          </p>
          <h2 className="mt-1 font-serif text-2xl leading-tight font-medium text-balance">{item.name}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide details window"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <p className="mt-2 px-5 text-sm leading-relaxed text-ink-soft text-pretty">
        {item.description}
        {related ? ` Highlights ${related.name.toLowerCase()}.` : ""}
      </p>

      <div
        data-ikigai-drop=""
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
        The card stays where it is. Shift-click selects several cards. You can also drop on the diagram or the list.
      </p>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto border-t border-line px-2 py-2">
        <h3 className="px-3 pt-1 pb-1 text-xs font-medium tracking-[0.16em] text-ink-soft uppercase">
          With {tag} <span className="tabular-nums">({tagged.length})</span>
        </h3>
        <CardList notes={tagged} empty="No cards yet." label={tag} onRemove={(id) => onRemoveTag(id, item.tag)} />

        {item.parents ? (
          <>
            <h3 className="px-3 pt-4 pb-1 text-xs font-medium tracking-[0.16em] text-ink-soft uppercase">
              Candidates <span className="tabular-nums">({candidates.length})</span>
            </h3>
            <p className="px-3 pb-1 text-xs text-ink-soft text-pretty">
              These have both #{item.parents[0]} and #{item.parents[1]}. They get {tag} only when you drop them.
            </p>
            <CardList notes={candidates} empty="No card has both yet." />
          </>
        ) : null}
      </div>
    </aside>
  )
}
