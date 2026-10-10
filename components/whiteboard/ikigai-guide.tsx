import clsx from "clsx"
import { X } from "lucide-react"
import { IKIGAI_MOVES, IKIGAI_STEPS, countTag, type IkigaiItem, type Note } from "@/lib/board-data"

type Props = {
  notes: Note[]
  activeId: string | null
  hoverId: string | null
  onPick: (id: string) => void
  onClose: () => void
}

function StepButton({
  item,
  number,
  count,
  active,
  hovered,
  onPick,
}: {
  item: IkigaiItem
  number: number
  count: number
  active: boolean
  hovered: boolean
  onPick: (id: string) => void
}) {
  return (
    <li>
      <button
        type="button"
        data-ikigai-item={item.id}
        aria-pressed={active}
        onClick={() => onPick(item.id)}
        className={clsx(
          "flex w-full items-center gap-3 rounded-xl border-2 px-2.5 py-1.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          active
            ? "border-accent bg-accent-soft"
            : hovered
              ? "border-dashed border-accent bg-accent-soft/60"
              : "border-transparent hover:bg-desk",
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            "flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-medium tabular-nums",
            active ? "bg-accent text-board" : "bg-ink text-board",
          )}
        >
          {number}
        </span>
        <span className="min-w-0 flex-1 text-sm leading-snug font-medium text-pretty text-ink">
          <span className="sr-only">Step {number}: </span>
          {item.name}
        </span>
        <span className="shrink-0 text-xs text-ink-soft tabular-nums">
          {count}
          <span className="sr-only"> {count === 1 ? "card" : "cards"}</span>
        </span>
      </button>
    </li>
  )
}

/** Steps 1 to 12 in a window on the left edge. Same shape as the details window on the right. */
export function IkigaiStepsWindow({ notes, activeId, hoverId, onPick, onClose }: Props) {
  return (
    <aside
      aria-label="Ikigai steps"
      className="pointer-events-auto flex max-h-full w-80 shrink-0 flex-col rounded-2xl border border-line bg-card shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)]"
    >
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.18em] text-ink-soft uppercase">Ikigai</p>
          <h2 className="mt-1 font-serif text-2xl leading-tight font-medium text-balance">Steps</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide steps window"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto border-t border-line px-2 py-2">
        <ol className="flex flex-col gap-0.5">
          {IKIGAI_STEPS.map((item) => (
            <StepButton
              key={item.id}
              item={item}
              number={item.step ?? 0}
              count={countTag(notes, item.tag)}
              active={item.id === activeId}
              hovered={item.id === hoverId}
              onPick={onPick}
            />
          ))}
        </ol>

        <h3 className="px-3 pt-4 pb-1 text-xs font-medium tracking-[0.16em] text-ink-soft uppercase">
          Move toward the center
        </h3>
        <ol start={IKIGAI_STEPS.length + 1} className="flex flex-col gap-0.5">
          {IKIGAI_MOVES.map((item, index) => (
            <StepButton
              key={item.id}
              item={item}
              number={IKIGAI_STEPS.length + 1 + index}
              count={countTag(notes, item.tag)}
              active={item.id === activeId}
              hovered={item.id === hoverId}
              onPick={onPick}
            />
          ))}
        </ol>
      </div>
    </aside>
  )
}
