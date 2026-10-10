"use client"

import { useRef } from "react"
import type { Bucket, MissionChoice, Mode, Note } from "@/lib/board-data"
import { NoteCard } from "./note-card"
import { SortZones } from "./sort-zones"

export function Board({
  notes,
  mode,
  selectedId,
  onSelect,
  onMove,
  onFront,
  onMission,
  onDelete,
}: {
  notes: Note[]
  mode: Mode
  selectedId: string | null
  onSelect: (id: string | null) => void
  onMove: (id: string, x: number, y: number, bucket: Bucket) => void
  onFront: (id: string) => void
  onMission: (id: string, choice: Exclude<MissionChoice, null>) => void
  onDelete: (id: string) => void
}) {
  const boardRef = useRef<HTMLElement>(null)

  return (
    <section
      ref={boardRef}
      aria-label="Whiteboard"
      aria-describedby="board-help"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onSelect(null)
      }}
      className="board-grain relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-line shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_10px_30px_-18px_rgba(35,39,43,0.35)]"
    >
      <p id="board-help" className="sr-only">
        Drag a note with the mouse, or focus it and use the arrow keys to move it. Press Enter to select it.
      </p>

      {mode === "sort" ? <SortZones notes={notes} /> : null}

      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          mode={mode}
          selected={note.id === selectedId}
          boardRef={boardRef}
          onSelect={onSelect}
          onMove={onMove}
          onFront={onFront}
          onMission={onMission}
          onDelete={onDelete}
        />
      ))}
    </section>
  )
}
