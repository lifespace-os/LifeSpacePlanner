export type Mode = "unload" | "sort" | "mission" | "labels" | "task"

export type NoteKind = "wish" | "worry" | "obligation" | "task"

export type Bucket = "want" | "must" | null

export type MissionChoice = "keep" | "release" | null

export type LabelGroupId = "area" | "happiness" | "budget"

export type TaskDetails = {
  title: string
  labelId: string | null
  due: string
  owner: string
}

export type Note = {
  id: string
  text: string
  kind: NoteKind
  /** Top-left position as a fraction of the board size (0–1). */
  x: number
  y: number
  rotation: number
  z: number
  bucket: Bucket
  mission: MissionChoice
  labels: Partial<Record<LabelGroupId, string>>
  task: TaskDetails | null
}

export const MODES: { id: Mode; name: string; hint: string }[] = [
  { id: "unload", name: "Unload", hint: "Get it out of your head. Write a note and drop it anywhere." },
  { id: "sort", name: "Want / Must", hint: "Drag notes into Want or Must. A note can stay outside both." },
  { id: "mission", name: "Mission", hint: "Read the mission, then mark each note Keep or Release." },
  { id: "labels", name: "Labels", hint: "Select a note, then answer the three questions in the panel." },
  { id: "task", name: "Make a task", hint: "Select a note and turn it into a task. One note, one task." },
]

export const MISSION = "I build clear systems that help people live more calmly."

export const KIND_LABEL: Record<NoteKind, string> = {
  wish: "Wish",
  worry: "Worry",
  obligation: "Obligation",
  task: "Task",
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

/** Want and Must zones, as fractions of the board. */
export const ZONES: Record<Exclude<Bucket, null>, { left: number; top: number; width: number; height: number }> = {
  want: { left: 0.025, top: 0.05, width: 0.4, height: 0.6 },
  must: { left: 0.575, top: 0.05, width: 0.4, height: 0.6 },
}

export function bucketAt(cx: number, cy: number): Bucket {
  for (const id of ["want", "must"] as const) {
    const z = ZONES[id]
    if (cx >= z.left && cx <= z.left + z.width && cy >= z.top && cy <= z.top + z.height) return id
  }
  return null
}

export const SAMPLE_NOTES: Note[] = [
  {
    id: "n1",
    text: "Run a half marathon next spring",
    kind: "wish",
    x: 0.05,
    y: 0.1,
    rotation: -2,
    z: 1,
    bucket: "want",
    mission: "keep",
    labels: { area: "body", happiness: "health", budget: "investment" },
    task: null,
  },
  {
    id: "n2",
    text: "Renew passport before June",
    kind: "obligation",
    x: 0.62,
    y: 0.12,
    rotation: 1.5,
    z: 2,
    bucket: "must",
    mission: null,
    labels: { area: "home", happiness: "safety" },
    task: null,
  },
  {
    id: "n3",
    text: "Am I saving enough for later?",
    kind: "worry",
    x: 0.44,
    y: 0.7,
    rotation: -1,
    z: 3,
    bucket: null,
    mission: null,
    labels: {},
    task: null,
  },
  {
    id: "n4",
    text: "Call Mom on Sunday",
    kind: "task",
    x: 0.24,
    y: 0.36,
    rotation: 2.5,
    z: 4,
    bucket: "want",
    mission: "keep",
    labels: { area: "relationships", happiness: "love" },
    task: null,
  },
  {
    id: "n5",
    text: "Learn to bake sourdough",
    kind: "wish",
    x: 0.08,
    y: 0.74,
    rotation: 1,
    z: 5,
    bucket: null,
    mission: null,
    labels: {},
    task: null,
  },
  {
    id: "n6",
    text: "Fix the leaking kitchen tap",
    kind: "task",
    x: 0.78,
    y: 0.38,
    rotation: -1.5,
    z: 6,
    bucket: "must",
    mission: "keep",
    labels: { area: "home", budget: "expense" },
    task: { title: "Replace kitchen tap washer", labelId: "home", due: "2026-10-18", owner: "Me" },
  },
  {
    id: "n7",
    text: "Quarterly tax filing",
    kind: "obligation",
    x: 0.8,
    y: 0.72,
    rotation: 2,
    z: 7,
    bucket: null,
    mission: null,
    labels: {},
    task: null,
  },
  {
    id: "n8",
    text: "Tired most afternoons",
    kind: "worry",
    x: 0.27,
    y: 0.72,
    rotation: -2.5,
    z: 8,
    bucket: null,
    mission: null,
    labels: {},
    task: null,
  },
  {
    id: "n9",
    text: "Write an onboarding guide for the new tool",
    kind: "task",
    x: 0.6,
    y: 0.72,
    rotation: 1,
    z: 9,
    bucket: null,
    mission: null,
    labels: { area: "work" },
    task: null,
  },
  {
    id: "n10",
    text: "A slow week by the sea",
    kind: "wish",
    x: 0.44,
    y: 0.14,
    rotation: -1,
    z: 10,
    bucket: null,
    mission: null,
    labels: {},
    task: null,
  },
  {
    id: "n11",
    text: "Reply to every unread group chat",
    kind: "obligation",
    x: 0.44,
    y: 0.42,
    rotation: 1.5,
    z: 11,
    bucket: null,
    mission: "release",
    labels: {},
    task: null,
  },
]
