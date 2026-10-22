import { TONES as MISSION_TONES, labelAt as missionLabelAt } from "@/components/dashboard/mission-tile"
import { PDF_HEIGHT, PDF_WIDTH, buildPdf } from "@/components/dashboard/export-pdf"
import {
  GOAL_RING_TAGS,
  IKIGAI,
  IKIGAI_CIRCLES,
  IKIGAI_SIZE,
  goalSectorStart,
  ikigaiCircleOffset,
  type GoalRing,
} from "@/lib/board-data"
import { percent, type Flow, type FinishedCounts } from "@/lib/dashboard"
import { GRAPH_MISSION_R, GRAPH_VERTEX_R } from "@/lib/graph-layout"
import {
  DEFAULT_LANGUAGE,
  localeFor,
  translate,
  translateCount,
  type Language,
  type MessageKey,
  type Translate,
  type TranslateCount,
} from "@/lib/i18n"
import type { LabelShareGroup } from "@/lib/label-shares"
import { WEEKS_PER_YEAR, type LifeGrid } from "@/lib/life-weeks"
import type { GraphTileData, MapTileData } from "@/lib/map-tile"
import { MISSION_REGIONS, type MissionCounts } from "@/lib/mission-counts"
import type { WheelSlice, WheelsData } from "@/lib/wheels"

export type SheetPart = "counts" | "flow" | "mission" | "map" | "wheels" | "labels" | "life"
export type SheetFormat = "image" | "pdf"

/** Numbers and shapes only. Card text, task titles, goal names, owner names, and the weekly review never reach this type. */
export type SheetData = {
  counts: FinishedCounts | null
  flow: Flow
  mission: MissionCounts
  map: MapTileData
  graph: GraphTileData
  /** Fill color of each card's dot, by card id. */
  dotFills: Map<string, string>
  rings: GoalRing[]
  wheels: WheelsData
  labels: LabelShareGroup[]
  life: LifeGrid | null
}

export type SheetOptions = {
  parts: SheetPart[]
  tagNames: boolean
  date: string
  format: SheetFormat
  language: Language
}

type Words = { t: Translate; tn: TranslateCount; locale: string }

/** The canvas code runs outside React, so buildSheet sets the language here before anything is drawn. */
let W: Words = {
  t: (key, vars) => translate(DEFAULT_LANGUAGE, key, vars),
  tn: (key, count, vars) => translateCount(DEFAULT_LANGUAGE, key, count, vars),
  locale: localeFor(DEFAULT_LANGUAGE),
}

function wordsFor(language: Language): Words {
  return {
    t: (key, vars) => translate(language, key, vars),
    tn: (key, count, vars) => translateCount(language, key, count, vars),
    locale: localeFor(language),
  }
}

type Ctx = CanvasRenderingContext2D
type Block = { height: number; draw: (ctx: Ctx, x: number, y: number) => void }

const P = {
  paper: "#ffffff",
  ink: "#23272b",
  soft: "#5f5b53",
  line: "#d8cfbf",
  accent: "#2f5d50",
  card: "#fffdf8",
  tie: "#9a7226",
  grey: "#cfcac0",
  fallbackDot: "#f2e6a8",
}

const SANS = `"Helvetica Neue", Helvetica, Arial, sans-serif`
const SERIF = `Georgia, "Times New Roman", serif`

const WIDTH = 1000
const MARGIN = 50
const CONTENT = WIDTH - MARGIN * 2
const GAP = 34
const TITLE = 46
const PAGE_HEIGHT = Math.round((WIDTH * PDF_HEIGHT) / PDF_WIDTH)
const TAU = Math.PI * 2

const number = { format: (value: number) => new Intl.NumberFormat(W.locale).format(value) }

type TextOptions = {
  size?: number
  weight?: number
  color?: string
  align?: CanvasTextAlign
  base?: CanvasTextBaseline
  serif?: boolean
  max?: number
}

function fontOf(size: number, weight: number, serif: boolean) {
  return `${weight} ${size}px ${serif ? SERIF : SANS}`
}

function fit(ctx: Ctx, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text
  let cut = text
  while (cut.length > 1 && ctx.measureText(`${cut}\u2026`).width > max) cut = cut.slice(0, -1)
  return `${cut}\u2026`
}

