import { CARD_MIN_HEIGHT, normalizeHashtag, type GoalRing, type IkigaiCircleId, type Note } from "@/lib/board-data"
import { KANBAN_BOARDS, type KanbanCard, type KanbanColumn, type KanbanBoardId } from "@/lib/kanban-data"
import { newId } from "@/lib/workspace"

/** A whiteboard card is a "note". A kanban card is a "task". */
export type CardRef = { kind: "note" | "task"; id: string }

export type ColumnsByBoard = Record<KanbanBoardId, KanbanColumn[]>

export type Hit = {
  ref: CardRef
  text: string
  tags: string[]
  /** "Whiteboard", or the board and column of the task. */
  place: string
}

export type Detail = Hit & {
  /** The card is joined to the mission, by a free line or by its goal line. */
  mission: boolean
  linked: Hit[]
}

export type Change =
  | { ok: true; notes: Note[]; cards: KanbanCard[]; message: string; ref: CardRef }
  | { ok: false; message: string }

export const CIRCLE_NAMES: Record<IkigaiCircleId, string> = {
  love: "Love",
  "good-at": "Good at",
  income: "Income",
  needed: "Needed",
}

export const SEARCH_LIMIT = 50

function noteText(note: Note) {
  return note.text.trim() || note.details?.title?.trim() || note.task?.title?.trim() || ""
}

function placeOfTask(card: KanbanCard, columns: ColumnsByBoard) {
  const board = KANBAN_BOARDS.find((item) => item.id === card.boardId)?.name ?? "Kanban"
  const column = columns[card.boardId]?.find((item) => item.id === card.columnId)?.name
  return column ? `${board} · ${column}` : board
}

function noteHit(note: Note): Hit {
  return { ref: { kind: "note", id: note.id }, text: noteText(note) || "Blank card", tags: note.hashtags, place: "Whiteboard" }
}

function taskHit(card: KanbanCard, columns: ColumnsByBoard): Hit {
  return { ref: { kind: "task", id: card.id }, text: card.title, tags: card.hashtags ?? [], place: placeOfTask(card, columns) }
}

function matches(text: string, tags: string[], tokens: string[]) {
  const lowerText = text.toLowerCase()
  const lowerTags = tags.map((tag) => tag.toLowerCase())
  return tokens.every((token) => {
    if (token.startsWith("#")) {
      const tag = normalizeHashtag(token).toLowerCase()
      return tag ? lowerTags.some((item) => item.startsWith(tag)) : lowerTags.length > 0
    }
    return lowerText.includes(token) || lowerTags.some((item) => item.includes(token))
  })
}

/** Whiteboard cards, then tasks, whose text or hashtag holds every word typed. A "#" word matches hashtags only. */
export function searchCards(query: string, notes: Note[], cards: KanbanCard[], columns: ColumnsByBoard): Hit[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return []
  const found: Hit[] = []
  for (const note of notes) {
    if (matches(noteText(note), note.hashtags, tokens)) found.push(noteHit(note))
  }
  for (const card of cards) {
    if (matches(card.title, card.hashtags ?? [], tokens)) found.push(taskHit(card, columns))
  }
  return found
}

function hitOf(ref: CardRef, notes: Note[], cards: KanbanCard[], columns: ColumnsByBoard): Hit | null {
  if (ref.kind === "note") {
    const note = notes.find((item) => item.id === ref.id)
    return note ? noteHit(note) : null
  }
  const card = cards.find((item) => item.id === ref.id)
  return card ? taskHit(card, columns) : null
}

function hitOfId(id: string, notes: Note[], cards: KanbanCard[], columns: ColumnsByBoard): Hit | null {
  return hitOf({ kind: "note", id }, notes, cards, columns) ?? hitOf({ kind: "task", id }, notes, cards, columns)
}

function freeIdsOf(ref: CardRef, notes: Note[], cards: KanbanCard[]): string[] {
  if (ref.kind === "note") return notes.find((item) => item.id === ref.id)?.freeIds ?? []
  return cards.find((item) => item.id === ref.id)?.freeIds ?? []
}

/** The chosen card with its hashtags and every card joined to it by a free line, in either direction. */
export function describeCard(ref: CardRef, notes: Note[], cards: KanbanCard[], columns: ColumnsByBoard): Detail | null {
  const hit = hitOf(ref, notes, cards, columns)
  if (!hit) return null
  const incoming = [
    ...notes.filter((item) => item.id !== ref.id && (item.freeIds ?? []).includes(ref.id)).map((item) => item.id),
    ...cards.filter((item) => item.id !== ref.id && (item.freeIds ?? []).includes(ref.id)).map((item) => item.id),
  ]
  const ids = [...new Set([...freeIdsOf(ref, notes, cards), ...incoming])].filter((id) => id !== "mission" && id !== ref.id)
  const linked = ids.flatMap((id) => {
    const found = hitOfId(id, notes, cards, columns)
    return found ? [found] : []
  })
  return { ...hit, mission: isOnMission(ref, notes, cards), linked }
}

