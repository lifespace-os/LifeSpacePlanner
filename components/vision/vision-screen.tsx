"use client"

import { useId, useMemo, useState } from "react"
import { useGoals } from "@/components/goals-provider"
import { useKanban } from "@/components/kanban/kanban-provider"
import { useLanguage } from "@/components/language-provider"
import { useVision } from "@/components/vision/vision-provider"
import { VisionTile, type TileFace } from "@/components/vision/vision-tile"
import { getCardColor } from "@/lib/board-data"
import { searchCards } from "@/lib/card-search"
import { placeLabel } from "@/lib/kanban-names"

const PICKER_LIMIT = 8
const CANVAS_PADDING = 120

export function VisionScreen() {
  const { t } = useLanguage()
  const { notes } = useGoals()
  const { cards, columnsByBoard } = useKanban()
  const { items, addCard, setBox, toggleWords, removeTile, bringToFront } = useVision()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("")
  const listId = useId()

  const faces = useMemo(() => {
    const map = new Map<string, TileFace>()
    for (const note of notes) {
      const color = getCardColor(note.color)
      map.set(note.id, {
        words: note.text.trim() || note.details?.title?.trim() || note.task?.title?.trim() || "",
        image: note.image,
        fill: color.fill,
        edge: color.edge,
        dark: color.dark,
      })
    }
    for (const card of cards) {
      map.set(card.id, { words: card.title, image: card.image, fill: undefined, edge: undefined, dark: false })
    }
    return map
  }, [notes, cards])

  const onBoard = useMemo(() => new Set(items.map((item) => item.cardId)), [items])
  const hits = useMemo(() => searchCards(query, notes, cards, columnsByBoard), [query, notes, cards, columnsByBoard])
  const shown = hits.slice(0, PICKER_LIMIT)

  const tiles = items.flatMap((item, index) => {
    const face = faces.get(item.cardId)
    return face ? [{ item, face, z: index + 1 }] : []
  })
  const width = Math.max(0, ...tiles.map(({ item }) => item.x + item.width)) + CANVAS_PADDING
  const height = Math.max(0, ...tiles.map(({ item }) => item.y + item.height)) + CANVAS_PADDING

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-5 sm:px-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-serif text-3xl font-medium tracking-tight">{t("vision.title")}</h1>
        <p id="vision-help" className="max-w-2xl text-sm leading-relaxed text-ink-soft">
          {t("vision.help")} {t("vision.tileHelp")}
        </p>
        <div className="flex max-w-md flex-col gap-2">
          <input
            type="search"
            aria-label={t("vision.search")}
            aria-controls={listId}
            placeholder={t("vision.searchPlaceholder")}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setStatus("")
            }}
            className="h-9 w-full rounded-md border border-line bg-card px-3 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          <div id={listId} aria-live="polite">
            {!query.trim() ? (
              <p className="text-xs text-ink-soft">{t("vision.searchHint")}</p>
            ) : shown.length === 0 ? (
              <p className="text-sm text-ink-soft">{t("search.noMatch")}</p>
            ) : (
              <ul className="flex flex-col overflow-hidden rounded-md border border-line bg-card">
                {shown.map((hit) => {
                  const already = onBoard.has(hit.ref.id)
                  const title = hit.text || t("search.blankCard")
                  return (
                    <li key={`${hit.ref.kind}-${hit.ref.id}`} className="border-t border-line first:border-t-0">
                      <button
                        type="button"
                        disabled={already}
                        aria-label={already ? `${title}. ${t("vision.onBoard")}` : t("vision.addCard", { title })}
                        onClick={() => {
                          if (addCard(hit.ref.id)) setStatus(t("vision.added"))
                        }}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-line/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent"
                      >
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-[11px] tracking-wide text-ink-soft uppercase">{placeLabel(t, hit.place)}</span>
                          <span className="line-clamp-1 text-sm text-ink">{title}</span>
                        </span>
                        {already ? <span className="shrink-0 text-xs text-ink-soft">{t("vision.onBoard")}</span> : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <p role="status" className="min-h-5 text-sm text-ink-soft">
            {status}
          </p>
        </div>
      </header>

      <section
        aria-label={t("vision.canvas")}
        className="relative h-[calc(100dvh-20rem)] min-h-96 overflow-auto rounded-xl border border-line bg-board"
      >
        {tiles.length === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-ink-soft">
            {t("vision.empty")}
          </p>
        ) : null}
        <div className="relative" style={{ width, height, minWidth: "100%", minHeight: "100%" }}>
          {tiles.map(({ item, face, z }) => (
            <VisionTile
              key={item.id}
              item={item}
              face={face}
              z={z}
              onBox={setBox}
              onFront={bringToFront}
              onToggleWords={toggleWords}
              onRemove={removeTile}
            />
          ))}
        </div>
      </section>
    </main>
  )
}
