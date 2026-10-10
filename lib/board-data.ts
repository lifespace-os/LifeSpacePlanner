export type Mode = "unload" | "clusters" | "mission" | "goals" | "labels" | "task"

export type ClusterView = "wantmust" | "groups"

export type MissionView = "sentence" | "ikigai" | "markers"

export type GoalView = "needs" | "life" | "project" | "tasks" | "map"

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
  /** The goal above this card on the Map: a card id, "mission", or empty. */
  parentId?: string | null
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
  { id: "labels", name: "Labels", hint: "Select a card, then answer the three questions in the panel." },
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
export const GOAL_VIEW_LEVELS: Record<Exclude<GoalView, "map">, string[]> = {
  needs: ["need", "dream", "want"],
  life: ["life-goal"],
  project: ["project-goal"],
  tasks: ["task"],
}

export function getGoalLevel(tag: string | null | undefined) {
  return GOAL_LEVELS.find((level) => level.tag === tag) ?? null
}

/** The goal level a card carries, or null when it has none. */
export function goalLevelOf(note: Note): string | null {
  const found = note.hashtags.find((t) => GOAL_TAGS.includes(t.toLowerCase()))
  return found ? found.toLowerCase() : null
}

/** Map ring of a level, counted from the mission outward: 0 needs, dreams, wants; 1 life; 2 project; 3 tasks. */
export const GOAL_RING_TAGS: string[][] = [["need", "dream", "want"], ["life-goal"], ["project-goal"], ["task"]]

export const GOAL_RING_NAMES = ["Needs, dreams, and wants", "Life goals", "Project goals", "Tasks"]

export function goalRingOf(note: Note): number {
  const level = goalLevelOf(note)
  return level ? GOAL_RING_TAGS.findIndex((tags) => tags.includes(level)) : -1
}

/** Sets a card's level. A new level replaces the previous one; other hashtags stay. A link survives only on the same ring. */
export function setGoalLevel(note: Note, tag: string): Note {
  const ring = goalRingOf(note)
  const next = retag(note, GOAL_TAGS, tag)
  const nextRing = GOAL_RING_TAGS.findIndex((tags) => tags.includes(tag))
  return ring !== nextRing && next.parentId ? { ...next, parentId: null } : next
}

/** Radii of the Map in canvas pixels: the mission disc, then four rings that widen toward the outside. */
export const GOAL_MAP_EDGES = [170, 290, 440, 640, 900]

export const GOAL_MAP_RADIUS = GOAL_MAP_EDGES[GOAL_MAP_EDGES.length - 1]

export const GOAL_MAP_SIZE = GOAL_MAP_RADIUS * 2

const SECTOR = (2 * Math.PI) / 3

/** The first ring is cut into three equal sectors, starting at the top and running clockwise. */
export function goalSectorStart(index: number) {
  return -Math.PI / 2 + index * SECTOR
}

