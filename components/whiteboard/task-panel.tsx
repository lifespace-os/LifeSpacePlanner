"use client"

import { useId, useState } from "react"
import clsx from "clsx"
import { MousePointerClick, Undo2 } from "lucide-react"
import {
  BUDGET_COLORS,
  BUDGET_TAGS,
  BUDGET_ZONE_IDS,
  getGoalLevel,
  goalLevelOf,
  hasHashtag,
  sectorTag,
  type Note,
  type Sector,
  type TaskDetails,
} from "@/lib/board-data"
import { TaskChain } from "./task-chain"

/** What Make task saves. The card keeps its place; only its task, level and hashtags can change. */
export type TaskPlan = {
  task: TaskDetails | null
  setLevel: boolean
  tags: { tag: string; color?: `#${string}` }[]
}

type SetOption = { tag: string; name: string; color: string; paper?: `#${string}` }

const FIELD_CLASS =
  "h-9 w-full rounded-md border border-line bg-board px-3 text-sm text-ink focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/30"

const BUDGET_OPTIONS: SetOption[] = BUDGET_ZONE_IDS.map((id) => ({
  tag: id,
  name: id === "investment" ? "Investment" : "Expense",
  color: BUDGET_COLORS[id],
}))

function toOptions(sectors: Sector[]): SetOption[] {
  return sectors.map((sector) => ({ tag: sectorTag(sector.name), name: sector.name, color: sector.color, paper: sector.color }))
}

function LabelSet({
  legend,
  options,
  note,
  value,
  onChange,
}: {
  legend: string
  options: SetOption[]
  note: Note
  value: string
  onChange: (tag: string) => void
}) {
  const id = useId()
  const present = options.filter((option) => hasHashtag(note, option.tag))
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="sr-only">{legend}</legend>
      <label htmlFor={id} className="text-sm font-medium">
        {legend} <span className="font-normal text-ink-soft">(optional)</span>
      </label>
      {present.length > 0 ? (
        <p id={id} className="flex flex-wrap gap-1.5">
          {present.map((option) => (
            <span key={option.tag} style={{ backgroundColor: option.color }} className="rounded-full px-2 py-0.5 text-xs text-ink">
              #{option.tag}
            </span>
          ))}
        </p>
      ) : options.length === 0 ? (
        <p id={id} className="text-xs text-ink-soft">
          This list has no sectors.
        </p>
      ) : (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={FIELD_CLASS}>
          <option value="">No label</option>
          {options.map((option) => (
            <option key={option.tag} value={option.tag}>
              {option.name}
            </option>
          ))}
        </select>
      )}
    </fieldset>
  )
}

export function TaskPanel({
  note,
  notes,
  missionText,
  spheres,
  happiness,
  onSave,
}: {
  note: Note | null
  notes: Note[]
  missionText: string
  spheres: Sector[]
  happiness: Sector[]
  onSave: (id: string, plan: TaskPlan) => void
}) {
  return (
    <aside
      aria-label="Make a task"
      className="pointer-events-auto flex max-h-full w-80 shrink-0 flex-col overflow-y-auto rounded-2xl border border-line bg-card p-5 shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)]"
    >
      {note ? (
        <TaskForm
          key={note.id}
          note={note}
          notes={notes}
          missionText={missionText}
          spheres={spheres}
          happiness={happiness}
          onSave={onSave}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center text-ink-soft">
          <MousePointerClick className="size-6" aria-hidden="true" />
          <p className="text-sm text-pretty">Select a card on the board to turn it into a task.</p>
        </div>
      )}
    </aside>
  )
}

function TaskForm({
  note,
  notes,
  missionText,
  spheres,
  happiness,
  onSave,
}: {
  note: Note
  notes: Note[]
  missionText: string
  spheres: Sector[]
  happiness: Sector[]
  onSave: (id: string, plan: TaskPlan) => void
}) {
  const uid = useId()
  const [title, setTitle] = useState(note.task?.title ?? note.text)
  const [due, setDue] = useState(note.task?.due ?? "")
  const [owner, setOwner] = useState(note.task?.owner ?? "Me")
  const [sphere, setSphere] = useState("")
  const [joy, setJoy] = useState("")
  const [budget, setBudget] = useState("")

  const sphereOptions = toOptions(spheres)
  const happinessOptions = toOptions(happiness)
  const atTasks = hasHashtag(note, "task")
  const current = getGoalLevel(goalLevelOf(note))

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) return
    const picks = [
      { tag: sphere, options: sphereOptions },
      { tag: joy, options: happinessOptions },
      { tag: budget, options: BUDGET_OPTIONS },
    ]
    const tags = picks
      .filter((pick) => pick.tag)
      .map((pick) => ({ tag: pick.tag, color: pick.options.find((o) => o.tag === pick.tag)?.paper }))
    onSave(note.id, {
      task: { title: cleanTitle, labelId: note.task?.labelId ?? null, due, owner: owner.trim() },
      setLevel: !atTasks,
      tags,
    })
    setSphere("")
    setJoy("")
    setBudget("")
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <p className="text-[10px] font-medium tracking-[0.16em] text-ink-soft uppercase">
          Selected {note.task ? "task" : "card"}
        </p>
        <p className="mt-1 font-serif text-xl leading-snug text-pretty">
          {note.text.trim() || <span className="text-ink-soft italic">Blank card</span>}
        </p>
      </div>

      <TaskChain note={note} notes={notes} missionText={missionText} />

      {atTasks ? null : (
        <p className="rounded-xl bg-accent-soft px-3 py-2.5 text-sm text-ink text-pretty">
          This card does not carry <span className="rounded-full bg-desk px-1.5 py-0.5 text-xs">#task</span>.
          {current ? ` Making the task replaces #${current.tag}.` : ""} The button below sets the Tasks level and then
          creates the task.
        </p>
      )}

      <div className="flex flex-col gap-4 border-t border-line pt-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${uid}-title`} className="text-sm font-medium">
            Title
          </label>
          <input
            id={`${uid}-title`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={80}
            autoComplete="off"
            className={FIELD_CLASS}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${uid}-due`} className="text-sm font-medium">
            Due date
          </label>
          <input id={`${uid}-due`} type="date" value={due} onChange={(e) => setDue(e.target.value)} className={FIELD_CLASS} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${uid}-owner`} className="text-sm font-medium">
            Owner
          </label>
          <input
            id={`${uid}-owner`}
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            maxLength={40}
            autoComplete="off"
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-line pt-4">
        <LabelSet legend="Life spheres" options={sphereOptions} note={note} value={sphere} onChange={setSphere} />
        <LabelSet legend="Happiness components" options={happinessOptions} note={note} value={joy} onChange={setJoy} />
        <LabelSet legend="Investment or expense" options={BUDGET_OPTIONS} note={note} value={budget} onChange={setBudget} />
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          className={clsx(
            "min-h-10 rounded-md bg-accent px-3 py-2 text-sm font-medium text-board transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          )}
        >
          {note.task ? (atTasks ? "Update task" : "Set Tasks level and update task") : atTasks ? "Make task" : "Set Tasks level and make task"}
        </button>
        {note.task ? (
          <button
            type="button"
            onClick={() => onSave(note.id, { task: null, setLevel: false, tags: [] })}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-line text-sm text-ink-soft transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Undo2 className="size-4" aria-hidden="true" />
            Turn back into a note
          </button>
        ) : null}
      </div>
    </form>
  )
}
