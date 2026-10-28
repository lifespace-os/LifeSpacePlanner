import type { WebLink } from "@/lib/web-links"

export type Mode = "unload" | "clusters" | "mission" | "goals" | "labels" | "task"

export type ClusterView = "wantmust" | "groups"

export type LabelView = "spheres" | "happiness" | "budget"

export type MissionView = "sentence" | "ikigai" | "markers"

export type GoalView = "needs" | "life" | "project" | "tasks" | "map" | "graph"

export type ZoneId = "want" | "must"

/** A rectangle on the canvas, in world pixels. */
export type Zone = { left: number; top: number; width: number; height: number }

export type Zones = Record<ZoneId, Zone>

/** A named area in the Groups view. Its hashtag is the group's membership. */
export type Group = Zone & { id: string; name: string; tag: string }

/** An area that owns a hashtag. Both Want / Must zones and groups are areas. */
export type TaggedArea = Zone & { tag: string }

export type MissionChoice = "keep" | "release" | null

export type LabelGroupId = "area" | "happiness" | "budget"

export type TaskDetails = {
  title: string
  labelId: string | null
  /** The day work starts, as yyyy-mm-dd. Empty when unset. */
  since?: string
  due: string
  owner: string
}

/** The fields the Make a task window writes onto any card, whether or not it is a task yet. */
export type CardDetails = {
  title: string
  since: string
  due: string
  owner: string
}

export type PresetColorId = "butter" | "peach" | "rose" | "sage" | "sky" | "lilac" | "paper"

/** A preset name, or a custom color as a 6-digit hex such as "#a8d5c9". */
export type CardColorId = PresetColorId | `#${string}`

export type CardColor = { id: CardColorId; name: string; fill: string; edge: string; dark: boolean }

export type Note = {
  id: string
  text: string
  color: CardColorId
  hashtags: string[]
  /** Top-left position in canvas pixels (world space, unaffected by pan and zoom). */
  x: number
  y: number
  rotation: number
  z: number
  mission: MissionChoice
  labels: Partial<Record<LabelGroupId, string>>
  task: TaskDetails | null
  /** Title, since date, due date and owner saved in the Make a task window. */
  details?: CardDetails | null
  /** The goals above this card on the Map, in the order chosen: card ids and "mission". Empty means none. */
  parentIds?: string[]
  /** Free lines: other cards, or "mission", this card is joined to. No ring is needed, and the Map and the shortest path ignore them. */
  freeIds?: string[]
  /** Where the point sits on its Map ring, in radians. Empty means the Map places it. */
  mapAngle?: number | null
  /** The answers saved in the side panel of a Life goals or Project goals card. */
  goalPlan?: GoalPlan | null
  /** The id of the one picture on this card, kept in the media store. Absent means no picture. */
  image?: string
  /** The Web links on this card, in the order added. They are not hashtags and change no filter or count. */
  webLinks?: WebLink[]
}

/** Why a goal exists. "unlinked" is a valid answer. */
export type GoalGround = "mission" | "living" | "want" | "unlinked"

export type GoalAim = "cause" | "symptom"

export type GoalReach = "now" | "smaller"

/** What the person wrote about one goal. It has no owner, start date, deadline, review, or public commitment. */
export type GoalPlan = {
  ground: GoalGround | null
  /** One line: how reaching the goal helps the mission. Used only when the ground is the mission. */
  missionHelp: string
  /** One line: why the goal matters to the person. */
  why: string
  aim: GoalAim | null
  /** The person confirmed the sentence holds one result. */
  oneResult: boolean
  /** The observable sign, number, or ready state that shows the result is reached. */
  sign: string
  reach: GoalReach | null
  /** The goal was split into two. */
  split: boolean
  /** For a card with #must: whether the person chose it themselves. */
  ownChoice: boolean | null
}

export type View = { x: number; y: number; zoom: number }

export const CARD_WIDTH = 196
export const CARD_MIN_HEIGHT = 132
export const MIN_ZOOM = 0.15
export const MAX_ZOOM = 2.5

export const MODES: { id: Mode; name: string; hint: string }[] = [
  {
    id: "unload",
    name: "Unload",
    hint: "Drag a blank card from the dock and write whatever is on your mind.",
  },
  {
    id: "clusters",
    name: "Clusters",
    hint: "Sort the same cards two ways. Open either view first. Neither is required.",
  },
  { id: "mission", name: "Mission", hint: "Write your mission sentence, then mark each card Keep or Release." },
  {
    id: "goals",
    name: "Goals",
    hint: "Give each card a level, from a need or dream down to a task. A card does not need a parent.",
  },
  { id: "labels", name: "Labels", hint: "Three views, open them in any order. None is required." },
  { id: "task", name: "Make a task", hint: "Select a card and turn it into a task. One card, one task." },
]

export const MISSION_MAX_LENGTH = 1000

export const CARD_COLORS: { id: PresetColorId; name: string; fill: string; edge: string }[] = [
  { id: "butter", name: "Butter", fill: "#f7e8a4", edge: "#e6d27c" },
  { id: "peach", name: "Peach", fill: "#f6d4bd", edge: "#e8b896" },
  { id: "rose", name: "Rose", fill: "#f3cdd1", edge: "#e2aab1" },
  { id: "sage", name: "Sage", fill: "#d6e5c9", edge: "#b9cfa6" },
  { id: "sky", name: "Sky", fill: "#d1e2ec", edge: "#acc8d8" },
  { id: "lilac", name: "Lilac", fill: "#e0d6ec", edge: "#c6b6db" },
  { id: "paper", name: "Paper", fill: "#fffdf8", edge: "#ddd3c2" },
]

const COLOR_INDEX = new Map<string, CardColor>(CARD_COLORS.map((color) => [color.id, { ...color, dark: false }]))

const HEX_COLOR = /^#[0-9a-f]{6}$/i

export function isCustomColor(id: string): id is `#${string}` {
  return HEX_COLOR.test(id)
}

function customCardColor(hex: `#${string}`): CardColor {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  const edge = [r, g, b].map((channel) => Math.round(channel * 0.82).toString(16).padStart(2, "0")).join("")
  return { id: hex, name: "Custom", fill: hex, edge: `#${edge}`, dark: luminance < 0.5 }
}

export function getCardColor(id: CardColorId): CardColor {
  return COLOR_INDEX.get(id) ?? (isCustomColor(id) ? customCardColor(id) : COLOR_INDEX.get("butter")!)
}

export function normalizeHashtag(value: string) {
  return value
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .slice(0, 24)
}

export type LabelOption = { id: string; name: string; color: string }

export type LabelGroup = {
  id: LabelGroupId
  name: string
  question: string
  shape: "dot" | "diamond" | "square"
  options: LabelOption[]
}

