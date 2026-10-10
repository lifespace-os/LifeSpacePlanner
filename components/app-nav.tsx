"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"

const LINKS = [
  { href: "/", label: "Whiteboard" },
  { href: "/kanban", label: "Kanban" },
  { href: "/dashboard", label: "Dashboard" },
]

export function AppNav() {
  const pathname = usePathname()

  return (
    <header className="border-b border-line/80 bg-desk">
      <div className="flex h-14 items-center justify-between px-6">
        <Link href="/" className="flex items-baseline gap-2 text-ink">
          <span className="font-serif text-xl font-medium tracking-tight">LifeSpace</span>
          <span className="text-xs uppercase tracking-[0.18em] text-ink-soft">Kaizen planner</span>
        </Link>
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
