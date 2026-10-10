export type Mode = "unload" | "sort" | "mission" | "labels" | "task"

export type Bucket = "want" | "must" | null

export type MissionChoice = "keep" | "release" | null

export type LabelGroupId = "area" | "happiness" | "budget"

export type TaskDetails = {
  title: string
  labelId: string | null
  due: string
  owner: string
}

export type CardColorId = "butter" | "peach" | "rose" | "sage" | "sky" | "lilac" | "paper"

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
  bucket: Bucket
  mission: MissionChoice
  labels: Partial<Record<LabelGroupId, string>>
  task: TaskDetails | null
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
  { id: "sort", name: "Want / Must", hint: "Drag cards into Want or Must. A card can stay outside both." },
  { id: "mission", name: "Mission", hint: "Read the mission, then mark each card Keep or Release." },
  { id: "labels", name: "Labels", hint: "Select a card, then answer the three questions in the panel." },
  { id: "task", name: "Make a task", hint: "Select a card and turn it into a task. One card, one task." },
]

export const MISSION = "I build clear systems that help people live more calmly."

export const CARD_COLORS: { id: CardColorId; name: string; fill: string; edge: string }[] = [
  { id: "butter", name: "Butter", fill: "#f7e8a4", edge: "#e6d27c" },
  { id: "peach", name: "Peach", fill: "#f6d4bd", edge: "#e8b896" },
  { id: "rose", name: "Rose", fill: "#f3cdd1", edge: "#e2aab1" },
  { id: "sage", name: "Sage", fill: "#d6e5c9", edge: "#b9cfa6" },
  { id: "sky", name: "Sky", fill: "#d1e2ec", edge: "#acc8d8" },
  { id: "lilac", name: "Lilac", fill: "#e0d6ec", edge: "#c6b6db" },
  { id: "paper", name: "Paper", fill: "#fffdf8", edge: "#ddd3c2" },
]

const COLOR_INDEX = new Map(CARD_COLORS.map((color) => [color.id, color]))

export function getCardColor(id: CardColorId) {
  return COLOR_INDEX.get(id) ?? CARD_COLORS[0]
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

/** Want and Must zones, in canvas pixels. */
export const ZONES: Record<Exclude<Bucket, null>, { left: number; top: number; width: number; height: number }> = {
  want: { left: 0, top: 0, width: 760, height: 640 },
  must: { left: 900, top: 0, width: 760, height: 640 },
}

export function bucketAt(cx: number, cy: number): Bucket {
  for (const id of ["want", "must"] as const) {
    const z = ZONES[id]
    if (cx >= z.left && cx <= z.left + z.width && cy >= z.top && cy <= z.top + z.height) return id
  }
  return null
}

type Seed = Pick<Note, "id" | "text" | "color" | "x" | "y" | "rotation"> & Partial<Note>

const SEEDS: Seed[] = [
  { id: "n1", text: "Run a half marathon next spring", color: "sage", x: 60, y: 70, rotation: -2, bucket: "want", mission: "keep", labels: { area: "body", happiness: "health", budget: "investment" }, hashtags: ["health"] },
  { id: "n2", text: "Renew passport before June", color: "butter", x: 960, y: 80, rotation: 1.5, bucket: "must", labels: { area: "home", happiness: "safety" } },
  { id: "n3", text: "Am I saving enough for later?", color: "sky", x: 720, y: 820, rotation: -1 },
  { id: "n4", text: "Call Mom on Sunday", color: "rose", x: 380, y: 300, rotation: 2.5, bucket: "want", mission: "keep", labels: { area: "relationships", happiness: "love" }, hashtags: ["family"] },
  { id: "n5", text: "Learn to bake sourdough", color: "peach", x: 120, y: 860, rotation: 1 },
  {
    id: "n6",
    text: "Fix the leaking kitchen tap",
    color: "butter",
    x: 1280,
    y: 340,
    rotation: -1.5,
    bucket: "must",
    mission: "keep",
    labels: { area: "home", budget: "expense" },
    task: { title: "Replace kitchen tap washer", labelId: "home", due: "2026-10-18", owner: "Me" },
  },
  { id: "n7", text: "Quarterly tax filing", color: "paper", x: 1320, y: 840, rotation: 2 },
  { id: "n8", text: "Tired most afternoons", color: "lilac", x: 420, y: 860, rotation: -2.5 },
  { id: "n9", text: "Write an onboarding guide for the new tool", color: "sky", x: 1020, y: 830, rotation: 1, labels: { area: "work" }, hashtags: ["work"] },
  { id: "n10", text: "A slow week by the sea", color: "sage", x: 720, y: 140, rotation: -1 },
  { id: "n11", text: "Reply to every unread group chat", color: "peach", x: 740, y: 470, rotation: 1.5, mission: "release" },
]

export const SAMPLE_NOTES: Note[] = SEEDS.map((seed, index) => ({
  hashtags: [],
  bucket: null,
  mission: null,
  labels: {},
  task: null,
  z: index + 1,
  ...seed,
}))
