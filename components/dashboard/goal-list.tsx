import { useLanguage } from "@/components/language-provider"
import type { LadderSection } from "@/lib/gantt"
import type { MessageKey } from "@/lib/i18n"

type Totals = Record<string, { done: number; total: number }>

export function GoalList({ sections, totals }: { sections: LadderSection[]; totals: Totals }) {
  const { t } = useLanguage()
  const filled = sections.filter((section) => section.rows.length > 0)
  if (filled.length === 0) {
    return <p className="text-sm text-ink-soft">{t("dashboard.goals.empty")}</p>
  }

  const sectionName = (section: LadderSection) =>
    section.id === "needs" || section.id === "life" || section.id === "project"
      ? t(`filter.ring.${section.id}` as MessageKey)
      : section.name

  return (
    <div className="flex flex-col gap-5">
      {filled.map((section) => (
        <section key={section.id} aria-labelledby={`goals-${section.id}`}>
          <h3 id={`goals-${section.id}`} className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            {sectionName(section)}
          </h3>
          <ul className="mt-2 divide-y divide-line/60 rounded-lg border border-line">
            {section.rows.map((row) => {
              const { done, total } = totals[row.id] ?? { done: 0, total: 0 }
              const share = total === 0 ? 0 : (done / total) * 100
              return (
                <li key={row.id} className="flex flex-col gap-1.5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-ink text-pretty">{row.text || t("gantt.untitledCard")}</p>
                    <p className="text-xs text-ink-soft">
                      {row.levelTag ? t(`goal.level.${row.levelTag}` as MessageKey) : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div aria-hidden="true" className="h-1.5 w-24 rounded-full bg-line/60">
                      <div className="h-1.5 rounded-full bg-accent" style={{ width: `${share}%` }} />
                    </div>
                    <span className="w-28 text-right text-sm tabular-nums text-ink">
                      {total === 0 ? (
                        <span className="text-ink-soft">{t("dashboard.goals.noTasks")}</span>
                      ) : (
                        t("dashboard.goals.doneOf", { done, total })
                      )}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
