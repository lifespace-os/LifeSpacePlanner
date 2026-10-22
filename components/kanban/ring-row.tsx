"use client"

import Link from "next/link"
import clsx from "clsx"
import { useLanguage } from "@/components/language-provider"
import { getCardColor, getGoalLevel, type GoalRing, type Note } from "@/lib/board-data"
import { goalRingOf } from "@/lib/board-data"

type RingRowProps = {
  cards: Note[]
  rings: GoalRing[]
  focusId: string | null
  /** Finished and total tasks under each ring card; finished means in Done or on Results. */
  taskCounts: Record<string, { done: number; total: number }>
  onPick: (id: string) => void
}

/** A row of the Map's ring cards. They are not kanban cards and never sit in a column. */
export function RingRow({ cards, rings, focusId, taskCounts, onPick }: RingRowProps) {
  const { t } = useLanguage()

  if (cards.length === 0) {
    return (
      <p className="mx-6 mb-3 text-sm text-ink-soft">
        {t("ringRow.emptyBefore")}{" "}
        <Link href="/" className="font-medium text-ink underline underline-offset-2 hover:text-accent">
          {t("nav.whiteboard")}
        </Link>
        {t("ringRow.emptyAfter")}
      </p>
    )
  }

  return (
    <section aria-label={t("ringRow.label")} className="mx-6 mb-3">
      <div className="mb-1.5 flex items-baseline justify-between gap-4">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-soft">{t("ringRow.label")}</h2>
        <p className="text-xs text-ink-soft">{focusId ? t("ringRow.hintOn") : t("ringRow.hintOff")}</p>
      </div>
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {cards.map((note) => {
          const color = getCardColor(note.color)
          const ring = rings[goalRingOf(note, rings)]
          const level = ring?.tags.length === 1 ? ring.name : (getGoalLevel(note.hashtags.find((tag) => ring?.tags.includes(tag.toLowerCase())))?.name ?? ring?.name)
          const selected = note.id === focusId
          const { done, total } = taskCounts[note.id] ?? { done: 0, total: 0 }
          return (
            <li key={note.id} className="shrink-0">
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onPick(note.id)}
                style={{ backgroundColor: color.fill, borderColor: color.edge }}
                className={clsx(
                  "flex h-full w-52 flex-col gap-1 rounded-md border px-3 py-2 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  color.dark ? "text-paper-light" : "text-paper-ink",
                  selected && "outline-2 outline-offset-2 outline-accent",
                )}
              >
                <span className="text-[10px] font-medium uppercase tracking-[0.12em] opacity-70">{level}</span>
                <span className="line-clamp-2 text-pretty text-sm font-medium leading-snug">{note.text || t("ringRow.untitled")}</span>
                <span
                  data-task-progress
                  aria-label={t("ringRow.progress", { done, total })}
                  className="text-xs font-medium tabular-nums opacity-80"
                >
                  {done} / {total}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
