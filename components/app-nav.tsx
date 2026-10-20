"use client"

import { useEffect, useState } from "react"
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

const MESSAGE: Record<"error" | "conflict", string> = {
  error: "Could not save",
  conflict: "Data changed in another tab. Reload to see the latest.",
}

const CHECK_VISIBLE_MS = 3000

function SaveMark({ mark }: { mark: "saving" | "saved" | null }) {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center text-ink-soft">
      {mark === "saving" ? (
        <svg
          role="img"
          aria-label="Saving"
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
          aria-label="Saved"
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
  const pathname = usePathname()
  const { status } = useWorkspace()
  const [checkVisible, setCheckVisible] = useState(false)
  const message = status === "error" || status === "conflict" ? MESSAGE[status] : null

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
          <span className="text-xs uppercase tracking-[0.18em] text-ink-soft">Kaizen planner</span>
        </Link>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 pl-4">
          <p aria-live="polite" className="min-w-0 truncate text-xs text-ink-soft">
            {message}
          </p>
          <span role="status" className="flex">
            <SaveMark mark={mark} />
          </span>
        </div>
        <nav aria-label="Main" className="ml-1">
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