function write(ctx: Ctx, text: string, x: number, y: number, o: TextOptions = {}) {
  ctx.font = fontOf(o.size ?? 14, o.weight ?? 400, o.serif ?? false)
  ctx.fillStyle = o.color ?? P.ink
  ctx.textAlign = o.align ?? "left"
  ctx.textBaseline = o.base ?? "alphabetic"
  ctx.fillText(o.max ? fit(ctx, text, o.max) : text, x, y)
}

function wrap(ctx: Ctx, text: string, max: number, size: number) {
  ctx.font = fontOf(size, 400, false)
  const lines: string[] = []
  let line = ""
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word
    if (line && ctx.measureText(next).width > max) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

function haloText(ctx: Ctx, text: string, x: number, y: number, o: TextOptions) {
  ctx.font = fontOf(o.size ?? 14, o.weight ?? 400, false)
  ctx.textAlign = o.align ?? "center"
  ctx.textBaseline = "middle"
  ctx.lineJoin = "round"
  ctx.lineWidth = 4
  ctx.strokeStyle = P.paper
  ctx.strokeText(text, x, y)
  ctx.fillStyle = o.color ?? P.soft
  ctx.fillText(text, x, y)
}

function title(ctx: Ctx, text: string, x: number, y: number) {
  write(ctx, text, x, y + 26, { size: 24, weight: 500, serif: true })
  ctx.strokeStyle = P.line
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x, y + 36.5)
  ctx.lineTo(x + CONTENT, y + 36.5)
  ctx.stroke()
}

function box(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 10)
  ctx.fillStyle = P.card
  ctx.fill()
  ctx.strokeStyle = P.line
  ctx.lineWidth = 1
  ctx.stroke()
}

function ringSlice(ctx: Ctx, cx: number, cy: number, inner: number, outer: number, start: number, end: number) {
  ctx.beginPath()
  ctx.arc(cx, cy, outer, start, end)
  ctx.arc(cx, cy, inner, end, start, true)
  ctx.closePath()
}

function cardsWord(count: number) {
  return W.tn("dashboard.cards", count, { count: number.format(count) })
}

function cardsLabel(count: number) {
  return W.tn("dashboard.cards", count, { count: "" }).trim()
}

function countsBlock(data: SheetData): Block {
  const { counts } = data
  const items: [string, number][] = [
    [W.t("dashboard.range.today"), counts?.today ?? 0],
    [W.t("dashboard.range.week"), counts?.week ?? 0],
    [W.t("dashboard.range.month"), counts?.month ?? 0],
    [W.t("dashboard.range.all"), counts?.all ?? 0],
  ]
  const gap = 14
  const w = (CONTENT - gap * 3) / 4
  const h = 92
  return {
    height: TITLE + h,
    draw(ctx, x, y) {
      title(ctx, W.t("dashboard.finished.title"), x, y)
      items.forEach(([name, value], i) => {
        const bx = x + i * (w + gap)
        const by = y + TITLE
        box(ctx, bx, by, w, h)
        write(ctx, name, bx + 16, by + 30, { size: 14, color: P.soft })
        write(ctx, number.format(value), bx + 16, by + 74, { size: 42, serif: true })
      })
    },
  }
}