export const LABEL_GROUPS: LabelGroup[] = [
  {
    id: "area",
    name: "Life area",
    question: "Which part of life does this touch?",
    shape: "dot",
    options: [
      { id: "work", name: "Work", color: "#3b6ea5" },
      { id: "home", name: "Home", color: "#b9773a" },
      { id: "relationships", name: "Relationships", color: "#8c5ba0" },
      { id: "body", name: "Body", color: "#7f9a2e" },
      { id: "learning", name: "Learning", color: "#2a8a8a" },
      { id: "money", name: "Money", color: "#6b5a3a" },
    ],
  },
  {
    id: "happiness",
    name: "Happiness component",
    question: "Which part of happiness does it serve?",
    shape: "diamond",
    options: [
      { id: "safety", name: "Safety", color: "#47597a" },
      { id: "health", name: "Health", color: "#d0603f" },
      { id: "freedom", name: "Freedom", color: "#d99a1e" },
      { id: "love", name: "Love", color: "#c23b4e" },
    ],
  },
  {
    id: "budget",
    name: "Investment or expense",
    question: "Does it give back more than it takes?",
    shape: "square",
    options: [
      { id: "investment", name: "Investment", color: "#2e7d4f" },
      { id: "expense", name: "Expense", color: "#8a3b2c" },
    ],
  },
]

/** One sector of a life-spheres or happiness list. Its hashtag is the name written as a tag. */
export type Sector = {
  id: string
  name: string
  color: `#${string}`
  /** Satisfaction from 0 to 100. Only life spheres have one, and it is unset until a score is saved. */
  score?: number
}

export const SCORE_MAX = 100

/** Wheel sizes in world units. The reach includes the names written outside the ring. */
export const WHEEL_OUTER = 230
export const WHEEL_INNER = 64
export const WHEEL_REACH = 380
export const WHEEL_GAP = 90

/** Soft paper colors given to a card dropped on a life sphere. */
export const SECTOR_COLORS: `#${string}`[] = [
  "#f2b8a2",
  "#f4d58d",
  "#b9d9a5",
  "#a9d3e0",
  "#c5b8e6",
  "#f0b3c8",
  "#9fc5e8",
  "#d9c7a0",
  "#a8dccb",
  "#e5a9a9",
]

/** Prototype colors for the four starting happiness components. They are a first draft, not a final palette. */
export const HAPPINESS_COLORS: `#${string}`[] = ["#9fc5e8", "#b9d9a5", "#f4d58d", "#f0b3c8"]

/** The first color no sector of the list uses yet, or the next one in turn when all are taken. */
export function nextSectorColor(sectors: Sector[], palette: `#${string}`[] = SECTOR_COLORS): `#${string}` {
  const used = new Set(sectors.map((sector) => sector.color))
  return palette.find((color) => !used.has(color)) ?? palette[sectors.length % palette.length]
}

export type SphereSetId = "five" | "seven" | "eight" | "ten"

export type SectorListId = SphereSetId | "happiness"

export const LIFE_SPHERE_SETS: { id: SphereSetId; name: string; starter: boolean; sectors: string[] }[] = [
  {
    id: "five",
    name: "Five",
    starter: false,
    sectors: ["Personal growth", "Family and friends", "Hobby", "Business and work", "Society"],
  },
  {
    id: "seven",
    name: "Seven",
    starter: false,
    sectors: ["Personal growth", "Family", "Friends", "Business and work", "Hobby", "Rest", "Health"],
  },
  {
    id: "eight",
    name: "Eight",
    starter: true,
    sectors: ["Health", "Family", "Friends", "Love", "Work", "Money", "Growth", "Rest"],
  },
  {
    id: "ten",
    name: "Ten",
    starter: true,
    sectors: ["Health", "Work", "Money", "Home", "Relationships", "Growth", "Rest", "Friends", "Creativity", "Contribution"],
  },
]

export const HAPPINESS_START = ["Safety", "Health", "Freedom", "Love"]

export const SECTOR_NAME_MAX = 28

export function sectorTag(name: string) {
  return groupTag(name)
}

function sectorsFrom(prefix: string, names: string[], palette: `#${string}`[] = SECTOR_COLORS): Sector[] {
  return names.map((name, i) => ({ id: `${prefix}-${i}`, name, color: palette[i % palette.length] }))
}

export function startingSectorLists(): Record<SectorListId, Sector[]> {
  return {
    five: sectorsFrom("five", LIFE_SPHERE_SETS[0].sectors),
    seven: sectorsFrom("seven", LIFE_SPHERE_SETS[1].sectors),
    eight: sectorsFrom("eight", LIFE_SPHERE_SETS[2].sectors),
    ten: sectorsFrom("ten", LIFE_SPHERE_SETS[3].sectors),
    happiness: sectorsFrom("happiness", HAPPINESS_START, HAPPINESS_COLORS),
  }
}

const LABEL_INDEX = new Map(
  LABEL_GROUPS.flatMap((group) => group.options.map((option) => [option.id, { ...option, group }] as const)),
)

export function getLabel(id: string | null | undefined) {
  return id ? LABEL_INDEX.get(id) ?? null : null
}

/** Starting positions for the Want and Must zones, in canvas pixels. */
export const DEFAULT_ZONES: Zones = {
  want: { left: 0, top: 0, width: 760, height: 640 },
  must: { left: 900, top: 0, width: 760, height: 640 },
}

export const ZONE_MIN_SIZE = { width: 300, height: 240 }

export const ZONE_IDS: ZoneId[] = ["want", "must"]

export const ZONE_TAGS: string[] = ZONE_IDS

export function zoneAreas(zones: Zones): TaggedArea[] {
  return ZONE_IDS.map((id) => ({ ...zones[id], tag: id }))
}

/** The two zones of the Labels > Investment and Expense view. A card may sit in one or in neither. */
export type BudgetZoneId = "investment" | "expense"

export type BudgetZones = Record<BudgetZoneId, Zone>

export const BUDGET_ZONE_IDS: BudgetZoneId[] = ["investment", "expense"]

export const BUDGET_TAGS: string[] = BUDGET_ZONE_IDS

export const BUDGET_ZONE_SIZE = { width: 520, height: 480 }

export const BUDGET_ZONE_GAP = 60

/** Colors of the two zones. Their hashtags are shown in these colors in the Tags and task windows. */
export const BUDGET_COLORS: Record<BudgetZoneId, `#${string}`> = {
  investment: "#7fbf9a",
  expense: "#e0a07f",
}

export function budgetAreas(zones: BudgetZones): TaggedArea[] {
  return BUDGET_ZONE_IDS.map((id) => ({ ...zones[id], tag: id }))
}

export function groupAreas(groups: Group[]): TaggedArea[] {
  return groups.map(({ left, top, width, height, tag }) => ({ left, top, width, height, tag }))
}

