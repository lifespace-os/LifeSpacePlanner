import clsx from "clsx"
import type { LabelGroup } from "@/lib/board-data"

export function LabelMark({ shape, color, className }: { shape: LabelGroup["shape"]; color: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "inline-block shrink-0",
        shape === "dot" && "size-2.5 rounded-full",
        shape === "diamond" && "size-2 rotate-45",
        shape === "square" && "size-2.5 rounded-[2px]",
        className,
      )}
      style={{ backgroundColor: color }}
    />
  )
}

/** A shape for a card face. The thin ring keeps it visible on a card painted in the same color. */
export function SetShape({ shape, color }: { shape: LabelGroup["shape"]; color: string }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "inline-block shrink-0 ring-1 ring-ink/40",
        shape === "dot" && "size-2.5 rounded-full",
        shape === "diamond" && "size-2 rotate-45",
        shape === "square" && "size-2.5 rounded-[2px]",
      )}
      style={{ backgroundColor: color }}
    />
  )
}

export function LabelChip({ name, color, shape }: { name: string; color: string; shape: LabelGroup["shape"] }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border bg-card/80 px-2 py-0.5 text-[11px] font-medium leading-4 text-ink"
      style={{ borderColor: `${color}66` }}
    >
      <LabelMark shape={shape} color={color} />
      {name}
    </span>
  )
}
