"use client"

import { useLayoutEffect, useRef, useState, type RefObject } from "react"
import clsx from "clsx"
import { beginGroupDrag, type GroupDrag, type GroupMove } from "@/lib/group-drag"
import type { Note, View } from "@/lib/board-data"

type Bounds = { left: number; top: number; width: number; height: number }

type DragState = { pointerId: number; startX: number; startY: number; group: GroupDrag; moved: boolean }

const PADDING = 14

function sameBounds(a: Bounds | null, b: Bounds | null) {
  if (a === b) return true
  if (!a || !b) return false
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height
}

/** A frame around two or more selected cards. Dragging it moves every selected card by the same distance. */
export function SelectionBox({
  notes,
  ids,
  viewRef,
  fixed,
  tagTarget,
  onMoveMany,
  onTagDrag,
}: {
  notes: Note[]
  ids: string[]
  viewRef: RefObject<View>
  /** In the Ikigai view the cards return after a drop, so the frame returns with them. */
  fixed: boolean
  /** In the Markers view the frame moves freely, and a drop on the marker area tags the cards and returns them. */
  tagTarget: boolean
  onMoveMany: (moves: GroupMove[]) => void
  onTagDrag: (id: string, clientX: number, clientY: number, phase: "move" | "drop" | "cancel") => boolean
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const drag = useRef<DragState | null>(null)
  const [bounds, setBounds] = useState<Bounds | null>(null)
  const [dragging, setDragging] = useState(false)

  useLayoutEffect(() => {
    const root = boxRef.current?.parentElement
    let next: Bounds | null = null
    if (root && ids.length > 1) {
      const wanted = new Set(ids)
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      root.querySelectorAll<HTMLElement>("[data-note-id]").forEach((el) => {
        if (!wanted.has(el.dataset.noteId ?? "")) return
        minX = Math.min(minX, el.offsetLeft)
        minY = Math.min(minY, el.offsetTop)
        maxX = Math.max(maxX, el.offsetLeft + el.offsetWidth)
        maxY = Math.max(maxY, el.offsetTop + el.offsetHeight)
      })
      if (minX !== Infinity) {
        next = {
          left: minX - PADDING,
          top: minY - PADDING,
          width: maxX - minX + PADDING * 2,
          height: maxY - minY + PADDING * 2,
        }
      }
    }
    setBounds((prev) => (sameBounds(prev, next) ? prev : next))
  }, [notes, ids])

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.stopPropagation()
    const root = boxRef.current?.parentElement
    if (!root) return
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      group: beginGroupDrag(root, ids),
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY
    if (!state.moved) {
      if (Math.hypot(dx, dy) < 4) return
      state.moved = true
      setDragging(true)
    }
    const zoom = viewRef.current.zoom
    state.group.apply(dx / zoom, dy / zoom)
    if (fixed || tagTarget) onTagDrag(ids[0], event.clientX, event.clientY, "move")
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    drag.current = null
    if (!state.moved) return
    setDragging(false)
    const dropped = event.type === "pointerup"
    if (fixed) {
      state.group.reset()
      onTagDrag(ids[0], event.clientX, event.clientY, dropped ? "drop" : "cancel")
      return
    }
    if (tagTarget && onTagDrag(ids[0], event.clientX, event.clientY, dropped ? "drop" : "cancel")) {
      state.group.reset()
      return
    }
    const zoom = viewRef.current.zoom
    const dx = dropped ? (event.clientX - state.startX) / zoom : 0
    const dy = dropped ? (event.clientY - state.startY) / zoom : 0
    onMoveMany(state.group.commit(dx, dy))
  }

  return (
    <div
      ref={boxRef}
      data-selection-box=""
      role="group"
      aria-label={`${ids.length} selected cards. Drag to move them together.`}
      hidden={bounds === null}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      style={bounds ?? undefined}
      className={clsx(
        "absolute touch-none rounded-md border-2 border-dashed border-accent bg-accent-soft/40",
        dragging ? "cursor-grabbing" : "cursor-move",
      )}
    />
  )
}
