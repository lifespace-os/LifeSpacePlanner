"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"
import { useWorkspace } from "@/components/workspace-provider"

const LINKS = [
  { href: "/", label: "Whiteboard" },
  { href: "/kanban", label: "Kanban" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/settings", label: "Settings" },
]

const STATUS: Record<"saving" | "saved" | "error" | "conflict", string> = {
  saving: "Saving",
  saved: "Saved",
  error: "Could not save",
  conflict: "Data changed in another tab. Reload to see the latest.",
}

export function AppNav() {
  const pathname = usePathname()
  const { status } = useWorkspace()
  const statusText = status ? STATUS[status] : null

  return (
    <header className="border-b border-line/80 bg-desk">
      <div className="flex h-14 items-center justify-between px-6">
        <Link href="/" className="flex items-baseline gap-2 text-ink">
          <span className="font-serif text-xl font-medium tracking-tight">LifeSpace</span>
          <span className="text-xs uppercase tracking-[0.18em] text-ink-soft">Kaizen planner</span>
        </Link>
        {statusText ? (
          <p aria-live="polite" className="text-xs text-ink-soft">
            {statusText}
          </p>
        ) : null}
        <nav aria-label="Main">
          <ul className="flex items-center gap-1">
            {LINKS.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href)
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                      active ? "bg-ink text-board" : "text-ink-soft hover:bg-line/50 hover:text-ink",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </header>
  )
}
