"use client"

import { useEffect, useId, useRef, useState } from "react"
import type { KeyboardEvent, MouseEvent } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"
import { useT } from "@/components/language-provider"
import { VIEWS, openViewFor } from "@/lib/views"

export function ViewsMenu() {
  const t = useT()
  const pathname = usePathname()
  const openView = openViewFor(pathname)
  const menuId = useId()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const pendingFocus = useRef<number | null>(null)
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)

  function close() {
    setOpen(false)
    setPinned(false)
  }

  function openWithFocus(index: number) {
    pendingFocus.current = index
    setOpen(true)
    setPinned(true)
  }

  useEffect(() => {
    if (!open || pendingFocus.current === null) return
    itemRefs.current[pendingFocus.current]?.focus()
    pendingFocus.current = null
  }, [open])

  useEffect(() => {
    if (!open || !pinned) return
    function onPointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) close()
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open, pinned])

  function onTriggerClick(event: MouseEvent<HTMLButtonElement>) {
    if (event.detail === 0) {
      if (open && pinned) close()
      else openWithFocus(0)
      return
    }
    if (!open) {
      setOpen(true)
      setPinned(true)
    } else if (!pinned) {
      setPinned(true)
    } else {
      close()
    }
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      openWithFocus(0)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      openWithFocus(VIEWS.length - 1)
    } else if (event.key === "Escape" && open) {
      close()
    }
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = itemRefs.current.findIndex((item) => item === document.activeElement)
    let next: number | null = null
    if (event.key === "ArrowDown") next = (current + 1) % VIEWS.length
    else if (event.key === "ArrowUp") next = (current - 1 + VIEWS.length) % VIEWS.length
    else if (event.key === "Home") next = 0
    else if (event.key === "End") next = VIEWS.length - 1
    if (next !== null) {
      event.preventDefault()
      itemRefs.current[next]?.focus()
    } else if (event.key === "Escape") {
      event.preventDefault()
      close()
      triggerRef.current?.focus()
    }
  }

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!pinned) setOpen(false)
      }}
      onBlur={(event) => {
        if (!wrapperRef.current?.contains(event.relatedTarget as Node | null)) close()
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={onTriggerClick}
        onKeyDown={onTriggerKeyDown}
        className={clsx(
          "flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          open ? "bg-line/50 text-ink" : "text-ink-soft hover:bg-line/50 hover:text-ink",
        )}
      >
        {t("nav.views")}
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          fill="none"
          className={clsx("size-3 transition-transform", open && "rotate-180")}
        >
          <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-30 pt-1">
          <div
            id={menuId}
            role="menu"
            aria-label={t("nav.views")}
            onKeyDown={onMenuKeyDown}
            className="min-w-40 rounded-md border border-line bg-board p-1 shadow-md"
          >
            {VIEWS.map((view, index) => (
              <Link
                key={view.href}
                ref={(node) => {
                  itemRefs.current[index] = node
                }}
                href={view.href}
                role="menuitem"
                tabIndex={-1}
                aria-current={openView?.href === view.href ? "page" : undefined}
                onClick={close}
                className={clsx(
                  "block rounded px-3 py-1.5 text-sm text-ink transition-colors hover:bg-line/50 focus-visible:bg-line/50 focus-visible:outline-none",
                  openView?.href === view.href && "bg-line/40",
                )}
              >
                {t(view.labelKey)}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
