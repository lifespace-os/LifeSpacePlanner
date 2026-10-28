"use client"

import { Globe } from "lucide-react"
import { useT } from "@/components/language-provider"
import { isWebUrl, webLinkLabel, type WebLink } from "@/lib/web-links"

const VISIBLE = 2

type Props = {
  links: readonly WebLink[] | undefined
  /** Called when the "+N" chip is pressed. Without it the chip is plain text. */
  onMore?: (event: React.MouseEvent<HTMLButtonElement>) => void
  className?: string
}

/** The Web links of a card as one short row. A click opens the site in a new tab and never starts a drag. */
export function WebLinkRow({ links, onMore, className }: Props) {
  const t = useT()
  const safe = (links ?? []).filter((link) => isWebUrl(link.url))
  if (safe.length === 0) return null
  const shown = safe.slice(0, VISIBLE)
  const hidden = safe.length - shown.length
  const chip =
    "inline-flex h-6 min-w-0 shrink items-center gap-1 rounded-full border border-current/25 px-2 text-xs font-medium text-current/80 transition-colors hover:bg-current/10 hover:text-current focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"

  return (
    <div
      data-web-links=""
      role="group"
      aria-label={t("webLinks.title")}
      className={`flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden ${className ?? ""}`}
    >
      {shown.map((link) => {
        const label = webLinkLabel(link)
        return (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            title={link.url}
            aria-label={t("webLinks.open", { label })}
            draggable={false}
            className={chip}
          >
            <Globe className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </a>
        )
      })}
      {hidden > 0 ? (
        onMore ? (
          <button
            type="button"
            aria-label={t("webLinks.more", { count: hidden })}
            onClick={onMore}
            className={`${chip} shrink-0 tabular-nums`}
          >
            +{hidden}
          </button>
        ) : (
          <span
            title={safe.slice(VISIBLE).map(webLinkLabel).join(", ")}
            className="inline-flex h-6 shrink-0 items-center px-1 text-xs font-medium text-current/70 tabular-nums"
          >
            +{hidden}
          </span>
        )
      ) : null}
    </div>
  )
}
