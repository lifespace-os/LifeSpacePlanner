"use client"

import { Check } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import { ToggleSwitch } from "@/components/kanban/toggle-switch"
import { useLanguage, useT } from "@/components/language-provider"
import { ConfirmDialog } from "@/components/settings/confirm-dialog"
import { useWorkspace } from "@/components/workspace-provider"
import {
  DEFAULT_NUDGE,
  NUDGE_CHECK_EVENT,
  NUDGE_TITLE_KEY,
  isTime,
  withTime,
  type NudgeKind,
} from "@/lib/nudge"
import {
  MAX_CUSTOM_THEMES,
  parseThemeText,
  themeFileName,
  themeFileText,
  themeFor,
  themeFromCustom,
  withCustomTheme,
  type CustomTheme,
} from "@/lib/custom-themes"
import { LANGUAGES, type MessageKey, type Translate } from "@/lib/i18n"
import { DEFAULT_THEME_SCHEDULE, isScheduleTime, type ThemeSchedule } from "@/lib/theme-schedule"
import { DEFAULT_THEME, THEMES, type Theme, type ThemeKey } from "@/lib/themes"
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

function themeLabel(t: Translate, theme: Pick<Theme, "id" | "name">) {
  return THEMES.some((builtIn) => builtIn.id === theme.id) ? t(`theme.${theme.id}` as MessageKey) : theme.name
}

