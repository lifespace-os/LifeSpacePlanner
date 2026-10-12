import clsx from "clsx"
import { Plus, Trash2, X } from "lucide-react"
import { useState } from "react"
import {
  GOAL_VIEW_LEVELS,
  getCardColor,
  getGoalLevel,
  goalChainFor,
  goalRingOf,
  newRingTag,
  type GoalChain,
  type GoalRing,
  hasHashtag,
  type GoalView,
  type Note,
} from "@/lib/board-data"
import { CardList } from "./ikigai-panel"

const WINDOW_CLASS =
  "pointer-events-auto flex max-h-full w-80 shrink-0 flex-col rounded-2xl border border-line bg-card shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)]"

const CLOSE_CLASS =
  "flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"

const ROW_CLASS =
  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-desk focus-visible:outline-2 focus-visible:outline-accent"

const VIEW_TITLES: Record<GoalView, string> = {
  needs: "Needs, dreams, and wants",
  life: "Life goals",
  project: "Project goals",
  tasks: "Tasks",
  map: "Map",
  graph: "Graph",
}

const FIELD_CLASS =
  "w-full rounded-lg border border-line bg-board px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-accent"

/** Adds a ring with a name and a place: the ring it sits after. */
function AddRingForm({ rings, onAdd }: { rings: GoalRing[]; onAdd: (name: string, afterId: string) => void }) {
  const [name, setName] = useState("")
  const [afterId, setAfterId] = useState("")
  const place = rings.some((ring) => ring.id === afterId) ? afterId : rings[rings.length - 1].id
  const tag = name.trim() ? newRingTag(name, rings) : null

  return (
    <form
      aria-label="Add a ring"
      onSubmit={(event) => {
        event.preventDefault()
        if (!tag) return
        onAdd(name, place)
        setName("")
      }}
      className="mx-1 mt-3 flex flex-col gap-2 border-t border-line px-2 pt-4 pb-2"
    >
      <h3 className="text-xs font-medium tracking-[0.16em] text-ink-soft uppercase">Add a ring</h3>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-ink-soft">Name</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={40}
          placeholder="For example, Habits"
          className={FIELD_CLASS}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-ink-soft">Place: after this ring</span>
        <select value={place} onChange={(event) => setAfterId(event.target.value)} className={FIELD_CLASS}>
          {rings.map((ring) => (
            <option key={ring.id} value={ring.id}>
              {ring.name}
            </option>
          ))}
        </select>
      </label>
      <p className="min-h-4 text-xs text-ink-soft">{tag ? `Cards on it carry #${tag}` : "\u00A0"}</p>
      <button
        type="submit"
        disabled={!tag}
        className="flex items-center justify-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-board transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="size-4" aria-hidden="true" />
        Add ring
      </button>
    </form>
  )
}

