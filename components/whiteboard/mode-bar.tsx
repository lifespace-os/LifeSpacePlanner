"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { KIND_LABEL, MISSION, type MODES, type Note, type NoteKind } from "@/lib/board-data"

type ModeInfo = (typeof MODES)[number]

export function ModeBar({
  mode,
  notes,
  onAdd,
}: {
  mode: ModeInfo
  notes: Note[]
  onAdd: (text: string, kind: NoteKind) => void
}) {
  if (mode.id === "mission") return <MissionStrip notes={notes} />

  return (
    <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-board/70 px-4 py-2">
      <p className="text-sm text-ink-soft">
        <span className="mr-2 font-medium text-ink">{mode.name}</span>
        {mode.hint}
      </p>
      {mode.id === "unload" ? <NoteComposer onAdd={onAdd} /> : null}
    </div>
  )
}

function MissionStrip({ notes }: { notes: Note[] }) {
  const kept = notes.filter((n) => n.mission === "keep").length
  const released = notes.filter((n) => n.mission === "release").length
  const open = notes.length - kept - released

  return (
    <figure className="flex min-h-14 flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-accent/30 bg-accent-soft px-5 py-2">
      <figcaption className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Mission</figcaption>
      <blockquote className="font-serif text-xl italic text-ink text-pretty">{`\u201C${MISSION}\u201D`}</blockquote>
      <p className="ml-auto text-sm text-ink-soft tabular-nums">
        {kept} kept <span aria-hidden="true">·</span> {released} released <span aria-hidden="true">·</span> {open} open
      </p>
    </figure>
  )
}

const KINDS: NoteKind[] = ["wish", "worry", "obligation", "task"]

function NoteComposer({ onAdd }: { onAdd: (text: string, kind: NoteKind) => void }) {
  const [text, setText] = useState("")
  const [kind, setKind] = useState<NoteKind>("wish")

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = text.trim()
    if (!value) return
    onAdd(value, kind)
    setText("")
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <label htmlFor="new-note" className="sr-only">
        New thought
      </label>
      <input
        id="new-note"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
        }}
        placeholder="Write a thought…"
        autoComplete="off"
        maxLength={120}
        className="h-9 w-72 rounded-md border border-line bg-card px-3 text-sm text-ink placeholder:text-ink-soft/70 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/30"
      />
      <label htmlFor="new-note-kind" className="sr-only">
        Kind of thought
      </label>
      <select
        id="new-note-kind"
        value={kind}
        onChange={(e) => setKind(e.target.value as NoteKind)}
        className="h-9 rounded-md border border-line bg-card px-2 text-sm text-ink focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/30"
      >
        {KINDS.map((k) => (
          <option key={k} value={k}>
            {KIND_LABEL[k]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={!text.trim()}
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-ink px-3 text-sm text-board transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Plus className="size-4" aria-hidden="true" />
        Add note
      </button>
    </form>
  )
}
