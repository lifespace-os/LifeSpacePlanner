"use client"

import { useId, useState } from "react"
import clsx from "clsx"
import { Check, ChevronRight, List, Minus, Plus, X } from "lucide-react"
import {
  LIFE_SPHERE_SETS,
  getCardColor,
  SCORE_MAX,
  SECTOR_NAME_MAX,
  hasHashtag,
  sectorTag,
  type LabelView,
  type Note,
  type Sector,
  type SphereSetId,
} from "@/lib/board-data"

type SectorView = Exclude<LabelView, "budget">

const COPY: Record<SectorView, { title: string; hint: string; other: string }> = {
  spheres: {
    title: "Life spheres",
    hint: "Drag cards onto a sector of the wheel to give them its hashtag and color. Click or right-click a sector to list its cards and set its satisfaction.",
    other: "Happiness components",
  },
  happiness: {
    title: "Happiness components",
    hint: "Drag cards onto a component of the wheel to give them its hashtag. Right-click a component to list its cards. Colors here are a prototype.",
    other: "Life spheres",
  },
}

export function LabelsPanel({
  view,
  setId,
  sectors,
  notes,
  selectedIds,
  usedByOtherView,
  openSector,
  dropOver,
  wheelOnly,
  onWheelOnly,
  onOpenSector,
  onSetId,
  onAdd,
  onRename,
  onRemove,
  onToggle,
  onScore,
  onClose,
}: {
  view: SectorView
  setId: SphereSetId
  sectors: Sector[]
  notes: Note[]
  selectedIds: string[]
  usedByOtherView: (tag: string) => boolean
  /** The sector whose cards are listed, or null. Its drop area is the second drop target of the window. */
  openSector: Sector | null
  dropOver: boolean
  wheelOnly: boolean
  onWheelOnly: (on: boolean) => void
  onOpenSector: (id: string | null) => void
  onSetId: (id: SphereSetId) => void
  onAdd: (name: string) => string | null
  onRename: (id: string, name: string) => string | null
  onRemove: (id: string) => void
  onToggle: (ids: string[], tag: string, on: boolean) => void
  onScore: (id: string, score: number | null) => void
  onClose: () => void
}) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const inputId = useId()
  const errorId = useId()
  const switchId = useId()
  const copy = COPY[view]
  const selected = notes.filter((note) => selectedIds.includes(note.id))
  const activeSet = LIFE_SPHERE_SETS.find((set) => set.id === setId)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const problem = onAdd(name)
    setError(problem)
    if (!problem) setName("")
  }

  return (
    <aside
      aria-label={`${copy.title} window`}
      className="pointer-events-auto flex max-h-full w-80 shrink-0 flex-col rounded-2xl border border-line bg-card shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)]"
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <h2 className="font-serif text-2xl leading-none font-medium">{copy.title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide labels window"
          title="Hide window. Sectors and hashtags are kept."
          className="flex size-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
      <p className="mt-1.5 px-5 text-sm text-ink-soft text-pretty">{copy.hint}</p>

      <div className="mt-3 flex items-center justify-between gap-3 px-5">
        <span id={switchId} className="text-sm font-medium">
          Wheel view
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={wheelOnly}
          aria-labelledby={switchId}
          onClick={() => onWheelOnly(!wheelOnly)}
          className={clsx(
            "relative h-6 w-11 shrink-0 rounded-full border border-line transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            wheelOnly ? "bg-ink" : "bg-board",
          )}
        >
          <span
            aria-hidden="true"
            className={clsx(
              "absolute top-0.5 left-0.5 size-4.5 rounded-full transition-transform",
              wheelOnly ? "translate-x-5 bg-board" : "translate-x-0 bg-ink-soft",
            )}
          />
        </button>
      </div>

      {view === "spheres" ? (
        <div className="px-5 pt-3">
          <div role="group" aria-label="Ready list" className="flex gap-1 rounded-xl border border-line bg-board p-1">
            {LIFE_SPHERE_SETS.map((set) => {
              const active = set.id === setId
              return (
                <button
                  key={set.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setConfirmId(null)
                    setError(null)
                    onSetId(set.id)
                  }}
                  className={clsx(
                    "flex-1 rounded-lg px-2 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    active ? "bg-ink text-board shadow" : "text-ink-soft hover:bg-desk hover:text-ink",
                  )}
                >
                  {set.name}
                </button>
              )
            })}
          </div>
          {activeSet?.starter ? <p className="mt-1.5 text-xs text-ink-soft">A further starter list. Edit it freely.</p> : null}
        </div>
      ) : null}

      <p className="mt-3 border-t border-line px-5 pt-3 text-xs text-ink-soft" aria-live="polite">
        {selected.length === 0
          ? "No card selected. Select one to switch sectors on."
          : `${selected.length} ${selected.length === 1 ? "card" : "cards"} selected.`}
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {openSector ? (
          <OpenSector
            sector={openSector}
            cards={notes.filter((note) => hasHashtag(note, sectorTag(openSector.name)))}
            dropOver={dropOver}
            onClose={() => onOpenSector(null)}
            onTakeOff={(id) => onToggle([id], sectorTag(openSector.name), false)}
            onScore={view === "spheres" ? onScore : undefined}
          />
        ) : null}
        <ul className="px-2 py-2">
          {sectors.length === 0 ? <li className="px-3 py-4 text-sm text-ink-soft">No sectors. Add one below.</li> : null}
          {sectors.map((sector) => (
            <SectorRow
              key={sector.id}
              sector={sector}
              count={notes.filter((note) => hasHashtag(note, sectorTag(sector.name))).length}
              selected={selected}
              confirming={confirmId === sector.id}
              opened={openSector?.id === sector.id}
              sharedWith={usedByOtherView(sectorTag(sector.name)) ? copy.other : null}
              onOpen={() => onOpenSector(openSector?.id === sector.id ? null : sector.id)}
              onRename={onRename}
              onToggle={onToggle}
              onAskRemove={() => setConfirmId(sector.id)}
              onKeep={() => setConfirmId(null)}
              onRemove={() => {
                setConfirmId(null)
                onRemove(sector.id)
              }}
            />
          ))}
        </ul>
      </div>

      <form onSubmit={submit} className="border-t border-line p-4" noValidate>
        <label htmlFor={inputId} className="text-xs font-medium uppercase tracking-[0.16em] text-ink-soft">
          Add a sector
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id={inputId}
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
            maxLength={SECTOR_NAME_MAX}
            autoComplete="off"
            placeholder="e.g. Travel"
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
      </form>
    </aside>
  )
}