function flowBlock(data: SheetData): Block {
  const { flow } = data
  const steps = flow.steps
  const col = CONTENT / steps.length
  const bar = 34
  const band = 110
  const head = steps[0]?.count ?? 0
  const results = steps[steps.length - 1]
  const separator = TITLE + band + 108
  return {
    height: separator + 84,
    draw(ctx, x, y) {
      title(ctx, W.t("dashboard.flow.title"), x, y)
      const heightOf = (share: number) => Math.max(share * band, head > 0 ? 3 : 0)
      const left = (i: number) => x + i * col + (col - bar) / 2
      const mid = y + TITLE + band / 2

      ctx.fillStyle = P.accent
      ctx.globalAlpha = 0.25
      steps.slice(0, -1).forEach((step, i) => {
        const from = heightOf(step.share)
        const to = heightOf(steps[i + 1]!.share)
        const x1 = left(i) + bar
        const x2 = left(i + 1)
        ctx.beginPath()
        ctx.moveTo(x1, mid - from / 2)
        ctx.lineTo(x2, mid - to / 2)
        ctx.lineTo(x2, mid + to / 2)
        ctx.lineTo(x1, mid + from / 2)
        ctx.closePath()
        ctx.fill()
      })
      ctx.globalAlpha = 1
      ctx.fillStyle = P.accent
      steps.forEach((step, i) => {
        const h = heightOf(step.share)
        ctx.beginPath()
        ctx.roundRect(left(i), mid - h / 2, bar, h, 3)
        ctx.fill()
      })

      const ty = y + TITLE + band + 24
      steps.forEach((step, i) => {
        const cx = x + i * col + col / 2
        wrap(ctx, W.t(`dashboard.flow.step.${step.id}` as MessageKey), col - 10, 12)
          .slice(0, 2)
          .forEach((line, n) => write(ctx, line, cx, ty + n * 15, { size: 12, color: P.soft, align: "center" }))
        write(ctx, number.format(step.count), cx, ty + 52, { size: 26, serif: true, align: "center" })
        write(
          ctx,
          step.id === "unload" ? W.t("dashboard.flow.allCards") : W.t("dashboard.flow.ofUnload", { percent: percent(step.share) }),
          cx,
          ty + 72,
          {
            size: 12,
            color: P.soft,
            align: "center",
          },
        )
      })

      const sy = y + separator
      ctx.strokeStyle = P.line
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, sy + 0.5)
      ctx.lineTo(x + CONTENT, sy + 0.5)
      ctx.stroke()
      write(
        ctx,
        `${W.t("dashboard.flow.released")} ${number.format(flow.released.count)} ${W.tn(
          "dashboard.flow.releasedText",
          flow.released.count,
          { percent: percent(flow.released.share) },
        )}`,
        x,
        sy + 28,
        { size: 14 },
      )
      ctx.fillStyle = "#ebe5d8"
      ctx.beginPath()
      ctx.roundRect(x, sy + 38, CONTENT, 8, 4)
      ctx.fill()
      if (flow.released.share > 0) {
        ctx.fillStyle = "#a8a396"
        ctx.beginPath()
        ctx.roundRect(x, sy + 38, Math.max(8, CONTENT * flow.released.share), 8, 4)
        ctx.fill()
      }
      write(
        ctx,
        `${W.t("dashboard.flow.effectiveness")} ${percent(flow.effectiveness)} ${W.t("dashboard.flow.effectivenessText", {
          results: number.format(results?.count ?? 0),
          unload: number.format(head),
        })}`,
        x,
        sy + 74,
        { size: 14 },
      )
    },
  }
}

function missionBlock(data: SheetData): Block {
  const { mission } = data
  const size = 520
  const scale = size / IKIGAI_SIZE
  const half = IKIGAI_SIZE / 2
  return {
    height: TITLE + size,
    draw(ctx, x, y) {
      title(ctx, W.t("dashboard.mission.title"), x, y)
      const ox = x
      const oy = y + TITLE

      for (const id of IKIGAI_CIRCLES) {
        const offset = ikigaiCircleOffset(id)
        const cx = ox + (half + offset.x) * scale
        const cy = oy + (half + offset.y) * scale
        ctx.beginPath()
        ctx.arc(cx, cy, IKIGAI.r * scale, 0, TAU)
        ctx.globalAlpha = 0.35
        ctx.fillStyle = MISSION_TONES[id].fill
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.strokeStyle = MISSION_TONES[id].edge
        ctx.lineWidth = 2
        ctx.stroke()
      }
      for (const id of MISSION_REGIONS) {
        const at = missionLabelAt(id)
        const count = mission.regions[id]
        ctx.globalAlpha = count === 0 ? 0.6 : 1
        const px = ox + at.x * scale
        const py = oy + at.y * scale
        write(ctx, W.t(`dashboard.region.${id}` as MessageKey), px, py - 14 * scale, { size: id === "ikigai" ? 13 : 15, color: P.soft, align: "center" })
        write(ctx, String(count), px, py + 38 * scale, { size: id === "ikigai" ? 34 : 40, serif: true, align: "center" })
        ctx.globalAlpha = 1
      }

      const sx = x + size + 40
      const sw = CONTENT - size - 40
      const marks: [string, number][] = [
        [W.t("dashboard.mission.keep"), mission.keep],
        [W.t("dashboard.mission.release"), mission.release],
        [W.t("dashboard.mission.none"), mission.none],
      ]
      marks.forEach(([name, value], i) => {
        const by = oy + i * 106
        box(ctx, sx, by, sw, 92)
        write(ctx, name, sx + 16, by + 30, { size: 14, color: P.soft })
        write(ctx, number.format(value), sx + 16, by + 74, { size: 42, serif: true })
      })
      write(ctx, W.t("dashboard.sheet.total", { cards: cardsWord(mission.total) }), sx, oy + 3 * 106 + 16, {
        size: 14,
        color: P.soft,
      })
    },
  }
}

