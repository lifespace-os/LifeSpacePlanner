import clsx from "clsx"
import { ArrowUp } from "lucide-react"
import { IKIGAI_MOVES, IKIGAI_RECT, IKIGAI_STEPS, countTag, type IkigaiItem, type Note } from "@/lib/board-data"

const STEPS_WIDTH = 340
const STEPS_GAP = 40

type Props = {
  notes: Note[]
  activeId: string | null
  hoverId: string | null
  onPick: (id: string) => void
}

function countText(count: number) {
  return `${count} ${count === 1 ? "card" : "cards"}`
}

function subline(item: IkigaiItem, notes: Note[]) {
  return `#${item.tag} · ${countText(countTag(notes, item.tag))}`
}

/** Steps 1 to 8, beside the circles. They sit on the canvas, so they pan and zoom with it. */
export function IkigaiSteps({ notes, activeId, hoverId, onPick }: Props) {
  return (
    <section
      data-zone=""
      aria-label="Ikigai steps"
      className="absolute z-[5001] rounded-3xl border-2 border-line bg-card/95 p-5 shadow-[0_18px_36px_-16px_rgba(35,39,43,0.4)]"
      style={{ left: IKIGAI_RECT.left - STEPS_GAP - STEPS_WIDTH, top: IKIGAI_RECT.top + 40, width: STEPS_WIDTH }}
    >
      <h2 className="px-1 text-[20px] font-medium tracking-[0.16em] text-ink-soft uppercase">Steps</h2>
      <ol className="mt-3 flex flex-col gap-1.5">
        {IKIGAI_STEPS.map((item) => {
          const active = item.id === activeId
          return (
            <li key={item.id}>
              <button
                type="button"
                data-board-control=""
                data-ikigai-item={item.id}
                aria-pressed={active}
                onClick={() => onPick(item.id)}
                className={clsx(
                  "flex w-full items-center gap-4 rounded-2xl border-2 px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  active
                    ? "border-accent bg-accent-soft"
                    : hoverId === item.id
                      ? "border-dashed border-accent bg-accent-soft/60"
                      : "border-transparent hover:bg-desk",
                )}
              >
                <span
                  className={clsx(
                    "flex size-10 shrink-0 items-center justify-center rounded-full text-[20px] font-medium tabular-nums",
                    active ? "bg-accent text-board" : "bg-ink text-board",
                  )}
                >
                  {item.step}
                </span>
                <span className="min-w-0">
                  <span className="block text-[23px] leading-tight font-medium text-ink">{item.name}</span>
                  <span className="block text-[18px] leading-snug text-ink-soft tabular-nums">{subline(item, notes)}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/** Four moves toward the center, in a row below the circles. */
export function IkigaiMoves({ notes, activeId, hoverId, onPick }: Props) {
  return (
    <section
      data-zone=""
      aria-label="Moves toward the center"
      className="absolute z-[5001]"
      style={{ left: IKIGAI_RECT.left, top: IKIGAI_RECT.top + IKIGAI_RECT.size + 28, width: IKIGAI_RECT.size }}
    >
      <h2 className="px-1 text-[20px] font-medium tracking-[0.16em] text-ink-soft uppercase">Moves toward the center</h2>
      <ul className="mt-3 grid grid-cols-4 gap-4">
        {IKIGAI_MOVES.map((item) => {
          const active = item.id === activeId
          return (
            <li key={item.id} className="flex">
              <button
                type="button"
                data-board-control=""
                data-ikigai-item={item.id}
                aria-pressed={active}
                onClick={() => onPick(item.id)}
                className={clsx(
                  "flex w-full flex-col items-start gap-2 rounded-2xl border-2 bg-card/95 p-4 text-left shadow-[0_10px_24px_-14px_rgba(35,39,43,0.4)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  active
                    ? "border-accent bg-accent-soft"
                    : hoverId === item.id
                      ? "border-dashed border-accent bg-accent-soft/60"
                      : "border-line hover:bg-desk",
                )}
              >
                <ArrowUp className={clsx("size-7", active ? "text-accent" : "text-ink-soft")} aria-hidden="true" />
                <span className="text-[21px] leading-tight font-medium text-balance text-ink">{item.name}</span>
                <span className="text-[18px] leading-snug text-ink-soft tabular-nums">{subline(item, notes)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
