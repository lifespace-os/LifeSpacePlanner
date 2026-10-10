export type GroupMove = { id: string; x: number; y: number; centerX: number; centerY: number }

export type GroupDrag = {
  /** Shifts every dragged card and the selection box by (dx, dy) world units, without touching React state. */
  apply: (dx: number, dy: number) => void
  /** Puts every dragged card and the box back where the drag began. */
  reset: () => void
  /** Settles the drag on whole pixels and returns where each card ended up. */
  commit: (dx: number, dy: number) => GroupMove[]
}

type Item = { id: string; el: HTMLElement; left: number; top: number }

function pixels(value: string, fallback: number) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function place(el: HTMLElement, left: number, top: number) {
  el.style.left = `${left}px`
  el.style.top = `${top}px`
}

/** Starts moving the cards in `ids` together. `root` is the world layer that holds the cards and the selection box. */
export function beginGroupDrag(root: HTMLElement, ids: readonly string[]): GroupDrag {
  const wanted = new Set(ids)
  const items: Item[] = []
  root.querySelectorAll<HTMLElement>("[data-note-id]").forEach((el) => {
    const id = el.dataset.noteId ?? ""
    if (!wanted.has(id)) return
    items.push({ id, el, left: pixels(el.style.left, el.offsetLeft), top: pixels(el.style.top, el.offsetTop) })
  })

  const boxEl = root.querySelector<HTMLElement>("[data-selection-box]")
  const box = boxEl
    ? { el: boxEl, left: pixels(boxEl.style.left, boxEl.offsetLeft), top: pixels(boxEl.style.top, boxEl.offsetTop) }
    : null

  function apply(dx: number, dy: number) {
    for (const item of items) place(item.el, item.left + dx, item.top + dy)
    if (box) place(box.el, box.left + dx, box.top + dy)
  }

  return {
    apply,
    reset: () => apply(0, 0),
    commit: (dx, dy) => {
      const moves = items.map<GroupMove>((item) => {
        const x = Math.round(item.left + dx)
        const y = Math.round(item.top + dy)
        place(item.el, x, y)
        return { id: item.id, x, y, centerX: x + item.el.offsetWidth / 2, centerY: y + item.el.offsetHeight / 2 }
      })
      if (box) place(box.el, box.left + Math.round(dx), box.top + Math.round(dy))
      return moves
    },
  }
}
