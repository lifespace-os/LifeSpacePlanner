import { WheelChart } from "@/components/dashboard/wheel-chart"
import type { WheelsData } from "@/lib/wheels"

export function WheelsTile({ data }: { data: WheelsData }) {
  const scored = data.balance.filter((slice) => slice.fill !== null).length

  return (
    <div className="grid gap-6 rounded-xl border border-line bg-card p-4 lg:grid-cols-2 md:p-6">
      <figure className="flex flex-col gap-2">
        <figcaption className="flex flex-col gap-0.5">
          <span className="font-serif text-lg font-medium">Wheel of balance</span>
          <span className="text-sm text-ink-soft text-pretty">
            {data.setName ? `Life spheres, ${data.setName} set. ` : ""}
            {scored} of {data.balance.length} scored. A sphere without a score stays empty.
          </span>
        </figcaption>
        <WheelChart title="Wheel of balance" centerLabel="Balance" slices={data.balance} />
      </figure>

      <figure className="flex flex-col gap-2">
        <figcaption className="flex flex-col gap-0.5">
          <span className="font-serif text-lg font-medium">Happiness components</span>
          <span className="text-sm text-ink-soft text-pretty">
            Cards carrying each component. A slice fills to the component with the most cards.
          </span>
        </figcaption>
        <WheelChart title="Happiness components wheel" centerLabel="Happiness" slices={data.happiness} />
      </figure>
    </div>
  )
}
