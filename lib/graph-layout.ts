import { goalRingOf, hasHashtag, type GoalRing, type Note } from "@/lib/board-data"

/** The two Graph filters. A null field filters nothing. A vertex must pass both to be shown. */
export type GraphFilter = { ringId: string | null; tag: string | null }

export const NO_GRAPH_FILTER: GraphFilter = { ringId: null, tag: null }

export function graphFilterActive(filter: GraphFilter) {
  return filter.ringId !== null || filter.tag !== null
}

/** Whether a vertex shows under the filters. `home` is its cluster id, or "lone". */
export function graphVertexShown(note: Note, home: string, filter: GraphFilter) {
  if (filter.ringId !== null && home !== filter.ringId) return false
  if (filter.tag !== null && !hasHashtag(note, filter.tag)) return false
  return true
}

/** Where a vertex was dropped. A cluster member keeps an offset from its cluster's corner; a lone vertex keeps world coordinates. */
export type GraphSpot = { home: string; x: number; y: number }

export type GraphCluster = {
  id: string
  name: string
  tags: string[]
  ring: number
  x: number
  y: number
  width: number
  height: number
  ids: string[]
}

export type GraphVertex = { id: string; x: number; y: number; home: string }

export type GraphLayout = {
  clusters: GraphCluster[]
  vertices: GraphVertex[]
  /** Top-left corner of the area where cards without a ring hashtag are placed. */
  loneOrigin: { x: number; y: number }
  bounds: { left: number; top: number; right: number; bottom: number }
}

export const GRAPH_LONE = "lone"
export const GRAPH_VERTEX_R = 24

const CELL_W = 148
const CELL_H = 112
const PAD = 28
const HEAD = 64
const GAP = 72
const ROW_LIMIT = 1500
const LONE_COLS = 8
const LABEL_ROOM = 20
const LABEL_SIDE = 74

function inner(cluster: GraphCluster) {
  return {
    left: cluster.x + LABEL_SIDE,
    right: cluster.x + cluster.width - LABEL_SIDE,
    top: cluster.y + HEAD + GRAPH_VERTEX_R,
    bottom: cluster.y + cluster.height - PAD * 0.5 - GRAPH_VERTEX_R - LABEL_ROOM,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

/** Moves a point out of every cluster, along the shortest way, so a lone vertex never sits inside one. */
function pushOut(x: number, y: number, clusters: GraphCluster[]) {
  const margin = GRAPH_VERTEX_R + 8
  let px = x
  let py = y
  for (let pass = 0; pass <= clusters.length; pass++) {
    let moved = false
    for (const c of clusters) {
      const left = c.x - margin
      const right = c.x + c.width + margin
      const top = c.y - margin
      const bottom = c.y + c.height + margin
      if (px <= left || px >= right || py <= top || py >= bottom) continue
      const toLeft = px - left
      const toRight = right - px
      const toTop = py - top
      const toBottom = bottom - py
      const least = Math.min(toLeft, toRight, toTop, toBottom)
      if (least === toLeft) px = left
      else if (least === toRight) px = right
      else if (least === toTop) py = top
      else py = bottom
      moved = true
    }
    if (!moved) break
  }
  return { x: px, y: py }
}

/**
 * Lays the Graph out. Each ring is a cluster. A card that carries one of that ring's hashtags is a vertex inside it.
 * A card with no ring hashtag is a lone vertex, kept outside every cluster.
 * The cluster boxes follow the member count, so the layout never reads or writes a card's whiteboard position.
 */
export function layoutGraph(
  notes: Note[],
  rings: GoalRing[],
  spots: Record<string, GraphSpot>,
  drag: { id: string; x: number; y: number } | null = null,
): GraphLayout {
  const members: string[][] = rings.map(() => [])
  const lone: string[] = []
  for (const note of notes) {
    const ring = goalRingOf(note, rings)
    if (ring >= 0) members[ring].push(note.id)
    else lone.push(note.id)
  }

  const clusters: GraphCluster[] = []
  let x = 0
  let y = 0
  let rowHeight = 0
  rings.forEach((ring, index) => {
    const count = members[index].length
    const cols = Math.max(2, Math.ceil(Math.sqrt(count)))
    const rows = Math.max(1, Math.ceil(count / cols))
    const width = cols * CELL_W + PAD * 2
    const height = HEAD + rows * CELL_H + PAD
    if (x > 0 && x + width > ROW_LIMIT) {
      x = 0
      y += rowHeight + GAP
      rowHeight = 0
    }
    clusters.push({ id: ring.id, name: ring.name, tags: ring.tags, ring: index, x, y, width, height, ids: members[index] })
    x += width + GAP
    rowHeight = Math.max(rowHeight, height)
  })

  const clustersBottom = y + rowHeight
  const loneOrigin = { x: 0, y: clustersBottom + GAP + 40 }
  const vertices: GraphVertex[] = []

  for (const cluster of clusters) {
    const cols = Math.max(2, Math.ceil(Math.sqrt(cluster.ids.length)))
    const box = inner(cluster)
    cluster.ids.forEach((id, slot) => {
      const spot = spots[id]
      let vx = cluster.x + PAD + (slot % cols) * CELL_W + CELL_W / 2
      let vy = cluster.y + HEAD + Math.floor(slot / cols) * CELL_H + CELL_H / 2 - 10
      if (spot && spot.home === cluster.id) {
        vx = cluster.x + spot.x
        vy = cluster.y + spot.y
      }
      if (drag?.id === id) {
        vx = drag.x
        vy = drag.y
      }
      vertices.push({
        id,
        home: cluster.id,
        x: clamp(vx, box.left, Math.max(box.left, box.right)),
        y: clamp(vy, box.top, Math.max(box.top, box.bottom)),
      })
    })
  }

  lone.forEach((id, slot) => {
    const spot = spots[id]
    let vx = loneOrigin.x + (slot % LONE_COLS) * CELL_W + CELL_W / 2
    let vy = loneOrigin.y + Math.floor(slot / LONE_COLS) * CELL_H + CELL_H / 2
    if (spot && spot.home === GRAPH_LONE) {
      vx = spot.x
      vy = spot.y
    }
    if (drag?.id === id) {
      vx = drag.x
      vy = drag.y
    }
    const free = pushOut(vx, vy, clusters)
    vertices.push({ id, home: GRAPH_LONE, x: free.x, y: free.y })
  })

  let left = 0
  let top = 0
  let right = 0
  let bottom = 0
  for (const c of clusters) {
    right = Math.max(right, c.x + c.width)
    bottom = Math.max(bottom, c.y + c.height)
  }
  for (const v of vertices) {
    left = Math.min(left, v.x - GRAPH_VERTEX_R)
    top = Math.min(top, v.y - GRAPH_VERTEX_R)
    right = Math.max(right, v.x + GRAPH_VERTEX_R)
    bottom = Math.max(bottom, v.y + GRAPH_VERTEX_R + LABEL_ROOM)
  }
  if (lone.length === 0) bottom = Math.max(bottom, loneOrigin.y + CELL_H)

  return { clusters, vertices, loneOrigin, bounds: { left, top, right, bottom } }
}

/** The spot to save for a vertex that was released at its resolved place in the layout. */
export function spotOf(layout: GraphLayout, vertex: GraphVertex): GraphSpot {
  const cluster = layout.clusters.find((c) => c.id === vertex.home)
  if (!cluster) return { home: GRAPH_LONE, x: vertex.x, y: vertex.y }
  return { home: cluster.id, x: vertex.x - cluster.x, y: vertex.y - cluster.y }
}
