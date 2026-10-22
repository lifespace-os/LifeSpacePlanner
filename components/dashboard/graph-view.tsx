import type { CSSProperties } from "react"
import { getCardColor, type Note } from "@/lib/board-data"
import { GRAPH_MISSION_R, GRAPH_VERTEX_R } from "@/lib/graph-layout"
import type { GraphTileData } from "@/lib/map-tile"

const halo: CSSProperties = {
  paintOrder: "stroke",
  stroke: "var(--color-card)",
  strokeWidth: 6,
  strokeLinejoin: "round",
}

/** The Graph without card text: the cluster frames with their ring names, a vertex for every card, and the links. */
export function GraphView({ graph, notes }: { graph: GraphTileData; notes: Note[] }) {
  const { clusters, vertices, mission, links, freeLines, loneLabelAt, box } = graph
  const byId = new Map(notes.map((note) => [note.id, note]))

  return (
    <svg
      viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
      role="img"
      aria-label={`Graph. ${clusters.length} clusters, one for each ring, ${vertices.length} ${vertices.length === 1 ? "card" : "cards"}, and ${links.length} ${links.length === 1 ? "link" : "links"}.`}
      className="h-auto max-h-[640px] w-full"
    >
      {clusters.map((cluster) => (
        <g key={cluster.id}>
          <clipPath id={`dash-graph-clip-${cluster.id}`}>
            <rect x={cluster.x} y={cluster.y} width={cluster.width} height={cluster.height} rx={36} ry={36} />
          </clipPath>
          <rect
            x={cluster.x}
            y={cluster.y}
            width={cluster.width}
            height={cluster.height}
            rx={36}
            ry={36}
            fill="var(--color-accent)"
            fillOpacity={0.05 + cluster.ring * 0.025}
            stroke="var(--color-accent)"
            strokeOpacity={0.55}
            strokeWidth={3}
          />
          <g clipPath={`url(#dash-graph-clip-${cluster.id})`}>
            <text x={cluster.x + 28} y={cluster.y + 40} fontSize={26} fontWeight={600} className="fill-ink">
              {cluster.name}
            </text>
          </g>
        </g>
      ))}

      {loneLabelAt ? (
        <text x={loneLabelAt.x} y={loneLabelAt.y} fontSize={22} className="fill-ink-soft" style={halo}>
          Cards with no ring hashtag
        </text>
      ) : null}

      {freeLines.map((line) => (
        <line
          key={line.id}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="var(--color-tie)"
          strokeOpacity={0.85}
          strokeWidth={3}
          strokeLinecap="round"
        />
      ))}
      {links.map((link) => (
        <line
          key={link.id}
          x1={link.x1}
          y1={link.y1}
          x2={link.x2}
          y2={link.y2}
          stroke="var(--color-accent)"
          strokeOpacity={0.7}
          strokeWidth={3.5}
          strokeLinecap="round"
        />
      ))}

      <g>
        <circle
          cx={mission.x}
          cy={mission.y}
          r={GRAPH_MISSION_R * 1.12}
          fill="none"
          strokeWidth={3}
          strokeOpacity={0.35}
          className="stroke-accent"
        />
        <circle cx={mission.x} cy={mission.y} r={GRAPH_MISSION_R} strokeWidth={4} className="fill-card stroke-accent" />
        <circle cx={mission.x} cy={mission.y} r={GRAPH_MISSION_R * 0.4} className="fill-accent" />
      </g>

      {vertices.map((vertex) => {
        const note = byId.get(vertex.id)
        if (!note) return null
        return (
          <circle
            key={vertex.id}
            cx={vertex.x}
            cy={vertex.y}
            r={GRAPH_VERTEX_R}
            fill={getCardColor(note.color).fill}
            stroke="var(--color-ink)"
            strokeWidth={3}
          />
        )
      })}
    </svg>
  )
}
