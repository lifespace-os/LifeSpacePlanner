import { type CSSProperties, type ReactNode } from "react"
import {
  IKIGAI,
  IKIGAI_CIRCLES,
  IKIGAI_LABEL_REACH,
  IKIGAI_SIZE,
  OVERLAP_PARENTS,
  countTag,
  ikigaiCircleOffset,
  type IkigaiCenter,
  type IkigaiCircleId,
  type IkigaiOverlapId,
  type IkigaiRegionId,
  type Note,
} from "@/lib/board-data"

const HALF = IKIGAI_SIZE / 2

const TONES: Record<IkigaiCircleId, { fill: string; edge: string }> = {
  love: { fill: "#f3cdd1", edge: "#d9a0a8" },
  "good-at": { fill: "#d1e2ec", edge: "#9fbfd2" },
  income: { fill: "#f7e8a4", edge: "#dcc56a" },
  needed: { fill: "#d6e5c9", edge: "#aac596" },
}

const CIRCLE_NAMES: Record<IkigaiCircleId, string> = {
  love: "What you love",
  "good-at": "What you are good at",
  income: "What brings you income",
  needed: "What people need",
}

const OVERLAP_NAMES: Record<IkigaiOverlapId, string> = {
  passion: "Passion",
  profession: "Profession",
  work: "Work",
  vocation: "Vocation",
}

const OVERLAP_POSITIONS: Record<IkigaiOverlapId, [number, number]> = {
  passion: [-1, -1],
  vocation: [1, -1],
  work: [1, 1],
  profession: [-1, 1],
}

function frameAt(center: IkigaiCenter): CSSProperties {
  return { left: center.x - HALF, top: center.y - HALF, width: IKIGAI_SIZE, height: IKIGAI_SIZE }
}

const halo: CSSProperties = {
  textShadow: "0 0 8px var(--color-board), 0 0 3px var(--color-board), 0 0 3px var(--color-board)",
}

function circleIds(region: IkigaiRegionId): IkigaiCircleId[] {
  if (region === "ikigai") return IKIGAI_CIRCLES
  if (region in OVERLAP_PARENTS) return OVERLAP_PARENTS[region as IkigaiOverlapId]
  return [region as IkigaiCircleId]
}

function position(id: IkigaiCircleId) {
  const o = ikigaiCircleOffset(id)
  return { cx: HALF + o.x, cy: HALF + o.y }
}

function Clipped({ ids, children }: { ids: IkigaiCircleId[]; children: ReactNode }) {
  return ids.reduceRight<ReactNode>((inner, id) => <g clipPath={`url(#ikigai-clip-${id})`}>{inner}</g>, children)
}

function Highlight({ region, kind }: { region: IkigaiRegionId; kind: "active" | "hover" }) {
  const ids = circleIds(region)
  const [first, ...rest] = ids
  const stroke: CSSProperties = {
    stroke: "var(--color-accent)",
    strokeWidth: kind === "active" ? 6 : 4,
    strokeDasharray: kind === "hover" ? "14 10" : undefined,
    fill: "none",
  }
  return (
    <g>
      <Clipped ids={rest}>
        <circle
          {...position(first)}
          r={IKIGAI.r}
          style={{ fill: "var(--color-accent)", fillOpacity: kind === "active" ? 0.24 : 0.14 }}
        />
      </Clipped>
      {ids.map((id) => (
        <Clipped key={id} ids={ids.filter((other) => other !== id)}>
          <circle {...position(id)} r={IKIGAI.r} style={stroke} />
        </Clipped>
      ))}
    </g>
  )
}

export function IkigaiCircles({
  center,
  activeRegion,
  hoverRegion,
}: {
  center: IkigaiCenter
  activeRegion: IkigaiRegionId | null
  hoverRegion: IkigaiRegionId | null
}) {
  return (
    <div data-zone="" data-ikigai="" aria-hidden="true" className="pointer-events-none absolute" style={frameAt(center)}>
      <svg viewBox={`0 0 ${IKIGAI_SIZE} ${IKIGAI_SIZE}`} width={IKIGAI_SIZE} height={IKIGAI_SIZE} className="absolute inset-0">
        <defs>
          {IKIGAI_CIRCLES.map((id) => (
            <clipPath key={id} id={`ikigai-clip-${id}`}>
              <circle {...position(id)} r={IKIGAI.r} />
            </clipPath>
          ))}
        </defs>
        {IKIGAI_CIRCLES.map((id) => (
          <circle
            key={id}
            {...position(id)}
            r={IKIGAI.r}
            fill={TONES[id].fill}
            fillOpacity={0.62}
            stroke={TONES[id].edge}
            strokeWidth={3}
            style={{ mixBlendMode: "multiply" }}
          />
        ))}
        {hoverRegion && hoverRegion !== activeRegion ? <Highlight region={hoverRegion} kind="hover" /> : null}
        {activeRegion ? <Highlight region={activeRegion} kind="active" /> : null}
      </svg>
    </div>
  )
}

function countText(count: number) {
  return `${count} ${count === 1 ? "card" : "cards"}`
}

function Label({
  x,
  y,
  name,
  count,
  nameClass,
  width,
  active,
}: {
  x: number
  y: number
  name: string
  count: number
  nameClass: string
  width: number
  active: boolean
}) {
  return (
    <div
      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center"
      style={{ left: HALF + x, top: HALF + y, width }}
    >
      <span className={`font-serif leading-tight font-medium text-balance text-ink ${nameClass}`} style={halo}>
        {name}
      </span>
      <span
        className={`mt-1.5 rounded-full border px-3 py-0.5 text-[20px] leading-snug font-medium tabular-nums ${
          active ? "border-accent bg-accent text-board" : "border-line bg-board/90 text-ink-soft"
        }`}
      >
        {countText(count)}
      </span>
    </div>
  )
}

/** Names and card counts. Drawn above the cards, never in the way of the pointer. */
export function IkigaiLabels({
  center,
  notes,
  activeRegion,
}: {
  center: IkigaiCenter
  notes: Note[]
  activeRegion: IkigaiRegionId | null
}) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute z-[5000]" style={frameAt(center)}>
      {IKIGAI_CIRCLES.map((id) => {
        const o = ikigaiCircleOffset(id)
        const scale = IKIGAI_LABEL_REACH / IKIGAI.d
        return (
          <Label
            key={id}
            x={o.x * scale}
            y={o.y * scale}
            name={CIRCLE_NAMES[id]}
            count={countTag(notes, id)}
            nameClass="text-[28px]"
            width={210}
            active={activeRegion === id}
          />
        )
      })}
      {(Object.keys(OVERLAP_NAMES) as IkigaiOverlapId[]).map((id) => (
        <Label
          key={id}
          x={OVERLAP_POSITIONS[id][0] * IKIGAI.d}
          y={OVERLAP_POSITIONS[id][1] * IKIGAI.d}
          name={OVERLAP_NAMES[id]}
          count={countTag(notes, id)}
          nameClass="text-[26px]"
          width={150}
          active={activeRegion === id}
        />
      ))}
      <Label
        x={0}
        y={0}
        name="Ikigai"
        count={countTag(notes, "ikigai")}
        nameClass="text-[36px] italic"
        width={150}
        active={activeRegion === "ikigai"}
      />
    </div>
  )
}