/** The selected point, each goal above it, then the mission. It stops, and says so, where a link is missing. */
function GoalChainList({
  chain,
  missionText,
  rings,
}: {
  chain: GoalChain
  missionText: string
  rings: GoalRing[]
}) {
  const saved = missionText.length > 0
  return (
    <section aria-label="Chain to the mission" className="mb-2 border-b border-line px-3 pt-1 pb-3">
      <h3 className="text-xs font-medium tracking-[0.16em] text-ink-soft uppercase">Chain to the mission</h3>
      <ol className="mt-2 flex flex-col">
        {chain.steps.map((note, index) => (
          <li key={note.id} className="flex gap-3">
            <div className="flex w-3 shrink-0 flex-col items-center">
              <span
                aria-hidden="true"
                className="mt-1.5 size-3 shrink-0 rounded-full border border-ink/60"
                style={{ backgroundColor: getCardColor(note.color).fill }}
              />
              {index < chain.steps.length - 1 || chain.reachesMission ? (
                <span aria-hidden="true" className="w-px flex-1 bg-line" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1 pb-3">
              <p className="text-[11px] tracking-wide text-ink-soft uppercase">
                {index === 0 ? "Selected" : "Goal above"} · {rings[goalRingOf(note, rings)]?.name}
              </p>
              <p className="text-sm text-ink break-words">{note.text.trim() || "Empty card"}</p>
            </div>
          </li>
        ))}
        {chain.reachesMission ? (
          <li className="flex gap-3">
            <div className="flex w-3 shrink-0 flex-col items-center">
              <span aria-hidden="true" className="mt-1.5 size-3 shrink-0 rounded-full bg-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] tracking-wide text-ink-soft uppercase">Mission</p>
              {saved ? (
                <p className="font-serif text-sm leading-snug italic text-ink break-words">{`\u201C${missionText}\u201D`}</p>
              ) : (
                <p className="text-sm text-ink-soft">The mission is not written yet.</p>
              )}
            </div>
          </li>
        ) : (
          <li className="flex gap-3">
            <div className="flex w-3 shrink-0 flex-col items-center">
              <span aria-hidden="true" className="mt-1.5 size-3 shrink-0 rounded-full border border-dashed border-ink-soft" />
            </div>
            <p className="min-w-0 flex-1 text-sm text-ink-soft">
              The goal above is not chosen. Right-click the point to choose it.
            </p>
          </li>
        )}
      </ol>
    </section>
  )
}

/** The right window of Goals. Each drop area sets one level on the cards dropped on it. */
export function GoalsPanel({
  view,
  notes,
  rings,
  missionText,
  hoverId,
  focusRing,
  selectedId,
  onFocusRing,
  onSelectPoint,
  onAddRing,
  onRemoveRing,
  onClose,
  onRemoveLevel,
}: {
  view: GoalView
  notes: Note[]
  rings: GoalRing[]
  missionText: string
  hoverId: string | null
  /** Map only: the ring the view is zoomed to, or null for the whole map. */
  focusRing: number | null
  selectedId: string | null
  onFocusRing: (ring: number | null) => void
  onSelectPoint: (id: string) => void
  onAddRing: (name: string, afterId: string) => void
  onRemoveRing: (id: string) => void
  onClose: () => void
  onRemoveLevel: (id: string, tag: string) => void
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const levelTags = view === "map" || view === "graph" ? [] : GOAL_VIEW_LEVELS[view]
  const chain = view === "map" && selectedId ? goalChainFor(notes, selectedId, rings) : null

  return (
    <aside aria-label={`${VIEW_TITLES[view]} panel`} className={WINDOW_CLASS}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.18em] text-ink-soft uppercase">Goals</p>
          <h2 className="mt-1 font-serif text-2xl leading-tight font-medium text-balance">{VIEW_TITLES[view]}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Hide goals window" className={CLOSE_CLASS}>
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {view === "map" ? (
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto border-t border-line px-2 py-2">
          {chain ? <GoalChainList chain={chain} missionText={missionText} rings={rings} /> : null}
          <p className="px-3 pt-1 pb-2 text-xs text-ink-soft text-pretty">
            Pick a ring to zoom to it and show only its points. Right-click a point to edit it.
          </p>
          <ul className="flex flex-col gap-0.5">
            <li>
              <button
                type="button"
                aria-pressed={focusRing === null}
                onClick={() => onFocusRing(null)}
                className={clsx(ROW_CLASS, focusRing === null && "bg-accent-soft")}
              >
                <span className="min-w-0 flex-1 text-sm font-medium text-ink">Whole map</span>
                <span className="shrink-0 text-sm text-ink-soft tabular-nums">
                  {notes.filter((note) => goalRingOf(note, rings) >= 0).length}
                  <span className="sr-only"> cards</span>
                </span>
              </button>
            </li>
            {rings.map((ringInfo, ring) => {
              const name = ringInfo.name
              const onRing = notes.filter((note) => goalRingOf(note, rings) === ring)
              const focused = focusRing === ring
              const confirming = confirmId === ringInfo.id
              return (
                <li key={ringInfo.id}>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-pressed={focused}
                      onClick={() => onFocusRing(focused ? null : ring)}
                      className={clsx(ROW_CLASS, "min-w-0 flex-1", focused && "bg-accent-soft")}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-ink">{name}</span>
                        <span className="block text-xs text-ink-soft">
                          {ringInfo.tags.map((tag) => `#${tag}`).join(" ")}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm text-ink-soft tabular-nums">
                        {onRing.length}
                        <span className="sr-only"> {onRing.length === 1 ? "card" : "cards"}</span>
                      </span>
                    </button>
                    {ringInfo.custom ? (
                      <button
                        type="button"
                        onClick={() => setConfirmId(confirming ? null : ringInfo.id)}
                        aria-label={`Remove the ring ${name}`}
                        title="Remove this ring"
                        className={CLOSE_CLASS}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                  {confirming ? (
                    <div role="alertdialog" aria-label={`Remove ${name}?`} className="mx-3 mt-1 mb-2 rounded-lg border border-line bg-desk p-3">
                      <p className="text-sm text-ink text-pretty">
                        {onRing.length === 0
                          ? `Remove the ring ${name}?`
                          : `Remove the ring ${name}? ${onRing.length === 1 ? "1 card loses" : `${onRing.length} cards lose`} #${ringInfo.tags[0]} and its place on the Map.`}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmId(null)
                            onRemoveRing(ringInfo.id)
                          }}
                          className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-board focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        >
                          Remove ring
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(null)}
                          className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-card hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
                        >
                          Keep it
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {focused ? (
                    <ul aria-label={`Points on ${name}`} className="mt-0.5 mb-1.5 ml-3 flex flex-col border-l border-line">
                      {onRing.length === 0 ? (
                        <li className="px-3 py-2 text-xs text-ink-soft">No cards on this ring yet.</li>
                      ) : (
                        onRing.map((note) => (
                          <li key={note.id}>
                            <button
                              type="button"
                              aria-pressed={selectedId === note.id}
                              onClick={() => onSelectPoint(note.id)}
                              className={clsx(
                                "flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-sm transition-colors hover:bg-desk focus-visible:outline-2 focus-visible:outline-accent",
                                selectedId === note.id ? "bg-desk text-ink" : "text-ink-soft",
                              )}
                            >
                              <span
                                aria-hidden="true"
                                className="size-3 shrink-0 rounded-full border border-ink/60"
                                style={{ backgroundColor: getCardColor(note.color).fill }}
                              />
                              <span className="min-w-0 flex-1 truncate">{note.text.trim() || "Empty card"}</span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ul>
          <AddRingForm rings={rings} onAdd={onAddRing} />
        </div>
      ) : (
        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto border-t border-line px-5 py-4">
          <p className="text-xs text-ink-soft text-pretty">
            Cards stay where they are. A new level replaces the previous one. Shift-click selects several cards.
          </p>
          {levelTags.map((tag) => {
            const level = getGoalLevel(tag)
            if (!level) return null
            const tagged = notes.filter((note) => hasHashtag(note, level.tag))
            const hovered = hoverId === level.tag
            return (
              <section key={level.id} aria-label={level.name} className="flex flex-col gap-2">
                <div
                  data-goal-area={level.tag}
                  className={clsx(
                    "flex flex-col items-center gap-1 rounded-xl border-2 border-dashed px-3 py-4 text-center transition-colors",
                    hovered ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-soft",
                  )}
                >
                  <Plus className="size-5" aria-hidden="true" />
                  <p className="text-sm font-medium">
                    Drop a card here to make it a <span className="text-ink">{level.name.toLowerCase()}</span>
                  </p>
                  <p className="text-xs">{level.description}</p>
                </div>
                <h3 className="text-xs font-medium tracking-[0.16em] text-ink-soft uppercase">
                  With #{level.tag} <span className="tabular-nums">({tagged.length})</span>
                </h3>
                <div className="-mx-3">
                  <CardList
                    notes={tagged}
                    empty="No cards yet."
                    label={`#${level.tag}`}
                    onRemove={(id) => onRemoveLevel(id, level.tag)}
                  />
                </div>
              </section>
            )
          })}
        </div>
      )}
    </aside>
  )
}
