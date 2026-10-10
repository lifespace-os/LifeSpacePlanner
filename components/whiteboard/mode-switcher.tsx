import clsx from "clsx"
import { MODES, type Mode } from "@/lib/board-data"

export function ModeSwitcher({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div role="group" aria-label="Board mode" className="flex items-center gap-1 rounded-xl border border-line bg-board p-1 shadow-sm">
      {MODES.map((m, index) => {
        const active = m.id === mode
        return (
          <button
            key={m.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(m.id)}
            className={clsx(
              "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              active ? "bg-ink text-board shadow" : "text-ink-soft hover:bg-desk hover:text-ink",
            )}
          >
            <span
              aria-hidden="true"
              className={clsx(
                "flex size-5 items-center justify-center rounded-full text-[11px] font-medium tabular-nums",
                active ? "bg-board text-ink" : "border border-line",
              )}
            >
              {index + 1}
            </span>
            {m.name}
          </button>
        )
      })}
    </div>
  )
}
