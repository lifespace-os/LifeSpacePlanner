"use client"

import { useEffect, useMemo, useState } from "react"
import { FlowDiagram } from "@/components/dashboard/flow-diagram"
import { GoalList } from "@/components/dashboard/goal-list"
import { WeeklyReview } from "@/components/dashboard/weekly-review"
import { useGoals } from "@/components/goals-provider"
import { useKanban } from "@/components/kanban/kanban-provider"
import { finishedCounts, flowOf, goalTaskCounts, taskStates } from "@/lib/dashboard"
import { ladderSections } from "@/lib/gantt"
import { todayIso } from "@/lib/repeat"

export function DashboardScreen() {
  const { cards, columnsByBoard } = useKanban()
  const { notes, rings } = useGoals()
  const [today, setToday] = useState<string | null>(null)

  useEffect(() => {
    setToday(todayIso())
  }, [])

  const tasks = useMemo(() => taskStates(cards, columnsByBoard), [cards, columnsByBoard])
  const counts = useMemo(() => (today ? finishedCounts(tasks, today) : null), [tasks, today])
  const flow = useMemo(() => flowOf(notes, rings, tasks), [notes, rings, tasks])
  const totals = useMemo(() => goalTaskCounts(tasks, notes, rings), [tasks, notes, rings])
  const sections = useMemo(() => ladderSections(notes, new Map()), [notes])

  const tiles: { id: string; name: string; value: number | undefined }[] = [
    { id: "today", name: "Today", value: counts?.today },
    { id: "week", name: "This week", value: counts?.week },
    { id: "month", name: "This month", value: counts?.month },
    { id: "all", name: "All time", value: counts?.all },
  ]

  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-4 py-5 sm:px-6">
      <h1 className="font-serif text-3xl font-medium tracking-tight">Dashboard</h1>

      <section aria-labelledby="finished-heading" className="flex flex-col gap-3">
        <h2 id="finished-heading" className="font-serif text-xl font-medium">
          Finished tasks
        </h2>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map((tile) => (
            <li key={tile.id} className="rounded-xl border border-line bg-card px-4 py-3">
              <p className="text-sm text-ink-soft">{tile.name}</p>
              <p className="font-serif text-4xl leading-tight tabular-nums text-ink">{tile.value ?? "\u00a0"}</p>
            </li>
          ))}
        </ul>
        <p className="text-sm text-ink-soft text-pretty">
          Tasks in Done and on Results. Tasks that were only started are not counted.
          {counts && counts.undated > 0
            ? ` ${counts.undated} finished before the day was kept, so ${counts.undated === 1 ? "it counts" : "they count"} under All time only.`
            : ""}
        </p>
      </section>

      <section aria-labelledby="flow-heading" className="flex flex-col gap-3">
        <h2 id="flow-heading" className="font-serif text-xl font-medium">
          Flow
        </h2>
        <p className="text-sm text-ink-soft text-pretty">
          Unload is every card on the Whiteboard plus every task made from a card. A card may skip a step.
        </p>
        <div className="rounded-xl border border-line bg-card p-4">
          <FlowDiagram flow={flow} />
        </div>
      </section>

      <section aria-labelledby="goals-heading" className="flex flex-col gap-3">
        <h2 id="goals-heading" className="font-serif text-xl font-medium">
          Goals
        </h2>
        <GoalList sections={sections} totals={totals} />
      </section>

      <section aria-labelledby="review-heading" className="flex flex-col gap-3">
        <h2 id="review-heading" className="font-serif text-xl font-medium">
          Weekly review
        </h2>
        {today ? (
          <div className="rounded-xl border border-line bg-card p-4">
            <WeeklyReview today={today} tasks={tasks} />
          </div>
        ) : null}
      </section>
    </main>
  )
}
