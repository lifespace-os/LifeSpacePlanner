import clsx from "clsx"
import { getGoalLevel, goalChainFor, goalLevelOf, goalRingOf, type Note } from "@/lib/board-data"

type Row = { key: string; title: string; text: string | null; filled: boolean; italic?: boolean }

const EMPTY = "Not linked yet"

/** The links a card already has, read from the card up: project goal, life goal, need, dream or want, mission. */
function chainRows(note: Note, notes: Note[], missionText: string): Row[] {
  const chain = goalRingOf(note) === 3 ? goalChainFor(notes, note.id) : null
  const byRing = new Map<number, Note>()
  for (const step of chain?.steps.slice(1) ?? []) byRing.set(goalRingOf(step), step)

  const level = (ring: number) => {
    const found = byRing.get(ring)
    return found ? (getGoalLevel(goalLevelOf(found))?.name ?? "Goal") : null
  }
  const sentence = (ring: number) => byRing.get(ring)?.text.trim() || "Untitled card"

  const mission = chain?.reachesMission ?? false
  const missionRow: Row = mission
    ? { key: "mission", title: "Mission", text: missionText ? `\u201C${missionText}\u201D` : "Linked, no sentence written yet", filled: true, italic: Boolean(missionText) }
    : { key: "mission", title: "Mission", text: null, filled: false }

  return [
    missionRow,
    { key: "ring0", title: level(0) ?? "Need, dream, or want", text: byRing.has(0) ? sentence(0) : null, filled: byRing.has(0) },
    { key: "ring1", title: "Life goal", text: byRing.has(1) ? sentence(1) : null, filled: byRing.has(1) },
    { key: "ring2", title: "Project goal", text: byRing.has(2) ? sentence(2) : null, filled: byRing.has(2) },
    { key: "card", title: "This card", text: note.text.trim() || "Blank card", filled: true },
  ]
}

/** A small graph of the chain above a card. An empty link is drawn dashed and never blocks making the task. */
export function TaskChain({ note, notes, missionText }: { note: Note; notes: Note[]; missionText: string }) {
  const rows = chainRows(note, notes, missionText)
  const atTasks = goalRingOf(note) === 3

  return (
    <section aria-label="Links of this card">
      <h3 className="text-xs font-medium tracking-[0.16em] text-ink-soft uppercase">Links</h3>
      <ol className="mt-3 flex flex-col">
        {rows.map((row, index) => {
          const next = rows[index + 1]
          const solid = row.filled && next?.filled
          return (
            <li key={row.key} className={clsx("relative pl-6", index < rows.length - 1 && "pb-3")}>
              <span
                aria-hidden="true"
                className={clsx(
                  "absolute top-1 left-0 size-3 rounded-full border-2",
                  row.filled ? "border-accent bg-accent" : "border-dashed border-ink-soft/60 bg-card",
                )}
              />
              {next ? (
                <span
                  aria-hidden="true"
                  className={clsx(
                    "absolute top-4 bottom-[-0.25rem] left-[5px] border-l-2",
                    solid ? "border-accent" : "border-dashed border-ink-soft/40",
                  )}
                />
              ) : null}
              <p className="text-[11px] leading-tight font-medium tracking-[0.12em] text-ink-soft uppercase">{row.title}</p>
              <p
                className={clsx(
                  "mt-0.5 line-clamp-2 text-sm leading-snug break-words",
                  row.filled ? "text-ink" : "text-ink-soft italic",
                  row.italic && "font-serif italic",
                )}
              >
                {row.text ?? EMPTY}
              </p>
            </li>
          )
        })}
      </ol>
      {atTasks ? null : (
        <p className="mt-2 text-xs text-ink-soft text-pretty">
          Links are made at the Tasks level, on the Goals map. Every link may stay empty for now.
        </p>
      )}
    </section>
  )
}