/** The tag of the topmost area that contains a point, or null when the point is outside every area. */
export function areaTagAt(areas: TaggedArea[], cx: number, cy: number): string | null {
  for (let i = areas.length - 1; i >= 0; i--) {
    const a = areas[i]
    if (cx >= a.left && cx <= a.left + a.width && cy >= a.top && cy <= a.top + a.height) return a.tag
  }
  return null
}

export function hasHashtag(note: Note, tag: string) {
  return note.hashtags.some((t) => t.toLowerCase() === tag.toLowerCase())
}

export type CardSpot = { x: number; y: number }

const ARRANGE_GAP = 24
const ARRANGE_PAD = 20
const ARRANGE_HEADER = 56

/**
 * The temporary layout of Want / Must, Groups, and Investment or expense. Cards go into the first area
 * whose hashtag they carry, in rows from the top left. Cards with no area go in rows below every area.
 * Nothing here is saved on a card.
 */
export function arrangeCards(notes: Note[], areas: TaggedArea[]): Record<string, CardSpot> {
  const stepX = CARD_WIDTH + ARRANGE_GAP
  const stepY = CARD_MIN_HEIGHT + ARRANGE_GAP
  const spots: Record<string, CardSpot> = {}
  const inArea = new Map<string, Note[]>()
  const outside: Note[] = []
  for (const note of notes) {
    const area = areas.find((a) => hasHashtag(note, a.tag))
    if (!area) outside.push(note)
    else inArea.set(area.tag, [...(inArea.get(area.tag) ?? []), note])
  }
  for (const area of areas) {
    const list = inArea.get(area.tag) ?? []
    if (list.length === 0) continue
    const cols = Math.max(1, Math.floor((area.width - ARRANGE_PAD * 2 + ARRANGE_GAP) / stepX))
    const rows = Math.ceil(list.length / cols)
    const room = area.height - ARRANGE_HEADER - ARRANGE_PAD - CARD_MIN_HEIGHT
    const rowStep = rows > 1 ? Math.min(stepY, Math.max(28, room / (rows - 1))) : stepY
    const used = Math.min(cols, list.length)
    const startX = area.left + (area.width - (used * stepX - ARRANGE_GAP)) / 2
    list.forEach((note, i) => {
      spots[note.id] = {
        x: Math.round(startX + (i % cols) * stepX),
        y: Math.round(area.top + ARRANGE_HEADER + Math.floor(i / cols) * rowStep),
      }
    })
  }
  if (outside.length > 0) {
    const left = areas.length > 0 ? Math.min(...areas.map((a) => a.left)) : 0
    const right = areas.length > 0 ? Math.max(...areas.map((a) => a.left + a.width)) : stepX * 4
    const bottom = areas.length > 0 ? Math.max(...areas.map((a) => a.top + a.height)) : 0
    const cols = Math.max(1, Math.floor((right - left + ARRANGE_GAP) / stepX))
    outside.forEach((note, i) => {
      spots[note.id] = {
        x: left + (i % cols) * stepX,
        y: bottom + 60 + Math.floor(i / cols) * (stepY + 40),
      }
    })
  }
  return spots
}

/** The three Labels sets. Each draws one shape on the face of a card. */
export type LabelSetId = "spheres" | "happiness" | "budget"

export const LABEL_SET_IDS: LabelSetId[] = ["spheres", "happiness", "budget"]

export const LABEL_SET_NAMES: Record<LabelSetId, string> = {
  spheres: "Life spheres",
  happiness: "Happiness components",
  budget: "Investment or expense",
}

export const LABEL_SET_SHAPES: Record<LabelSetId, LabelGroup["shape"]> = {
  spheres: "dot",
  happiness: "diamond",
  budget: "square",
}

/** One label a card can carry: its hashtag, its name for the window, and the color of its sector or zone. */
export type LabelSetOption = { tag: string; name: string; color: `#${string}` }

export type LabelSetLists = Record<LabelSetId, LabelSetOption[]>

export function labelSetLists(spheres: Sector[], happiness: Sector[]): LabelSetLists {
  const fromSectors = (sectors: Sector[]): LabelSetOption[] =>
    sectors.map((sector) => ({ tag: sectorTag(sector.name), name: sector.name, color: sector.color }))
  return {
    spheres: fromSectors(spheres),
    happiness: fromSectors(happiness),
    budget: BUDGET_ZONE_IDS.map((id) => ({
      tag: id,
      name: id === "investment" ? "Investment" : "Expense",
      color: BUDGET_COLORS[id],
    })),
  }
}

/** The hashtags a card carries in one set, in the order they were added. */
export function labelSetTags(note: Note, options: LabelSetOption[]): string[] {
  const known = new Set(options.map((option) => option.tag.toLowerCase()))
  return note.hashtags.filter((tag) => known.has(tag.toLowerCase()))
}

/** What the face of a card draws for one set: a shape in the color of the latest label, and every hashtag of the set. */
export type CardLabelSet = {
  id: LabelSetId
  shape: LabelGroup["shape"]
  color: string
  tags: string[]
}

/** The sets that have at least one label. An empty set is left out, so it draws no shape. */
export function labelSetsOf(note: Note, lists: LabelSetLists): CardLabelSet[] {
  return LABEL_SET_IDS.flatMap((id) => {
    const tags = labelSetTags(note, lists[id])
    if (tags.length === 0) return []
    const latest = tags[tags.length - 1].toLowerCase()
    const option = lists[id].find((o) => o.tag.toLowerCase() === latest)
    return option ? [{ id, shape: LABEL_SET_SHAPES[id], color: option.color, tags }] : []
  })
}

/**
 * Writes one set onto a card: labels still chosen keep their place, new ones are appended, and the
 * rest of the set is removed. Hashtags outside the set are never touched.
 */
export function writeLabelSet(
  hashtags: string[],
  options: LabelSetOption[],
  chosen: string[],
): { hashtags: string[]; added: LabelSetOption | null } {
  const owned = new Set(options.map((option) => option.tag.toLowerCase()))
  const wanted = new Set(chosen.map((tag) => tag.toLowerCase()))
  const kept = hashtags.filter((tag) => !owned.has(tag.toLowerCase()) || wanted.has(tag.toLowerCase()))
  const present = new Set(kept.map((tag) => tag.toLowerCase()))
  const fresh = chosen.filter((tag) => !present.has(tag.toLowerCase()))
  const last = fresh[fresh.length - 1]
  return {
    hashtags: [...kept, ...fresh],
    added: last ? options.find((option) => option.tag.toLowerCase() === last.toLowerCase()) ?? null : null,
  }
}

/**
 * Moves a card between the areas of one view. Only that view's hashtags change: entering an area
 * adds its tag, leaving removes it. Hashtags from the other view are never touched.
 */
