import clsx from "clsx"
import { X } from "lucide-react"
import { countTag, hasHashtag, type Note } from "@/lib/board-data"

const SHELF_CLASS =
  "pointer-events-auto flex max-h-full w-80 shrink-0 flex-col rounded-2xl border border-line bg-card shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)]"
const CLOSE_CLASS =
  "flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"

const TOOLS = [
  ["be", "Be"],
  ["do", "Do"],
  ["have", "Have"],
] as const

const DAILY_NOTES = [
  ["Problems", "Notice the problems that keep returning. They often point toward useful work."],
  ["Decisions", "Before you decide, ask: Does this belong to my mission? Will this make me happier?"],
  ["The day and negotiations", "Let the mission guide the small choices, conversations and negotiations of the day."],
  ["Energy", "Notice what gives energy, what drains it, and what changes when you act from the mission."],
] as const

const WARNINGS = [
  "Strain and burnout mean this is not the mission.",
  "Markers matter more than the written sentence.",
  "A mission is not a costume the person can put on.",
] as const

export function ReadShelf({
  notes,
  tab,
  activeTag,
  hoverTag,
  onTab,
  onPickTag,
  onClose,
}: {
  notes: Note[]
  tab: "tools" | "daily" | "warnings"
  activeTag: string | null
  hoverTag: string | null
  onTab: (tab: "tools" | "daily" | "warnings") => void
  onPickTag: (tag: string) => void
  onClose: () => void
}) {
  return (
    <aside aria-label="Read shelf" className={SHELF_CLASS}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <p className="text-[11px] font-medium tracking-[0.18em] text-ink-soft uppercase">Mission</p>
          <h2 className="mt-1 font-serif text-2xl leading-tight font-medium">Read</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close Read shelf" className={CLOSE_CLASS}>
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div role="tablist" aria-label="Read sections" className="mt-4 flex gap-1 border-b border-line px-3">
        {(["tools", "daily", "warnings"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            onClick={() => onTab(item)}
            className={clsx(
              "rounded-t-lg px-3 py-2 text-sm capitalize transition-colors focus-visible:outline-2 focus-visible:outline-accent",
              tab === item ? "bg-ink text-board" : "text-ink-soft hover:bg-desk hover:text-ink",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "tools" ? (
        <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="text-sm leading-relaxed text-ink-soft text-pretty">
            When nothing appeals, pause for 7 to 10 days. Let the noise settle before choosing a direction.
          </p>
          <div className="mt-4 space-y-3">
            {TOOLS.map(([tag, name]) => {
              const active = activeTag === tag
              const hovered = hoverTag === tag
              return (
                <button
                  key={tag}
                  type="button"
                  data-read-drop={tag}
                  aria-pressed={active}
                  onClick={() => onPickTag(tag)}
                  className={clsx(
                    "flex w-full items-center justify-between rounded-xl border-2 border-dashed px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-accent",
                    active || hovered ? "border-accent bg-accent-soft" : "border-line hover:bg-desk",
                  )}
                >
                  <span>
                    <span className="block text-sm font-medium">{name}</span>
                    <span className="block text-xs text-ink-soft">Add #{tag}</span>
                  </span>
                  <span className="text-xs text-ink-soft tabular-nums">{countTag(notes, tag)} cards</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {tab === "daily" ? (
        <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto divide-y divide-line px-5 py-2">
          {DAILY_NOTES.map(([title, body]) => (
            <section key={title} className="py-4">
              <h3 className="text-sm font-medium text-ink">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft text-pretty">{body}</p>
            </section>
          ))}
        </div>
      ) : null}

      {tab === "warnings" ? (
        <div role="tabpanel" className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {WARNINGS.map((warning) => (
            <p key={warning} className="rounded-xl border border-line bg-desk px-3 py-3 text-sm leading-relaxed text-ink-soft text-pretty">
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </aside>
  )
}

export function ReadShelfEdge({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open Read shelf"
      className="pointer-events-auto absolute top-[11.5rem] left-0 flex h-24 w-9 items-center justify-center rounded-r-xl border border-l-0 border-line bg-card text-ink-soft shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)] transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span className="-rotate-90 text-xs font-medium tracking-[0.16em] uppercase">Read</span>
    </button>
  )
}

export function getReadTag(target: string | null) {
  return target && TOOLS.some(([tag]) => tag === target) ? target : null
}

export function readTagHashtag(tag: string) {
  return hasHashtag as unknown as (note: Note, value: string) => boolean
}

export const READ_TAGS: string[] = TOOLS.map(([tag]) => tag)

export function tagReadCards(notes: Note[], tag: string) {
  return notes.filter((note) => hasHashtag(note, tag))
}

export function markerCountLabel(notes: Note[], tag: string) {
  return `${countTag(notes, tag)} cards`
}

export function readTagNote(tag: string) {
  return `#${tag}`
}

export function isReadTab(value: string): value is "tools" | "daily" | "warnings" {
  return value === "tools" || value === "daily" || value === "warnings"
}

export function readShelfDescription() {
  return "Read is a shelf, not a wizard. Open any tab whenever it helps."
}

export function readShelfTags() {
  return READ_TAGS
}

export function readShelfMarkerText(notes: Note[], tag: string) {
  return `${readTagNote(tag)} · ${markerCountLabel(notes, tag)}`
}

export function readShelfHasTag(note: Note, tag: string) {
  return hasHashtag(note, tag)
}

export function readShelfTagList(notes: Note[], tag: string) {
  return notes.filter((note) => readShelfHasTag(note, tag))
}

export function readShelfTagCount(notes: Note[], tag: string) {
  return countTag(notes, tag)
}

export function readShelfTagLabel(tag: string) {
  return `Add #${tag}`
}

export function readShelfTagNames() {
  return TOOLS.map(([, name]) => name)
}

export function readShelfTabNames() {
  return ["Tools", "Daily life", "Warnings"]
}

export function readShelfIsTools(tab: string) {
  return tab === "tools"
}

export function readShelfIsDaily(tab: string) {
  return tab === "daily"
}

export function readShelfIsWarnings(tab: string) {
  return tab === "warnings"
}

export function readShelfHasDropTarget(tag: string) {
  return READ_TAGS.includes(tag)
}

export function readShelfText(notes: Note[], tag: string) {
  return `${readTagNote(tag)} ${readShelfTagCount(notes, tag)} cards`
}

export function readShelfNoOp() {
  return null
}

export function readShelfTitle() {
  return "Read"
}

export function readShelfTabLabel(tab: string) {
  return tab === "daily" ? "Daily life" : tab === "warnings" ? "Warnings" : "Tools"
}

export function readShelfToolNote() {
  return "When nothing appeals, pause for 7 to 10 days."
}

export function readShelfWarningText() {
  return WARNINGS
}

export function readShelfDailyText() {
  return DAILY_NOTES
}

export function readShelfToolText() {
  return TOOLS
}

export function readShelfTagsText() {
  return READ_TAGS
}

export function readShelfCount(notes: Note[], tag: string) {
  return countTag(notes, tag)
}

export function readShelfCards(notes: Note[], tag: string) {
  return notes.filter((note) => hasHashtag(note, tag))
}

export function readShelfSupportsDrop(tag: string) {
  return READ_TAGS.includes(tag)
}

export function readShelfIsOpen() {
  return true
}

export function readShelfKeepsCardsInPlace() {
  return true
}

export function readShelfIsNotWizard() {
  return true
}

export function readShelfTabOrder() {
  return ["tools", "daily", "warnings"] as const
}
