"use client"

import { useEffect, useMemo, useState } from "react"
import clsx from "clsx"
import {
  KANBAN_BOARDS,
  draftOf,
  matchColumn,
  sameDraft,
  type KanbanBoardId,
  type KanbanColumn,
} from "@/lib/kanban-data"
import { CardEditor } from "./card-editor"
import { ColumnEditor } from "./column-editor"
import { KanbanCardView } from "./kanban-card"
import { KanbanColumnView } from "./kanban-column"
import { useKanban } from "./kanban-provider"

export function KanbanScreen() {
  const {
    boardId,
    setBoardId,
    columnsByBoard,
    setColumnsByBoard,
    cards,
    setCards,
    openId,
    openCard,
    closeCard,
    drafts,
    editDraft,
    revertDraft,
    saveDraft,
  } = useKanban()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overTab, setOverTab] = useState<KanbanBoardId | null>(null)
  const [status, setStatus] = useState("")

  const board = KANBAN_BOARDS.find((item) => item.id === boardId) ?? KANBAN_BOARDS[0]!
  const columns = columnsByBoard[boardId]

  useEffect(() => {
    if (!status) return
    const timer = window.setTimeout(() => setStatus(""), 6000)
    return () => window.clearTimeout(timer)
  }, [status])

  const openCardData = openId ? (cards.find((item) => item.id === openId) ?? null) : null
  const boardCards = useMemo(() => cards.filter((card) => card.boardId === boardId), [cards, boardId])
  const counts = useMemo(() => {
    const result: Record<string, number> = {}
    for (const card of boardCards) result[card.columnId] = (result[card.columnId] ?? 0) + 1
    return result
  }, [boardCards])
  const boardTotals = useMemo(() => {
    const result: Partial<Record<KanbanBoardId, number>> = {}
    for (const card of cards) result[card.boardId] = (result[card.boardId] ?? 0) + 1
    return result
  }, [cards])

  const moveCard = (cardId: string, targetBoard: KanbanBoardId, columnId: string, beforeId: string | null) => {
    const card = cards.find((item) => item.id === cardId)
    const column = columnsByBoard[targetBoard].find((item) => item.id === columnId)
    if (!card || !column) return
    const sameSpot = card.boardId === targetBoard && card.columnId === columnId
    const held = cards.filter((item) => item.boardId === targetBoard && item.columnId === columnId && item.id !== cardId).length
    if (column.limit !== undefined && !sameSpot && held >= column.limit) {
      setStatus(`${column.name} is full at ${column.limit} cards. Finish or move one first.`)
      return
    }
    setCards((previous) => {
      const rest = previous.filter((item) => item.id !== cardId)
      const index = beforeId ? rest.findIndex((item) => item.id === beforeId) : -1
      const at = index < 0 ? rest.length : index
      return [...rest.slice(0, at), { ...card, boardId: targetBoard, columnId }, ...rest.slice(at)]
    })
    const targetName = KANBAN_BOARDS.find((item) => item.id === targetBoard)?.name
    setStatus(
      targetBoard === card.boardId
        ? `Moved “${card.title}” to ${column.name}.`
        : `Moved “${card.title}” to ${column.name} on the ${targetName} board.`,
    )
  }

  const moveToBoard = (cardId: string, targetBoard: KanbanBoardId) => {
    const card = cards.find((item) => item.id === cardId)
    if (!card || card.boardId === targetBoard) return
    const kind = columnsByBoard[card.boardId].find((item) => item.id === card.columnId)?.kind ?? "todo"
    const target = matchColumn(
      columnsByBoard[targetBoard],
      cards.filter((item) => item.id !== cardId),
      targetBoard,
      kind,
    )
    if (target) moveCard(cardId, targetBoard, target.id, null)
  }

  const updateColumns = (update: (list: KanbanColumn[]) => KanbanColumn[]) =>
    setColumnsByBoard((previous) => ({ ...previous, [boardId]: update(previous[boardId]) }))

  const renameColumn = (columnId: string, name: string) =>
    updateColumns((list) => list.map((column) => (column.id === columnId ? { ...column, name } : column)))

  const shiftColumn = (columnId: string, direction: -1 | 1) =>
    updateColumns((list) => {
      const index = list.findIndex((column) => column.id === columnId)
      const swap = index + direction
      if (index < 0 || swap < 0 || swap >= list.length) return list
      const next = [...list]
      ;[next[index], next[swap]] = [next[swap]!, next[index]!]
      return next
    })

  const removeColumn = (columnId: string) => {
    if (columns.length <= 1) return
    const index = columns.findIndex((column) => column.id === columnId)
    const neighbor = columns[index - 1] ?? columns[index + 1]
    if (index < 0 || !neighbor) return
    setCards((previous) =>
      previous.map((card) =>
        card.boardId === boardId && card.columnId === columnId ? { ...card, columnId: neighbor.id } : card,
      ),
    )
    updateColumns((list) => list.filter((column) => column.id !== columnId))
    const moved = counts[columnId] ?? 0
    setStatus(
      moved > 0
        ? `Removed ${columns[index]!.name}. ${moved} ${moved === 1 ? "card" : "cards"} moved to ${neighbor.name}.`
        : `Removed ${columns[index]!.name}.`,
    )
  }

  const addColumn = (name: string) => {
    const created: KanbanColumn = { id: `col-${Date.now().toString(36)}`, name, kind: "todo" }
    updateColumns((list) => {
      const doneAt = list.findIndex((column) => column.kind === "done")
      if (doneAt < 0) return [...list, created]
      return [...list.slice(0, doneAt), created, ...list.slice(doneAt)]
    })
    setStatus(`Added ${name}.`)
  }

  return (
    <main className="board-grain flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-6 pb-4 pt-5">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">Tasks in motion</p>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-ink">Kanban</h1>
        </div>

        <div role="tablist" aria-label="Boards" className="flex items-center gap-1 rounded-lg border border-line bg-desk/70 p-1">
          {KANBAN_BOARDS.map((item) => {
            const active = item.id === boardId
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                role="tab"
                type="button"
                aria-selected={active}
                aria-controls="kanban-panel"
                onClick={() => setBoardId(item.id)}
                onDragOver={(event) => {
                  if (!draggingId) return
                  event.preventDefault()
                  event.dataTransfer.dropEffect = "move"
                  setOverTab(item.id)
                }}
                onDragLeave={() => setOverTab((current) => (current === item.id ? null : current))}
                onDrop={(event) => {
                  if (!draggingId) return
                  event.preventDefault()
                  setOverTab(null)
                  moveToBoard(draggingId, item.id)
                  setDraggingId(null)
                }}
                className={clsx(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  active ? "bg-ink text-board" : "text-ink-soft hover:bg-line/50 hover:text-ink",
                  overTab === item.id && "bg-accent text-board outline-2 outline-accent",
                )}
              >
                {item.name}
                <span className={clsx("text-xs tabular-nums", active || overTab === item.id ? "text-board/70" : "text-ink-soft/70")}>
                  {boardTotals[item.id] ?? 0}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-3">
          <p role="status" aria-live="polite" className="max-w-xs text-pretty text-right text-sm text-ink-soft">
            {status}
          </p>
          <ColumnEditor
            boardName={board.name}
            columns={columns}
            counts={counts}
            onRename={renameColumn}
            onMove={shiftColumn}
            onRemove={removeColumn}
            onAdd={addColumn}
          />
        </div>
      </div>

      <div
        id="kanban-panel"
        role="tabpanel"
        aria-labelledby={`tab-${boardId}`}
        className="min-h-0 flex-1 overflow-x-auto px-6 pb-6"
      >
        <div className="flex h-full min-w-max gap-3">
          {columns.map((column) => (
            <KanbanColumnView
              key={column.id}
              column={column}
              count={counts[column.id] ?? 0}
              draggingId={draggingId}
              onDropCard={(columnId, beforeId) => {
                if (draggingId) moveCard(draggingId, boardId, columnId, beforeId)
                setDraggingId(null)
              }}
            >
              {boardCards
                .filter((card) => card.columnId === column.id)
                .map((card) => (
                  <KanbanCardView
                    key={card.id}
                    card={card}
                    columns={columns}
                    counts={counts}
                    done={column.kind === "done"}
                    dragging={draggingId === card.id}
                    onDragStart={setDraggingId}
                    onDragEnd={() => {
                      setDraggingId(null)
                      setOverTab(null)
                    }}
                    onMoveToColumn={(cardId, columnId) => moveCard(cardId, boardId, columnId, null)}
                    onMoveToBoard={moveToBoard}
                    onOpen={openCard}
                  />
                ))}
            </KanbanColumnView>
          ))}
        </div>
      </div>

      {openCardData && (
        <CardEditor
          key={openCardData.id}
          card={openCardData}
          draft={drafts[openCardData.id] ?? draftOf(openCardData)}
          dirty={openCardData.id in drafts && !sameDraft(drafts[openCardData.id]!, draftOf(openCardData))}
          onChange={(patch) => editDraft(openCardData.id, patch)}
          onClose={closeCard}
          onSave={() => {
            if (saveDraft(openCardData.id)) {
              setStatus("Saved the card.")
              closeCard()
            }
          }}
          onRevert={() => revertDraft(openCardData.id)}
        />
      )}
    </main>
  )
}