export function retag(note: Note, viewTags: string[], next: string | null): Note {
  const owned = new Set(viewTags.map((t) => t.toLowerCase()))
  let hashtags = note.hashtags.filter((t) => !owned.has(t.toLowerCase()) || t.toLowerCase() === next?.toLowerCase())
  if (next && !hashtags.some((t) => t.toLowerCase() === next.toLowerCase())) hashtags = [...hashtags, next]
  const unchanged = hashtags.length === note.hashtags.length && hashtags.every((t, i) => t === note.hashtags[i])
  return unchanged ? note : { ...note, hashtags }
}

/** Retags a card only when it crossed from one area to another, so tags added by hand survive a nudge. */
export function reconcile(note: Note, viewTags: string[], from: string | null, to: string | null): Note {
  return from === to ? note : retag(note, viewTags, to)
}

export type IkigaiCircleId = "love" | "good-at" | "income" | "needed"

export type IkigaiOverlapId = "passion" | "profession" | "work" | "vocation"

export type IkigaiRegionId = IkigaiCircleId | IkigaiOverlapId | "ikigai"

export type IkigaiMoveId = "could-help" | "beloved-from-list" | "skill-to-grow" | "could-earn"

/** Circles sit on the four compass points around the center of the diagram, in canvas pixels. */
export const IKIGAI = { r: 260, d: 165 }

export const IKIGAI_SIZE = 2 * (IKIGAI.r + IKIGAI.d)

/** Distance from the center to the middle of a region that belongs to a single circle. */
export const IKIGAI_LABEL_REACH = 313

/** Center of the four circles on the canvas. The circles move together, so one point places them all. */
export type IkigaiCenter = { x: number; y: number }

/** Clear space between the rectangle around all cards and the circles, in canvas pixels. */
export const IKIGAI_GAP = 160

export const IKIGAI_CIRCLES: IkigaiCircleId[] = ["love", "needed", "income", "good-at"]

const CIRCLE_DIRECTION: Record<IkigaiCircleId, [number, number]> = {
  love: [0, -1],
  needed: [1, 0],
  income: [0, 1],
  "good-at": [-1, 0],
}

/** Each overlap is where two neighbouring circles meet. */
export const OVERLAP_PARENTS: Record<IkigaiOverlapId, [IkigaiCircleId, IkigaiCircleId]> = {
  passion: ["love", "good-at"],
  profession: ["good-at", "income"],
  work: ["income", "needed"],
  vocation: ["love", "needed"],
}

/** Offset of a circle's center from the center of the diagram. */
export function ikigaiCircleOffset(id: IkigaiCircleId) {
  const [dx, dy] = CIRCLE_DIRECTION[id]
  return { x: dx * IKIGAI.d, y: dy * IKIGAI.d }
}

/** Which region of the diagram a canvas point falls in, or null when it is outside every circle. */
export function ikigaiRegionAt(x: number, y: number, center: IkigaiCenter): IkigaiRegionId | null {
  const inside = IKIGAI_CIRCLES.filter((id) => {
    const o = ikigaiCircleOffset(id)
    return Math.hypot(x - (center.x + o.x), y - (center.y + o.y)) <= IKIGAI.r
  })
  if (inside.length === 0) return null
  if (inside.length === 1) return inside[0]
  if (inside.length === 4) return "ikigai"

  const overlaps = (Object.keys(OVERLAP_PARENTS) as IkigaiOverlapId[]).filter((id) =>
    OVERLAP_PARENTS[id].every((parent) => inside.includes(parent)),
  )
  if (overlaps.length === 0) return "ikigai"
  if (overlaps.length === 1) return overlaps[0]

  // Three circles meet here. Pick the overlap whose parents' midpoint is nearest.
  let best = overlaps[0]
  let bestDistance = Infinity
  for (const id of overlaps) {
    const [a, b] = OVERLAP_PARENTS[id].map(ikigaiCircleOffset)
    const distance = Math.hypot(x - (center.x + (a.x + b.x) / 2), y - (center.y + (a.y + b.y) / 2))
    if (distance < bestDistance) {
      best = id
      bestDistance = distance
    }
  }
  return best
}

/** A step, circle, overlap, or move that owns a hashtag. Its id is its hashtag. */
export type IkigaiItem = {
  id: string
  kind: "region" | "move"
  step: number | null
  name: string
  tag: string
  /** The area highlighted on the diagram when this item is chosen. */
  region: IkigaiRegionId
  /** Hashtags of the two circles an overlap joins. */
  parents: [string, string] | null
  /** The three circles whose shared overlap a move points to. */
  lens: [IkigaiCircleId, IkigaiCircleId, IkigaiCircleId] | null
  description: string
}

function regionItem(
  step: number | null,
  id: IkigaiRegionId,
  name: string,
  description: string,
): IkigaiItem {
  const parents = id in OVERLAP_PARENTS ? OVERLAP_PARENTS[id as IkigaiOverlapId] : null
  return { id, kind: "region", step, name, tag: id, region: id, parents, lens: null, description }
}

function moveItem(
  id: IkigaiMoveId,
  name: string,
  region: IkigaiCircleId,
  lens: [IkigaiCircleId, IkigaiCircleId, IkigaiCircleId],
  description: string,
): IkigaiItem {
  return { id, kind: "move", step: null, name, tag: id, region, parents: null, lens, description }
}

export const IKIGAI_ITEMS: IkigaiItem[] = [
  regionItem(1, "love", "What you love", "Things you enjoy so much that time passes without notice."),
  regionItem(2, "good-at", "What you are good at", "Skills and strengths you already have."),
  regionItem(3, "passion", "Passion", "Where what you love meets what you are good at."),
  regionItem(4, "income", "What brings you income", "Things people would pay you for."),
  regionItem(5, "profession", "Profession", "Where what you are good at meets what can earn you income."),
  regionItem(6, "needed", "What people need", "Needs and wishes of other people that you could answer."),
  regionItem(7, "work", "Work", "Where what brings income meets what people need."),
  regionItem(8, "vocation", "Vocation", "Where what you love meets what people need."),
  regionItem(null, "ikigai", "Ikigai", "The center, where all four circles meet."),
  moveItem(
    "could-help",
    "How this could help people",
    "needed",
    ["love", "good-at", "income"],
    "Cards where you can see a way to help someone.",
  ),
  moveItem(
    "beloved-from-list",
    "Find a loved activity from the love list",
    "love",
    ["good-at", "income", "needed"],
    "Cards from the love list you would like to do more of.",
  ),
  moveItem(
    "skill-to-grow",
    "Develop a skill from the list",
    "good-at",
    ["love", "income", "needed"],
    "Cards from the good-at list that are worth growing.",
  ),
  moveItem(
    "could-earn",
    "Find a way to earn from it",
    "income",
    ["love", "good-at", "needed"],
    "Cards that could turn into income.",
  ),
]

