"use client"

import { useState } from "react"
import clsx from "clsx"
import { MousePointerClick, Undo2 } from "lucide-react"
import { LABEL_GROUPS, type LabelGroupId, type Mode, type Note, type TaskDetails } from "@/lib/board-data"
import { LabelMark } from "./label-chip"

export function Inspector({
  mode,
  note,
  onToggleLabel,
  onSaveTask,
}: {
  mode: Mode
  note: Note | null
  onToggleLabel: (id: string, group: LabelGroupId, optionId: string) => void
  onSaveTask: (id: string, task: TaskDetails | null) => void
}) {
  return (
    <aside
      aria-label={mode === "labels" ? "Labels" : "Make a task"}
      className="pointer-events-auto flex max-h-full w-80 shrink-0 flex-col overflow-y-auto rounded-2xl border border-line bg-card p-5 shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)]"
    >
      {note ? (
        <>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-soft">
            Selected {note.task ? "task" : "card"}
          </p>
          <p className="mt-1 font-serif text-xl leading-snug text-pretty">
            {note.text.trim() || <span className="text-ink-soft italic">Blank card</span>}
          </p>
          <div className="mt-5 flex-1">
            {mode === "labels" ? (
              <LabelPanel note={note} onToggle={onToggleLabel} />
            ) : (
              <TaskForm key={note.id} note={note} onSave={onSaveTask} />
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-ink-soft">
          <MousePointerClick className="size-6" aria-hidden="true" />
          <p className="text-sm text-pretty">
            {mode === "labels"
              ? "Select a note on the board to give it labels."
              : "Select a note on the board to turn it into a task."}
          </p>
        </div>
      )}
    </aside>
  )
}

function LabelPanel({
  note,
  onToggle,
}: {
  note: Note
  onToggle: (id: string, group: LabelGroupId, optionId: string) => void
}) {
  return (
    <div className="flex flex-col gap-5">
      {LABEL_GROUPS.map((group) => (
        <fieldset key={group.id}>
          <legend className="flex items-center gap-2 text-sm font-medium text-ink">
            <LabelMark shape={group.shape} color="#23272b" />
            {group.name}
          </legend>
          <p className="mt-0.5 text-sm text-ink-soft">{group.question}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {group.options.map((option) => {
              const active = note.labels[group.id] === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggle(note.id, group.id, option.id)}
                  className={clsx(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    active ? "text-board" : "border-line text-ink hover:bg-desk",
                  )}
                  style={active ? { backgroundColor: option.color, borderColor: option.color } : undefined}
                >
                  <LabelMark shape={group.shape} color={active ? "#fffdf8" : option.color} />
                  {option.name}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}
      <p className="rounded-md bg-desk/70 px-3 py-2 text-xs leading-relaxed text-ink-soft">
        Prototype colors for this sketch. They are not an official course palette.
      </p>
    </div>
  )
}

function TaskForm({ note, onSave }: { note: Note; onSave: (id: string, task: TaskDetails | null) => void }) {
  const firstLabel = note.labels.area ?? note.labels.happiness ?? note.labels.budget ?? ""
  const [title, setTitle] = useState(note.task?.title ?? note.text)
  const [labelId, setLabelId] = useState(note.task?.labelId ?? firstLabel)
  const [due, setDue] = useState(note.task?.due ?? "")
  const [owner, setOwner] = useState(note.task?.owner ?? "Me")

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) return
    onSave(note.id, { title: cleanTitle, labelId: labelId || null, due, owner: owner.trim() })
  }

  const fieldClass =
    "h-9 w-full rounded-md border border-line bg-board px-3 text-sm text-ink focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/30"

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft text-pretty">One note becomes one task. Fill in four fields.</p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-title" className="text-sm font-medium">
          Title
        </label>
        <input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={80}
          autoComplete="off"
          className={fieldClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-label" className="text-sm font-medium">
          Label
        </label>
        <select id="task-label" value={labelId} onChange={(e) => setLabelId(e.target.value)} className={fieldClass}>
          <option value="">No label</option>
          {LABEL_GROUPS.map((group) => (
            <optgroup key={group.id} label={group.name}>
              {group.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-due" className="text-sm font-medium">
          Due date
        </label>
        <input id="task-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className={fieldClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-owner" className="text-sm font-medium">
          Owner
        </label>
        <input
          id="task-owner"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          maxLength={40}
          autoComplete="off"
          className={fieldClass}
        />
      </div>
      <div className="mt-1 flex flex-col gap-2">
        <button
          type="submit"
          className="h-10 rounded-md bg-accent text-sm font-medium text-board transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {note.task ? "Update task" : "Make task"}
        </button>
        {note.task ? (
          <button
            type="button"
            onClick={() => onSave(note.id, null)}
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