/** The level a canvas point stands for on the Map, or null over the mission or outside the rings. */
export function goalMapTagAt(x: number, y: number, center: IkigaiCenter): string | null {
  const dx = x - center.x
  const dy = y - center.y
  const distance = Math.hypot(dx, dy)
  if (distance < GOAL_MAP_EDGES[0] || distance > GOAL_MAP_RADIUS) return null
  const ring = GOAL_MAP_EDGES.findIndex((edge, i) => i > 0 && distance <= edge) - 1
  if (ring !== 0) return GOAL_RING_TAGS[ring][0]
  const turn = (((Math.atan2(dy, dx) + Math.PI / 2) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  return GOAL_RING_TAGS[0][Math.min(2, Math.floor(turn / SECTOR))]
}

/** What a card is linked to on the Map: a card id, "mission", or null. A link counts only when it is valid now. */
export function goalLink(note: Note, byId: Map<string, Note>): string | null {
  const ring = goalRingOf(note)
  if (ring < 0 || !note.parentId) return null
  if (note.parentId === "mission") return "mission"
  const parent = byId.get(note.parentId)
  return parent && ring > 0 && goalRingOf(parent) === ring - 1 ? parent.id : null
}

export type GoalMapPoint = { id: string; ring: number; angle: number; x: number; y: number }

export type GoalMapThread = { id: string; x1: number; y1: number; x2: number; y2: number }

const POINT_GAP = 78

/** Places every card that has a level as a point on its ring, with a thread to the goal above it. */
export function layoutGoalMap(notes: Note[], center: IkigaiCenter): { points: GoalMapPoint[]; threads: GoalMapThread[] } {
  const byId = new Map(notes.map((note) => [note.id, note]))
  const angles = new Map<string, number>()

  for (let ring = 0; ring < GOAL_RING_TAGS.length; ring++) {
    const inRing = notes.filter((note) => goalRingOf(note) === ring)
    const radius = ring === 0 ? GOAL_MAP_EDGES[1] - 36 : (GOAL_MAP_EDGES[ring] + GOAL_MAP_EDGES[ring + 1]) / 2
    if (ring === 0) {
      GOAL_RING_TAGS[0].forEach((tag, sector) => {
        const cards = inRing.filter((note) => goalLevelOf(note) === tag)
        cards.forEach((note, k) => angles.set(note.id, goalSectorStart(sector) + ((k + 1) / (cards.length + 1)) * SECTOR))
      })
      continue
    }
    const loose = inRing.filter((note) => !angles.has(goalLink(note, byId) ?? ""))
    const wanted = inRing.map((note) => {
      const link = goalLink(note, byId)
      const above = link && link !== "mission" ? angles.get(link) : undefined
      const slot = loose.indexOf(note)
      return { note, angle: above ?? -Math.PI / 2 + (2 * Math.PI * (slot + 0.5)) / Math.max(1, loose.length) }
    })
    wanted.sort((a, b) => a.angle - b.angle)
    const gap = Math.min(POINT_GAP / radius, (2 * Math.PI) / Math.max(1, wanted.length))
    wanted.forEach((entry, i) => {
      const previous = i > 0 ? angles.get(wanted[i - 1].note.id)! : -Infinity
      angles.set(entry.note.id, Math.max(entry.angle, previous + gap))
    })
  }

  const points: GoalMapPoint[] = []
  const at = new Map<string, GoalMapPoint>()
  for (const note of notes) {
    const ring = goalRingOf(note)
    const angle = angles.get(note.id)
    if (ring < 0 || angle === undefined) continue
    const radius = ring === 0 ? GOAL_MAP_EDGES[1] - 36 : (GOAL_MAP_EDGES[ring] + GOAL_MAP_EDGES[ring + 1]) / 2
    const point = { id: note.id, ring, angle, x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) }
    points.push(point)
    at.set(note.id, point)
  }

  const threads: GoalMapThread[] = []
  for (const note of notes) {
    const from = at.get(note.id)
    const link = goalLink(note, byId)
    if (!from || !link) continue
    if (link === "mission") {
      const dx = from.x - center.x
      const dy = from.y - center.y
      const scale = GOAL_MAP_EDGES[0] / Math.hypot(dx, dy)
      threads.push({ id: note.id, x1: from.x, y1: from.y, x2: center.x + dx * scale, y2: center.y + dy * scale })
      continue
    }
    const to = at.get(link)
    if (to) threads.push({ id: note.id, x1: from.x, y1: from.y, x2: to.x, y2: to.y })
  }
  return { points, threads }
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
  { id: "n1", text: "Run a half marathon next spring", color: "sage", x: 60, y: 70, rotation: -2, labels: { area: "body", happiness: "health", budget: "investment" }, hashtags: ["health", "want"] },
  { id: "n2", text: "Renew passport before June", color: "butter", x: 960, y: 80, rotation: 1.5, labels: { area: "home", happiness: "safety" }, hashtags: ["must"] },
  { id: "n3", text: "Am I saving enough for later?", color: "sky", x: 720, y: 820, rotation: -1 },
  { id: "n4", text: "Call Mom on Sunday", color: "rose", x: 380, y: 300, rotation: 2.5, labels: { area: "relationships", happiness: "love" }, hashtags: ["family", "want"] },
  { id: "n5", text: "Learn to bake sourdough", color: "peach", x: 120, y: 860, rotation: 1, hashtags: ["love", "good-at"] },
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
  { id: "n8", text: "Tired most afternoons", color: "lilac", x: 420, y: 860, rotation: -2.5 },
  { id: "n9", text: "Write an onboarding guide for the new tool", color: "sky", x: 1020, y: 830, rotation: 1, labels: { area: "work" }, hashtags: ["work", "income", "needed"] },
  { id: "n10", text: "A slow week by the sea", color: "sage", x: 720, y: 140, rotation: -1, hashtags: ["love"] },
  { id: "n11", text: "Reply to every unread group chat", color: "peach", x: 740, y: 470, rotation: 1.5 },
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