function mapBlock(data: SheetData): Block {
  const { map, rings, dotFills } = data
  const size = 640
  const scale = size / (map.half * 2)
  const { edges } = map
  return {
    height: TITLE + size,
    draw(ctx, x, y) {
      title(ctx, W.t("dashboard.map.title"), x, y)
      const cx = x + CONTENT / 2
      const cy = y + TITLE + size / 2
      const at = (value: number) => value * scale

      rings.forEach((_, ring) => {
        ctx.beginPath()
        ctx.arc(cx, cy, at(edges[ring + 1]!), 0, TAU)
        ctx.arc(cx, cy, at(edges[ring]!), 0, TAU)
        ctx.globalAlpha = 0.035 + ring * 0.03
        ctx.fillStyle = P.accent
        ctx.fill("evenodd")
        ctx.globalAlpha = 1
        ctx.strokeStyle = P.line
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(cx, cy, at(edges[ring + 1]!), 0, TAU)
        ctx.moveTo(cx + at(edges[ring]!), cy)
        ctx.arc(cx, cy, at(edges[ring]!), 0, TAU)
        ctx.stroke()
      })
      GOAL_RING_TAGS[0]!.forEach((_, i) => {
        const angle = goalSectorStart(i)
        ctx.beginPath()
        ctx.moveTo(cx + at(edges[0]!) * Math.cos(angle), cy + at(edges[0]!) * Math.sin(angle))
        ctx.lineTo(cx + at(edges[1]!) * Math.cos(angle), cy + at(edges[1]!) * Math.sin(angle))
        ctx.strokeStyle = P.line
        ctx.lineWidth = 1.5
        ctx.stroke()
      })

      ctx.beginPath()
      ctx.arc(cx, cy, at(edges[0]!), 0, TAU)
      ctx.fillStyle = P.card
      ctx.fill()
      ctx.strokeStyle = P.accent
      ctx.lineWidth = 2
      ctx.stroke()
      write(ctx, W.t("dashboard.sheet.missionCenter"), cx, cy, { size: 14, weight: 600, align: "center", base: "middle" })

      rings.forEach(({ name }, ring) => {
        const mid = (edges[ring]! + edges[ring + 1]!) / 2
        haloText(ctx, name.toUpperCase(), cx, cy - at(mid) + 3, { size: Math.max(10, 26 * scale), weight: 600 })
      })

      ctx.lineCap = "round"
      ctx.strokeStyle = P.accent
      ctx.globalAlpha = 0.75
      ctx.lineWidth = Math.max(1.5, 3.5 * scale)
      for (const thread of map.threads) {
        ctx.beginPath()
        ctx.moveTo(cx + at(thread.x1 - map.half), cy + at(thread.y1 - map.half))
        ctx.lineTo(cx + at(thread.x2 - map.half), cy + at(thread.y2 - map.half))
        ctx.stroke()
      }
      ctx.globalAlpha = 1

      for (const point of map.points) {
        ctx.beginPath()
        ctx.arc(cx + at(point.x - map.half), cy + at(point.y - map.half), Math.max(5, 17 * scale), 0, TAU)
        ctx.fillStyle = dotFills.get(point.id) ?? P.fallbackDot
        ctx.fill()
        ctx.strokeStyle = P.ink
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
    },
  }
}

function graphBlock(data: SheetData): Block {
  const { graph, dotFills } = data
  const { box: view } = graph
  const scale = Math.min(CONTENT / view.width, 640 / view.height)
  const width = view.width * scale
  const height = view.height * scale
  return {
    height: TITLE + height,
    draw(ctx, x, y) {
      title(ctx, W.t("dashboard.map.graph"), x, y)
      const ox = x + (CONTENT - width) / 2 - view.x * scale
      const oy = y + TITLE - view.y * scale
      const px = (value: number) => ox + value * scale
      const py = (value: number) => oy + value * scale
      const stroke = Math.max(1.2, 3 * scale)

      for (const cluster of graph.clusters) {
        ctx.beginPath()
        ctx.roundRect(px(cluster.x), py(cluster.y), cluster.width * scale, cluster.height * scale, 36 * scale)
        ctx.globalAlpha = 0.05 + cluster.ring * 0.025
        ctx.fillStyle = P.accent
        ctx.fill()
        ctx.globalAlpha = 0.55
        ctx.strokeStyle = P.accent
        ctx.lineWidth = stroke
        ctx.stroke()
        ctx.globalAlpha = 1
        ctx.save()
        ctx.beginPath()
        ctx.roundRect(px(cluster.x), py(cluster.y), cluster.width * scale, cluster.height * scale, 36 * scale)
        ctx.clip()
        write(ctx, cluster.name, px(cluster.x + 28), py(cluster.y + 40), { size: Math.max(11, 26 * scale), weight: 600 })
        ctx.restore()
      }

      if (graph.loneLabelAt) {
        haloText(ctx, W.t("dashboard.sheet.lone"), px(graph.loneLabelAt.x), py(graph.loneLabelAt.y), {
          size: Math.max(11, 22 * scale),
          align: "left",
        })
      }

      ctx.lineCap = "round"
      const lines = (items: { x1: number; y1: number; x2: number; y2: number }[], color: string, alpha: number) => {
        ctx.strokeStyle = color
        ctx.globalAlpha = alpha
        ctx.lineWidth = Math.max(1.2, 3.5 * scale)
        for (const line of items) {
          ctx.beginPath()
          ctx.moveTo(px(line.x1), py(line.y1))
          ctx.lineTo(px(line.x2), py(line.y2))
          ctx.stroke()
        }
        ctx.globalAlpha = 1
      }
      lines(graph.freeLines, P.tie, 0.85)
      lines(graph.links, P.accent, 0.7)

      const mx = px(graph.mission.x)
      const my = py(graph.mission.y)
      ctx.beginPath()
      ctx.arc(mx, my, GRAPH_MISSION_R * 1.12 * scale, 0, TAU)
      ctx.globalAlpha = 0.35
      ctx.strokeStyle = P.accent
      ctx.lineWidth = stroke
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.beginPath()
      ctx.arc(mx, my, GRAPH_MISSION_R * scale, 0, TAU)
      ctx.fillStyle = P.card
      ctx.fill()
      ctx.lineWidth = Math.max(1.5, 4 * scale)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(mx, my, GRAPH_MISSION_R * 0.4 * scale, 0, TAU)
      ctx.fillStyle = P.accent
      ctx.fill()

      for (const vertex of graph.vertices) {
        ctx.beginPath()
        ctx.arc(px(vertex.x), py(vertex.y), Math.max(4, GRAPH_VERTEX_R * scale), 0, TAU)
        ctx.fillStyle = dotFills.get(vertex.id) ?? P.fallbackDot
        ctx.fill()
        ctx.strokeStyle = P.ink
        ctx.lineWidth = 1.2
        ctx.stroke()
      }
    },
  }
}

function drawWheel(ctx: Ctx, name: string, slices: WheelSlice[], cx: number, top: number, tagNames: boolean) {
  const outer = 105
  const inner = 30
  const cy = top + 30 + outer + 22
  write(ctx, name, cx, top + 16, { size: 16, weight: 500, serif: true, align: "center" })

  ctx.beginPath()
  ctx.arc(cx, cy, outer, 0, TAU)
  ctx.setLineDash([2, 4])
  ctx.strokeStyle = P.line
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.setLineDash([])

  const step = TAU / Math.max(slices.length, 1)
  const gap = slices.length > 1 ? 0.02 : 0
  const reachWidth = 450 / 2 - outer - 18
  slices.forEach((slice, i) => {
    const start = -Math.PI / 2 + i * step + gap / 2
    const end = -Math.PI / 2 + (i + 1) * step - gap / 2 - (slices.length === 1 ? 0.001 : 0)
    const mid = (start + end) / 2

    if (slice.fill !== null && slice.fill > 0) {
      ringSlice(ctx, cx, cy, inner, inner + (outer - inner) * slice.fill, start, end)
      ctx.globalAlpha = 0.95
      ctx.fillStyle = slice.color
      ctx.fill()
      ctx.globalAlpha = 1
    }
    ringSlice(ctx, cx, cy, inner, outer, start, end)
    ctx.strokeStyle = slice.color
    ctx.lineWidth = 3
    ctx.lineJoin = "round"
    ctx.stroke()
    ctx.strokeStyle = P.soft
    ctx.lineWidth = 0.75
    ctx.stroke()

    const nameText = tagNames ? slice.name : ""
    if (!nameText && !slice.value) return
    const lx = cx + (outer + 10) * Math.cos(mid)
    const ly = cy + (outer + 10) * Math.sin(mid)
    const side = Math.cos(mid)
    const vertical = Math.sin(mid)
    ctx.font = fontOf(13, 600, false)
    const valueWidth = slice.value ? ctx.measureText(slice.value).width : 0
    ctx.font = fontOf(13, 500, false)
    const shown = nameText ? fit(ctx, nameText, reachWidth - valueWidth - 6) : ""
    const nameWidth = shown ? ctx.measureText(shown).width : 0
    const total = nameWidth + (shown && valueWidth ? 6 : 0) + valueWidth
    const x0 = side > 0.25 ? lx : side < -0.25 ? lx - total : lx - total / 2
    const base: CanvasTextBaseline = vertical > 0.6 ? "top" : vertical < -0.6 ? "bottom" : "middle"
    if (shown) write(ctx, shown, x0, ly, { size: 13, weight: 500, base })
    if (slice.value) write(ctx, slice.value, x0 + (nameWidth ? nameWidth + 6 : 0), ly, { size: 13, weight: 600, color: P.accent, base })
  })

  if (slices.length === 0) {
    write(ctx, W.t("dashboard.wheels.empty"), cx, cy, { size: 13, color: P.soft, align: "center", base: "middle" })
    return
  }
  ctx.beginPath()
  ctx.arc(cx, cy, inner - 4, 0, TAU)
  ctx.fillStyle = P.paper
  ctx.fill()
  ctx.strokeStyle = P.line
  ctx.lineWidth = 1
  ctx.stroke()
}

function wheelsBlock(data: SheetData, tagNames: boolean): Block {
  const { wheels } = data
  return {
    height: TITLE + 292,
    draw(ctx, x, y) {
      title(ctx, W.t("dashboard.wheels.title"), x, y)
      const top = y + TITLE
      const half = CONTENT / 2
      drawWheel(
        ctx,
        wheels.setName ? W.t("dashboard.wheels.balanceSet", { name: wheels.setName }) : W.t("dashboard.wheels.balance"),
        wheels.balance,
        x + half / 2,
        top,
        tagNames,
      )
      drawWheel(ctx, W.t("dashboard.wheels.happiness"), wheels.happiness, x + half + half / 2, top, tagNames)
    },
  }
}

function labelsBlock(data: SheetData, tagNames: boolean): Block {
  const groups = data.labels
  const rows = Math.max(0, ...groups.map((group) => group.slices.filter((slice) => slice.count > 0).length))
  const column = (CONTENT - 48) / 3
  const outer = 78
  const inner = 50
  const legendTop = 30 + 2 * (outer + 4) + 18
  return {
    height: TITLE + legendTop + rows * 22 + 6,
    draw(ctx, x, y) {
      title(ctx, W.t("dashboard.labels.title"), x, y)
      const top = y + TITLE
      groups.forEach((group, g) => {
        const gx = x + g * (column + 24)
        const cx = gx + column / 2
        const cy = top + 30 + outer + 4
        write(ctx, group.name, cx, top + 16, { size: 17, weight: 500, serif: true, align: "center" })

        const drawn = group.slices.filter((slice) => slice.count > 0)
        const total = drawn.reduce((sum, slice) => sum + slice.count, 0)
        if (total === 0) {
          ctx.beginPath()
          ctx.arc(cx, cy, (outer + inner) / 2, 0, TAU)
          ctx.strokeStyle = P.line
          ctx.lineWidth = outer - inner
          ctx.stroke()
        } else {
          const gap = drawn.length > 1 ? 0.028 : 0
          let cursor = -Math.PI / 2
          for (const slice of drawn) {
            const span = (slice.count / total) * TAU
            ringSlice(ctx, cx, cy, inner, outer, cursor + gap / 2, cursor + span - gap / 2 - (drawn.length === 1 ? 0.001 : 0))
            ctx.fillStyle = slice.color ?? P.grey
            ctx.fill()
            cursor += span
          }
        }
        write(ctx, String(group.cards), cx, cy - 2, { size: 26, serif: true, align: "center", base: "middle" })
        write(ctx, cardsLabel(group.cards), cx, cy + 20, { size: 11, color: P.soft, align: "center", base: "middle" })

        drawn.forEach((slice, i) => {
          const ry = top + legendTop + i * 22
          ctx.beginPath()
          ctx.arc(gx + 6, ry - 4, 5, 0, TAU)
          ctx.fillStyle = slice.color ?? P.grey
          ctx.fill()
          const figure = `${slice.percent}% \u00b7 ${slice.count}`
          if (tagNames) {
            write(ctx, figure, gx + column, ry, { size: 13, align: "right" })
            ctx.font = fontOf(13, 400, false)
            const room = column - 22 - ctx.measureText(figure).width - 8
            write(ctx, slice.name, gx + 20, ry, { size: 13, max: room })
          } else {
            write(ctx, figure, gx + 20, ry, { size: 13 })
          }
        })
      })
    },
  }
}

function lifeBlock(data: SheetData): Block | null {
  const { life } = data
  if (!life) return null
  const pitch = Math.max(5, Math.min(16, Math.floor(1050 / life.years)))
  const gridWidth = WEEKS_PER_YEAR * pitch
  const gridHeight = life.years * pitch
  return {
    height: TITLE + gridHeight + 16 + 26 + 18 + 70,
    draw(ctx, x, y) {
      title(ctx, W.t("dashboard.life.title"), x, y)
      const gx = x + 36
      const gy = y + TITLE
      const cell = pitch - Math.max(1, Math.round(pitch / 8))
      for (let year = 0; year < life.years; year += 1) {
        if (year % 10 === 0) write(ctx, String(year), gx - 8, gy + year * pitch + cell, { size: Math.min(11, pitch + 1), color: P.soft, align: "right" })
        for (let week = 0; week < WEEKS_PER_YEAR; week += 1) {
          const index = year * WEEKS_PER_YEAR + week
          const cx = gx + week * pitch
          const cy = gy + year * pitch
          if (index === life.current) {
            ctx.fillStyle = P.ink
            ctx.fillRect(cx, cy, cell, cell)
            ctx.strokeStyle = P.ink
            ctx.lineWidth = 1.5
            ctx.strokeRect(cx - 1.5, cy - 1.5, cell + 3, cell + 3)
          } else {
            ctx.fillStyle = index < life.lived ? P.accent : "#ece6d8"
            ctx.fillRect(cx, cy, cell, cell)
          }
        }
      }

      const ly = gy + gridHeight + 28
      const swatch = (sx: number, color: string, outlined: boolean, text: string) => {
        ctx.fillStyle = color
        ctx.fillRect(sx, ly - 10, 11, 11)
        if (outlined) {
          ctx.strokeStyle = P.ink
          ctx.lineWidth = 1.5
          ctx.strokeRect(sx - 1.5, ly - 11.5, 14, 14)
        }
        write(ctx, text, sx + 20, ly, { size: 13, color: P.soft })
      }
      const lived = W.t("dashboard.sheet.lived")
      const thisWeek = W.t("dashboard.sheet.thisWeek")
      ctx.font = fontOf(13, 400, false)
      const livedWidth = 20 + ctx.measureText(lived).width + 24
      const thisWeekWidth = 20 + ctx.measureText(thisWeek).width + 24
      swatch(gx, P.accent, false, lived)
      swatch(gx + livedWidth, P.ink, true, thisWeek)
      swatch(gx + livedWidth + thisWeekWidth, "#ece6d8", false, W.t("dashboard.sheet.later"))

      const boxWidth = (gridWidth - 14) / 2
      const by = ly + 22
      ;(
        [
          [W.t("dashboard.sheet.weeksLived"), life.lived],
          [W.t("dashboard.sheet.weeksLeft"), life.left],
        ] as [string, number][]
      ).forEach(([name, value], i) => {
        const bx = gx + i * (boxWidth + 14)
        box(ctx, bx, by, boxWidth, 62)
        write(ctx, name, bx + 16, by + 24, { size: 13, color: P.soft })
        write(ctx, number.format(value), bx + 16, by + 52, { size: 28, serif: true })
      })
    },
  }
}

function headerBlock(date: string): Block {
  const spoken = new Date(`${date}T00:00:00Z`).toLocaleDateString(W.locale, { dateStyle: "long", timeZone: "UTC" })
  return {
    height: 54,
    draw(ctx, x, y) {
      write(ctx, W.t("dashboard.title"), x, y + 38, { size: 38, weight: 500, serif: true })
      write(ctx, spoken, x + CONTENT, y + 36, { size: 14, color: P.soft, align: "right" })
    },
  }
}

function blocksFor(data: SheetData, options: SheetOptions): Block[] {
  const wanted = new Set(options.parts)
  const blocks: Block[] = [headerBlock(options.date)]
  if (wanted.has("counts")) blocks.push(countsBlock(data))
  if (wanted.has("flow")) blocks.push(flowBlock(data))
  if (wanted.has("mission")) blocks.push(missionBlock(data))
  if (wanted.has("map")) blocks.push(mapBlock(data), graphBlock(data))
  if (wanted.has("wheels")) blocks.push(wheelsBlock(data, options.tagNames))
  if (wanted.has("labels")) blocks.push(labelsBlock(data, options.tagNames))
  if (wanted.has("life")) {
    const life = lifeBlock(data)
    if (life) blocks.push(life)
  }
  return blocks
}

function canvasOf(width: number, height: number, scale: number) {
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error(W.t("dashboard.export.noDraw"))
  ctx.scale(scale, scale)
  ctx.fillStyle = P.paper
  ctx.fillRect(0, 0, width, height)
  return { canvas, ctx }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error(W.t("dashboard.export.noSave")))), type, quality)
  })
}