function isOnMission(ref: CardRef, notes: Note[], cards: KanbanCard[]) {
  if (ref.kind === "note") {
    const note = notes.find((item) => item.id === ref.id)
    return Boolean(note && ((note.freeIds ?? []).includes("mission") || (note.parentIds ?? []).includes("mission")))
  }
  const card = cards.find((item) => item.id === ref.id)
  return Boolean(card && (card.missionLink || card.secondLine))
}

function changeCard(
  notes: Note[],
  cards: KanbanCard[],
  ref: CardRef,
  onNote: (note: Note) => Note,
  onTask: (card: KanbanCard) => KanbanCard,
) {
  return {
    notes: ref.kind === "note" ? notes.map((item) => (item.id === ref.id ? onNote(item) : item)) : notes,
    cards: ref.kind === "task" ? cards.map((item) => (item.id === ref.id ? onTask(item) : item)) : cards,
  }
}

function addTag(notes: Note[], cards: KanbanCard[], ref: CardRef, tag: string, message: string): Change {
  const has = (tags: string[]) => tags.some((item) => item.toLowerCase() === tag.toLowerCase())
  const current = ref.kind === "note" ? notes.find((item) => item.id === ref.id)?.hashtags : cards.find((item) => item.id === ref.id)?.hashtags ?? []
  if (!current) return { ok: false, message: "That card is gone." }
  if (has(current)) return { ok: true, notes, cards, ref, message: `Already has #${tag}.` }
  const next = changeCard(
    notes,
    cards,
    ref,
    (note) => ({ ...note, hashtags: [...note.hashtags, tag] }),
    (card) => ({ ...card, hashtags: [...(card.hashtags ?? []), tag] }),
  )
  return { ok: true, ...next, ref, message }
}

/** Adds a hashtag. A hashtag that places a card on a goal-map ring is refused: rings are set on the Whiteboard. */
export function addHashtag(notes: Note[], cards: KanbanCard[], ref: CardRef, raw: string, rings: GoalRing[]): Change {
  const tag = normalizeHashtag(raw)
  if (!tag) return { ok: false, message: "Write a hashtag first." }
  const ringTags = new Set(rings.flatMap((ring) => ring.tags.map((item) => item.toLowerCase())))
  if (ringTags.has(tag.toLowerCase())) {
    return { ok: false, message: `#${tag} places a card on a goal-map ring. Set rings on the Whiteboard.` }
  }
  return addTag(notes, cards, ref, tag, `Added #${tag}.`)
}

/** Links a card to an Ikigai circle. The circle's hashtag is its membership. */
export function linkCircle(notes: Note[], cards: KanbanCard[], ref: CardRef, circle: IkigaiCircleId): Change {
  return addTag(notes, cards, ref, circle, `Linked to ${CIRCLE_NAMES[circle]}.`)
}

/** A whiteboard card gets a free line to the mission. A task gets the second line. Neither sets a ring. */
export function linkMission(notes: Note[], cards: KanbanCard[], ref: CardRef): Change {
  if (isOnMission(ref, notes, cards)) return { ok: true, notes, cards, ref, message: "Already linked to the mission." }
  const next = changeCard(
    notes,
    cards,
    ref,
    (note) => ({ ...note, freeIds: [...(note.freeIds ?? []), "mission"] }),
    (card) => ({ ...card, secondLine: true }),
  )
  return { ok: true, ...next, ref, message: "Linked to the mission." }
}

/** A free line from the chosen card to another card, whiteboard or kanban. */
export function linkCard(notes: Note[], cards: KanbanCard[], ref: CardRef, target: CardRef): Change {
  if (ref.kind === target.kind && ref.id === target.id) return { ok: false, message: "A card cannot link to itself." }
  const already = freeIdsOf(ref, notes, cards).includes(target.id) || freeIdsOf(target, notes, cards).includes(ref.id)
  if (already) return { ok: true, notes, cards, ref, message: "Already linked." }
  const next = changeCard(
    notes,
    cards,
    ref,
    (note) => ({ ...note, freeIds: [...(note.freeIds ?? []), target.id] }),
    (card) => ({ ...card, freeIds: [...(card.freeIds ?? []), target.id] }),
  )
  return { ok: true, ...next, ref, message: "Linked." }
}

