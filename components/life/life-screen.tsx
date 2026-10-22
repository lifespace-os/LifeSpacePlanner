"use client"

import { memo, useMemo } from "react"
import Link from "next/link"
import clsx from "clsx"
import { useLanguage } from "@/components/language-provider"
import { useWorkspace } from "@/components/workspace-provider"
import { WEEKS_PER_YEAR, lifeGrid, type LifeGrid } from "@/lib/life-weeks"
import { todayIso } from "@/lib/repeat"
import { DEFAULT_LIFE } from "@/lib/workspace"

function longDate(iso: string, locale: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale, { dateStyle: "long", timeZone: "UTC" })
}

const Row = memo(function Row({ year, lived, current }: { year: number; lived: number; current: number | null }) {
  const first = year * WEEKS_PER_YEAR
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 shrink-0 text-right text-xs tabular-nums text-ink-soft">{year % 10 === 0 ? year : ""}</span>
      <div className="grid flex-1 grid-cols-[repeat(52,minmax(0,1fr))] gap-px sm:gap-[2px]">
        {Array.from({ length: WEEKS_PER_YEAR }, (_, week) => {
          const index = first + week
          return (
            <span
              key={week}
              className={clsx(
                "aspect-square rounded-[1px]",
                index === current
                  ? "bg-ink outline outline-2 outline-offset-1 outline-ink"
                  : index < lived
                    ? "bg-accent"
                    : "bg-line/50",
              )}
            />
          )
        })}
      </div>
    </div>
  )
})

function Legend() {
  const { t } = useLanguage()
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-soft">
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="size-3 rounded-[2px] bg-accent" />
        {t("life.legend.lived")}
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="size-3 rounded-[2px] bg-ink outline outline-2 outline-offset-1 outline-ink" />
        {t("life.legend.thisWeek")}
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="size-3 rounded-[2px] bg-line/50" />
        {t("life.legend.later")}
      </li>
    </ul>
  )
}

function Totals({ grid }: { grid: LifeGrid }) {
  const { t, locale } = useLanguage()
  const number = new Intl.NumberFormat(locale)
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-line bg-card px-4 py-3">
        <dt className="text-sm text-ink-soft">{t("life.weeksLived")}</dt>
        <dd className="font-serif text-3xl font-medium tabular-nums">{number.format(grid.lived)}</dd>
      </div>
      <div className="rounded-xl border border-line bg-card px-4 py-3">
        <dt className="text-sm text-ink-soft">{t("life.weeksLeft")}</dt>
        <dd className="font-serif text-3xl font-medium tabular-nums">{number.format(grid.left)}</dd>
      </div>
    </dl>
  )
}

function NeedSettings() {
  const { t } = useLanguage()
  return (
    <section
      aria-label={t("life.setUpAria")}
      className="flex flex-col items-start gap-3 rounded-xl border border-line bg-card px-5 py-6"
    >
      <p className="max-w-prose text-pretty text-ink">{t("life.needSettings")}</p>
      <Link
        href="/settings"
        className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-board focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {t("life.openSettings")}
      </Link>
    </section>
  )
}

export function LifeScreen() {
  const { doc } = useWorkspace()
  const { t, locale } = useLanguage()
  const number = new Intl.NumberFormat(locale)
  const life = doc.life ?? DEFAULT_LIFE
  const grid = useMemo(() => lifeGrid(life.birthDate, life.years, todayIso()), [life.birthDate, life.years])

  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-4 py-5 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-serif text-3xl font-medium tracking-tight">{t("life.title")}</h1>
        {grid && (
          <p className="text-sm text-ink-soft">
            {t("life.born", { date: longDate(life.birthDate, locale), weeks: WEEKS_PER_YEAR, years: grid.years })}
          </p>
        )}
      </header>

      {grid ? (
        <>
          <section aria-label={t("life.weeksAria")} className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4">
            <div
              role="img"
              aria-label={t("life.gridAria", { lived: number.format(grid.lived), left: number.format(grid.left), years: grid.years })}
              className="flex flex-col gap-px sm:gap-[2px]"
            >
              {Array.from({ length: grid.years }, (_, year) => (
                <Row key={year} year={year} lived={grid.lived} current={grid.current} />
              ))}
            </div>
            <Legend />
          </section>
          <Totals grid={grid} />
        </>
      ) : (
        <NeedSettings />
      )}
    </main>
  )
}
