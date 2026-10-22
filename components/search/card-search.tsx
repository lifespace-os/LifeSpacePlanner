"use client"

import { useId, useMemo, useState } from "react"
import { useGoals } from "@/components/goals-provider"
import { useKanban } from "@/components/kanban/kanban-provider"
import { ConfirmDialog } from "@/components/settings/confirm-dialog"
import { CardWindow, type Feedback } from "@/components/search/card-window"
import type { IkigaiCircleId } from "@/lib/board-data"
import {
  addHashtag,
  describeCard,
  linkCard,
  linkCircle,
  linkMission,
  noteToTask,
  searchCards,
  taskToNote,
  type CardRef,
  type Change,
} from "@/lib/card-search"

const DROPDOWN_LIMIT = 8

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** A search field for the header, and the window it opens. Finds whiteboard cards and kanban tasks by text or hashtag. */
export function CardSearch() {
  const { notes, setNotes, rings } = useGoals()
  const { cards, setCards, columnsByBoard, openId, closeCard, revertDraft } = useKanban()
  const [query, setQuery] = useState("")
  const [listOpen, setListOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [windowOpen, setWindowOpen] = useState(false)
  const [chosenRef, setChosenRef] = useState<CardRef | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [confirmBack, setConfirmBack] = useState(false)
  const listId = useId()

  const hits = useMemo(() => searchCards(query, notes, cards, columnsByBoard), [query, notes, cards, columnsByBoard])
  const chosen = useMemo(
    () => (chosenRef ? describeCard(chosenRef, notes, cards, columnsByBoard) : null),
    [chosenRef, notes, cards, columnsByBoard],
  )
  const dropdown = hits.slice(0, DROPDOWN_LIMIT)
  const dropdownShown = listOpen && !windowOpen && query.trim().length > 0

  function openWindow(ref: CardRef | null) {
    setChosenRef(ref)
    setFeedback(null)
    setListOpen(false)
    setWindowOpen(true)
  }

  function apply(change: Change) {
    if (!change.ok) {
      setFeedback({ text: change.message, error: true })
      return false
    }
    setNotes(change.notes)
    setCards(change.cards)
    setChosenRef(change.ref)
    setFeedback({ text: change.message, error: false })
    return true
  }

  function forgetTask(id: string) {
    if (openId === id) closeCard()
    revertDraft(id)
  }

  function convert() {
    if (!chosen) return
    if (chosen.ref.kind === "task") {
      setConfirmBack(true)
      return
    }
    apply(noteToTask(notes, cards, chosen.ref.id, columnsByBoard.all, rings))
  }

  function convertBack() {
    if (!chosen || chosen.ref.kind !== "task") return
    const id = chosen.ref.id
    if (apply(taskToNote(notes, cards, id))) forgetTask(id)
    setConfirmBack(false)
  }

  return (
    <>
      <div className="relative flex shrink-0 items-center gap-1">
        <input
          type="search"
          role="combobox"
          aria-label="Search cards"
          aria-expanded={dropdownShown && dropdown.length > 0}
          aria-controls={listId}
          aria-activedescendant={dropdownShown && dropdown[active] ? `${listId}-${active}` : undefined}
          aria-autocomplete="list"
          placeholder="Search cards or #tag"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
            setListOpen(true)
          }}
          onBlur={() => setListOpen(false)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || event.keyCode === 229) return
            if (event.key === "ArrowDown") {
              event.preventDefault()
              setListOpen(true)
              setActive((value) => Math.min(value + 1, Math.max(dropdown.length - 1, 0)))
            } else if (event.key === "ArrowUp") {
              event.preventDefault()
              setActive((value) => Math.max(value - 1, 0))
            } else if (event.key === "Enter" && dropdownShown && dropdown[active]) {
              event.preventDefault()
              openWindow(dropdown[active].ref)
            } else if (event.key === "Escape") {
              setListOpen(false)
            }
          }}
          className="h-8 w-40 rounded-md border border-line bg-card px-3 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:w-56"
        />
        <button
          type="button"
          aria-label="Open card search window"
          onClick={() => openWindow(null)}
          className="flex size-8 items-center justify-center rounded-md border border-line bg-card text-ink-soft transition-colors hover:bg-line/40 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <SearchIcon />
        </button>
        {dropdownShown ? (
          <div
            onMouseDown={(event) => event.preventDefault()}
            className="absolute top-full left-0 z-30 mt-1 w-80 max-w-[calc(100vw-2rem)] rounded-md border border-line bg-board shadow-lg"
          >
            {dropdown.length === 0 ? (
              <p className="px-3 py-2 text-sm text-ink-soft">No card matches.</p>
            ) : (
              <ul id={listId} role="listbox" aria-label="Matching cards" className="max-h-80 overflow-y-auto py-1">
                {dropdown.map((hit, index) => (
                  <li
                    key={`${hit.ref.kind}-${hit.ref.id}`}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={index === active}
                    onClick={() => openWindow(hit.ref)}
                    onMouseEnter={() => setActive(index)}
                    className="flex cursor-pointer flex-col gap-0.5 px-3 py-2 aria-selected:bg-line/50"
                  >
                    <span className="text-[11px] tracking-wide text-ink-soft uppercase">{hit.place}</span>
                    <span className="line-clamp-1 text-sm text-ink">{hit.text}</span>
                  </li>
                ))}
              </ul>
            )}
            {hits.length > DROPDOWN_LIMIT ? (
              <button
                type="button"
                onClick={() => openWindow(null)}
                className="w-full border-t border-line px-3 py-2 text-left text-xs text-ink-soft hover:bg-line/40"
              >
                {hits.length - DROPDOWN_LIMIT} more. Open the window to see them all.
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <CardWindow
        open={windowOpen}
        onClose={() => setWindowOpen(false)}
        query={query}
        onQuery={setQuery}
        hits={hits}
        chosen={chosen}
        linkHits={(text) => searchCards(text, notes, cards, columnsByBoard)}
        feedback={feedback}
        onPick={(ref) => {
          setChosenRef(ref)
          setFeedback(null)
        }}
        onConvert={convert}
        onAddTag={(raw) => chosen !== null && apply(addHashtag(notes, cards, chosen.ref, raw, rings))}
        onLinkMission={() => chosen && apply(linkMission(notes, cards, chosen.ref))}
        onLinkCircle={(circle: IkigaiCircleId) => chosen && apply(linkCircle(notes, cards, chosen.ref, circle))}
        onLinkCard={(target) => chosen && apply(linkCard(notes, cards, chosen.ref, target))}
      />

      <ConfirmDialog
        open={confirmBack}
        title="Turn this task back into a whiteboard card?"
        confirmLabel="Turn back into a card"
        onConfirm={convertBack}
        onCancel={() => setConfirmBack(false)}
      >
        <p>
          The task leaves the Kanban board and returns to the Whiteboard as a plain card below the others. Its dates and
          owner are kept. Its steps, repeat rule, times, and column are dropped. Goal lines become plain lines.
        </p>
      </ConfirmDialog>
    </>
  )
}
