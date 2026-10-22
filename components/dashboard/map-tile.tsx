"use client"

import { useMemo, useState } from "react"
import { GraphView } from "@/components/dashboard/graph-view"
import { MapView } from "@/components/dashboard/map-view"
import type { GoalRing, Note } from "@/lib/board-data"
import type { GraphBox, GraphSpot } from "@/lib/graph-layout"
import { graphTile, mapTile } from "@/lib/map-tile"

type View = "map" | "graph"

const VIEWS: { id: View; name: string }[] = [
  { id: "map", name: "Map" },
  { id: "graph", name: "Graph" },
]

function cards(count: number) {
  return `${count} ${count === 1 ? "card" : "cards"}`
}

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
  const [view, setView] = useState<View>("map")
  const map = useMemo(() => mapTile(notes, rings), [notes, rings])
  const graph = useMemo(() => graphTile(notes, rings, spots, boxes), [notes, rings, spots, boxes])

  const offRing = notes.length - map.points.length

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-card p-4 md:p-6">
      <div role="group" aria-label="Show the Map or the Graph" className="flex w-fit gap-1 rounded-lg border border-line p-1">
        {VIEWS.map((option) => {
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
          ? `${cards(map.points.length)} on the rings, ${map.threads.length} ${map.threads.length === 1 ? "line" : "lines"} up to a goal.${
              offRing > 0 ? ` ${cards(offRing)} without a ring hashtag ${offRing === 1 ? "is" : "are"} not on the Map.` : ""
            }`
          : `${cards(graph.vertices.length)}, ${graph.links.length} ${graph.links.length === 1 ? "link" : "links"} to a goal${
              graph.freeLines.length > 0
                ? `, ${graph.freeLines.length} free ${graph.freeLines.length === 1 ? "line" : "lines"}`
                : ""
            }. The large circle is the Mission.${
              graph.loneCount > 0 ? ` ${cards(graph.loneCount)} with no ring hashtag sit below the frames.` : ""
            }`}
      </p>
    </div>
  )
}