export function SettingsScreen() {
  const t = useT()
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="font-serif text-4xl font-medium tracking-tight text-balance">{t("settings.title")}</h1>
      <div className="mt-8 flex flex-col gap-10">
        <LanguageSection />
        <ThemeSection />
        <SampleStorySection />
        <BackupSection />
        <LifeSection />
        <NudgeSection />
        <p className="border-t border-line pt-6 text-sm text-ink-soft">
          {t("settings.footer")}
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

const THEME_GROUPS: { mode: Theme["mode"]; titleKey: MessageKey }[] = [
  { mode: "light", titleKey: "settings.theme.light" },
  { mode: "dark", titleKey: "settings.theme.dark" },
]

function LanguageSection() {
  const headingId = useId()
  const { lang, t } = useLanguage()
  const { report } = useWorkspace()
  const optionRefs = useRef(new Map<string, HTMLButtonElement>())

  function choose(id: (typeof LANGUAGES)[number]["id"]) {
    report("language", id)
  }

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0
    if (!step) return
    event.preventDefault()
    const next = LANGUAGES[(index + step + LANGUAGES.length) % LANGUAGES.length]
    choose(next.id)
    optionRefs.current.get(next.id)?.focus()
  }

  return (
    <SectionShell id={headingId} title={t("settings.language.title")}>
      <p className="text-sm text-ink-soft">{t("settings.language.help")}</p>
      <div role="radiogroup" aria-label={t("settings.language.group")} className="flex flex-wrap gap-2">
        {LANGUAGES.map((language, index) => {
          const selected = language.id === lang
          return (
            <button
              key={language.id}
              ref={(node) => {
                if (node) optionRefs.current.set(language.id, node)
                else optionRefs.current.delete(language.id)
              }}
              type="button"
              role="radio"
              lang={language.id}
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => choose(language.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                selected ? "border-accent ring-2 ring-accent" : "border-line hover:border-ink-soft"
              }`}
            >
              {language.name}
              {selected && <Check aria-hidden="true" className="size-4 shrink-0 text-accent" />}
            </button>
          )
        })}
      </div>
    </SectionShell>
  )
}

function ThemeSection() {
  const t = useT()
  const headingId = useId()
  const { doc, report } = useWorkspace()
  const customs = doc.customThemes ?? []
  const current: ThemeKey = doc.theme ?? DEFAULT_THEME
  const schedule = doc.themeSchedule ?? DEFAULT_THEME_SCHEDULE
  const optionRefs = useRef(new Map<ThemeKey, HTMLButtonElement>())
  const allThemes: Theme[] = [...THEMES, ...customs.map(themeFromCustom)]
  const ordered = THEME_GROUPS.flatMap((group) => allThemes.filter((theme) => theme.mode === group.mode))
  const shown = themeFor(current, customs)

  function choose(id: ThemeKey) {
    report("theme", id)
  }

  function follow(enabled: boolean) {
    report("themeSchedule", { ...schedule, enabled })
  }

  function move(from: number, step: number) {
    const next = ordered[(from + step + ordered.length) % ordered.length]
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
    <SectionShell id={headingId} title={t("settings.theme.title")}>
      <p className="text-sm text-ink-soft">
        {t("settings.theme.help")}
      </p>
      <ToggleSwitch checked={schedule.enabled} onChange={follow} label={t("settings.theme.follow")} />
      {schedule.enabled ? (
        <ScheduleFields schedule={schedule} nowName={themeLabel(t, shown)} customs={customs} />
      ) : (
      <div role="radiogroup" aria-labelledby={headingId} className="flex flex-col gap-4">
        {THEME_GROUPS.map((group) => (
          <div key={group.mode} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-ink-soft">{t(group.titleKey)}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ordered.map((theme, index) =>
                theme.mode !== group.mode ? null : (
                  <ThemeOption
                    key={theme.id}
                    theme={theme}
                    label={themeLabel(t, theme)}
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
      )}
      <ThemeFileTools shown={shown} customs={customs} current={current} schedule={schedule} />
    </SectionShell>
  )
}

function ThemeFileTools({
  shown,
  customs,
  current,
  schedule,
}: {
  shown: Theme
  customs: CustomTheme[]
  current: ThemeKey
  schedule: ThemeSchedule
}) {
  const t = useT()
  const { report } = useWorkspace()
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ text: string; problem: boolean } | null>(null)

  function download() {
    const blob = new Blob([themeFileText(shown)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = themeFileName(shown.name)
    link.click()
    URL.revokeObjectURL(url)
    setMessage({ text: t("settings.theme.saved", { name: themeLabel(t, shown), file: link.download }), problem: false })
  }

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (file.size > 20_000) {
      setMessage({ text: t("settings.theme.tooLarge"), problem: true })
      return
    }
    const parsed = parseThemeText(await file.text())
    if (!parsed.ok) {
      setMessage({ text: t(parsed.reason, localizeVars(t, parsed.vars)), problem: true })
      return
    }
    const next = withCustomTheme(customs, parsed.theme)
    if (!next.ok) {
      setMessage({
        text: t("settings.theme.limit", { max: MAX_CUSTOM_THEMES }),
        problem: true,
      })
      return
    }
    report("customThemes", next.list)
    setMessage({
      text: t(next.replaced ? "settings.theme.updatedMsg" : "settings.theme.loadedMsg", { name: parsed.theme.name }),
      problem: false,
    })
  }

  function remove(theme: CustomTheme) {
    const left = customs.filter((entry) => entry.id !== theme.id)
    report("customThemes", left.length ? left : undefined)
    if (current === theme.id) report("theme", DEFAULT_THEME)
    if (schedule.day === theme.id || schedule.evening === theme.id) {
      report("themeSchedule", {
        ...schedule,
        day: schedule.day === theme.id ? DEFAULT_THEME_SCHEDULE.day : schedule.day,
        evening: schedule.evening === theme.id ? DEFAULT_THEME_SCHEDULE.evening : schedule.evening,
      })
    }
    setMessage({ text: t("settings.theme.removedMsg", { name: theme.name }), problem: false })
  }

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      <p className="text-sm text-ink-soft">
        {t("settings.theme.fileHelp", { name: themeLabel(t, shown) })}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={download} className={secondaryButton}>
          {t("settings.theme.download")}
        </button>
        <button type="button" onClick={() => fileInput.current?.click()} className={secondaryButton}>
          {t("settings.theme.load")}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-label={t("settings.theme.chooseFile")}
          onChange={onFile}
        />
      </div>
      <p role="status" className={`min-h-5 text-sm ${message?.problem ? "text-release" : "text-ink-soft"}`}>
        {message?.text}
      </p>
      {customs.length > 0 && (
        <ul aria-label={t("settings.theme.loadedList")} className="flex flex-col gap-2">
          {customs.map((theme) => (
            <li
              key={theme.id}
              className="flex items-center justify-between gap-3 rounded-md border border-line bg-card px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm text-ink">
                {theme.name}
                <span className="text-ink-soft">{theme.mode === "dark" ? t("settings.theme.darkTag") : t("settings.theme.lightTag")}</span>
              </span>
              <button
                type="button"
                onClick={() => remove(theme)}
                aria-label={t("settings.theme.removeNamed", { name: theme.name })}
                className="shrink-0 rounded-md px-2 py-1 text-sm text-release hover:bg-line/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {t("common.remove")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const SCHEDULE_SLOTS: {
  slot: "day" | "evening"
  timeKey: "dayTime" | "eveningTime"
  labelKey: MessageKey
  themeLabelKey: MessageKey
}[] = [
  { slot: "day", timeKey: "dayTime", labelKey: "settings.theme.day", themeLabelKey: "settings.theme.dayTheme" },
  { slot: "evening", timeKey: "eveningTime", labelKey: "settings.theme.evening", themeLabelKey: "settings.theme.eveningTheme" },
]

function localizeVars(t: Translate, vars?: Record<string, string | number>) {
  if (!vars || typeof vars.surface !== "string") return vars
  return { ...vars, surface: t(`settings.theme.surface.${vars.surface}` as MessageKey) }
}

function ScheduleFields({
  schedule,
  nowName,
  customs,
}: {
  schedule: ThemeSchedule
  nowName: string
  customs: CustomTheme[]
}) {
  const t = useT()
  const fieldId = useId()
  const { report } = useWorkspace()
  const [times, setTimes] = useState({ dayTime: schedule.dayTime, eveningTime: schedule.eveningTime })

  function changeTime(timeKey: "dayTime" | "eveningTime", value: string) {
    setTimes((current) => ({ ...current, [timeKey]: value }))
    if (isScheduleTime(value)) report("themeSchedule", { ...schedule, [timeKey]: value })
  }

  function changeTheme(slot: "day" | "evening", id: ThemeKey) {
    report("themeSchedule", { ...schedule, [slot]: id })
  }

  const sameTimes = isScheduleTime(times.dayTime) && times.dayTime === times.eveningTime

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">
        {t("settings.theme.showingNow", { name: nowName })}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {SCHEDULE_SLOTS.map(({ slot, timeKey, labelKey, themeLabelKey }) => {
          const valid = isScheduleTime(times[timeKey])
          return (
            <div key={slot} className="flex flex-col gap-3 rounded-lg border border-line bg-card p-4">
              <h3 className="text-sm font-medium text-ink">{t(labelKey)}</h3>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`${fieldId}-${slot}-theme`} className="text-sm text-ink">
                  {t(themeLabelKey)}
                </label>
                <select
                  id={`${fieldId}-${slot}-theme`}
                  value={schedule[slot]}
                  onChange={(event) => changeTheme(slot, event.target.value as ThemeKey)}
                  className={inputClass}
                >
                  {THEME_GROUPS.map((group) => (
                    <optgroup key={group.mode} label={t(group.titleKey)}>
                      {THEMES.filter((theme) => theme.mode === group.mode).map((theme) => (
                        <option key={theme.id} value={theme.id}>
                          {themeLabel(t, theme)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  {customs.length > 0 && (
                    <optgroup label={t("settings.theme.loaded")}>
                      {customs.map((theme) => (
                        <option key={theme.id} value={theme.id}>
                          {theme.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`${fieldId}-${slot}-time`} className="text-sm text-ink">
                  {t("settings.theme.startsAt")}
                </label>
                <input
                  id={`${fieldId}-${slot}-time`}
                  type="time"
                  value={times[timeKey]}
                  aria-invalid={!valid}
                  aria-describedby={`${fieldId}-${slot}-help`}
                  onChange={(event) => changeTime(timeKey, event.target.value)}
                  className={inputClass}
                />
                <p id={`${fieldId}-${slot}-help`} className={`text-xs ${valid ? "text-ink-soft" : "text-release"}`}>
                  {valid ? t("common.localTime") : t("common.enterTime")}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      {sameTimes && (
        <p className="text-sm text-ink-soft">{t("settings.theme.sameTimes")}</p>
      )}
      <p className="text-sm text-ink-soft">
        {t("settings.theme.followNote")}
      </p>
    </div>
  )
}

function ThemeOption({
  theme,
  label,
  selected,
  onSelect,
  onKeyDown,
  buttonRef,
}: {
  theme: Theme
  label: string
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
        {label}
        {selected && <Check aria-hidden="true" className="size-4 shrink-0 text-accent" />}
      </span>
    </button>
  )
}

function SampleStorySection() {
  const t = useT()
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
    <SectionShell id={headingId} title={t("settings.sample.title")}>
      <ToggleSwitch checked={on} onChange={choose} label={t("settings.sample.show")} />
      <p className="text-sm text-ink-soft">{t("settings.sample.help")}</p>
      <ConfirmDialog
        open={asking === "sample"}
        title={t("settings.sample.putBackTitle")}
        confirmLabel={t("settings.sample.putBackConfirm")}
        busy={busy}
        onConfirm={() => void swap("sample")}
        onCancel={() => setAsking(null)}
      >
        {t("settings.sample.putBackBody")}
      </ConfirmDialog>
      <ConfirmDialog
        open={asking === "empty"}
        title={t("settings.sample.emptyTitle")}
        confirmLabel={t("settings.sample.emptyConfirm")}
        busy={busy}
        onConfirm={() => void swap("empty")}
        onCancel={() => setAsking(null)}
      >
        {t("settings.sample.emptyBody")}
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
  const t = useT()
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
      setProblem(t("settings.backup.notJson"))
      return
    }
    const parsed = parseWorkspace(json)
    if (!parsed.ok) {
      setProblem(t("settings.backup.nothingLoaded", { reason: parsed.reason }))
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
      customThemes: incoming.customThemes ?? doc.customThemes,
      themeSchedule: incoming.themeSchedule ?? (incoming.theme ? undefined : doc.themeSchedule),
    })
    setBusy(false)
    setIncoming(null)
  }

  return (
    <SectionShell id={headingId} title={t("settings.backup.title")}>
      <p className="text-sm text-ink-soft">{t("settings.backup.help")}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={download} className={primaryButton}>
          {t("settings.backup.download")}
        </button>
        <button type="button" onClick={() => fileInput.current?.click()} className={secondaryButton}>
          {t("settings.backup.load")}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-label={t("settings.backup.chooseFile")}
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
        title={t("settings.backup.confirmTitle")}
        confirmLabel={t("settings.backup.confirmLabel")}
        busy={busy}
        onConfirm={() => void load()}
        onCancel={() => setIncoming(null)}
      >
        {t("settings.backup.confirmBody", {
          notes: incoming?.notes.length ?? 0,
          tasks: incoming?.kanban.cards.length ?? 0,
        })}
      </ConfirmDialog>
    </SectionShell>
  )
}

type Permission = NotificationPermission | "unsupported" | null

const NUDGE_FIELDS: { kind: NudgeKind; labelKey: MessageKey }[] = [
  { kind: "morning", labelKey: "settings.nudge.morningTime" },
  { kind: "evening", labelKey: "settings.nudge.eveningTime" },
]

function NudgeSection() {
  const t = useT()
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
    <SectionShell id={headingId} title={t("settings.nudge.title")}>
      <p className="text-sm text-ink-soft">{t("settings.nudge.help")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {NUDGE_FIELDS.map(({ kind, labelKey }) => {
          const valid = isTime(times[kind])
          return (
            <div key={kind} className="flex flex-col gap-1.5">
              <label htmlFor={`${fieldId}-${kind}`} className="text-sm text-ink">
                {t(labelKey)}
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
                {valid ? t("settings.nudge.shows", { title: t(NUDGE_TITLE_KEY[kind]) }) : t("common.enterTime")}
              </p>
            </div>
          )
        })}
      </div>
      {permission === "default" && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void allow()} className={primaryButton}>
            {t("settings.nudge.allow")}
          </button>
          <p className="text-sm text-ink-soft">{t("settings.nudge.needsPermission")}</p>
        </div>
      )}
      {permission === "denied" && (
        <p className="text-sm text-ink-soft">
          {t("settings.nudge.blocked")}
        </p>
      )}
      {permission === "unsupported" && (
        <p className="text-sm text-ink-soft">{t("settings.nudge.unsupported")}</p>
      )}
    </SectionShell>
  )
}

function LifeSection() {
  const t = useT()
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
    <SectionShell id={headingId} title={t("settings.life.title")}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={dateId} className="text-sm text-ink">
            {t("settings.life.birth")}
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
          {!dateValid && <p className="text-xs text-release">{t("settings.life.birthError")}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={yearsId} className="text-sm text-ink">
            {t("settings.life.years")}
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
              {t("settings.life.yearsError", { min: LIFE_YEARS_MIN, max: LIFE_YEARS_MAX })}
            </p>
          )}
        </div>
      </div>
    </SectionShell>
  )
}
