"use client"

import { useId, useState } from "react"
import clsx from "clsx"
import { MousePointerClick, Undo2 } from "lucide-react"
import {
  LABEL_SET_IDS,
  LABEL_SET_NAMES,
  LABEL_SET_SHAPES,
  getGoalLevel,
  goalLevelOf,
  hasHashtag,
  type CardDetails,
  type LabelSetId,
  type LabelSetLists,
  type LabelSetOption,
  type Note,
} from "@/lib/board-data"
import { TaskChain } from "./task-chain"

/**
 * What the window saves. Every part is optional: the details button sends only `details`, the labels
 * button only `sets`, Save card sends both, and Convert to task adds the level and the task.
 * The card keeps its place in every case.
 */
export type CardPlan = {
  details?: CardDetails
  sets?: Partial<Record<LabelSetId, string[]>>
  setLevel?: boolean
  task?: "make" | "remove"
}

type Chosen = Record<LabelSetId, string[]>

const FIELD_CLASS =
  "h-9 w-full rounded-md border border-line bg-board px-3 text-sm text-ink focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/30"

const SAVE_CLASS =
  "min-h-9 rounded-md border border-line bg-board px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-desk disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"

function chosenOnCard(note: Note, lists: LabelSetLists): Chosen {
  const result = { spheres: [], happiness: [], budget: [] } as Chosen
  for (const id of LABEL_SET_IDS) {
    for (const tag of note.hashtags) {
      const option = lists[id].find((o) => o.tag.toLowerCase() === tag.toLowerCase())
      if (option) result[id].push(option.tag)
    }
  }
  return result
}

function sameTags(a: string[], b: string[]) {
  return a.length === b.length && a.every((tag) => b.includes(tag))
}

function Shape({ shape, color }: { shape: "dot" | "diamond" | "square"; color: string }) {
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: color }}
      className={clsx(
        "inline-block size-3 shrink-0",
        shape === "dot" && "rounded-full",
        shape === "diamond" && "rotate-45 scale-90 rounded-[2px]",
        shape === "square" && "rounded-[2px]",
      )}
    />
  )
}

