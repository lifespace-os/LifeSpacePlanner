"use client"

import Link from "next/link"
import clsx from "clsx"
import { useLanguage } from "@/components/language-provider"

type MissionStripProps = {
  missionText: string
  filtering: boolean
  shown: number
  total: number
  onToggle: () => void
}

/** The saved mission sentence above the board. Pressing it keeps only the cards with a path to the mission. */
export function MissionStrip({ missionText, filtering, shown, total, onToggle }: MissionStripProps) {
  const { t } = useLanguage()

  if (!missionText) {
    return (
      <p className="mx-6 mb-3 text-sm text-ink-soft">
        {t("missionStrip.emptyBefore")}{" "}
        <Link href="/" className="font-medium text-ink underline underline-offset-2 hover:text-accent">
          {t("nav.whiteboard")}
        </Link>
        {t("missionStrip.emptyAfter")}
      </p>
    )
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={filtering}
      aria-label={
        filtering
          ? t("missionStrip.ariaFiltering", { mission: missionText, shown, total })
          : t("missionStrip.ariaPlain", { mission: missionText })
      }
      className={clsx(
        "mx-6 mb-3 flex items-center justify-between gap-4 rounded-lg border px-4 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        filtering ? "border-accent bg-accent-soft" : "border-accent/30 bg-accent-soft/60 hover:bg-accent-soft",
      )}
    >
      <span className="min-w-0">
        <span className="block text-[11px] uppercase tracking-[0.18em] text-ink-soft">{t("missionStrip.title")}</span>
        <span className="block text-pretty font-serif text-lg leading-snug text-ink">{`\u201C${missionText}\u201D`}</span>
      </span>
      <span className="shrink-0 text-right text-sm text-ink-soft" aria-hidden="true">
        {filtering ? (
          <>
            <span className="block font-medium text-ink">{t("missionStrip.count", { shown, total })}</span>
            <span className="block">{t("missionStrip.showAll")}</span>
          </>
        ) : (
          t("missionStrip.showOnly")
        )}
      </span>
    </button>
  )
}
