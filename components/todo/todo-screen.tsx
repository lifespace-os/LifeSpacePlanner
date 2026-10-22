"use client"

import { useMemo, useState } from "react"
import clsx from "clsx"
import { Check } from "lucide-react"
import { useGoals } from "@/components/goals-provider"
import { CardEditor } from "@/components/kanban/card-editor"
import { useKanban } from "@/components/kanban/kanban-provider"
import { useLanguage } from "@/components/language-provider"
import { LabelMark } from "@/components/whiteboard/label-chip"
import { getLabel } from "@/lib/board-data"
import type { MessageKey } from "@/lib/i18n"
import { calendarTasks, shortDate } from "@/lib/calendar"
import { draftOf, sameDraft } from "@/lib/kanban-data"
import { TODO_SORTS, goalSummary, sortRows, stepsOf, todoRows, type TodoRow, type TodoSort } from "@/lib/todo-list"

const columns = "md:grid md:grid-cols-[minmax(0,1fr)_8.5rem_minmax(0,15rem)_10rem] md:gap-x-4"

export function TodoScreen() {
  const { cards, columnsByBoard, openId, openCard, closeCard, drafts, editDraft, revertDraft, saveDraft } = useKanban()
  const { notes } = useGoals()
  const { t } = useLanguage()
  const [sort, setSort] = useState<TodoSort>("due")
  const [status, setStatus] = useState("")

  const rows = useMemo(
    () => sortRows(todoRows(calendarTasks(cards, columnsByBoard), cards, notes), sort),
    [cards, columnsByBoard, notes, sort],
  )
  const openCardData = openId ? (cards.find((item) => item.id === openId) ?? null) : null

  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-4 py-5 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl font-medium tracking-tight">{t("todo.title")}</h1>
        <div role="group" aria-label={t("todo.sortAria")} className="flex items-center gap-2">
          <span className="text-sm text-ink-soft">{t("todo.sortBy")}</span>
          <div className="flex overflow-hidden rounded-md border border-line bg-card">
            {TODO_SORTS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={sort === option.id}
                onClick={() => {
                  setSort(option.id)
                  setStatus(t("todo.sorted", { sort: t(`todo.sort.${option.id}` as MessageKey).toLowerCase() }))
                }}
                className={clsx(
                  "h-9 border-l border-line px-3 text-sm transition-colors first:border-l-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                  sort === option.id ? "bg-accent-soft font-medium text-ink" : "text-ink-soft hover:bg-line/50",
                )}
              >
                {t(`todo.sort.${option.id}` as MessageKey)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <p role="status" className="min-h-5 text-sm text-ink-soft">
        {status}
      </p>

      <section aria-label={t("todo.tasksAria")} className="overflow-hidden rounded-xl border border-line bg-card">
        <div
          aria-hidden="true"
          className={clsx(columns, "hidden border-b border-line bg-accent-soft px-4 py-2 text-xs font-medium text-ink-soft")}
        >
          <span>{t("todo.task")}</span>
          <span>{t("todo.sort.due")}</span>
          <span>{t("todo.sort.goal")}</span>
          <span>{t("todo.sort.label")}</span>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-soft">{t("common.noTasks")}</p>
        ) : (
          <ul>
            {rows.map((row) => (
              <TaskRow key={row.task.id} row={row} onOpen={openCard} />
            ))}
          </ul>
        )}
      </section>

      {openCardData && (
        <CardEditor
          key={openCardData.id}
          card={openCardData}
          draft={drafts[openCardData.id] ?? draftOf(openCardData)}
          dirty={openCardData.id in drafts && !sameDraft(drafts[openCardData.id]!, draftOf(openCardData))}
          onChange={(patch) => editDraft(openCardData.id, patch)}
          onClose={closeCard}
          onSave={() => {
            if (saveDraft(openCardData.id)) {
              setStatus(t("common.savedCard"))
              closeCard()
            }
          }}
          onRevert={() => revertDraft(openCardData.id)}
        />
      )}
    </main>
  )
}

function TaskRow({ row, onOpen }: { row: TodoRow; onOpen: (cardId: string) => void }) {
  const { task } = row
  const { card } = task
  const label = getLabel(card.labelId)
  const goal = goalSummary(row)
  const { steps, done } = stepsOf(card)
  const { t, tn, locale } = useLanguage()
  const empty = <span className="text-ink-soft">{t("common.none")}</span>

  return (
    <li data-task={task.id} className={clsx(columns, "flex flex-col gap-1 border-b border-line/60 px-4 py-3 transition-colors last:border-b-0 hover:bg-line/40")}>
      <div className="min-w-0">
        <div className="flex items-start gap-2">
          {task.done && <Check aria-label={t("common.done")} className="mt-0.5 size-4 shrink-0 text-accent" />}
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => onOpen(task.id)}
            className={clsx(
              "min-w-0 text-left text-sm text-pretty focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              task.done ? "text-ink-soft line-through decoration-ink-soft/50" : "text-ink",
            )}
          >
            {card.title}
          </button>
        </div>
        {steps.length > 0 && (
          <div className="mt-1.5 pl-0.5">
            <p className="text-xs text-ink-soft">
              {tn("todo.steps", steps.length, { done })}
            </p>
            <ul aria-label={t("todo.stepsFor", { title: card.title })} className="mt-1 flex flex-col gap-0.5">
              {steps.map((step) => (
                <li key={step.id} className="flex items-start gap-1.5 text-xs leading-snug text-ink-soft">
                  <span
                    aria-hidden="true"
                    className={clsx(
                      "mt-0.5 flex size-3 shrink-0 items-center justify-center rounded-[3px] border",
                      step.done ? "border-accent bg-accent text-card" : "border-ink-soft/60",
                    )}
                  >
                    {step.done && <Check className="size-2.5" strokeWidth={3} />}
                  </span>
                  <span className={clsx("text-pretty", step.done && "line-through decoration-ink-soft/50")}>
                    {step.text}
                    {step.done && <span className="sr-only">{t("common.doneSr")}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Cell name={t("todo.sort.due")}>{card.due ? shortDate(card.due, locale) : empty}</Cell>
      <Cell name={t("todo.sort.goal")}>{goal ? <span className="text-pretty">{goal}</span> : empty}</Cell>
      <Cell name={t("todo.sort.label")}>
        {label ? (
          <span className="flex items-center gap-1.5">
            <LabelMark shape={label.group.shape} color={label.color} />
            {label.name}
          </span>
        ) : (
          empty
        )}
      </Cell>
    </li>
  )
}

function Cell({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 gap-2 text-sm text-ink md:block">
      <span className="w-20 shrink-0 text-xs leading-5 text-ink-soft md:hidden">{name}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