function SetPicker({
  id,
  options,
  chosen,
  onToggle,
}: {
  id: LabelSetId
  options: LabelSetOption[]
  chosen: string[]
  onToggle: (tag: string) => void
}) {
  const name = LABEL_SET_NAMES[id]
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-sm font-medium">
        {name} <span className="font-normal text-ink-soft">(optional)</span>
      </legend>
      {options.length === 0 ? (
        <p className="text-xs text-ink-soft">This list has no sectors.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {options.map((option) => {
            const on = chosen.includes(option.tag)
            return (
              <li key={option.tag}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onToggle(option.tag)}
                  className={clsx(
                    "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    on ? "border-ink bg-desk text-ink" : "border-line bg-board text-ink-soft hover:text-ink",
                  )}
                >
                  <Shape shape={LABEL_SET_SHAPES[id]} color={option.color} />#{option.tag}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </fieldset>
  )
}

export function TaskPanel({
  note,
  notes,
  missionText,
  labelLists,
  onSave,
}: {
  note: Note | null
  notes: Note[]
  missionText: string
  labelLists: LabelSetLists
  onSave: (id: string, plan: CardPlan) => void
}) {
  return (
    <aside
      aria-label="Make a task"
      className="pointer-events-auto flex max-h-full w-80 shrink-0 flex-col overflow-y-auto rounded-2xl border border-line bg-card p-5 shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)]"
    >
      {note ? (
        <TaskForm key={note.id} note={note} notes={notes} missionText={missionText} labelLists={labelLists} onSave={onSave} />
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
  labelLists,
  onSave,
}: {
  note: Note
  notes: Note[]
  missionText: string
  labelLists: LabelSetLists
  onSave: (id: string, plan: CardPlan) => void
}) {
  const uid = useId()
  const saved = note.details ?? note.task
  const [title, setTitle] = useState(saved?.title ?? note.text)
  const [since, setSince] = useState(saved?.since ?? "")
  const [due, setDue] = useState(saved?.due ?? "")
  const [owner, setOwner] = useState(saved?.owner ?? "Me")
  const [chosen, setChosen] = useState<Chosen>(() => chosenOnCard(note, labelLists))
  const [status, setStatus] = useState("")

  const onCard = chosenOnCard(note, labelLists)
  const atTasks = hasHashtag(note, "task")
  const current = getGoalLevel(goalLevelOf(note))
  const datesInvalid = since !== "" && due !== "" && since > due
  const detailsReady = title.trim().length > 0 && !datesInvalid

  function details(): CardDetails {
    return { title: title.trim(), since, due, owner: owner.trim() }
  }

  function changedSets(): Partial<Record<LabelSetId, string[]>> {
    const changed: Partial<Record<LabelSetId, string[]>> = {}
    for (const id of LABEL_SET_IDS) if (!sameTags(chosen[id], onCard[id])) changed[id] = chosen[id]
    return changed
  }

  function toggle(id: LabelSetId, tag: string) {
    setStatus("")
    setChosen((prev) => ({
      ...prev,
      [id]: prev[id].includes(tag) ? prev[id].filter((t) => t !== tag) : [...prev[id], tag],
    }))
  }

  function saveDetails() {
    if (!detailsReady) return
    onSave(note.id, { details: details() })
    setStatus("Details saved.")
  }

  function saveSets() {
    onSave(note.id, { sets: changedSets() })
    setStatus("Labels saved.")
  }

  function saveCard() {
    if (!detailsReady) return
    onSave(note.id, { details: details(), sets: changedSets() })
    setStatus("Card saved.")
  }

  function convert() {
    if (!detailsReady) return
    onSave(note.id, { details: details(), sets: changedSets(), setLevel: !atTasks, task: "make" })
    setStatus(note.task ? "Task updated." : "Task created.")
  }

  const convertLabel = note.task
    ? atTasks
      ? "Update task"
      : "Set Tasks level and update task"
    : atTasks
      ? "Convert to task"
      : "Set Tasks level and convert to task"

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        saveCard()
      }}
      className="flex flex-col gap-5"
    >
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
          {current ? ` Converting replaces #${current.tag}.` : ""} The convert button below sets the Tasks level and
          then creates the task.
        </p>
      )}

      <section aria-labelledby={`${uid}-details`} className="flex flex-col gap-4 border-t border-line pt-4">
        <h3 id={`${uid}-details`} className="text-[10px] font-medium tracking-[0.16em] text-ink-soft uppercase">
          Details
        </h3>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${uid}-title`} className="text-sm font-medium">
            Title
          </label>
          <input
            id={`${uid}-title`}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setStatus("")
            }}
            required
            maxLength={80}
            autoComplete="off"
            className={FIELD_CLASS}
          />
        </div>
        <div className="flex gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor={`${uid}-since`} className="text-sm font-medium">
              Since date
            </label>
            <input
              id={`${uid}-since`}
              type="date"
              value={since}
              max={due || undefined}
              onChange={(e) => {
                setSince(e.target.value)
                setStatus("")
              }}
              className={FIELD_CLASS}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor={`${uid}-due`} className="text-sm font-medium">
              Due date
            </label>
            <input
              id={`${uid}-due`}
              type="date"
              value={due}
              min={since || undefined}
              onChange={(e) => {
                setDue(e.target.value)
                setStatus("")
              }}
              className={FIELD_CLASS}
            />
          </div>
        </div>
        {datesInvalid ? (
          <p role="alert" className="text-xs text-pretty text-ink">
            The since date comes after the due date.
          </p>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${uid}-owner`} className="text-sm font-medium">
            Owner
          </label>
          <input
            id={`${uid}-owner`}
            value={owner}
            onChange={(e) => {
              setOwner(e.target.value)
              setStatus("")
            }}
            maxLength={40}
            autoComplete="off"
            className={FIELD_CLASS}
          />
        </div>
        <button type="button" onClick={saveDetails} disabled={!detailsReady} className={SAVE_CLASS}>
          Save details
        </button>
      </section>

      <section aria-labelledby={`${uid}-labels`} className="flex flex-col gap-4 border-t border-line pt-4">
        <h3 id={`${uid}-labels`} className="text-[10px] font-medium tracking-[0.16em] text-ink-soft uppercase">
          Labels
        </h3>
        {LABEL_SET_IDS.map((id) => (
          <SetPicker key={id} id={id} options={labelLists[id]} chosen={chosen[id]} onToggle={(tag) => toggle(id, tag)} />
        ))}
        <button type="button" onClick={saveSets} className={SAVE_CLASS}>
          Save labels
        </button>
      </section>

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <button
          type="submit"
          disabled={!detailsReady}
          className="min-h-10 rounded-md bg-accent px-3 py-2 text-sm font-medium text-board transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Save card
        </button>
        <button type="button" onClick={convert} disabled={!detailsReady} className={SAVE_CLASS}>
          {convertLabel}
        </button>
        {note.task ? (
          <button
            type="button"
            onClick={() => {
              onSave(note.id, { task: "remove" })
              setStatus("Turned back into a note.")
            }}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md text-sm text-ink-soft transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Undo2 className="size-4" aria-hidden="true" />
            Turn back into a note
          </button>
        ) : null}
        <p role="status" aria-live="polite" className="min-h-4 text-center text-xs text-ink-soft">
          {status}
        </p>
      </div>
    </form>
  )
}