export const IKIGAI_STEPS = IKIGAI_ITEMS.filter((item) => item.step !== null)

export const IKIGAI_MOVES = IKIGAI_ITEMS.filter((item) => item.kind === "move")

const IKIGAI_INDEX = new Map(IKIGAI_ITEMS.map((item) => [item.id, item]))

export function getIkigaiItem(id: string | null | undefined) {
  return id ? IKIGAI_INDEX.get(id) ?? null : null
}

export function countTag(notes: Note[], tag: string) {
  return notes.reduce((total, note) => total + (hasHashtag(note, tag) ? 1 : 0), 0)
}

/** A sign that something belongs in the mission. Its id is its hashtag. */
export type Marker = { id: string; name: string; tag: string; description: string }

function marker(tag: string, name: string, description: string): Marker {
  return { id: tag, name, tag, description }
}

export const MARKERS: Marker[] = [
  marker("love-this", "You love it", "You enjoy it for its own sake."),
  marker("comes-easily", "It comes out well", "The result turns out well without strain."),
  marker("ease-despite-difficulty", "Easy even when it is hard", "It stays easy for you even when the task is hard."),
  marker("luck", "Luck shows up", "Good things happen around it, as if luck follows you there."),
  marker("energy", "It gives energy", "You finish with more energy than you started with."),
  marker("rather-do-it", "Easier to do than to skip", "Doing it costs you less than avoiding it."),
  marker("joy", "Joy", "It brings you joy while you do it."),
  marker("process", "The process matters", "You care about the doing as much as the result."),
  marker("mastery", "You want mastery", "You want to keep getting better at it."),
  marker("flow", "Time disappears", "Hours pass and you do not notice."),
]

const MARKER_INDEX = new Map(MARKERS.map((item) => [item.id, item]))

export function getMarker(id: string | null | undefined) {
  return id ? MARKER_INDEX.get(id) ?? null : null
}

/** How many of the ten markers a card carries. */
export function countMarkers(note: Note) {
  return MARKERS.reduce((total, item) => total + (hasHashtag(note, item.tag) ? 1 : 0), 0)
}

/** A level a card can hold in Goals. Its id is its hashtag. */
export type GoalLevel = { id: string; name: string; tag: string; description: string }

function goalLevel(tag: string, name: string, description: string): GoalLevel {
  return { id: tag, name, tag, description }
}

export const GOAL_LEVELS: GoalLevel[] = [
  goalLevel("need", "Need", "Something you cannot do without."),
  goalLevel("dream", "Dream", "Something you wish for, with no plan yet."),
  goalLevel("want", "Want", "Something you would like to have or do."),
  goalLevel("life-goal", "Life goal", "A direction for years, not weeks."),
  goalLevel("project-goal", "Project goal", "An outcome with an end, within a project."),
  goalLevel("task", "Task", "One step you can do next."),
]

export const GOAL_TAGS = GOAL_LEVELS.map((level) => level.tag)

/** The levels that each view takes drops for. Map takes none. */
export const GOAL_VIEW_LEVELS: Record<Exclude<GoalView, "map" | "graph">, string[]> = {
  needs: ["need", "dream", "want"],
  life: ["life-goal"],
  project: ["project-goal"],
  tasks: ["task"],
}

export function getGoalLevel(tag: string | null | undefined) {
  return GOAL_LEVELS.find((level) => level.tag === tag) ?? null
}

/**
 * A ring of the Map. The main rings are fixed. A ring the person adds carries one hashtag, made from its name,
 * and lives only on the Map.
 */
export type GoalRing = { id: string; name: string; tags: string[]; width: number; custom: boolean }

/** The main rings, counted from the mission outward: 0 needs, dreams, wants; 1 life; 2 project; 3 tasks. */
export const BUILT_IN_RINGS: GoalRing[] = [
  { id: "needs", name: "Needs, dreams, and wants", tags: ["need", "dream", "want"], width: 120, custom: false },
  { id: "life", name: "Life goals", tags: ["life-goal"], width: 150, custom: false },
  { id: "project", name: "Project goals", tags: ["project-goal"], width: 200, custom: false },
  { id: "tasks", name: "Tasks", tags: ["task"], width: 260, custom: false },
]

export const GOAL_RING_TAGS: string[][] = BUILT_IN_RINGS.map((ring) => ring.tags)

export const GOAL_RING_NAMES = BUILT_IN_RINGS.map((ring) => ring.name)

/** Width of an added ring before the thickness factor. */
export const NEW_RING_WIDTH = 150

export function ringTags(rings: GoalRing[]) {
  return rings.flatMap((ring) => ring.tags)
}

/** The goal level a card carries, or null when it has none. */
export function goalLevelOf(note: Note, rings: GoalRing[] = BUILT_IN_RINGS): string | null {
  const tags = ringTags(rings)
  const found = note.hashtags.find((t) => tags.includes(t.toLowerCase()))
  return found ? found.toLowerCase() : null
}

export function goalRingOf(note: Note, rings: GoalRing[] = BUILT_IN_RINGS): number {
  const level = goalLevelOf(note, rings)
  return level ? rings.findIndex((ring) => ring.tags.includes(level)) : -1
}

/** The hashtag a new ring would carry, or null when the name leaves nothing to write. A taken tag gets a number. */
export function newRingTag(name: string, rings: GoalRing[]): string | null {
  const base = groupTag(name)
  if (!base) return null
  const taken = new Set([...ringTags(rings), ...ringTags(BUILT_IN_RINGS)])
  let tag = base
  for (let n = 2; taken.has(tag); n++) tag = `${base.slice(0, 28)}-${n}`
  return tag
}

/** Adds a ring right after the ring with `afterId`, or at the end when that ring is not found. */
export function insertRing(rings: GoalRing[], name: string, afterId: string): GoalRing[] | null {
  const tag = newRingTag(name, rings)
  if (!tag) return null
  const ring: GoalRing = { id: `ring-${tag}`, name: name.trim().replace(/\s+/g, " "), tags: [tag], width: NEW_RING_WIDTH, custom: true }
  const at = rings.findIndex((r) => r.id === afterId)
  const index = at < 0 ? rings.length : at + 1
  return [...rings.slice(0, index), ring, ...rings.slice(index)]
}

/** Takes a removed ring's hashtag off every card that carries it. Those cards lose their place on the ring and their link. */
export function stripRingTags(notes: Note[], ring: GoalRing): Note[] {
  const tags = ring.tags.map((t) => t.toLowerCase())
  return notes.map((note) =>
    note.hashtags.some((t) => tags.includes(t.toLowerCase()))
      ? {
          ...note,
          hashtags: note.hashtags.filter((t) => !tags.includes(t.toLowerCase())),
          mapAngle: null,
          parentIds: [],
        }
      : note,
  )
}

