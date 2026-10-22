"use client"

import { useLanguage } from "@/components/language-provider"
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
  const { t } = useLanguage()

  return (
    <section
      id="results-panel"
      aria-label={t("resultsGrid.label")}
      className="min-h-0 flex-1 overflow-y-auto px-6 pb-6"
    >
      {total === 0 ? (
        <p className="max-w-md text-pretty text-sm text-ink-soft">
          {t("resultsGrid.empty")}
        </p>
      ) : cards.length === 0 ? (
        <p className="max-w-md text-pretty text-sm text-ink-soft">
          {t(total === 1 ? "resultsGrid.filtered.one" : "resultsGrid.filtered.other", { count: total })}
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
