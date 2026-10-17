"use client"

import type { KanbanCard } from "@/lib/kanban-data"
import { KanbanCardView } from "./kanban-card"

type ResultsGridProps = {
  /** The finished cards the filter keeps. */
  cards: KanbanCard[]
  /** Every card on Results, before any filter. */
  total: number
  highlightFor: (card: KanbanCard) => string | null
  boardNameOf: (card: KanbanCard) => string
  onOpen: (cardId: string) => void
  onReturn: (cardId: string) => void
}

const noop = () => {}

/** The same kanban cards as a grid. No columns and no ring row. */
export function ResultsGrid({ cards, total, highlightFor, boardNameOf, onOpen, onReturn }: ResultsGridProps) {
  return (
    <section
      id="results-panel"
      aria-label="Results"
      className="min-h-0 flex-1 overflow-y-auto px-6 pb-6"
    >
      {total === 0 ? (
        <p className="max-w-md text-pretty text-sm text-ink-soft">
          Nothing on Results yet. Open a board and use Move to Results on a card in Done, or move everything in Done at once.
        </p>
      ) : cards.length === 0 ? (
        <p className="max-w-md text-pretty text-sm text-ink-soft">
          The filter leaves none of the {total} {total === 1 ? "card" : "cards"} on Results. Clear it to see them.
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] items-start gap-3">
          {cards.map((card) => (
            <KanbanCardView
              key={card.id}
              card={card}
              columns={[]}
              counts={{}}
              done
              dragging={false}
              highlight={highlightFor(card)}
              mode="results"
              boardName={boardNameOf(card)}
              onDragStart={noop}
              onDragEnd={noop}
              onMoveToColumn={noop}
              onMoveToBoard={noop}
              onOpen={onOpen}
              onResult={onReturn}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