/** Sets a card's level. A new level replaces the previous one; other hashtags stay. A link survives only on the same ring. */
export function setGoalLevel(note: Note, tag: string, rings: GoalRing[] = BUILT_IN_RINGS): Note {
  const ring = goalRingOf(note, rings)
  const level = goalLevelOf(note, rings)
  const next = retag(note, ringTags(rings), tag)
  const nextRing = rings.findIndex((r) => r.tags.includes(tag))
  const kept = level === tag ? next : { ...next, mapAngle: null }
  return ring !== nextRing && kept.parentIds?.length ? { ...kept, parentIds: [] } : kept
}

/** Radius of the small mission circle in canvas pixels. It does not change with ring thickness. */
export const GOAL_MAP_MISSION_RADIUS = 110

/** The thickness field: a factor on every ring width, typed as a percent. The top is a guard against a typo, not a design limit. */
export const GOAL_RING_SCALE = { min: 0.2, max: 10, step: 0.1, initial: 1 }

/** The point size field: the diameter of a point in canvas pixels. */
export const GOAL_POINT_SIZE = { min: 8, max: 120, initial: 22 }

export type GoalNameMode = "pointer" | "selected" | "always"

export const GOAL_NAME_MODES: { id: GoalNameMode; label: string }[] = [
  { id: "pointer", label: "Under the pointer" },
  { id: "selected", label: "On the selected point" },
  { id: "always", label: "Always" },
]

/** Radii of the Map: the mission circle, then one edge for every ring, outward. */
export function goalMapEdges(scale = GOAL_RING_SCALE.initial, rings: GoalRing[] = BUILT_IN_RINGS): number[] {
  const edges = [GOAL_MAP_MISSION_RADIUS]
  for (const ring of rings) edges.push(edges[edges.length - 1] + ring.width * scale)
  return edges
}

/** Radius the points of a ring sit on. The first ring keeps its points toward the outer edge, clear of its title. */
export function goalRingRadius(edges: number[], ring: number) {
  return ring === 0 ? edges[0] + (edges[1] - edges[0]) * 0.7 : (edges[ring] + edges[ring + 1]) / 2
}

const SECTOR = (2 * Math.PI) / 3

/** The first ring is cut into three equal sectors, starting at the top and running clockwise. */
export function goalSectorStart(index: number) {
  return -Math.PI / 2 + index * SECTOR
}

