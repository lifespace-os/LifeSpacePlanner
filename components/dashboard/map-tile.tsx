"use client"

import { useMemo, useState } from "react"
import { GraphView } from "@/components/dashboard/graph-view"
import { MapView } from "@/components/dashboard/map-view"
import { useLanguage } from "@/components/language-provider"
import type { GoalRing, Note } from "@/lib/board-data"
import type { GraphBox, GraphSpot } from "@/lib/graph-layout"
import { graphTile, mapTile } from "@/lib/map-tile"

type View = "map" | "graph"

export function MapTile({
  notes,
  rings,
  spots,
  boxes,
}: {
  notes: Note[]
  rings: GoalRing[]
  spots: Record<string, GraphSpot>
  boxes: Record<string, GraphBox>
}) {
  const { t, tn } = useLanguage()
  const cards = (count: number) => tn("dashboard.cards", count)
  const views: { id: View; name: string }[] = [
    { id: "map", name: t("dashboard.map.title") },
    { id: "graph", name: t("dashboard.map.graph") },
  ]
  const [view, setView] = useState<View>("map")
  const map = useMemo(() => mapTile(notes, rings), [notes, rings])
  const graph = useMemo(() => graphTile(notes, rings, spots, boxes), [notes, rings, spots, boxes])

  const offRing = notes.length - map.points.length

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-card p-4 md:p-6">
      <div role="group" aria-label={t("dashboard.map.group")} className="flex w-fit gap-1 rounded-lg border border-line p-1">
        {views.map((option) => {
          const on = view === option.id
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={on}
              onClick={() => setView(option.id)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                on ? "bg-ink text-board" : "text-ink-soft hover:text-ink"
              }`}
            >
              {option.name}
            </button>
          )
        })}
      </div>

      <div className="flex justify-center">
        {view === "map" ? <MapView map={map} notes={notes} rings={rings} /> : <GraphView graph={graph} notes={notes} />}
      </div>

      <p className="text-sm text-ink-soft text-pretty">
        {view === "map"
          ? `${t("dashboard.map.summary", {
              cards: cards(map.points.length),
              lines: tn("dashboard.lines", map.threads.length),
            })}${offRing > 0 ? ` ${tn("dashboard.map.off", offRing, { cards: cards(offRing) })}` : ""}`
          : `${t("dashboard.graph.summary", {
              cards: cards(graph.vertices.length),
              links: tn("dashboard.links", graph.links.length),
              free: graph.freeLines.length > 0 ? `, ${tn("dashboard.freeLines", graph.freeLines.length)}` : "",
            })}${graph.loneCount > 0 ? ` ${t("dashboard.graph.lone", { cards: cards(graph.loneCount) })}` : ""}`}
      </p>
    </div>
  )
}
