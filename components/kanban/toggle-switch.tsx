"use client"

import clsx from "clsx"

type ToggleSwitchProps = {
  checked: boolean
  onChange: (on: boolean) => void
  label: string
  count?: number
}

export function ToggleSwitch({ checked, onChange, label, count }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 rounded-md px-1 py-1 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span
        aria-hidden="true"
        className={clsx(
          "flex h-5 w-9 items-center rounded-full border p-0.5 transition-colors",
          checked ? "border-accent bg-accent" : "border-line bg-desk",
        )}
      >
        <span className={clsx("size-3.5 rounded-full bg-board shadow-sm transition-transform", checked ? "translate-x-4" : "translate-x-0 bg-ink-soft")} />
      </span>
      {label}
      {count !== undefined && <span className="text-xs tabular-nums text-ink-soft">{count}</span>}
    </button>
  )
}