function paginate(blocks: Block[]) {
  const room = PAGE_HEIGHT - MARGIN * 2
  const pages: Block[][] = [[]]
  let used = 0
  for (const block of blocks) {
    const current = pages[pages.length - 1]!
    const next = used === 0 ? block.height : used + GAP + block.height
    if (used > 0 && next > room) {
      pages.push([block])
      used = block.height
    } else {
      current.push(block)
      used = next
    }
  }
  return pages
}

function drawStack(ctx: Ctx, blocks: Block[]) {
  let y = MARGIN
  for (const block of blocks) {
    block.draw(ctx, MARGIN, y)
    y += block.height + GAP
  }
}

/** Builds the file. Image is one tall PNG; PDF is A4 pages, and no picture is cut between two pages. */
export async function buildSheet(data: SheetData, options: SheetOptions): Promise<{ blob: Blob; fileName: string }> {
  W = wordsFor(options.language)
  const blocks = blocksFor(data, options)

  if (options.format === "image") {
    const height = MARGIN * 2 + blocks.reduce((sum, block) => sum + block.height, 0) + GAP * (blocks.length - 1)
    const scale = Math.min(2, Math.sqrt(36_000_000 / (WIDTH * height)), 15_000 / height)
    const { canvas, ctx } = canvasOf(WIDTH, height, scale)
    drawStack(ctx, blocks)
    return { blob: await toBlob(canvas, "image/png"), fileName: `Dashboard-${options.date}.png` }
  }

  const pages = []
  for (const page of paginate(blocks)) {
    const { canvas, ctx } = canvasOf(WIDTH, PAGE_HEIGHT, 1.6)
    drawStack(ctx, page)
    const jpeg = new Uint8Array(await (await toBlob(canvas, "image/jpeg", 0.92)).arrayBuffer())
    pages.push({ jpeg, width: canvas.width, height: canvas.height })
  }
  return { blob: buildPdf(pages), fileName: `Dashboard-${options.date}.pdf` }
}
