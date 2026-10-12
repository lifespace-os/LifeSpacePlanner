"use client"

import { useLayoutEffect, useMemo, useRef, useState } from "react"
import clsx from "clsx"
import { goalLinks, type GoalRing, type Note } from "@/lib/board-data"
import { cardLinkIssue, MISSION_LINK } from "@/lib/card-links"

export type BoardLinkState = {
  rings: GoalRing[]
  /** The one selected card, which carries the handle and whose lines show. Null when none or several are selected. */
  selectedId: string | null
  /** When true every line on the board shows, not only the selected card's. */
  all: boolean
  missionText: string
  toWorld: (clientX: number, clientY: number) => { x: number; y: number }
  onLinks: (id: string, parentIds: string[]) => void
  onNotice: (message: string | null) => void
}

type Box = { x: number; y: number; w: number; h: number }
type Point = { x: number; y: number }

const MISSION_W = 176
const MISSION_H = 44
const MISSION_GAP = 120
const HANDLE = 22

function shorten(text: string, max = 34) {
  const clean = text.replace(/\s+/g, " ").trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean || "Blank card"
}

function sameBoxes(a: Map<string, Box>, b: Map<string, Box>) {
  if (a.size !== b.size) return false
  for (const [id, box] of a) {
    const other = b.get(id)
    if (!other || other.x !== box.x || other.y !== box.y || other.w !== box.w || other.h !== box.h) return false
  }
  return true
}

/** Where the segment from a box's center toward a point leaves the box. */
function edgePoint(box: Box, toward: Point): Point {
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const dx = toward.x - cx
  const dy = toward.y - cy
  if (dx === 0 && dy === 0) return { x: cx, y: cy }
  const t = Math.min(box.w / 2 / Math.abs(dx || 1e-9), box.h / 2 / Math.abs(dy || 1e-9), 1)
  return { x: cx + dx * t, y: cy + dy * t }
}

const centerOf = (box: Box): Point => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 })

/**
 * The link handle and the lines on a free board. A line is the same goal-above link the Graph draws:
 * it lives in the card's parentIds, so the Graph, the Map and the card window all change together.
 */
