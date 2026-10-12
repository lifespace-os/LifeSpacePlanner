import { goalLinks, goalRingOf, type GoalRing, type Note } from "@/lib/board-data"

/** The id a card's goal-above list uses for the mission. */
export const MISSION_LINK = "mission"

/**
 * Why a card cannot take this goal above, or null when the link is allowed.
 * The Graph and the free boards share it, so a line means the same thing everywhere.
 */
export function cardLinkIssue(fromId: string, toId: string, byId: Map<string, Note>, rings: GoalRing[]): string | null {
  const from = byId.get(fromId)
  if (!from) return "That card is gone."
  const fromRing = goalRingOf(from, rings)
  if (fromRing < 0) return "Give this card a ring hashtag first. Only a card on a ring has goals above."
  if (goalLinks(from, byId, rings).includes(toId)) return "That is already a goal above this card."
  if (toId === MISSION_LINK) return null
  const to = byId.get(toId)
  const toRing = to ? goalRingOf(to, rings) : -1
  if (toRing < 0) return "That card has no ring hashtag, so it cannot be a goal above."
  if (toRing >= fromRing) return "A goal above must sit on a ring closer to the center."
  return null
}
