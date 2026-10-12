import { freeEdges, goalLinks, goalRingOf, type GoalRing, type Note } from "@/lib/board-data"

/** The id a card's goal-above list uses for the mission. */
export const MISSION_LINK = "mission"

/** The two kinds of line. A goal above is a Map link; a free line only joins two things. */
export type LinkKind = "goal" | "free"

/**
 * Why a card cannot take this goal above, or null when the link is allowed.
 * The Graph and the free boards share it, so a line means the same thing everywhere.
 */
export function cardLinkIssue(fromId: string, toId: string, byId: Map<string, Note>, rings: GoalRing[]): string | null {
  const from = byId.get(fromId)
  if (!from) return "That card is gone."
  if (goalLinks(from, byId, rings).includes(toId)) return "That is already a goal above this card."
  if (toId === MISSION_LINK) return goalRingOf(from, rings) >= 0 ? null : GOAL_RULE
  const to = byId.get(toId)
  if (!to) return "That card is gone."
  if (goalRingOf(from, rings) < 0 || goalRingOf(to, rings) >= goalRingOf(from, rings) || goalRingOf(to, rings) < 0) return GOAL_RULE
  return null
}

const GOAL_RULE = "A goal above is the mission or a card on a ring closer to the center. Use the other handle to join any two cards."

/** Why two things cannot be joined by a free line, or null when they can. */
export function freeLinkIssue(fromId: string, toId: string, byId: Map<string, Note>, rings: GoalRing[]): string | null {
  const from = byId.get(fromId)
  if (!from) return "That card is gone."
  if (fromId === toId) return "A card cannot be joined to itself."
  if (toId !== MISSION_LINK && !byId.has(toId)) return "That card is gone."
  const joined = freeEdges([...byId.values()]).some(
    (edge) => (edge.fromId === fromId && edge.toId === toId) || (edge.fromId === toId && edge.toId === fromId),
  )
  if (joined) return "Those two are already joined."
  const goal =
    goalLinks(from, byId, rings).includes(toId) || (toId !== MISSION_LINK && goalLinks(byId.get(toId)!, byId, rings).includes(fromId))
  if (goal) return "Those two are already joined by a goal above."
  return null
}

/** The issue for either kind of line. */
export function linkIssueFor(kind: LinkKind, fromId: string, toId: string, byId: Map<string, Note>, rings: GoalRing[]) {
  return kind === "free" ? freeLinkIssue(fromId, toId, byId, rings) : cardLinkIssue(fromId, toId, byId, rings)
}
