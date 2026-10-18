"use client"

import { useEffect, useMemo, useState } from "react"
import clsx from "clsx"
import {
  KANBAN_BOARDS,
  draftOf,
  hasMissionPath,
  matchColumn,
  resultEntries,
  resultKey,
  sameDraft,
  type KanbanBoardId,
  type KanbanColumn,
} from "@/lib/kanban-data"
import { useGoals } from "@/components/goals-provider"
import { useMission } from "@/components/mission-provider"
import { belowIds, ringCardsOf } from "@/lib/ring-focus"
import { filterGoalIds, highlightColor, passesFilter, ringHashtags } from "@/lib/kanban-filter"
import { CardEditor } from "./card-editor"
import { ColumnEditor } from "./column-editor"
import { FilterBar } from "./filter-bar"
import { KanbanCardView } from "./kanban-card"
import { KanbanColumnView } from "./kanban-column"
import { useKanban } from "./kanban-provider"
import { MissionStrip } from "./mission-strip"
import { ResultsGrid } from "./results-grid"
import { RingRow } from "./ring-row"
import { ToggleSwitch } from "./toggle-switch"

export function KanbanScreen() {
  const {
    boardId,
    setBoardId,
    columnsByBoard,
    setColumnsByBoard,
    cards,
    setCards,
    missionOnly,
    setMissionOnly,
    ringsOn,
    setRingsOn,
    resultsOn,
    setResultsOn,
    ringFocusId,
    setRingFocusId,
    cardFilter,
    setCardFilter,
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
  const boardCards = useMemo(
    () => cards.filter((card) => card.boardId === boardId && !card.inResults),
    [cards, boardId],
  )
  const resultList = useMemo(() => resultEntries(cards), [cards])
  const resultCards = useMemo(() => resultList.map((entry) => entry.card), [resultList])
  const boardNamesById = useMemo(() => {
    const order = KANBAN_BOARDS.map((item) => item.id)
    const result: Record<string, string> = {}
    for (const entry of resultList) {
      result[entry.card.id] = [...entry.boardIds]
        .sort((a, b) => order.indexOf(a) - order.indexOf(b))
        .map((id) => KANBAN_BOARDS.find((item) => item.id === id)?.name ?? id)
        .join(", ")
    }
    return result
  }, [resultList])
  const doneTaskCount = useMemo(() => {
    const keys = new Set<string>()
    for (const card of cards) {
      if (card.inResults) continue
      if (columnsByBoard[card.boardId].find((column) => column.id === card.columnId)?.kind === "done") keys.add(resultKey(card))
    }
    return keys.size
  }, [cards, columnsByBoard])
  const { missionText } = useMission()
  const filtering = missionOnly && missionText.length > 0
  const { notes, rings } = useGoals()
  const ringNotes = useMemo(() => ringCardsOf(notes, rings), [notes, rings])
  const focusedId = ringsOn && !resultsOn && ringFocusId && ringNotes.some((note) => note.id === ringFocusId) ? ringFocusId : null
  const below = useMemo(() => (focusedId ? belowIds(focusedId, notes, rings) : null), [focusedId, notes, rings])
  const shownRingNotes = below ? ringNotes.filter((note) => below.has(note.id)) : ringNotes
  const taskCounts = useMemo(() => {
    const finishedByTask = new Map<string, boolean>()
    const goalIdsByTask = new Map<string, string[]>()
    for (const card of cards) {
      const key = resultKey(card)
      const finished = card.inResults || columnsByBoard[card.boardId].find((column) => column.id === card.columnId)?.kind === "done"
      finishedByTask.set(key, (finishedByTask.get(key) ?? false) || finished)
      goalIdsByTask.set(key, [...(goalIdsByTask.get(key) ?? []), ...card.goalIds])
    }
    const result: Record<string, { done: number; total: number }> = {}
    for (const note of ringNotes) {
      const subtree = belowIds(note.id, notes, rings)
      let done = 0
      let total = 0
      for (const [key, goalIds] of goalIdsByTask) {
        if (!goalIds.some((id) => subtree.has(id))) continue
        total += 1
        if (finishedByTask.get(key)) done += 1
      }
      result[note.id] = { done, total }
    }
    return result
  }, [ringNotes, notes, rings, cards, columnsByBoard])
  const activeFilter = useMemo(() => {
    if (!cardFilter.ring) return cardFilter
    const known = ringHashtags(cardFilter.ring, notes, rings).some((entry) => entry.tag === cardFilter.tag)
    return known ? cardFilter : { ring: cardFilter.ring, tag: null, label: null }
  }, [cardFilter, notes, rings])
  const keptIds = useMemo(() => filterGoalIds(activeFilter, notes, rings), [activeFilter, notes, rings])
  const visibleCards = useMemo(() => {
    const byMission = filtering ? boardCards.filter(hasMissionPath) : boardCards
    const byRing = below ? byMission.filter((card) => card.goalIds.some((id) => below.has(id))) : byMission
    return byRing.filter((card) => passesFilter(card, activeFilter, keptIds))
  }, [filtering, boardCards, below, activeFilter, keptIds])
  const visibleResults = useMemo(() => {
    const byMission = filtering ? resultCards.filter(hasMissionPath) : resultCards
    return byMission.filter((card) => passesFilter(card, activeFilter, keptIds))
  }, [filtering, resultCards, activeFilter, keptIds])
  const listCards = resultsOn ? resultCards : boardCards
  const listShown = resultsOn ? visibleResults.length : visibleCards.length

  const pickRing = (id: string) => {
    if (id === focusedId) {
      setRingFocusId(null)
      setStatus("Showing the whole board.")
      return
    }
    setRingFocusId(id)
    const name = ringNotes.find((note) => note.id === id)?.text || "this card"
    setStatus(`Showing “${name}” and everything below it.`)
  }

  useEffect(() => {
    if (!focusedId || openId) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      setRingFocusId(null)
      setStatus("Showing the whole board.")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [focusedId, openId, setRingFocusId])
  const counts = useMemo(() => {
    const result: Record<string, number> = {}
    for (const card of boardCards) result[card.columnId] = (result[card.columnId] ?? 0) + 1
    return result
  }, [boardCards])
  const boardTotals = useMemo(() => {
    const result: Partial<Record<KanbanBoardId, number>> = {}
    for (const card of cards) {
      if (!card.inResults) result[card.boardId] = (result[card.boardId] ?? 0) + 1
    }
    return result
  }, [cards])

  const moveCard = (cardId: string, targetBoard: KanbanBoardId, columnId: string, beforeId: string | null) => {
    const card = cards.find((item) => item.id === cardId)
    const column = columnsByBoard[targetBoard].find((item) => item.id === columnId)
    if (!card || !column) return
    const sameSpot = card.boardId === targetBoard && card.columnId === columnId
    const held = cards.filter(
      (item) => item.boardId === targetBoard && item.columnId === columnId && item.id !== cardId && !item.inResults,
    ).length
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

  const isInDone = (card: { boardId: KanbanBoardId; columnId: string }) =>
    columnsByBoard[card.boardId].find((column) => column.id === card.columnId)?.kind === "done"

  /** One Done card to Results. Copies of the same task in Done on other boards go with it. */
  const moveToResults = (cardId: string) => {
    const card = cards.find((item) => item.id === cardId)
    if (!card || card.inResults || !isInDone(card)) return
    const key = resultKey(card)
    setCards((previous) =>
      previous.map((item) => (!item.inResults && isInDone(item) && resultKey(item) === key ? { ...item, inResults: true } : item)),
    )
    setStatus(`Moved “${card.title}” from Done to Results.`)
  }

  /** Every card in Done, on all five boards, to Results. */
  const moveAllDone = () => {
    if (doneTaskCount === 0) return
    setCards((previous) => previous.map((item) => (!item.inResults && isInDone(item) ? { ...item, inResults: true } : item)))
    setStatus(`Moved ${doneTaskCount} ${doneTaskCount === 1 ? "task" : "tasks"} from Done to Results.`)
  }

  const returnToDone = (cardId: string) => {
    const card = cards.find((item) => item.id === cardId)
    if (!card) return
    const key = resultKey(card)
    setCards((previous) =>
      previous.map((item) => {
        if (!item.inResults || resultKey(item) !== key) return item
        const doneColumn = columnsByBoard[item.boardId].find((column) => column.kind === "done")
        return { ...item, inResults: false, columnId: isInDone(item) ? item.columnId : (doneColumn?.id ?? item.columnId) }
      }),
    )
    setStatus(`Returned “${card.title}” to Done.`)
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
            const active = item.id === boardId && !resultsOn
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                role="tab"
                type="button"
                aria-selected={active}
                aria-controls="kanban-panel"
                onClick={() => {
                  setBoardId(item.id)
                  setResultsOn(false)
                }}
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
          <ToggleSwitch checked={resultsOn} onChange={setResultsOn} label="Results" count={resultCards.length} />
        </div>

        <div className="flex items-center gap-3">
          {!resultsOn && <ToggleSwitch checked={ringsOn} onChange={setRingsOn} label="Ring cards" />}
          {!resultsOn && (
            <button
              type="button"
              disabled={doneTaskCount === 0}
              onClick={moveAllDone}
              className="rounded-md border border-line px-2.5 py-1.5 text-sm text-ink transition-colors hover:bg-line/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:text-ink-soft/60 disabled:hover:bg-transparent"
            >
              Move all Done to Results
              <span className="ml-1.5 text-xs tabular-nums text-ink-soft">{doneTaskCount}</span>
            </button>
          )}
          <p role="status" aria-live="polite" className="max-w-xs text-pretty text-right text-sm text-ink-soft">
            {status}
          </p>
          {!resultsOn && (
            <ColumnEditor
              boardName={board.name}
              columns={columns}
              counts={counts}
              onRename={renameColumn}
              onMove={shiftColumn}
              onRemove={removeColumn}
              onAdd={addColumn}
            />
          )}
        </div>
      </div>

      <MissionStrip
        missionText={missionText}
        filtering={filtering}
        shown={listShown}
        total={listCards.length}
        onToggle={() => setMissionOnly(!missionOnly)}
      />

      <FilterBar
        filter={activeFilter}
        onChange={setCardFilter}
        notes={notes}
        rings={rings}
        boardCards={listCards}
        shown={listShown}
      />

      {ringsOn && !resultsOn && <RingRow cards={shownRingNotes} rings={rings} focusId={focusedId} taskCounts={taskCounts} onPick={pickRing} />}

      {resultsOn ? (
        <ResultsGrid
          cards={visibleResults}
          total={resultCards.length}
          highlightFor={(card) => highlightColor(card, activeFilter)}
          boardNameOf={(card) => boardNamesById[card.id] ?? ""}
          onOpen={openCard}
          onReturn={returnToDone}
        />
      ) : (
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
              {visibleCards
                .filter((card) => card.columnId === column.id)
                .map((card) => (
                  <KanbanCardView
                    key={card.id}
                    card={card}
                    columns={columns}
                    counts={counts}
                    done={column.kind === "done"}
                    dragging={draggingId === card.id}
                    highlight={highlightColor(card, activeFilter)}
                    onDragStart={setDraggingId}
                    onDragEnd={() => {
                      setDraggingId(null)
                      setOverTab(null)
                    }}
                    onMoveToColumn={(cardId, columnId) => moveCard(cardId, boardId, columnId, null)}
                    onMoveToBoard={moveToBoard}
                    onOpen={openCard}
                    onResult={column.kind === "done" ? moveToResults : undefined}
                  />
                ))}
            </KanbanColumnView>
          ))}
        </div>
      </div>
      )}

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