function SectorRow({
  sector,
  count,
  selected,
  confirming,
  opened,
  sharedWith,
  onOpen,
  onRename,
  onToggle,
  onAskRemove,
  onKeep,
  onRemove,
}: {
  sector: Sector
  count: number
  selected: Note[]
  confirming: boolean
  opened: boolean
  sharedWith: string | null
  onOpen: () => void
  onRename: (id: string, name: string) => string | null
  onToggle: (ids: string[], tag: string, on: boolean) => void
  onAskRemove: () => void
  onKeep: () => void
  onRemove: () => void
}) {
  const [draft, setDraft] = useState(sector.name)
  const [error, setError] = useState<string | null>(null)
  const tag = sectorTag(sector.name)
  const withTag = selected.filter((note) => hasHashtag(note, tag)).length
  const all = selected.length > 0 && withTag === selected.length
  const some = withTag > 0 && !all

  function commit() {
    const problem = onRename(sector.id, draft)
    setError(problem)
    if (problem) setDraft(sector.name)
  }

  return (
    <li className={clsx("rounded-lg px-1 py-1 hover:bg-desk", opened && "bg-desk")}>
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="size-3 shrink-0 rounded-full border border-ink/20"
          style={{ backgroundColor: sector.color }}
        />
        <button
          type="button"
          disabled={selected.length === 0}
          aria-pressed={all ? true : some ? "mixed" : false}
          aria-label={`${sector.name} on the selected ${selected.length === 1 ? "card" : "cards"}`}
          onClick={() =>
            onToggle(
              selected.map((note) => note.id),
              tag,
              !all,
            )
          }
          className={clsx(
            "flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40",
            all || some ? "border-accent bg-accent text-board" : "border-line bg-board text-transparent",
          )}
        >
          {some ? <Minus className="size-4" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
        </button>
        <input
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            setError(null)
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur()
            if (event.key === "Escape") {
              setDraft(sector.name)
              setError(null)
              event.currentTarget.blur()
            }
          }}
          maxLength={SECTOR_NAME_MAX}
          autoComplete="off"
          aria-label={`Name of sector ${sector.name}`}
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-ink hover:border-line focus-visible:border-line focus-visible:bg-board focus-visible:outline-2 focus-visible:outline-accent"
        />
        <span className="text-sm text-ink-soft tabular-nums" aria-label={`${count} cards`}>
          {count}
        </span>
        <button
          type="button"
          onClick={onOpen}
          aria-pressed={opened}
          aria-label={`List the cards in ${sector.name}`}
          title="List the cards in this sector"
          className={clsx(
            "flex size-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-board hover:text-ink focus-visible:outline-2 focus-visible:outline-accent",
            opened ? "bg-board text-ink" : "text-ink-soft",
          )}
        >
          <List className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onAskRemove}
          aria-label={`Remove sector ${sector.name}`}
          title="Remove sector"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-board hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <p className="truncate px-10 text-xs text-ink-soft">#{tag}</p>
      {error ? (
        <p role="alert" className="px-10 pt-0.5 text-sm text-[#8d3f4a]">
          {error}
        </p>
      ) : null}
      {confirming ? (
        <div role="group" aria-label={`Remove ${sector.name}?`} className="mx-1 mt-1.5 rounded-lg border border-line bg-board p-3">
          <p className="text-sm text-ink text-pretty">
            {sharedWith
              ? `Remove ${sector.name}? Cards keep #${tag} because ${sharedWith} also uses it.`
              : count > 0
                ? `Remove ${sector.name}? This takes #${tag} off ${count} ${count === 1 ? "card" : "cards"}.`
                : `Remove ${sector.name}? No card has #${tag}.`}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onRemove}
              className="rounded-lg bg-ink px-3 py-1.5 text-sm text-board transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Remove
            </button>
            <button
              type="button"
              autoFocus
              onClick={onKeep}
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink transition-colors hover:bg-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Keep it
            </button>
          </div>
        </div>
      ) : null}
    </li>
  )
}