function rewire(ids: string[] | undefined, from: string, to: string) {
  if (!ids || !ids.includes(from)) return ids
  return [...new Set(ids.map((id) => (id === from ? to : id)))]
}

function rewireAll(notes: Note[], cards: KanbanCard[], from: string, to: string) {
  return {
    notes: notes.map((item) => {
      const freeIds = rewire(item.freeIds, from, to)
      return freeIds === item.freeIds ? item : { ...item, freeIds }
    }),
    cards: cards.map((item) => {
      const freeIds = rewire(item.freeIds, from, to)
      return freeIds === item.freeIds ? item : { ...item, freeIds }
    }),
  }
}

/**
 * Turns a whiteboard card into a task in the first to-do column of All work. The card leaves the whiteboard. Free lines
 * to it follow the task. A card that other cards hang under on the goal map cannot be turned.
 */
export function noteToTask(notes: Note[], cards: KanbanCard[], id: string, columns: KanbanColumn[]): Change {
  const note = notes.find((item) => item.id === id)
  if (!note) return { ok: false, message: "That card is gone." }
  const title = noteText(note)
  if (!title) return { ok: false, message: "Write on the card before making it a task." }
  const hangs = notes.some((item) => item.id !== id && (item.parentIds ?? []).includes(id)) || cards.some((item) => item.goalIds.includes(id))
  if (hangs) return { ok: false, message: "Other cards hang under this one on the goal map. Move them first." }
  const column = columns.find((item) => item.kind === "todo") ?? columns[0]
  if (!column) return { ok: false, message: "There is no column to put the task in." }

  const noteIds = new Set(notes.map((item) => item.id))
  const parents = note.parentIds ?? []
  const free = note.freeIds ?? []
  const taskId = newId("t")
  const details = note.details ?? note.task
  const task: KanbanCard = {
    id: taskId,
    boardId: "all",
    columnId: column.id,
    title,
    labelId: note.task?.labelId ?? null,
    since: details?.since ?? "",
    startTime: "",
    due: details?.due ?? "",
    endTime: "",
    owner: details?.owner ?? "",
    missionLink: parents.includes("mission"),
    secondLine: free.includes("mission"),
    goalIds: parents.filter((parent) => parent !== "mission" && noteIds.has(parent)),
    inResults: false,
    hashtags: [...note.hashtags],
    freeIds: [...new Set(free.filter((item) => item !== "mission" && item !== id))],
  }
  const rewired = rewireAll(
    notes.filter((item) => item.id !== id),
    cards,
    id,
    taskId,
  )
  return {
    ok: true,
    notes: rewired.notes,
    cards: [...rewired.cards, task],
    ref: { kind: "task", id: taskId },
    message: `Now a task in ${column.name}.`,
  }
}

/**
 * Turns a task back into a whiteboard card below the other cards. Its dates and owner are kept. Its steps, repeat rule,
 * times and column are dropped. Goal lines become plain free lines.
 */
export function taskToNote(notes: Note[], cards: KanbanCard[], id: string): Change {
  const card = cards.find((item) => item.id === id)
  if (!card) return { ok: false, message: "That task is gone." }
  const noteIds = new Set(notes.map((item) => item.id))
  const noteId = newId("card")
  const maxZ = notes.reduce((max, item) => Math.max(max, item.z), 0)
  const bottom = notes.reduce((max, item) => Math.max(max, item.y + CARD_MIN_HEIGHT), 0)
  const left = notes.length ? Math.min(...notes.map((item) => item.x)) : 0
  const lines = [
    ...(card.freeIds ?? []),
    ...card.goalIds.filter((goal) => noteIds.has(goal)),
    ...(card.missionLink || card.secondLine ? ["mission"] : []),
  ]
  const hasDetails = Boolean(card.since || card.due || card.owner)
  const note: Note = {
    id: noteId,
    text: card.title,
    color: "butter",
    hashtags: [...(card.hashtags ?? [])],
    x: left,
    y: bottom + 40,
    rotation: 0,
    z: maxZ + 1,
    mission: null,
    labels: {},
    task: null,
    details: hasDetails ? { title: card.title, since: card.since, due: card.due, owner: card.owner } : null,
    freeIds: [...new Set(lines.filter((item) => item !== id))],
  }
  const rewired = rewireAll(
    notes,
    cards.filter((item) => item.id !== id),
    id,
    noteId,
  )
  return {
    ok: true,
    notes: [...rewired.notes, note],
    cards: rewired.cards,
    ref: { kind: "note", id: noteId },
    message: "Now a whiteboard card, placed below the other cards.",
  }
}
