"use client"

import { Check } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import { ToggleSwitch } from "@/components/kanban/toggle-switch"
import { ConfirmDialog } from "@/components/settings/confirm-dialog"
import { useWorkspace } from "@/components/workspace-provider"
import {
  DEFAULT_NUDGE,
  NUDGE_CHECK_EVENT,
  NUDGE_TITLE,
  isTime,
  withTime,
  type NudgeKind,
} from "@/lib/nudge"
import { DEFAULT_THEME, THEMES, type Theme, type ThemeId } from "@/lib/themes"
import {
  DEFAULT_LIFE,
  LIFE_YEARS_MAX,
  LIFE_YEARS_MIN,
  hasWrittenCards,
  parseWorkspace,
  sampleStoryOn,
  withEmptyBoard,
  withSampleStory,
  type WorkspaceDoc,
} from "@/lib/workspace"

type Swap = "sample" | "empty"

const buttonBase =
  "rounded-md px-4 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
const primaryButton = `${buttonBase} bg-ink text-board hover:opacity-90`
const secondaryButton = `${buttonBase} border border-line bg-card text-ink hover:bg-line/40`
const inputClass =
  "w-full rounded-md border border-line bg-card px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-[invalid=true]:border-release"

export function SettingsScreen() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="font-serif text-4xl font-medium tracking-tight text-balance">Settings</h1>
      <div className="mt-8 flex flex-col gap-10">
        <ThemeSection />
        <SampleStorySection />
        <BackupSection />
        <LifeSection />
        <NudgeSection />
        <p className="border-t border-line pt-6 text-sm text-ink-soft">
          Your cards live in a file on this machine, at ~/Library/Application Support/LifeSpace Planner/workspace.json. There is no account.
        </p>
      </div>
    </main>
  )
}

