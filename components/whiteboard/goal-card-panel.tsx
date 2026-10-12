import { useId, useRef, useState, type ReactNode } from "react"
import clsx from "clsx"
import { Check, X } from "lucide-react"
import {
  BUILT_IN_RINGS,
  DEFAULT_GOAL_PLAN,
  getGoalLevel,
  goalChecks,
  goalLevelOf,
  goalLinks,
  goalRingOf,
  hasHashtag,
  looksLikeTwoResults,
  splitGoalSentence,
  type GoalGround,
  type GoalPlan,
  type GoalRing,
  type Note,
} from "@/lib/board-data"

export type GoalDraft = { text: string; parentIds: string[]; plan: GoalPlan }

const PANEL_CLASS =
  "pointer-events-auto flex min-h-0 w-96 max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-line bg-card shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)]"

const FIELD_CLASS =
  "w-full rounded-md border border-line bg-board px-2.5 py-2 text-sm text-ink placeholder:text-ink-soft/70 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/30"

const BUTTON_CLASS =
  "rounded-lg border border-line bg-board px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"

const GROUNDS: { id: GoalGround; label: string }[] = [
  { id: "mission", label: "It serves the mission" },
  { id: "living", label: "It keeps my life or my people\u2019s lives going" },
  { id: "want", label: "It is a want beyond necessity" },
  { id: "unlinked", label: "It is not linked yet" },
]

function Question({ children }: { children: ReactNode }) {
  return <span className="text-sm font-medium text-ink">{children}</span>
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-0.5 text-xs text-ink-soft text-pretty">{children}</p>
}

function Choice({
  name,
  checked,
  onChange,
  children,
}: {
  name: string
  checked: boolean
  onChange: () => void
  children: ReactNode
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm text-ink transition-colors hover:bg-desk has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-0.5 size-4 shrink-0 accent-accent" />
      <span className="min-w-0 text-pretty">{children}</span>
    </label>
  )
}

