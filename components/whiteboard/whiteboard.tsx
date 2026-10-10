"use client"

import { useCallback, useRef, useState } from "react"
import {
  MODES,
  SAMPLE_NOTES,
  type Bucket,
  type LabelGroupId,
  type MissionChoice,
  type Mode,
  type Note,
  type NoteKind,
  type TaskDetails,
} from "@/lib/board-data"
import { ModeSwitcher } from "./mode-switcher"
import { ModeBar } from "./mode-bar"
import { Board } from "./board"
import { Inspector } from "./inspector"

export function Whiteboard() {
  const [notes, setNotes] = useState<Note[]>(SAMPLE_NOTES)
  const [mode, setMode] = useState<Mode>("unload")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const idCounter = useRef(0)

  const updateNote = useCallback((id: string, change: (note: Note) => Note) => {
    setNotes((prev) => prev.map((note) => (note.id === id ? change(note) : note)))
  }, [])

  const addNote = useCallback((text: string, kind: NoteKind) => {
    idCounter.current += 1
    const id = `new-${idCounter.current}`
    setNotes((prev) => {
      const maxZ = prev.reduce((max, note) => Math.max(max, note.z), 0)
      return [
        ...prev,
        {
          id,
          text,
          kind,
          x: 0.3 + Math.random() * 0.3,
          y: 0.18 + Math.random() * 0.35,
          rotation: Math.round((Math.random() * 6 - 3) * 10) / 10,
          z: maxZ + 1,
          bucket: null,
          mission: null,
          labels: {},
          task: null,
        },
      ]
    })
  }, [])

  const moveNote = useCallback(
    (id: string, x: number, y: number, bucket: Bucket) => updateNote(id, (note) => ({ ...note, x, y, bucket })),
    [updateNote],
  )

  const bringToFront = useCallback((id: string) => {
    setNotes((prev) => {
      const maxZ = prev.reduce((max, note) => Math.max(max, note.z), 0)
      const target = prev.find((note) => note.id === id)
      if (!target || target.z === maxZ) return prev
      return prev.map((note) => (note.id === id ? { ...note, z: maxZ + 1 } : note))
    })
  }, [])

  const setMission = useCallback(
    (id: string, choice: Exclude<MissionChoice, null>) =>
      updateNote(id, (note) => ({ ...note, mission: note.mission === choice ? null : choice })),
    [updateNote],
  )

  const toggleLabel = useCallback(
    (id: string, group: LabelGroupId, optionId: string) =>
      updateNote(id, (note) => {
        const labels = { ...note.labels }
        if (labels[group] === optionId) delete labels[group]
        else labels[group] = optionId
        return { ...note, labels }
      }),
    [updateNote],
  )

  const saveTask = useCallback(
    (id: string, task: TaskDetails | null) => updateNote(id, (note) => ({ ...note, task })),
    [updateNote],
  )

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id))
    setSelectedId((current) => (current === id ? null : current))
  }, [])

  const activeMode = MODES.find((m) => m.id === mode) ?? MODES[0]
  const showInspector = mode === "labels" || mode === "task"
  const selectedNote = notes.find((note) => note.id === selectedId) ?? null

  return (
    <main className="flex h-[calc(100dvh-3.5rem)] min-h-[680px] flex-col gap-4 px-6 pt-5 pb-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">
            Whiteboard <span aria-hidden="true">·</span> {notes.length} notes
          </p>
          <h1 className="font-serif text-4xl font-medium tracking-tight">Unload</h1>
        </div>
        <ModeSwitcher mode={mode} onChange={setMode} />
      </div>

      <ModeBar mode={activeMode} notes={notes} onAdd={addNote} />

      <div className="flex min-h-0 flex-1 gap-4">
        <Board
          notes={notes}
          mode={mode}
          selectedId={showInspector ? selectedId : null}
          onSelect={setSelectedId}
          onMove={moveNote}
          onFront={bringToFront}
          onMission={setMission}
          onDelete={deleteNote}
        />
        {showInspector ? (
          <Inspector mode={mode} note={selectedNote} onToggleLabel={toggleLabel} onSaveTask={saveTask} />
        ) : null}
      </div>
    </main>
  )
}
