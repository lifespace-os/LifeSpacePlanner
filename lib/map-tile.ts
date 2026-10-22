import {
  freeEdges,
  goalLinks,
  goalMapEdges,
  layoutGoalMap,
  type GoalMapPoint,
  type GoalRing,
  type Note,
} from "@/lib/board-data"
import {
  GRAPH_LONE,
  GRAPH_MISSION,
  GRAPH_MISSION_R,
  GRAPH_VERTEX_R,
  layoutGraph,
  type GraphBox,
  type GraphCluster,
  type GraphSpot,
  type GraphVertex,
} from "@/lib/graph-layout"

export type TileLine = { id: string; x1: number; y1: number; x2: number; y2: number }

export type MapTileData = {
  /** Radii of the mission circle and then each ring, outward. */
  edges: number[]
  /** Half the side of the square the Map is drawn in. */
  half: number
  points: GoalMapPoint[]
  threads: TileLine[]
}

/** The Map as the Whiteboard lays it out at its starting size, read from each card's saved place on its ring. */
export function mapTile(notes: Note[], rings: GoalRing[]): MapTileData {
  const edges = goalMapEdges(undefined, rings)
  const half = edges[edges.length - 1]
  const { points, threads } = layoutGoalMap(notes, { x: half, y: half }, { rings })
  return {
    edges,
    half,
    points,
    threads: threads.map(({ id, x1, y1, x2, y2 }) => ({ id, x1, y1, x2, y2 })),
  }
}

export type GraphTileData = {
  clusters: GraphCluster[]
  vertices: GraphVertex[]
  mission: GraphVertex
  links: TileLine[]
  freeLines: TileLine[]
  loneCount: number
  loneLabelAt: { x: number; y: number } | null
  box: { x: number; y: number; width: number; height: number }
}

const MARGIN = 40

/** The Graph as the Whiteboard lays it out, from the saved vertex spots and cluster boxes. */
export function graphTile(
  notes: Note[],
  rings: GoalRing[],
  spots: Record<string, GraphSpot>,
  boxes: Record<string, GraphBox>,
): GraphTileData {
  const layout = layoutGraph(notes, rings, spots, null, boxes)
  const byId = new Map(notes.map((note) => [note.id, note]))
  const at = new Map<string, GraphVertex>(layout.vertices.map((v) => [v.id, v]))
  at.set(GRAPH_MISSION, layout.mission)

  const links: TileLine[] = []
  for (const from of layout.vertices) {
    const note = byId.get(from.id)
    if (!note) continue
    for (const toId of goalLinks(note, byId, rings)) {
      const to = at.get(toId)
      if (to) links.push({ id: `${from.id}>${toId}`, x1: from.x, y1: from.y, x2: to.x, y2: to.y })
    }
  }

  const freeLines: TileLine[] = []
  for (const edge of freeEdges(notes)) {
    const from = at.get(edge.fromId)
    const to = at.get(edge.toId)
    if (from && to) freeLines.push({ id: edge.id, x1: from.x, y1: from.y, x2: to.x, y2: to.y })
  }

  const loneCount = layout.vertices.filter((v) => v.home === GRAPH_LONE).length
  const loneLabelAt = loneCount > 0 ? { x: layout.loneOrigin.x, y: layout.loneOrigin.y - 22 } : null

  let left = layout.mission.x - GRAPH_MISSION_R * 1.2
  let top = layout.mission.y - GRAPH_MISSION_R * 1.2
  let right = layout.mission.x + GRAPH_MISSION_R * 1.2
  let bottom = layout.mission.y + GRAPH_MISSION_R * 1.2
  for (const c of layout.clusters) {
    left = Math.min(left, c.x)
    top = Math.min(top, c.y)
    right = Math.max(right, c.x + c.width)
    bottom = Math.max(bottom, c.y + c.height)
  }
  for (const v of layout.vertices) {
    left = Math.min(left, v.x - GRAPH_VERTEX_R)
    top = Math.min(top, v.y - GRAPH_VERTEX_R)
    right = Math.max(right, v.x + GRAPH_VERTEX_R)
    bottom = Math.max(bottom, v.y + GRAPH_VERTEX_R)
  }
  if (loneLabelAt) top = Math.min(top, loneLabelAt.y - 24)

  return {
    clusters: layout.clusters,
    vertices: layout.vertices,
    mission: layout.mission,
    links,
    freeLines,
    loneCount,
    loneLabelAt,
    box: {
      x: left - MARGIN,
      y: top - MARGIN,
      width: right - left + MARGIN * 2,
      height: bottom - top + MARGIN * 2,
    },
  }
}
