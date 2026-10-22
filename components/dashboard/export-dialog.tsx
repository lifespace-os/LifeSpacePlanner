"use client"

import { useId, useRef, useState } from "react"
import Link from "next/link"
import clsx from "clsx"
import type { SheetFormat, SheetPart } from "@/components/dashboard/export-sheet"
import { getCardColor, type GoalRing, type Note } from "@/lib/board-data"
import type { FinishedCounts, Flow } from "@/lib/dashboard"
import type { GraphBox, GraphSpot } from "@/lib/graph-layout"
import type { LabelShareGroup } from "@/lib/label-shares"
import type { LifeGrid } from "@/lib/life-weeks"
import { graphTile, mapTile } from "@/lib/map-tile"
import type { MissionCounts } from "@/lib/mission-counts"
import { todayIso } from "@/lib/repeat"
import type { WheelsData } from "@/lib/wheels"

type Props = {
  notes: Note[]
  rings: GoalRing[]
  spots: Record<string, GraphSpot>
  boxes: Record<string, GraphBox>
  counts: FinishedCounts | null
  flow: Flow
  mission: MissionCounts
  wheels: WheelsData
  labels: LabelShareGroup[]
  life: LifeGrid | null
}

const PARTS: { id: SheetPart; name: string; hint?: string }[] = [
  { id: "counts", name: "Counts" },
  { id: "flow", name: "Flow" },
  { id: "mission", name: "Mission" },
  { id: "map", name: "Map", hint: "The rings and the Graph" },
  { id: "wheels", name: "Wheels" },
  { id: "labels", name: "Labels" },
  { id: "life", name: "Life in weeks", hint: "The view, not a Dashboard tile" },
]

const button =
  "rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"

export function ExportDialog({ notes, rings, spots, boxes, counts, flow, mission, wheels, labels, life }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [picked, setPicked] = useState<Set<SheetPart>>(new Set(["counts", "flow", "mission", "map", "wheels", "labels"]))
  const [format, setFormat] = useState<SheetFormat>("image")
  const [tagNames, setTagNames] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const chosen = PARTS.filter((part) => picked.has(part.id) && (part.id !== "life" || life))

  function toggle(id: SheetPart) {
    setPicked((before) => {
      const next = new Set(before)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function run() {
    setBusy(true)
    setError("")
    try {
      const { buildSheet } = await import("@/components/dashboard/export-sheet")
      const date = todayIso()
      const { blob, fileName } = await buildSheet(
        {
          counts,
          flow,
          mission,
          map: mapTile(notes, rings),
          graph: graphTile(notes, rings, spots, boxes),
          dotFills: new Map(notes.map((note) => [note.id, getCardColor(note.color).fill])),
          rings,
          wheels,
          labels,
          life,
        },
        { parts: chosen.map((part) => part.id), tagNames, date, format },
      )
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      document.body.append(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      dialog.current?.close()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The sheet could not be built.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className={clsx(button, "border border-line bg-card text-ink hover:bg-accent-soft")}
      >
        Export
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close()
        }}
        className="m-auto w-[min(92vw,28rem)] rounded-xl border border-line bg-card p-0 text-ink shadow-xl backdrop:bg-ink/40"
      >
        <div className="flex max-h-[88vh] flex-col gap-5 overflow-y-auto p-5">
          <h2 id={titleId} className="font-serif text-2xl font-medium">
            Export the Dashboard
          </h2>

          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-1 text-sm text-ink-soft">Pictures to include</legend>
            {PARTS.map((part) => {
              const unavailable = part.id === "life" && !life
              return (
                <label key={part.id} className={clsx("flex items-start gap-3", unavailable && "text-ink-soft")}>
                  <input
                    type="checkbox"
                    checked={picked.has(part.id) && !unavailable}
                    disabled={unavailable}
                    onChange={() => toggle(part.id)}
                    className="mt-0.5 size-4 accent-accent"
                  />
                  <span className="flex flex-col">
                    <span className="text-sm text-pretty">{part.name}</span>
                    {part.hint && !unavailable ? <span className="text-xs text-ink-soft">{part.hint}</span> : null}
                    {unavailable ? (
                      <span className="text-xs text-ink-soft">
                        Enter your date of birth and years in{" "}
                        <Link href="/settings" className="underline underline-offset-2">
                          Settings
                        </Link>{" "}
                        first.
                      </span>
                    ) : null}
                  </span>
                </label>
              )
            })}
          </fieldset>

          <div className="flex flex-col gap-2">
            <span id={`${titleId}-format`} className="text-sm text-ink-soft">
              File
            </span>
            <div role="radiogroup" aria-labelledby={`${titleId}-format`} className="grid grid-cols-2 gap-1 rounded-lg border border-line p-1">
              {(["image", "pdf"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={format === id}
                  onClick={() => setFormat(id)}
                  className={clsx(
                    "rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    format === id ? "bg-accent text-card" : "text-ink hover:bg-accent-soft",
                  )}
                >
                  {id === "image" ? "Image" : "PDF"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span id={`${titleId}-names`} className="text-sm">
              Show tag names
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={tagNames}
              aria-labelledby={`${titleId}-names`}
              onClick={() => setTagNames((on) => !on)}
              className={clsx(
                "relative h-6 w-11 shrink-0 rounded-full border border-line transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                tagNames ? "bg-accent" : "bg-line/60",
              )}
            >
              <span
                aria-hidden="true"
                className={clsx(
                  "absolute top-0.5 left-0.5 size-4 rounded-full bg-card shadow transition-transform",
                  tagNames && "translate-x-5",
                )}
              />
            </button>
          </div>
          <p className="-mt-3 text-xs text-ink-soft text-pretty">
            When off, slices and sectors keep their colors and lose their names.
          </p>

          <p role="status" className="min-h-5 text-sm text-ink-soft">
            {busy ? "Building the sheet\u2026" : error}
          </p>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className={clsx(button, "border border-line text-ink hover:bg-accent-soft")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={run}
              disabled={busy || chosen.length === 0}
              className={clsx(button, "bg-ink text-board")}
            >
              Export
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}
