"use client"

import type { GraphBoxMode, GraphCluster } from "@/lib/graph-layout"

const CURSOR: Record<GraphBoxMode, string> = {
  move: "cursor-move",
  n: "cursor-ns-resize",
  s: "cursor-ns-resize",
  e: "cursor-ew-resize",
  w: "cursor-ew-resize",
  ne: "cursor-nesw-resize",
  sw: "cursor-nesw-resize",
  nw: "cursor-nwse-resize",
  se: "cursor-nwse-resize",
}

const EDGES: GraphBoxMode[] = ["n", "s", "w", "e"]
const CORNERS: GraphBoxMode[] = ["nw", "ne", "sw", "se"]

/** One cluster rectangle on the Graph. Dragging the body moves it; dragging an edge or corner resizes it. */
export function GraphClusterFrame({
  cluster,
  k,
  zoom,
  active,
  onDown,
  onMove,
  onUp,
  onCancel,
}: {
  cluster: GraphCluster
  k: number
  zoom: number
  active: boolean
  onDown: (event: React.PointerEvent<SVGElement>, cluster: GraphCluster, mode: GraphBoxMode) => void
  onMove: (event: React.PointerEvent<SVGElement>) => void
  onUp: (event: React.PointerEvent<SVGElement>) => void
  onCancel: () => void
}) {
  const { x, y, width, height } = cluster
  const clipId = `graph-cluster-clip-${cluster.id}`
  const t = Math.max(12, 16 / zoom)
  const c = t * 1.8

  function zone(mode: GraphBoxMode) {
    let zx = x
    let zy = y
    let zw = width
    let zh = height
    if (mode.length === 1) {
      if (mode === "n" || mode === "s") {
        zx = x + c / 2
        zw = width - c
        zh = t
        zy = mode === "n" ? y - t / 2 : y + height - t / 2
      } else {
        zy = y + c / 2
        zh = height - c
        zw = t
        zx = mode === "w" ? x - t / 2 : x + width - t / 2
      }
    } else {
      zw = c
      zh = c
      zx = mode.includes("w") ? x - c / 2 : x + width - c / 2
      zy = mode.includes("n") ? y - c / 2 : y + height - c / 2
    }
    return (
      <rect
        key={mode}
        data-graph-cluster-grip={mode}
        x={zx}
        y={zy}
        width={Math.max(zw, 1)}
        height={Math.max(zh, 1)}
        fill="transparent"
        className={CURSOR[mode]}
        onPointerDown={(event) => onDown(event, cluster, mode)}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
        onContextMenu={(event) => event.stopPropagation()}
      />
    )
  }

  return (
    <g data-graph-cluster={cluster.id}>
      <clipPath id={clipId}>
        <rect x={x} y={y} width={width} height={height} rx={36} ry={36} />
      </clipPath>
      <rect
        data-graph-cluster-grip="move"
        x={x}
        y={y}
        width={width}
        height={height}
        rx={36}
        ry={36}
        fill="var(--color-accent)"
        fillOpacity={0.05 + cluster.ring * 0.025}
        stroke="var(--color-accent)"
        strokeOpacity={active ? 0.9 : 0.55}
        strokeWidth={2.5 * Math.min(k, 1.6)}
        className={CURSOR.move}
        onPointerDown={(event) => onDown(event, cluster, "move")}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
      >
        <title>Drag to move this cluster. Drag an edge or corner to resize it.</title>
      </rect>
      <g clipPath={`url(#${clipId})`} pointerEvents="none">
        <text x={x + 28} y={y + 36} fontSize={20 * Math.min(k, 1.4)} fontWeight={600} fill="var(--color-ink)">
          {cluster.name}
        </text>
        <text x={x + 28} y={y + 58} fontSize={14 * Math.min(k, 1.4)} fill="var(--color-ink-soft)">
          {cluster.tags.map((tag) => `#${tag}`).join(" ")}
        </text>
      </g>
      {EDGES.map(zone)}
      {CORNERS.map(zone)}
    </g>
  )
}