export function BoardLinks({ notes, links, zoom }: { notes: Note[]; links: BoardLinkState; zoom: number }) {
  const { rings, selectedId, all, missionText, toWorld, onLinks, onNotice } = links
  const rootRef = useRef<HTMLDivElement>(null)
  const press = useRef<number | null>(null)
  const [boxes, setBoxes] = useState<Map<string, Box>>(() => new Map())
  const [linking, setLinking] = useState<{ from: string; x: number; y: number; target: string | null } | null>(null)

  const byId = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes])

  useLayoutEffect(() => {
    const world = rootRef.current?.parentElement
    if (!world) return
    const next = new Map<string, Box>()
    world.querySelectorAll<HTMLElement>("[data-note-id]").forEach((el) => {
      next.set(el.dataset.noteId ?? "", { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight })
    })
    setBoxes((prev) => (sameBoxes(prev, next) ? prev : next))
  })

  const mission = useMemo<Box>(() => {
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    for (const box of boxes.values()) {
      minX = Math.min(minX, box.x)
      maxX = Math.max(maxX, box.x + box.w)
      minY = Math.min(minY, box.y)
    }
    if (minX === Infinity) return { x: -MISSION_W / 2, y: -MISSION_GAP, w: MISSION_W, h: MISSION_H }
    return { x: (minX + maxX) / 2 - MISSION_W / 2, y: minY - MISSION_GAP - MISSION_H, w: MISSION_W, h: MISSION_H }
  }, [boxes])

  const boxOf = (id: string) => (id === MISSION_LINK ? mission : boxes.get(id))
  const nameOf = (id: string) =>
    id === MISSION_LINK ? (missionText.trim() ? shorten(missionText, 40) : "Mission") : shorten(byId.get(id)?.text || byId.get(id)?.task?.title || "")

  const lines = useMemo(() => {
    const found: { id: string; fromId: string; toId: string }[] = []
    for (const note of notes) {
      if (!all && note.id !== selectedId) {
        // Incoming lines of the selected card: other cards that have it as a goal above.
        if (!selectedId) continue
        if (!goalLinks(note, byId, rings).includes(selectedId)) continue
        found.push({ id: `${note.id}>${selectedId}`, fromId: note.id, toId: selectedId })
        continue
      }
      for (const toId of goalLinks(note, byId, rings)) found.push({ id: `${note.id}>${toId}`, fromId: note.id, toId })
    }
    return found.filter((line) => boxOf(line.fromId) && boxOf(line.toId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, byId, rings, all, selectedId, boxes, mission])

  const showMission = all || selectedId !== null || linking !== null
  const handleBox = selectedId ? boxes.get(selectedId) : undefined
  const scale = Math.max(1, Math.min(1.8, 1 / zoom))

  function targetAt(clientX: number, clientY: number, fromId: string): string | null {
    for (const el of document.elementsFromPoint(clientX, clientY)) {
      if (el.closest("[data-link-mission]")) return MISSION_LINK
      const id = el.closest<HTMLElement>("[data-note-id]")?.dataset.noteId
      if (id && id !== fromId) return id
    }
    return null
  }

  function removeLink(fromId: string, toId: string) {
    const note = byId.get(fromId)
    if (!note) return
    onLinks(
      fromId,
      goalLinks(note, byId, rings).filter((id) => id !== toId),
    )
    onNotice(`Removed the link from ${nameOf(fromId)} to ${nameOf(toId)}.`)
  }

  function handleDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !selectedId) return
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    press.current = event.pointerId
    onNotice(null)
    setLinking({ from: selectedId, ...toWorld(event.clientX, event.clientY), target: null })
  }

  function handleMove(event: React.PointerEvent<HTMLDivElement>) {
    if (press.current !== event.pointerId) return
    const point = toWorld(event.clientX, event.clientY)
    setLinking((current) =>
      current ? { ...current, ...point, target: targetAt(event.clientX, event.clientY, current.from) } : current,
    )
  }

  function handleUp(event: React.PointerEvent<HTMLDivElement>) {
    if (press.current !== event.pointerId) return
    press.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    const from = linking?.from
    setLinking(null)
    if (!from) return
    const target = targetAt(event.clientX, event.clientY, from)
    if (!target) return
    const issue = cardLinkIssue(from, target, byId, rings)
    if (issue) {
      onNotice(issue)
      return
    }
    const note = byId.get(from)
    if (!note) return
    onLinks(from, [...goalLinks(note, byId, rings), target])
    onNotice(`Linked ${nameOf(from)} to ${nameOf(target)}.`)
  }

  const previewFrom = linking ? boxes.get(linking.from) : undefined
  const previewTargetBox = linking?.target ? boxOf(linking.target) : undefined
  const previewEnd: Point | null = linking ? (previewTargetBox ? centerOf(previewTargetBox) : { x: linking.x, y: linking.y }) : null

  return (
    <div ref={rootRef} data-board-links="" className="pointer-events-none absolute top-0 left-0 h-0 w-0" style={{ zIndex: 100000 }}>
      <svg width={1} height={1} className="pointer-events-none absolute top-0 left-0 overflow-visible" aria-hidden={lines.length === 0}>
        <defs>
          <marker id="board-link-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--color-accent)" />
          </marker>
        </defs>
        {lines.map((line) => {
          const from = boxOf(line.fromId)!
          const to = boxOf(line.toId)!
          const a = edgePoint(from, centerOf(to))
          const b = edgePoint(to, centerOf(from))
          const label = `Link from ${nameOf(line.fromId)} to ${nameOf(line.toId)}. Click to remove.`
          return (
            <g
              key={line.id}
              data-board-control=""
              data-board-link={line.id}
              role="button"
              tabIndex={0}
              aria-label={label}
              className="group pointer-events-none cursor-pointer outline-none"
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  removeLink(line.fromId, line.toId)
                }
              }}
            >
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                strokeWidth={2.5 * scale}
                markerEnd="url(#board-link-arrow)"
                className="stroke-accent group-hover:stroke-release group-focus-visible:stroke-release"
                strokeLinecap="round"
              />
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="transparent"
                strokeWidth={16 * scale}
                strokeLinecap="round"
                pointerEvents="stroke"
                onClick={() => removeLink(line.fromId, line.toId)}
              />
            </g>
          )
        })}
        {previewFrom && previewEnd ? (
          <line
            x1={edgePoint(previewFrom, previewEnd).x}
            y1={edgePoint(previewFrom, previewEnd).y}
            x2={previewEnd.x}
            y2={previewEnd.y}
            strokeWidth={2.5 * scale}
            strokeDasharray={`${8 * scale} ${6 * scale}`}
            strokeLinecap="round"
            className="stroke-accent"
          />
        ) : null}
      </svg>

      {linking?.target && linking.target !== MISSION_LINK && previewTargetBox ? (
        <div
          aria-hidden="true"
          className="absolute rounded-md border-2 border-dashed border-accent"
          style={{ left: previewTargetBox.x - 6, top: previewTargetBox.y - 6, width: previewTargetBox.w + 12, height: previewTargetBox.h + 12 }}
        />
      ) : null}

      {showMission ? (
        <div
          data-board-control=""
          data-link-mission=""
          role="note"
          aria-label={`Mission. ${missionText.trim() || "No sentence yet"}. Drop the link handle here to make the mission a goal above.`}
          className={clsx(
            "pointer-events-auto absolute flex items-center justify-center rounded-full border-2 px-4 text-center text-sm font-medium shadow-md select-none",
            linking?.target === MISSION_LINK
              ? "border-accent bg-accent text-board"
              : "border-accent bg-card text-ink",
          )}
          style={{ left: mission.x, top: mission.y, width: mission.w, height: mission.h }}
        >
          <span className="truncate">{nameOf(MISSION_LINK)}</span>
        </div>
      ) : null}

      {handleBox && selectedId ? (
        <div
          data-board-control=""
          data-link-handle={selectedId}
          role="button"
          tabIndex={-1}
          aria-label="Link handle. Drag it onto another card or the Mission to make that a goal above this card."
          title="Drag onto another card or the Mission"
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
          className="pointer-events-auto absolute flex cursor-crosshair touch-none items-center justify-center rounded-full border-2 border-board bg-accent shadow-md"
          style={{
            width: HANDLE,
            height: HANDLE,
            left: handleBox.x + handleBox.w,
            top: handleBox.y + handleBox.h / 2,
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          <span aria-hidden="true" className="size-1.5 rounded-full bg-board" />
        </div>
      ) : null}
    </div>
  )
}
