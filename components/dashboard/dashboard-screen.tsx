"use client"

import { useEffect, useMemo, useState } from "react"
import { ExportDialog } from "@/components/dashboard/export-dialog"
import { FlowDiagram } from "@/components/dashboard/flow-diagram"
import { GoalList } from "@/components/dashboard/goal-list"
import { LabelsTile } from "@/components/dashboard/labels-tile"
import { MapTile } from "@/components/dashboard/map-tile"
import { MissionTile } from "@/components/dashboard/mission-tile"
import { WeeklyReview } from "@/components/dashboard/weekly-review"
import { WheelsTile } from "@/components/dashboard/wheels-tile"
import { useGoals } from "@/components/goals-provider"
import { useKanban } from "@/components/kanban/kanban-provider"
import { useLanguage } from "@/components/language-provider"
import { useWorkspace } from "@/components/workspace-provider"
import { labelSetLists } from "@/lib/board-data"
import { finishedCounts, flowOf, goalTaskCounts, taskStates } from "@/lib/dashboard"
import { ladderSections } from "@/lib/gantt"
import { labelShares } from "@/lib/label-shares"
import { lifeGrid } from "@/lib/life-weeks"
import { missionCounts } from "@/lib/mission-counts"
import { todayIso } from "@/lib/repeat"
import { wheelsData } from "@/lib/wheels"
import { DEFAULT_LIFE } from "@/lib/workspace"

export function DashboardScreen() {
  const { cards, columnsByBoard } = useKanban()
  const { notes, rings } = useGoals()
  const { doc } = useWorkspace()
  const { t, tn } = useLanguage()
  const [today, setToday] = useState<string | null>(null)

  useEffect(() => {
    setToday(todayIso())
  }, [])

  const tasks = useMemo(() => taskStates(cards, columnsByBoard), [cards, columnsByBoard])
  const counts = useMemo(() => (today ? finishedCounts(tasks, today) : null), [tasks, today])
  const flow = useMemo(() => flowOf(notes, rings, tasks), [notes, rings, tasks])
  const totals = useMemo(() => goalTaskCounts(tasks, notes, rings), [tasks, notes, rings])
  const sections = useMemo(() => ladderSections(notes, new Map()), [notes])
  const mission = useMemo(() => missionCounts(notes, cards), [notes, cards])
  const wheels = useMemo(
    () => wheelsData(doc.board.sectorLists, doc.board.sphereSetId, notes, cards),
    [doc.board.sectorLists, doc.board.sphereSetId, notes, cards],
  )
  const labels = useMemo(
    () =>
      labelShares(
        labelSetLists(doc.board.sectorLists[doc.board.sphereSetId] ?? [], doc.board.sectorLists.happiness ?? []),
        notes,
        cards,
      ),
    [doc.board.sectorLists, doc.board.sphereSetId, notes, cards],
  )

  const life = useMemo(() => {
    if (!today) return null
    const saved = doc.life ?? DEFAULT_LIFE
    return lifeGrid(saved.birthDate, saved.years, today)
  }, [doc.life, today])

  const tiles: { id: string; name: string; value: number | undefined }[] = [
    { id: "today", name: t("dashboard.range.today"), value: counts?.today },
    { id: "week", name: t("dashboard.range.week"), value: counts?.week },
    { id: "month", name: t("dashboard.range.month"), value: counts?.month },
    { id: "all", name: t("dashboard.range.all"), value: counts?.all },
  ]

  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-4 py-5 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-3xl font-medium tracking-tight">{t("dashboard.title")}</h1>
        <ExportDialog
          notes={notes}
          rings={rings}
          spots={doc.board.graphSpots}
          boxes={doc.board.graphBoxes}
          counts={counts}
          flow={flow}
          mission={mission}
          wheels={wheels}
          labels={labels}
          life={life}
        />
      </header>

      <section aria-labelledby="finished-heading" className="flex flex-col gap-3">
        <h2 id="finished-heading" className="font-serif text-xl font-medium">
          {t("dashboard.finished.title")}
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
          {t("dashboard.finished.note")}
          {counts && counts.undated > 0 ? ` ${tn("dashboard.finished.undated", counts.undated)}` : ""}
        </p>
      </section>

      <section aria-labelledby="flow-heading" className="flex flex-col gap-3">
        <h2 id="flow-heading" className="font-serif text-xl font-medium">
          {t("dashboard.flow.title")}
        </h2>
        <p className="text-sm text-ink-soft text-pretty">{t("dashboard.flow.note")}</p>
        <div className="rounded-xl border border-line bg-card p-4">
          <FlowDiagram flow={flow} />
        </div>
      </section>

      <section aria-labelledby="mission-heading" className="flex flex-col gap-3">
        <h2 id="mission-heading" className="font-serif text-xl font-medium">
          {t("dashboard.mission.title")}
        </h2>
        <p className="text-sm text-ink-soft text-pretty">{t("dashboard.mission.note")}</p>
        <MissionTile counts={mission} />
      </section>

      <section aria-labelledby="map-heading" className="flex flex-col gap-3">
        <h2 id="map-heading" className="font-serif text-xl font-medium">
          {t("dashboard.map.title")}
        </h2>
        <p className="text-sm text-ink-soft text-pretty">{t("dashboard.map.note")}</p>
        <MapTile notes={notes} rings={rings} spots={doc.board.graphSpots} boxes={doc.board.graphBoxes} />
      </section>

      <section aria-labelledby="wheels-heading" className="flex flex-col gap-3">
        <h2 id="wheels-heading" className="font-serif text-xl font-medium">
          {t("dashboard.wheels.title")}
        </h2>
        <p className="text-sm text-ink-soft text-pretty">{t("dashboard.wheels.note")}</p>
        <WheelsTile data={wheels} />
      </section>

      <section aria-labelledby="labels-heading" className="flex flex-col gap-3">
        <h2 id="labels-heading" className="font-serif text-xl font-medium">
          {t("dashboard.labels.title")}
        </h2>
        <p className="text-sm text-ink-soft text-pretty">{t("dashboard.labels.note")}</p>
        <LabelsTile groups={labels} />
      </section>

      <section aria-labelledby="goals-heading" className="flex flex-col gap-3">
        <h2 id="goals-heading" className="font-serif text-xl font-medium">
          {t("dashboard.goals.title")}
        </h2>
        <GoalList sections={sections} totals={totals} />
      </section>

      <section aria-labelledby="review-heading" className="flex flex-col gap-3">
        <h2 id="review-heading" className="font-serif text-xl font-medium">
          {t("dashboard.review.title")}
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