function SectionShell({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 border-t border-line pt-6">
      <h2 id={id} className="font-serif text-2xl font-medium tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  )
}

const THEME_GROUPS: { mode: Theme["mode"]; title: string }[] = [
  { mode: "light", title: "Light" },
  { mode: "dark", title: "Dark" },
]

function ThemeSection() {
  const headingId = useId()
  const { doc, report } = useWorkspace()
  const current: ThemeId = doc.theme ?? DEFAULT_THEME
  const optionRefs = useRef(new Map<ThemeId, HTMLButtonElement>())

  function choose(id: ThemeId) {
    report("theme", id)
  }

  function move(from: number, step: number) {
    const next = THEMES[(from + step + THEMES.length) % THEMES.length]
    choose(next.id)
    optionRefs.current.get(next.id)?.focus()
  }

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault()
      move(index, 1)
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault()
      move(index, -1)
    }
  }

  return (
    <SectionShell id={headingId} title="Theme">
      <p className="text-sm text-ink-soft">
        Changes the colors of the app. Whiteboard card colors stay the same, and the Dashboard export is always a light
        sheet.
      </p>
      <div role="radiogroup" aria-labelledby={headingId} className="flex flex-col gap-4">
        {THEME_GROUPS.map((group) => (
          <div key={group.mode} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-ink-soft">{group.title}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {THEMES.map((theme, index) =>
                theme.mode !== group.mode ? null : (
                  <ThemeOption
                    key={theme.id}
                    theme={theme}
                    selected={theme.id === current}
                    onSelect={() => choose(theme.id)}
                    onKeyDown={(event) => onKeyDown(event, index)}
                    buttonRef={(node) => {
                      if (node) optionRefs.current.set(theme.id, node)
                      else optionRefs.current.delete(theme.id)
                    }}
                  />
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  )
}

function ThemeOption({
  theme,
  selected,
  onSelect,
  onKeyDown,
  buttonRef,
}: {
  theme: Theme
  selected: boolean
  onSelect: () => void
  onKeyDown: (event: React.KeyboardEvent) => void
  buttonRef: (node: HTMLButtonElement | null) => void
}) {
  const c = theme.colors
  return (
    <button
      ref={buttonRef}
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={`flex flex-col gap-2 rounded-lg border bg-card p-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        selected ? "border-accent ring-2 ring-accent" : "border-line hover:border-ink-soft"
      }`}
    >
      <span
        aria-hidden="true"
        className="flex h-16 items-stretch gap-1.5 rounded-md p-1.5"
        style={{ background: c.desk }}
      >
        <span
          className="flex flex-1 flex-col justify-between rounded-[5px] border p-1.5"
          style={{ background: c.board, borderColor: c.line }}
        >
          <span className="text-xs leading-none font-semibold" style={{ color: c.ink }}>
            Aa
          </span>
          <span className="h-1.5 w-8 rounded-full" style={{ background: c.accent }} />
        </span>
        <span
          className="flex w-6 flex-col gap-1 rounded-[5px] border p-1"
          style={{ background: c.card, borderColor: c.line }}
        >
          <span className="h-1 rounded-full" style={{ background: c.inkSoft }} />
          <span className="h-1 rounded-full" style={{ background: c.accentSoft }} />
        </span>
      </span>
      <span className="flex items-center justify-between gap-2 px-0.5 text-sm text-ink">
        {theme.name}
        {selected && <Check aria-hidden="true" className="size-4 shrink-0 text-accent" />}
      </span>
    </button>
  )
}

function SampleStorySection() {
  const headingId = useId()
  const { doc, replace } = useWorkspace()
  const [asking, setAsking] = useState<Swap | null>(null)
  const [busy, setBusy] = useState(false)
  const on = sampleStoryOn(doc)
  const written = hasWrittenCards(doc)

  async function swap(kind: Swap) {
    setBusy(true)
    await replace(kind === "sample" ? withSampleStory(doc) : withEmptyBoard(doc))
    setBusy(false)
    setAsking(null)
  }

  function choose(next: boolean) {
    const kind: Swap = next ? "sample" : "empty"
    if (written) setAsking(kind)
    else void swap(kind)
  }

  return (
    <SectionShell id={headingId} title="Sample story">
      <ToggleSwitch checked={on} onChange={choose} label="Show the sample story" />
      <p className="text-sm text-ink-soft">Off leaves an empty board for the whiteboard and the Kanban.</p>
      <ConfirmDialog
        open={asking === "sample"}
        title="Put the sample story back?"
        confirmLabel="Replace with sample"
        busy={busy}
        onConfirm={() => void swap("sample")}
        onCancel={() => setAsking(null)}
      >
        This replaces the cards you wrote on the whiteboard and the Kanban with the sample story. Download a backup first
        if you want to keep them.
      </ConfirmDialog>
      <ConfirmDialog
        open={asking === "empty"}
        title="Empty the board?"
        confirmLabel="Empty the board"
        busy={busy}
        onConfirm={() => void swap("empty")}
        onCancel={() => setAsking(null)}
      >
        This removes every whiteboard card and Kanban task, including the ones you wrote. Download a backup first if you
        want to keep them.
      </ConfirmDialog>
    </SectionShell>
  )
}

function today() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

function BackupSection() {
  const headingId = useId()
  const { doc, replace } = useWorkspace()
  const fileInput = useRef<HTMLInputElement>(null)
  const [incoming, setIncoming] = useState<WorkspaceDoc | null>(null)
  const [problem, setProblem] = useState("")
  const [busy, setBusy] = useState(false)

  function download() {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `lifespace-backup-${today()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function pick(file: File | undefined) {
    if (!file) return
    setProblem("")
    let json: unknown
    try {
      json = JSON.parse(await file.text())
    } catch {
      setProblem("That file is not valid JSON, so nothing was loaded.")
      return
    }
    const parsed = parseWorkspace(json)
    if (!parsed.ok) {
      setProblem(`${parsed.reason} Nothing was loaded.`)
      return
    }
    setIncoming(parsed.doc)
  }

  async function load() {
    if (!incoming) return
    setBusy(true)
    await replace({
      ...incoming,
      life: incoming.life ?? doc.life,
      lastView: incoming.lastView ?? doc.lastView,
      nudge: incoming.nudge ?? doc.nudge,
      theme: incoming.theme ?? doc.theme,
    })
    setBusy(false)
    setIncoming(null)
  }

  return (
    <SectionShell id={headingId} title="Backup">
      <p className="text-sm text-ink-soft">Download your cards as a JSON file, or load one back.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={download} className={primaryButton}>
          Download JSON
        </button>
        <button type="button" onClick={() => fileInput.current?.click()} className={secondaryButton}>
          Load JSON file
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose a backup JSON file"
          onChange={(event) => {
            void pick(event.target.files?.[0])
            event.target.value = ""
          }}
        />
      </div>
      {problem && (
        <p role="alert" className="text-sm text-release">
          {problem}
        </p>
      )}
      <ConfirmDialog
        open={incoming !== null}
        title="Load this backup?"
        confirmLabel="Replace my cards"
        busy={busy}
        onConfirm={() => void load()}
        onCancel={() => setIncoming(null)}
      >
        The file holds {incoming?.notes.length ?? 0} whiteboard cards and {incoming?.kanban.cards.length ?? 0} Kanban
        tasks. Loading it replaces everything on the whiteboard and the Kanban now.
      </ConfirmDialog>
    </SectionShell>
  )
}

type Permission = NotificationPermission | "unsupported" | null

const NUDGE_FIELDS: { kind: NudgeKind; label: string }[] = [
  { kind: "morning", label: "Morning" },
  { kind: "evening", label: "Evening" },
]

function NudgeSection() {
  const headingId = useId()
  const fieldId = useId()
  const { doc, report } = useWorkspace()
  const saved = doc.nudge ?? DEFAULT_NUDGE
  const [times, setTimes] = useState<Record<NudgeKind, string>>({ morning: saved.morning, evening: saved.evening })
  const [permission, setPermission] = useState<Permission>(null)

  useEffect(() => {
    setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission)
  }, [])

  function change(kind: NudgeKind, value: string) {
    setTimes((current) => ({ ...current, [kind]: value }))
    if (isTime(value)) report("nudge", withTime(saved, kind, value, new Date()))
  }

  async function allow() {
    if (typeof Notification === "undefined") return
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === "granted") window.dispatchEvent(new Event(NUDGE_CHECK_EVENT))
  }

  return (
    <SectionShell id={headingId} title="Daily nudge">
      <p className="text-sm text-ink-soft">One system notification in the morning and one in the evening, each once a day.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {NUDGE_FIELDS.map(({ kind, label }) => {
          const valid = isTime(times[kind])
          return (
            <div key={kind} className="flex flex-col gap-1.5">
              <label htmlFor={`${fieldId}-${kind}`} className="text-sm text-ink">
                {label} time
              </label>
              <input
                id={`${fieldId}-${kind}`}
                type="time"
                value={times[kind]}
                aria-invalid={!valid}
                aria-describedby={`${fieldId}-${kind}-help`}
                onChange={(event) => change(kind, event.target.value)}
                className={inputClass}
              />
              <p id={`${fieldId}-${kind}-help`} className={`text-xs ${valid ? "text-ink-soft" : "text-release"}`}>
                {valid ? `Shows “${NUDGE_TITLE[kind]}”.` : "Enter a time."}
              </p>
            </div>
          )
        })}
      </div>
      {permission === "default" && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void allow()} className={primaryButton}>
            Allow notifications
          </button>
          <p className="text-sm text-ink-soft">The app needs your permission before it can show them.</p>
        </div>
      )}
      {permission === "denied" && (
        <p className="text-sm text-ink-soft">
          Notifications are blocked for this app, so none will show. Allow them in your system or browser settings.
        </p>
      )}
      {permission === "unsupported" && (
        <p className="text-sm text-ink-soft">This window cannot show system notifications.</p>
      )}
    </SectionShell>
  )
}

function LifeSection() {
  const headingId = useId()
  const dateId = useId()
  const yearsId = useId()
  const { doc, report } = useWorkspace()
  const saved = doc.life ?? DEFAULT_LIFE
  const [birthDate, setBirthDate] = useState(saved.birthDate)
  const [years, setYears] = useState(String(saved.years))

  const dateValid = birthDate === "" || (/^\d{4}-\d{2}-\d{2}$/.test(birthDate) && birthDate <= today())
  const yearsNumber = Number(years)
  const yearsValid = years.trim() !== "" && Number.isInteger(yearsNumber) && yearsNumber >= LIFE_YEARS_MIN && yearsNumber <= LIFE_YEARS_MAX

  function changeDate(value: string) {
    setBirthDate(value)
    if (value === "" || (/^\d{4}-\d{2}-\d{2}$/.test(value) && value <= today())) {
      report("life", { birthDate: value, years: saved.years })
    }
  }

  function changeYears(value: string) {
    setYears(value)
    const next = Number(value)
    if (value.trim() !== "" && Number.isInteger(next) && next >= LIFE_YEARS_MIN && next <= LIFE_YEARS_MAX) {
      report("life", { birthDate: saved.birthDate, years: next })
    }
  }

  return (
    <SectionShell id={headingId} title="Life in weeks">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={dateId} className="text-sm text-ink">
            Date of birth
          </label>
          <input
            id={dateId}
            type="date"
            value={birthDate}
            max={today()}
            aria-invalid={!dateValid}
            onChange={(event) => changeDate(event.target.value)}
            className={inputClass}
          />
          {!dateValid && <p className="text-xs text-release">Enter a date that is not in the future.</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={yearsId} className="text-sm text-ink">
            Years the grid covers
          </label>
          <input
            id={yearsId}
            type="number"
            inputMode="numeric"
            min={LIFE_YEARS_MIN}
            max={LIFE_YEARS_MAX}
            step={1}
            value={years}
            aria-invalid={!yearsValid}
            onChange={(event) => changeYears(event.target.value)}
            className={inputClass}
          />
          {!yearsValid && (
            <p className="text-xs text-release">
              Enter a whole number from {LIFE_YEARS_MIN} to {LIFE_YEARS_MAX}.
            </p>
          )}
        </div>
      </div>
    </SectionShell>
  )
}