/** Satisfaction from 0 to 100. The value is saved when the slider is released, and the wheel fills to it. */
function ScoreSlider({ sector, onScore }: { sector: Sector; onScore: (id: string, score: number | null) => void }) {
  const [draft, setDraft] = useState(sector.score ?? 50)
  const id = useId()
  const saved = typeof sector.score === "number"

  function save() {
    onScore(sector.id, draft)
  }

  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium uppercase tracking-[0.16em] text-ink-soft">
          Satisfaction
        </label>
        <span className="text-sm text-ink tabular-nums" aria-live="polite">
          {saved ? `Saved ${sector.score}%` : "Not scored yet"}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={SCORE_MAX}
        step={1}
        value={draft}
        aria-valuetext={`${draft} percent`}
        onChange={(event) => setDraft(Number(event.target.value))}
        onPointerUp={save}
        onKeyUp={(event) => {
          if (event.key.startsWith("Arrow") || event.key === "Home" || event.key === "End" || event.key.startsWith("Page")) save()
        }}
        onBlur={() => {
          if (!saved || sector.score !== draft) save()
        }}
        className="mt-1.5 w-full accent-accent"
      />
      <div className="flex items-center justify-between text-xs text-ink-soft">
        <span className="tabular-nums">{draft}%</span>
        {saved ? (
          <button
            type="button"
            onClick={() => onScore(sector.id, null)}
            className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            Clear score
          </button>
        ) : (
          <span>Release the slider to save</span>
        )}
      </div>
    </div>
  )
}

function OpenSector({
  sector,
  cards,
  dropOver,
  onClose,
  onTakeOff,
  onScore,
}: {
  sector: Sector
  cards: Note[]
  dropOver: boolean
  onClose: () => void
  onTakeOff: (id: string) => void
  /** Present only for life spheres. Happiness components have no satisfaction score. */
  onScore?: (id: string, score: number | null) => void
}) {
  const tag = sectorTag(sector.name)
  return (
    <section aria-label={`Cards in ${sector.name}`} className="mx-3 mt-3 rounded-xl border border-line bg-board p-3">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="size-3 shrink-0 rounded-full border border-ink/20"
          style={{ backgroundColor: sector.color }}
        />
        <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{sector.name}</h3>
        <span className="text-xs text-ink-soft tabular-nums">
          {cards.length} {cards.length === 1 ? "card" : "cards"}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the card list"
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {onScore ? <ScoreSlider key={sector.id} sector={sector} onScore={onScore} /> : null}

      <div
        data-sector-drop=""
        role="group"
        aria-label={`Drop area for ${sector.name}`}
        className={clsx(
          "mt-2.5 flex h-14 items-center justify-center rounded-lg border-2 border-dashed px-3 text-center text-xs text-pretty transition-colors",
          dropOver ? "border-accent bg-accent/10 text-ink" : "border-line text-ink-soft",
        )}
      >
        Drop cards here to add #{tag}
      </div>

      {cards.length === 0 ? (
        <p className="mt-2.5 text-xs text-ink-soft">No card is in this sector yet.</p>
      ) : (
        <ul className="mt-2.5 flex max-h-40 flex-col gap-1 overflow-y-auto">
          {cards.map((card) => (
            <li key={card.id} className="flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-desk">
              <span
                aria-hidden="true"
                className="size-3 shrink-0 rounded-sm border border-ink/20"
                style={{ backgroundColor: getCardColor(card.color).fill }}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{card.text.trim() || "Untitled card"}</span>
              <button
                type="button"
                onClick={() => onTakeOff(card.id)}
                aria-label={`Take #${tag} off ${card.text.trim().slice(0, 30) || "this card"}`}
                title={`Take #${tag} off this card`}
                className="flex size-6 shrink-0 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-board hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
