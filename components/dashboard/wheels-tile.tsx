import { WheelChart } from "@/components/dashboard/wheel-chart"
import { useLanguage } from "@/components/language-provider"
import type { WheelsData } from "@/lib/wheels"

export function WheelsTile({ data }: { data: WheelsData }) {
  const { t } = useLanguage()
  const scored = data.balance.filter((slice) => slice.fill !== null).length

  return (
    <div className="grid gap-6 rounded-xl border border-line bg-card p-4 lg:grid-cols-2 md:p-6">
      <figure className="flex flex-col gap-2">
        <figcaption className="flex flex-col gap-0.5">
          <span className="font-serif text-lg font-medium">{t("dashboard.wheels.balance")}</span>
          <span className="text-sm text-ink-soft text-pretty">
            {data.setName ? `${t("dashboard.wheels.set", { name: data.setName })} ` : ""}
            {t("dashboard.wheels.scored", { scored, total: data.balance.length })}
          </span>
        </figcaption>
        <WheelChart
          title={t("dashboard.wheels.balance")}
          centerLabel={t("dashboard.wheels.balanceCenter")}
          slices={data.balance}
        />
      </figure>

      <figure className="flex flex-col gap-2">
        <figcaption className="flex flex-col gap-0.5">
          <span className="font-serif text-lg font-medium">{t("dashboard.wheels.happiness")}</span>
          <span className="text-sm text-ink-soft text-pretty">{t("dashboard.wheels.happinessNote")}</span>
        </figcaption>
        <WheelChart
          title={t("dashboard.wheels.happinessWheel")}
          centerLabel={t("dashboard.wheels.happinessCenter")}
          slices={data.happiness}
        />
      </figure>
    </div>
  )
}