/** The level a canvas point stands for on the Map, or null over the mission or outside the rings. */
export function goalMapTagAt(
  x: number,
  y: number,
  center: IkigaiCenter,
  scale = GOAL_RING_SCALE.initial,
  rings: GoalRing[] = BUILT_IN_RINGS,
): string | null {
  const edges = goalMapEdges(scale, rings)
  const dx = x - center.x
  const dy = y - center.y
  const distance = Math.hypot(dx, dy)
  if (distance < edges[0] || distance > edges[edges.length - 1]) return null
  const ring = edges.findIndex((edge, i) => i > 0 && distance <= edge) - 1
  if (ring !== 0) return rings[ring].tags[0]
  const turn = (((Math.atan2(dy, dx) + Math.PI / 2) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  return GOAL_RING_TAGS[0][Math.min(2, Math.floor(turn / SECTOR))]
}

/** Wraps an angle into the range the Map uses: from the top, clockwise. */
export function goalAngle(angle: number) {
  const turn = (((angle + Math.PI / 2) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  return turn - Math.PI / 2
}

const SECTOR_MARGIN = 0.12

/** Keeps an angle on the ring of a level. The first ring holds each level inside its own sector. */
export function clampGoalAngle(tag: string, angle: number) {
  const wrapped = goalAngle(angle)
  const sector = GOAL_RING_TAGS[0].indexOf(tag)
  if (sector < 0) return wrapped
  const start = goalSectorStart(sector)
  return Math.min(start + SECTOR - SECTOR_MARGIN, Math.max(start + SECTOR_MARGIN, wrapped))
}

/**
 * Everything a card is linked to on the Map, in the order chosen: card ids and "mission".
 * A link may run to any card on a ring closer to the center, or to the mission. A link counts only when it is valid now.
 */
export function goalLinks(note: Note, byId: Map<string, Note>, rings: GoalRing[] = BUILT_IN_RINGS): string[] {
  const ring = goalRingOf(note, rings)
  if (ring < 0) return []
  const found: string[] = []
  for (const id of note.parentIds ?? []) {
    if (found.includes(id)) continue
    if (id === "mission") {
      found.push(id)
      continue
    }
    const parent = byId.get(id)
    const parentRing = parent ? goalRingOf(parent, rings) : -1
    if (parent && parentRing >= 0 && parentRing < ring) found.push(id)
  }
  return found
}

/** One free line. `fromId` is the card that stores it; `toId` is another card or "mission". */
export type FreeEdge = { id: string; fromId: string; toId: string }

/** Every free line between existing cards or the mission, each pair once. It never reads rings. */
export function freeEdges(notes: Note[]): FreeEdge[] {
  const ids = new Set(notes.map((note) => note.id))
  const seen = new Set<string>()
  const found: FreeEdge[] = []
  for (const note of notes) {
    for (const toId of note.freeIds ?? []) {
      if (toId === note.id || (toId !== "mission" && !ids.has(toId))) continue
      const key = [note.id, toId].sort().join("~")
      if (seen.has(key)) continue
      seen.add(key)
      found.push({ id: `${note.id}~${toId}`, fromId: note.id, toId })
    }
  }
  return found
}

/** The id of the thread that runs from a card to one goal above it. */
export function goalThreadId(from: string, to: string) {
  return `${from}>${to}`
}

/** The threads of a point: every link inward through the goals above it, and outward to everything below it. */
export function goalThreadsFor(notes: Note[], id: string, rings: GoalRing[] = BUILT_IN_RINGS): Set<string> {
  const byId = new Map(notes.map((note) => [note.id, note]))
  const found = new Set<string>()

  const seenUp = new Set([id])
  const up = [id]
  while (up.length > 0) {
    const current = byId.get(up.shift()!)
    if (!current) continue
    for (const link of goalLinks(current, byId, rings)) {
      found.add(goalThreadId(current.id, link))
      if (link !== "mission" && !seenUp.has(link)) {
        seenUp.add(link)
        up.push(link)
      }
    }
  }

  const seenDown = new Set([id])
  const down = [id]
  while (down.length > 0) {
    const parent = down.shift()!
    for (const note of notes) {
      if (!goalLinks(note, byId, rings).includes(parent)) continue
      found.add(goalThreadId(note.id, parent))
      if (!seenDown.has(note.id)) {
        seenDown.add(note.id)
        down.push(note.id)
      }
    }
  }
  return found
}

/** The shortest chain from a point to the mission: the card, each goal on the way, then the mission. */
export type GoalChain = {
  /** The cards of the shortest path, starting with the selected point. Only the point itself when no path exists. */
  steps: Note[]
  /** True when a path to the mission exists. */
  reachesMission: boolean
}

export function goalChainFor(notes: Note[], id: string, rings: GoalRing[] = BUILT_IN_RINGS): GoalChain | null {
  const byId = new Map(notes.map((note) => [note.id, note]))
  const start = byId.get(id)
  if (!start || goalRingOf(start, rings) < 0) return null

  const cameFrom = new Map<string, string>()
  const seen = new Set([id])
  const queue = [id]
  while (queue.length > 0) {
    const current = byId.get(queue.shift()!)
    if (!current) continue
    for (const link of goalLinks(current, byId, rings)) {
      if (link === "mission") {
        const steps: Note[] = []
        for (let at: string | undefined = current.id; at !== undefined; at = cameFrom.get(at)) {
          const note = byId.get(at)
          if (note) steps.unshift(note)
        }
        return { steps, reachesMission: true }
      }
      if (seen.has(link)) continue
      seen.add(link)
      cameFrom.set(link, current.id)
      queue.push(link)
    }
  }
  return { steps: [start], reachesMission: false }
}

export const DEFAULT_GOAL_PLAN: GoalPlan = {
  ground: null,
  missionHelp: "",
  why: "",
  aim: null,
  oneResult: false,
  sign: "",
  reach: null,
  split: false,
  ownChoice: null,
}

/** The two levels that open the goal side panel. */
export const GOAL_PANEL_TAGS = ["life-goal", "project-goal"]

export function opensGoalPanel(note: Note) {
  return GOAL_PANEL_TAGS.includes(goalLevelOf(note) ?? "")
}

const TWO_RESULTS = /\s*;\s*|\s+[&+]\s+|\s+(?:and|plus|as well as)\s+/i

/** Splits a sentence where it joins two results. One part comes back when it holds a single result. */
export function splitGoalSentence(text: string): string[] {
  return text
    .split(TWO_RESULTS)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function looksLikeTwoResults(text: string) {
  return splitGoalSentence(text).length > 1
}

export type GoalCheck = { id: "written" | "one" | "checkable" | "scale"; label: string; passed: boolean }

export function goalChecks(text: string, plan: GoalPlan): GoalCheck[] {
  const written = text.trim().length > 0
  return [
    { id: "written", label: "Written", passed: written },
    { id: "one", label: "One result", passed: written && (!looksLikeTwoResults(text) || plan.oneResult) },
    { id: "checkable", label: "Result can be checked", passed: plan.sign.trim().length > 0 },
    { id: "scale", label: "Scale is realistic or it was split", passed: plan.reach === "now" || plan.split },
  ]
}

export type GoalMapPoint = { id: string; ring: number; angle: number; x: number; y: number }

/** A thread runs from a card (`from`) to one goal above it. `to` is that card's id, or "mission". */
export type GoalMapThread = { id: string; from: string; to: string; x1: number; y1: number; x2: number; y2: number }

const POINT_GAP = 78

/**
 * Places every card that has a level as a point on its ring, with a thread to the goal above it.
 * A card's saved angle wins; `drag` overrides one point while it is being dragged.
 */
export function layoutGoalMap(
  notes: Note[],
  center: IkigaiCenter,
  options: { scale?: number; pointSize?: number; rings?: GoalRing[]; drag?: { id: string; angle: number } | null } = {},
): { points: GoalMapPoint[]; threads: GoalMapThread[] } {
  const rings = options.rings ?? BUILT_IN_RINGS
  const edges = goalMapEdges(options.scale, rings)
  const drag = options.drag ?? null
  const pointGap = Math.max(POINT_GAP, (options.pointSize ?? GOAL_POINT_SIZE.initial) * 2.4)
  const byId = new Map(notes.map((note) => [note.id, note]))
  const angles = new Map<string, number>()

  for (let ring = 0; ring < rings.length; ring++) {
    const inRing = notes.filter((note) => goalRingOf(note, rings) === ring)
    const radius = goalRingRadius(edges, ring)
    if (ring === 0) {
      GOAL_RING_TAGS[0].forEach((tag, sector) => {
        const cards = inRing.filter((note) => goalLevelOf(note, rings) === tag)
        cards.forEach((note, k) => {
          const slot = goalSectorStart(sector) + ((k + 1) / (cards.length + 1)) * SECTOR
          const wanted = drag?.id === note.id ? drag.angle : (note.mapAngle ?? slot)
          angles.set(note.id, clampGoalAngle(tag, wanted))
        })
      })
      continue
    }
    const aboveAngles = (note: Note) =>
      goalLinks(note, byId, rings)
        .map((link) => angles.get(link))
        .filter((angle): angle is number => angle !== undefined)
    const loose = inRing.filter((note) => aboveAngles(note).length === 0)
    const wanted = inRing.map((note) => {
      const linked = aboveAngles(note)
      const above =
        linked.length > 0
          ? Math.atan2(
              linked.reduce((sum, angle) => sum + Math.sin(angle), 0),
              linked.reduce((sum, angle) => sum + Math.cos(angle), 0),
            )
          : undefined
      const slot = loose.indexOf(note)
      const fallback = above ?? -Math.PI / 2 + (2 * Math.PI * (slot + 0.5)) / Math.max(1, loose.length)
      return { note, angle: drag?.id === note.id ? drag.angle : (note.mapAngle ?? fallback) }
    })
    wanted.sort((a, b) => a.angle - b.angle)
    const gap = Math.min(pointGap / radius, (2 * Math.PI) / Math.max(1, wanted.length))
    wanted.forEach((entry, i) => {
      if (drag?.id === entry.note.id) {
        angles.set(entry.note.id, entry.angle)
        return
      }
      const previous = i > 0 ? angles.get(wanted[i - 1].note.id)! : -Infinity
      angles.set(entry.note.id, Math.max(entry.angle, previous + gap))
    })
  }

  const points: GoalMapPoint[] = []
  const at = new Map<string, GoalMapPoint>()
  for (const note of notes) {
    const ring = goalRingOf(note, rings)
    const angle = angles.get(note.id)
    if (ring < 0 || angle === undefined) continue
    const radius = goalRingRadius(edges, ring)
    const point = { id: note.id, ring, angle, x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) }
    points.push(point)
    at.set(note.id, point)
  }

  const threads: GoalMapThread[] = []
  for (const note of notes) {
    const from = at.get(note.id)
    if (!from) continue
    for (const link of goalLinks(note, byId, rings)) {
      const id = goalThreadId(note.id, link)
      if (link === "mission") {
        const dx = from.x - center.x
        const dy = from.y - center.y
        const scale = edges[0] / Math.hypot(dx, dy)
        threads.push({ id, from: note.id, to: link, x1: from.x, y1: from.y, x2: center.x + dx * scale, y2: center.y + dy * scale })
        continue
      }
      const to = at.get(link)
      if (to) threads.push({ id, from: note.id, to: link, x1: from.x, y1: from.y, x2: to.x, y2: to.y })
    }
  }
  return { points, threads }
}

/**
 * Spaces the points of every ring evenly along that ring, keeping their order.
 * The first ring spaces each level inside its own sector. Only the saved angle changes.
 */
export function spaceGoalPoints(
  notes: Note[],
  scale: number,
  pointSize?: number,
  rings: GoalRing[] = BUILT_IN_RINGS,
): Note[] {
  const { points } = layoutGoalMap(notes, { x: 0, y: 0 }, { scale, pointSize, rings })
  const angles = new Map<string, number>()
  for (let ring = 1; ring < rings.length; ring++) {
    const onRing = points.filter((point) => point.ring === ring).sort((a, b) => a.angle - b.angle)
    onRing.forEach((point, i) => {
      angles.set(point.id, goalAngle(onRing[0].angle + (2 * Math.PI * i) / onRing.length))
    })
  }
  return notes.map((note) => {
    const ring = goalRingOf(note, rings)
    if (ring < 0) return note
    if (ring === 0) return note.mapAngle == null ? note : { ...note, mapAngle: null }
    const angle = angles.get(note.id)
    return angle === undefined ? note : { ...note, mapAngle: angle }
  })
}

export const GROUP_MIN_SIZE = { width: 260, height: 220 }

const GROUP_SLOT = { width: 380, height: 470, gap: 30, columns: 4 }

export function groupTag(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32)
}

/** First grid slot that does not overlap an existing group area. */
export function nextGroupRect(groups: Zone[]): Zone {
  for (let i = 0; i < 200; i++) {
    const col = i % GROUP_SLOT.columns
    const row = Math.floor(i / GROUP_SLOT.columns)
    const rect = {
      left: col * (GROUP_SLOT.width + GROUP_SLOT.gap),
      top: row * (GROUP_SLOT.height + GROUP_SLOT.gap),
      width: GROUP_SLOT.width,
      height: GROUP_SLOT.height,
    }
    const taken = groups.some(
      (g) =>
        rect.left < g.left + g.width &&
        rect.left + rect.width > g.left &&
        rect.top < g.top + g.height &&
        rect.top + rect.height > g.top,
    )
    if (!taken) return rect
  }
  return { left: 0, top: 0, ...GROUP_SLOT }
}

const GROUP_NAMES = [
  "Fears and anxieties",
  "Dreams and goals",
  "Unfinished business",
  "Problems",
  "Obligations",
  "Ideas",
  "Questions",
  "People",
]

export const DEFAULT_GROUPS: Group[] = GROUP_NAMES.reduce<Group[]>((groups, name) => {
  const tag = groupTag(name)
  return [...groups, { id: tag, name, tag, ...nextGroupRect(groups) }]
}, [])

type Seed = Pick<Note, "id" | "text" | "color" | "x" | "y" | "rotation"> & Partial<Note>

const SEEDS: Seed[] = [
  { id: "n1", text: "Feel strong and healthy, with a half marathon to aim for", color: "sage", x: 60, y: 70, rotation: -2, labels: { area: "body", happiness: "health", budget: "investment" }, hashtags: ["health", "want"], mission: "keep", parentIds: ["mission"] },
  { id: "n2", text: "Renew passport before June", color: "butter", x: 960, y: 80, rotation: 1.5, labels: { area: "home", happiness: "safety" }, hashtags: ["must"] },
  { id: "n3", text: "Am I saving enough for later?", color: "sky", x: 720, y: 820, rotation: -1 },
  { id: "n4", text: "Stay close to Mom", color: "rose", x: 380, y: 300, rotation: 2.5, labels: { area: "relationships", happiness: "love" }, hashtags: ["family", "want"], mission: "keep" },
  { id: "n5", text: "Learn to bake sourdough", color: "peach", x: 120, y: 860, rotation: 1, hashtags: ["love", "good-at"], mission: "release" },
  {
    id: "n6",
    text: "Fix the leaking kitchen tap",
    color: "butter",
    x: 1280,
    y: 340,
    rotation: -1.5,
    hashtags: ["must"],
    labels: { area: "home", budget: "expense" },
    task: { title: "Replace kitchen tap washer", labelId: "home", due: "2026-10-18", owner: "Me" },
  },
  { id: "n7", text: "Quarterly tax filing", color: "paper", x: 1320, y: 840, rotation: 2, hashtags: ["income"] },
  { id: "n8", text: "Tired most afternoons", color: "lilac", x: 420, y: 860, rotation: -2.5, mission: "keep" },
  { id: "n9", text: "Write an onboarding guide for the new tool", color: "sky", x: 1020, y: 830, rotation: 1, labels: { area: "work" }, hashtags: ["work", "income", "needed"] },
  { id: "n10", text: "A slow week by the sea", color: "sage", x: 720, y: 140, rotation: -1, hashtags: ["love"], mission: "keep" },
  { id: "n11", text: "Reply to every unread group chat", color: "peach", x: 740, y: 470, rotation: 1.5, mission: "release" },
  { id: "n12", text: "Stay fit and strong for life", color: "sage", x: 1620, y: 90, rotation: -1, hashtags: ["life-goal", "fitness"], parentIds: ["n1"], mission: "keep" },
  { id: "n13", text: "Train for the half marathon", color: "sage", x: 1620, y: 330, rotation: 1.5, hashtags: ["project-goal", "marathon"], parentIds: ["n12"], mission: "keep" },
  { id: "n14", text: "Choose and register for a race", color: "sky", x: 1620, y: 570, rotation: -1.5, hashtags: ["project-goal", "marathon"], parentIds: ["n12"], mission: "keep" },
  { id: "n15", text: "Spend more time with Mom", color: "rose", x: 1620, y: 810, rotation: 1, hashtags: ["project-goal", "family-time"], parentIds: ["n4"], mission: "keep" },
]

const SAMPLE_GROUP_AREAS = groupAreas(DEFAULT_GROUPS)
const SAMPLE_GROUP_TAGS = DEFAULT_GROUPS.map((g) => g.tag)

/** Sample cards that sit inside a starting group area carry that group's hashtag, so counts match what is on screen. */
export const SAMPLE_NOTES: Note[] = SEEDS.map((seed, index) => {
  const note: Note = {
    hashtags: [],
    mission: null,
    labels: {},
    task: null,
    z: index + 1,
    ...seed,
  }
  const group = areaTagAt(SAMPLE_GROUP_AREAS, note.x + CARD_WIDTH / 2, note.y + CARD_MIN_HEIGHT / 2)
  return retag(note, SAMPLE_GROUP_TAGS, group)
})
