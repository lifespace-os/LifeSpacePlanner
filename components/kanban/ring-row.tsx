"use client"

import Link from "next/link"
import clsx from "clsx"
import { getCardColor, getGoalLevel, type GoalRing, type Note } from "@/lib/board-data"
import { goalRingOf } from "@/lib/board-data"

type RingRowProps = {
  cards: Note[]
  rings: GoalRing[]
  focusId: string | null
  /** How many tasks on this board hang under each ring card, counting the cards below it. */
  taskCounts: Record<string, number>
  onPick: (id: string) => void
}

/** A row of the Map's ring cards. They are not kanban cards and never sit in a column. */
export function RingRow({ cards, rings, focusId, taskCounts, onPick }: RingRowProps) {
  if (cards.length === 0) {
    return (
      <p className="mx-6 mb-3 text-sm text-ink-soft">
        No cards on a ring yet. Give a card a level in Goals on the{" "}
        <Link href="/" className="font-medium text-ink underline underline-offset-2 hover:text-accent">
          Whiteboard
        </Link>
        .
      </p>
    )
  }

  return (
    <section aria-label="Ring cards" className="mx-6 mb-3">
      <div className="mb-1.5 flex items-baseline justify-between gap-4">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft">Ring cards</h2>
        <p className="text-xs text-ink-soft">
          {focusId ? "Press the card again, or Esc, to bring the board back." : "Press a card to see it and everything below it."}
        </p>
      </div>
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {cards.map((note) => {
          const color = getCardColor(note.color)
          const ring = rings[goalRingOf(note, rings)]
          const level = ring?.tags.length === 1 ? ring.name : (getGoalLevel(note.hashtags.find((tag) => ring?.tags.includes(tag.toLowerCase())))?.name ?? ring?.name)
          const selected = note.id === focusId
          const tasks = taskCounts[note.id] ?? 0
          return (
            <li key={note.id} className="shrink-0">
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onPick(note.id)}
                style={{ backgroundColor: color.fill, borderColor: color.edge }}
                className={clsx(
                  "flex h-full w-52 flex-col gap-1 rounded-md border px-3 py-2 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  color.dark ? "text-board" : "text-ink",
                  selected && "outline-2 outline-offset-2 outline-accent",
                )}
              >
                <span className="text-[10px] font-medium uppercase tracking-[0.12em] opacity-70">{level}</span>
                <span className="line-clamp-2 text-pretty text-sm font-medium leading-snug">{note.text || "Untitled card"}</span>
                <span className="text-xs opacity-70">{tasks === 1 ? "1 task" : `${tasks} tasks`}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
