"use client"

import { useRef, useState } from "react"
import clsx from "clsx"
import { CARD_COLORS, getCardColor, type CardColorId } from "@/lib/board-data"

type DragState = { pointerId: number; startX: number; startY: number; moved: boolean }

export function CardDock({
  color,
  onColorChange,
  onDrop,
  onPlaceCenter,
}: {
  color: CardColorId
  onColorChange: (color: CardColorId) => void
  onDrop: (clientX: number, clientY: number) => void
  onPlaceCenter: () => void
}) {
  const dockRef = useRef<HTMLDivElement>(null)
  const drag = useRef<DragState | null>(null)
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null)
  const swatch = getCardColor(color)

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    event.preventDefault()
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    if (!state.moved && Math.hypot(event.clientX - state.startX, event.clientY - state.startY) < 4) return
    state.moved = true
    setGhost({ x: event.clientX, y: event.clientY })
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLButtonElement>) {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    drag.current = null
    setGhost(null)
    if (event.type !== "pointerup") return
    if (!state.moved) {
      onPlaceCenter()
      return
    }
    const rect = dockRef.current?.getBoundingClientRect()
    const overDock =
      rect &&
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    if (!overDock) onDrop(event.clientX, event.clientY)
  }

  return (
    <>
      <div
        ref={dockRef}
        className="pointer-events-auto flex items-center gap-4 rounded-2xl border border-line bg-board/95 py-2.5 pr-4 pl-3 shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)] backdrop-blur"
      >
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              onPlaceCenter()
            }
          }}
          aria-label={`New ${swatch.name.toLowerCase()} card. Drag onto the canvas, or press Enter to place it in the middle.`}
          className="group flex touch-none cursor-grab items-center gap-3 rounded-lg py-1 pr-2 pl-1 active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span
            aria-hidden="true"
            className="block h-11 w-14 -rotate-3 rounded-[3px] border-b-2 shadow-[0_1px_1px_rgba(35,39,43,0.08),0_6px_10px_-6px_rgba(35,39,43,0.4)] transition-transform group-hover:-translate-y-1 group-hover:rotate-0"
            style={{ backgroundColor: swatch.fill, borderBottomColor: swatch.edge }}
          />
          <span className="flex flex-col items-start text-left leading-tight">
            <span className="text-sm font-medium text-ink">New card</span>
            <span className="text-xs text-ink-soft">Drag to place</span>
          </span>
        </button>

        <span aria-hidden="true" className="h-9 w-px bg-line" />

        <div role="radiogroup" aria-label="Card color" className="flex items-center gap-1.5">
          {CARD_COLORS.map((option) => {
            const active = option.id === color
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={option.name}
                title={option.name}
                onClick={() => onColorChange(option.id)}
                className={clsx(
                  "size-7 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  active ? "scale-110 ring-2 ring-ink ring-offset-2 ring-offset-board" : "",
                )}
                style={{ backgroundColor: option.fill, borderColor: option.edge }}
              />
            )
          })}
        </div>
      </div>

      {ghost ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[100] h-[132px] w-[196px] -translate-x-1/2 -translate-y-1/2 rotate-2 rounded-sm border-b-2 opacity-90 shadow-[0_18px_30px_-12px_rgba(35,39,43,0.45)]"
          style={{ left: ghost.x, top: ghost.y, backgroundColor: swatch.fill, borderBottomColor: swatch.edge }}
        />
      ) : null}
    </>
  )
}
