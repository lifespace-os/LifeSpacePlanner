import type { CardLabelSet } from "@/lib/board-data"
import { LABEL_SET_NAMES } from "@/lib/board-data"
import { SetShape } from "./label-chip"

/** The only label marks on the face of a card: one shape per set, with the hashtags of the set beside it. */
export function CardLabelSets({ sets }: { sets: CardLabelSet[] }) {
  if (sets.length === 0) return null
  return (
    <ul className="flex flex-col gap-1 px-4 pb-2.5 text-[11px] leading-4 font-medium text-current">
      {sets.map((set) => (
        <li key={set.id} className="flex items-start gap-1.5">
          <span className="mt-[3px] flex h-2.5 items-center">
            <SetShape shape={set.shape} color={set.color} />
          </span>
          <span className="sr-only">{LABEL_SET_NAMES[set.id]}:</span>
          <span className="min-w-0 break-words">
            {set.tags.map((tag) => `#${tag}`).join(" ")}
          </span>
        </li>
      ))}
    </ul>
  )
}