function SplitForm({
  first,
  second,
  onFirst,
  onSecond,
  onConfirm,
  onCancel,
}: {
  first: string
  second: string
  onFirst: (value: string) => void
  onSecond: (value: string) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  const id = useId()
  return (
    <div className="mt-2 flex flex-col gap-2 rounded-xl border border-line bg-board p-3">
      <p className="text-xs text-ink-soft text-pretty">
        This card keeps the first goal and stays where it is. The second goal becomes a new card beside it.
      </p>
      <label htmlFor={`${id}-first`} className="text-xs font-medium text-ink">
        First goal
      </label>
      <textarea
        id={`${id}-first`}
        value={first}
        maxLength={280}
        rows={2}
        onChange={(e) => onFirst(e.target.value)}
        className={clsx(FIELD_CLASS, "resize-none")}
      />
      <label htmlFor={`${id}-second`} className="text-xs font-medium text-ink">
        Second goal
      </label>
      <textarea
        id={`${id}-second`}
        value={second}
        maxLength={280}
        rows={2}
        onChange={(e) => onSecond(e.target.value)}
        className={clsx(FIELD_CLASS, "resize-none")}
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={BUTTON_CLASS}>
          Cancel
        </button>
        <button type="button" onClick={onConfirm} disabled={!first.trim() || !second.trim()} className={BUTTON_CLASS}>
          Split into two goals
        </button>
      </div>
    </div>
  )
}

/** The side panel of a Life goals or Project goals card. It never appears for the other levels or for Map. */
export function GoalCardPanel({
  note,
  notes,
  rings = BUILT_IN_RINGS,
  missionText,
  fresh,
  onSave,
  onSplit,
  onClose,
  tagColors,
}: {
  note: Note
  notes: Note[]
  rings?: GoalRing[]
  /** Labels hashtags show in the color of their sector or zone. */
  tagColors?: Record<string, string>
  missionText: string
  /** True right after the card was created, when the reminder shows. */
  fresh: boolean
  onSave: (id: string, draft: GoalDraft) => void
  onSplit: (id: string, draft: GoalDraft, secondText: string) => void
  onClose: () => void
}) {
  const uid = useId()
  const focusedOnce = useRef(false)
  const byId = new Map(notes.map((n) => [n.id, n]))
  const storedLinks = goalLinks(note, byId, rings)
  const storedPlan: GoalPlan = { ...DEFAULT_GOAL_PLAN, ...note.goalPlan }

  const [text, setText] = useState(note.text)
  const [parentIds, setParentIds] = useState<string[]>(storedLinks)
  const [plan, setPlan] = useState<GoalPlan>(storedPlan)
  const [splitAt, setSplitAt] = useState<"result" | "scale" | null>(null)
  const [first, setFirst] = useState("")
  const [second, setSecond] = useState("")

  const level = getGoalLevel(goalLevelOf(note, rings))
  const ring = goalRingOf(note, rings)
  const above = notes.filter((n) => n.id !== note.id && goalRingOf(n, rings) >= 0 && goalRingOf(n, rings) < ring)
  const missionSaved = missionText.length > 0
  const hasMust = hasHashtag(note, "must")
  const flagged = looksLikeTwoResults(text)
  const checks = goalChecks(text, plan)
  const written = text.trim().length > 0

  const saved =
    JSON.stringify([text.trim(), parentIds, plan]) === JSON.stringify([note.text.trim(), storedLinks, storedPlan])

  const patch = (change: Partial<GoalPlan>) => setPlan((prev) => ({ ...prev, ...change }))
  const draft = (): GoalDraft => ({ text: text.trim(), parentIds, plan })
  const toggleParent = (id: string) =>
    setParentIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))

  function openSplit(where: "result" | "scale") {
    const parts = splitGoalSentence(text)
    setFirst(parts[0] ?? text.trim())
    setSecond(parts.slice(1).join(" and "))
    setSplitAt(where)
  }

  function confirmSplit() {
    onSplit(note.id, { text: first.trim(), parentIds, plan: { ...plan, split: true, oneResult: true } }, second.trim())
  }

  const splitForm = (
    <SplitForm
      first={first}
      second={second}
      onFirst={setFirst}
      onSecond={setSecond}
      onConfirm={confirmSplit}
      onCancel={() => setSplitAt(null)}
    />
  )

  return (
    <aside aria-label={`${level?.name ?? "Goal"} panel`} className={PANEL_CLASS}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.18em] text-ink-soft uppercase">Goals</p>
          <h2 className="mt-1 font-serif text-2xl leading-tight font-medium text-balance">{level?.name ?? "Goal"}</h2>
          <p className="mt-1 flex flex-wrap gap-1.5">
            {note.hashtags.map((tag) => (
              <span
                key={tag}
                style={tagColors?.[tag.toLowerCase()] ? { backgroundColor: tagColors[tag.toLowerCase()] } : undefined}
                className={clsx(
                  "rounded-full px-2 py-0.5 text-xs",
                  tagColors?.[tag.toLowerCase()] ? "text-ink" : "bg-desk text-ink-soft",
                )}
              >
                #{tag}
              </span>
            ))}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide goal panel"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto border-t border-line px-5 py-4">
        {fresh ? (
          <section aria-label="Reminder" className="rounded-xl bg-accent-soft px-4 py-3">
            <p className="text-[11px] font-medium tracking-[0.16em] text-ink-soft uppercase">Before you write</p>
            <ul className="mt-1.5 list-disc pl-4 text-sm text-ink">
              <li>What is my goal?</li>
              <li>What is the goal above it?</li>
            </ul>
          </section>
        ) : null}

        <fieldset>
          <legend>
            <Question>The goals above it</Question>
          </legend>
          <Hint>Choose one or more. A goal may be on any ring closer to the center, or be the mission.</Hint>
          <div className="mt-1 flex max-h-48 flex-col overflow-y-auto">
            {[{ id: "mission", label: "The mission" }, ...above.map((n) => ({ id: n.id, label: n.text.trim().slice(0, 48) || "Untitled card" }))].map(
              (option) => (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm text-ink transition-colors hover:bg-desk has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
                >
                  <input
                    type="checkbox"
                    checked={parentIds.includes(option.id)}
                    onChange={() => toggleParent(option.id)}
                    className="mt-0.5 size-4 shrink-0 accent-accent"
                  />
                  <span className="min-w-0 break-words text-pretty">{option.label}</span>
                </label>
              ),
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend>
            <Question>Why this goal</Question>
          </legend>
          <div className="mt-1 flex flex-col">
            {GROUNDS.map((ground) => (
              <Choice
                key={ground.id}
                name={`${uid}-ground`}
                checked={plan.ground === ground.id}
                onChange={() => patch({ ground: ground.id })}
              >
                {ground.label}
              </Choice>
            ))}
          </div>
          {plan.ground === "mission" && missionSaved ? (
            <div className="mt-2">
              <label htmlFor={`${uid}-help`} className="text-sm text-ink">
                How does reaching it help the mission?
              </label>
              <input
                id={`${uid}-help`}
                type="text"
                value={plan.missionHelp}
                maxLength={200}
                onChange={(e) => patch({ missionHelp: e.target.value })}
                className={clsx(FIELD_CLASS, "mt-1.5")}
              />
            </div>
          ) : null}
        </fieldset>

        <div>
          <label htmlFor={`${uid}-why`}>
            <Question>Why does this matter to me?</Question>
          </label>
          <input
            id={`${uid}-why`}
            type="text"
            value={plan.why}
            maxLength={200}
            onChange={(e) => patch({ why: e.target.value })}
            className={clsx(FIELD_CLASS, "mt-1.5")}
          />
        </div>

        {hasMust ? (
          <fieldset>
            <legend>
              <Question>
                This card carries <span className="rounded-full bg-desk px-2 py-0.5 text-xs">#must</span>. Is this my own
                choice?
              </Question>
            </legend>
            <div className="mt-1 flex flex-col">
              <Choice name={`${uid}-own`} checked={plan.ownChoice === true} onChange={() => patch({ ownChoice: true })}>
                Yes, it is my own choice
              </Choice>
              <Choice name={`${uid}-own`} checked={plan.ownChoice === false} onChange={() => patch({ ownChoice: false })}>
                No, it is not my own choice
              </Choice>
            </div>
          </fieldset>
        ) : null}

        <div>
          <label htmlFor={`${uid}-text`}>
            <Question>What should come into existence?</Question>
          </label>
          <Hint>Name what appears, the qualities that matter, and a quantity where a number fits.</Hint>
          <textarea
            id={`${uid}-text`}
            value={text}
            maxLength={280}
            rows={3}
            ref={(el) => {
              if (fresh && el && !focusedOnce.current) {
                focusedOnce.current = true
                el.focus({ preventScroll: true })
              }
            }}
            onChange={(e) => {
              setText(e.target.value)
              if (plan.oneResult) patch({ oneResult: false })
            }}
            className={clsx(FIELD_CLASS, "mt-1.5 resize-none")}
          />
        </div>

        <fieldset>
          <legend>
            <Question>Does this change the cause, or only what should disappear?</Question>
          </legend>
          <div className="mt-1 flex flex-col">
            <Choice name={`${uid}-aim`} checked={plan.aim === "cause"} onChange={() => patch({ aim: "cause" })}>
              It changes the cause
            </Choice>
            <Choice name={`${uid}-aim`} checked={plan.aim === "symptom"} onChange={() => patch({ aim: "symptom" })}>
              It only makes something disappear
            </Choice>
          </div>
        </fieldset>

        <div>
          <Question>If the sentence contains two results, split it into two goals.</Question>
          {flagged ? (
            <div className="mt-1.5 flex flex-col gap-1">
              <p className="text-xs text-ink-soft text-pretty">This sentence may hold two results.</p>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-desk">
                <input
                  type="checkbox"
                  checked={plan.oneResult}
                  onChange={(e) => patch({ oneResult: e.target.checked })}
                  className="mt-0.5 size-4 shrink-0 accent-accent"
                />
                <span>It is one result</span>
              </label>
            </div>
          ) : null}
          {splitAt === "result" ? (
            splitForm
          ) : (
            <button
              type="button"
              onClick={() => openSplit("result")}
              disabled={!written}
              className={clsx(BUTTON_CLASS, "mt-2")}
            >
              Split into two goals
            </button>
          )}
        </div>

        <div>
          <label htmlFor={`${uid}-sign`}>
            <Question>What observable sign, number, or ready state will show that this one result is reached?</Question>
          </label>
          <textarea
            id={`${uid}-sign`}
            value={plan.sign}
            maxLength={280}
            rows={2}
            onChange={(e) => patch({ sign: e.target.value })}
            className={clsx(FIELD_CLASS, "mt-1.5 resize-none")}
          />
        </div>

        <fieldset>
          <legend>
            <Question>Is this scale reachable now, or should it become a smaller goal?</Question>
          </legend>
          <div className="mt-1 flex flex-col">
            <Choice name={`${uid}-reach`} checked={plan.reach === "now"} onChange={() => patch({ reach: "now" })}>
              It is reachable now
            </Choice>
            <Choice name={`${uid}-reach`} checked={plan.reach === "smaller"} onChange={() => patch({ reach: "smaller" })}>
              It should become a smaller goal
            </Choice>
          </div>
          {plan.reach === "smaller" ? (
            splitAt === "scale" ? (
              splitForm
            ) : (
              <button
                type="button"
                onClick={() => openSplit("scale")}
                disabled={!written}
                className={clsx(BUTTON_CLASS, "mt-2")}
              >
                Split into two goals
              </button>
            )
          ) : null}
        </fieldset>

        <section aria-label="Checks">
          <h3 className="text-xs font-medium tracking-[0.16em] text-ink-soft uppercase">Checks</h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {checks.map((check) => (
              <li key={check.id} className="flex items-center gap-2.5 text-sm text-ink">
                <span
                  aria-hidden="true"
                  className={clsx(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border",
                    check.passed ? "border-accent bg-accent text-card" : "border-line text-transparent",
                  )}
                >
                  <Check className="size-3" />
                </span>
                <span className={check.passed ? "text-ink" : "text-ink-soft"}>{check.label}</span>
                <span className="sr-only">{check.passed ? "done" : "not yet"}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
        <p role="status" className="text-xs text-ink-soft">
          {!written ? "Write the goal to save it" : saved ? "Saved" : "Not saved yet"}
        </p>
        <button
          type="button"
          onClick={() => onSave(note.id, draft())}
          disabled={!written || saved}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-card transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save goal
        </button>
      </div>
    </aside>
  )
}
