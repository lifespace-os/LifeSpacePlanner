"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"
import { CardSearch } from "@/components/search/card-search"
import { ViewsMenu } from "@/components/views-menu"
import { useWorkspace } from "@/components/workspace-provider"
import { useT } from "@/components/language-provider"
import type { MessageKey } from "@/lib/i18n"
import { openViewFor, slotViewFor } from "@/lib/views"

const BEFORE_VIEWS: { href: string; labelKey: MessageKey }[] = [
  { href: "/", labelKey: "nav.whiteboard" },
  { href: "/kanban", labelKey: "nav.kanban" },
]

const AFTER_VIEWS: { href: string; labelKey: MessageKey }[] = [
  { href: "/dashboard", labelKey: "nav.dashboard" },
  { href: "/settings", labelKey: "nav.settings" },
]

const NAV_ITEM =
  "block rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"

function NavLink({ href, labelKey, pathname }: { href: string; labelKey: MessageKey; pathname: string }) {
  const t = useT()
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={clsx(NAV_ITEM, active ? "bg-ink text-board" : "text-ink-soft hover:bg-line/50 hover:text-ink")}
      >
        {t(labelKey)}
      </Link>
    </li>
  )
}

function ViewSlot({ pathname }: { pathname: string }) {
  const t = useT()
  const { doc, report } = useWorkspace()
  const openView = openViewFor(pathname)
  const shown = slotViewFor(pathname, doc.lastView)

  useEffect(() => {
    if (openView) report("lastView", openView.href)
  }, [openView, report])

  return (
    <li className="w-32 shrink-0">
      <Link
        href={shown.href}
        aria-current={openView ? "page" : undefined}
        className={clsx(
          NAV_ITEM,
          "w-full truncate text-center",
          openView ? "bg-ink text-board" : "text-ink-soft hover:bg-line/50 hover:text-ink",
        )}
      >
        {t(shown.labelKey)}
      </Link>
    </li>
  )
}

const MESSAGE: Record<"error" | "conflict", MessageKey> = {
  error: "nav.saveError",
  conflict: "nav.saveConflict",
}

const CHECK_VISIBLE_MS = 3000

function SaveMark({ mark }: { mark: "saving" | "saved" | null }) {
  const t = useT()
  return (
    <span className="flex size-5 shrink-0 items-center justify-center text-ink-soft">
      {mark === "saving" ? (
        <svg
          role="img"
          aria-label={t("nav.saving")}
          viewBox="0 0 20 20"
          className="size-4 animate-spin motion-reduce:animate-none"
          fill="none"
        >
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" className="opacity-20" />
          <path d="M10 2a8 8 0 0 1 8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : null}
      {mark === "saved" ? (
        <svg
          role="img"
          aria-label={t("nav.saved")}
          viewBox="0 0 20 20"
          className="size-4 text-accent"
          fill="none"
        >
          <path
            d="M4.5 10.5l3.5 3.5 7.5-8"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  )
}

export function AppNav() {
  const t = useT()
  const pathname = usePathname()
  const { status } = useWorkspace()
  const [checkVisible, setCheckVisible] = useState(false)
  const message = status === "error" || status === "conflict" ? t(MESSAGE[status]) : null

  useEffect(() => {
    if (status !== "saved") {
      setCheckVisible(false)
      return
    }
    setCheckVisible(true)
    const timer = setTimeout(() => setCheckVisible(false), CHECK_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [status])

  const mark = status === "saving" ? "saving" : status === "saved" && checkVisible ? "saved" : null

  return (
    <header className="border-b border-line/80 bg-desk">
      <div className="flex h-14 items-center justify-between px-6">
        <Link href="/" className="flex items-baseline gap-2 text-ink">
          <span className="font-serif text-xl font-medium tracking-tight">LifeSpace</span>
          <span className="text-xs uppercase tracking-[0.18em] text-ink-soft">{t("nav.tagline")}</span>
        </Link>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3 pl-4">
          <CardSearch />
          <p aria-live="polite" className="min-w-0 truncate text-xs text-ink-soft">
            {message}
          </p>
          <span role="status" className="flex">
            <SaveMark mark={mark} />
          </span>
        </div>
        <nav aria-label={t("nav.main")} className="ml-1">
          <ul className="flex items-center gap-1">
            {BEFORE_VIEWS.map((link) => (
              <NavLink key={link.href} {...link} pathname={pathname} />
            ))}
            <ViewSlot pathname={pathname} />
            <li>
              <ViewsMenu />
            </li>
            {AFTER_VIEWS.map((link) => (
              <NavLink key={link.href} {...link} pathname={pathname} />
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
