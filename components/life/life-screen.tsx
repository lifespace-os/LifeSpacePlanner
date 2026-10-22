"use client"

import { memo, useMemo } from "react"
import Link from "next/link"
import clsx from "clsx"
import { useWorkspace } from "@/components/workspace-provider"
import { WEEKS_PER_YEAR, lifeGrid, type LifeGrid } from "@/lib/life-weeks"
import { todayIso } from "@/lib/repeat"
import { DEFAULT_LIFE } from "@/lib/workspace"

const number = new Intl.NumberFormat("en-US")

function longDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" })
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
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-soft">
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="size-3 rounded-[2px] bg-accent" />
        Lived
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="size-3 rounded-[2px] bg-ink outline outline-2 outline-offset-1 outline-ink" />
        This week
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden="true" className="size-3 rounded-[2px] bg-line/50" />
        Later
      </li>
    </ul>
  )
}

function Totals({ grid }: { grid: LifeGrid }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-line bg-card px-4 py-3">
        <dt className="text-sm text-ink-soft">Weeks lived</dt>
        <dd className="font-serif text-3xl font-medium tabular-nums">{number.format(grid.lived)}</dd>
      </div>
      <div className="rounded-xl border border-line bg-card px-4 py-3">
        <dt className="text-sm text-ink-soft">Weeks left</dt>
        <dd className="font-serif text-3xl font-medium tabular-nums">{number.format(grid.left)}</dd>
      </div>
    </dl>
  )
}

function NeedSettings() {
  return (
    <section
      aria-label="Set up"
      className="flex flex-col items-start gap-3 rounded-xl border border-line bg-card px-5 py-6"
    >
      <p className="max-w-prose text-pretty text-ink">
        Enter your date of birth and the number of years the grid covers in Settings, and your weeks will appear here.
      </p>
      <Link
        href="/settings"
        className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-board focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Open Settings
      </Link>
    </section>
  )
}

export function LifeScreen() {
  const { doc } = useWorkspace()
  const life = doc.life ?? DEFAULT_LIFE
  const grid = useMemo(() => lifeGrid(life.birthDate, life.years, todayIso()), [life.birthDate, life.years])

  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-4 py-5 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-serif text-3xl font-medium tracking-tight">Life in weeks</h1>
        {grid && (
          <p className="text-sm text-ink-soft">
            Born {longDate(life.birthDate)}. One row is one year of {WEEKS_PER_YEAR} weeks, {grid.years} years in all.
          </p>
        )}
      </header>

      {grid ? (
        <>
          <section aria-label="Weeks" className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4">
            <div
              role="img"
              aria-label={`Life in weeks: ${number.format(grid.lived)} weeks lived, ${number.format(grid.left)} weeks left, in a grid of ${grid.years} years.`}
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
