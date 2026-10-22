import { percent, type Flow } from "@/lib/dashboard"

const COLUMN = 100
const BAR = 36
const HEIGHT = 120

/** The band diagram. The bands are drawn once; the words under them are a list, so a reader gets the same numbers. */
export function FlowDiagram({ flow }: { flow: Flow }) {
  const { steps } = flow
  const width = COLUMN * steps.length
  const barHeight = (share: number) => Math.max(share * HEIGHT, steps[0]!.count > 0 ? 3 : 0)
  const left = (index: number) => index * COLUMN + (COLUMN - BAR) / 2
  const results = steps[steps.length - 1]!
  const unload = steps[0]!

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${width} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="block h-32 w-full"
        >
          {steps.slice(0, -1).map((step, index) => {
            const next = steps[index + 1]!
            const from = barHeight(step.share)
            const to = barHeight(next.share)
            const x1 = left(index) + BAR
            const x2 = left(index + 1)
            const mid = HEIGHT / 2
            return (
              <polygon
                key={step.id}
                points={`${x1},${mid - from / 2} ${x2},${mid - to / 2} ${x2},${mid + to / 2} ${x1},${mid + from / 2}`}
                className="fill-accent opacity-25"
              />
            )
          })}
          {steps.map((step, index) => {
            const height = barHeight(step.share)
            return (
              <rect
                key={step.id}
                x={left(index)}
                y={(HEIGHT - height) / 2}
                width={BAR}
                height={height}
                rx={3}
                className="fill-accent"
              />
            )
          })}
        </svg>

        <ol className="mt-3 grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map((step) => (
            <li key={step.id} className="flex flex-col items-center gap-0.5 px-1 text-center">
              <span className="text-xs leading-snug text-ink-soft text-balance">{step.name}</span>
              <span className="font-serif text-2xl leading-none tabular-nums text-ink">{step.count}</span>
              <span className="text-xs tabular-nums text-ink-soft">
                {step.id === "unload" ? "all cards" : `${percent(step.share)} of Unload`}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 text-sm">
        <div className="flex flex-col gap-1.5">
          <p className="text-ink">
            <span className="font-medium">Released:</span>{" "}
            <span className="tabular-nums">{flow.released.count}</span>{" "}
            <span className="text-ink-soft">
              {flow.released.count === 1 ? "card" : "cards"} left the flow here, {percent(flow.released.share)} of Unload.
            </span>
          </p>
          <div aria-hidden="true" className="h-2 w-full rounded-full bg-line/60">
            <div className="h-2 rounded-full bg-ink-soft/50" style={{ width: percent(flow.released.share) }} />
          </div>
        </div>
        <p className="text-ink">
          <span className="font-medium">Effectiveness:</span>{" "}
          <span className="tabular-nums">{percent(flow.effectiveness)}</span>{" "}
          <span className="text-ink-soft">
            of Unload reached Results ({results.count} of {unload.count}).
          </span>
        </p>
      </div>
    </div>
  )
}
