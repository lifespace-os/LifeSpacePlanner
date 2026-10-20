export const VIEWS = [
  { href: "/views/calendar", label: "Calendar" },
  { href: "/views/gantt", label: "Gantt" },
  { href: "/views/todo-list", label: "Todo list" },
] as const

export type ViewHref = (typeof VIEWS)[number]["href"]

/** The view the header slot shows until one has been chosen. */
export const DEFAULT_VIEW = VIEWS[0]

export function isViewHref(value: unknown): value is ViewHref {
  return VIEWS.some((view) => view.href === value)
}

export function openViewFor(pathname: string) {
  return VIEWS.find((view) => pathname === view.href || pathname.startsWith(`${view.href}/`)) ?? null
}

/** The view the slot shows: the open one, else the remembered one, else Calendar. */
export function slotViewFor(pathname: string, remembered: ViewHref | undefined) {
  return openViewFor(pathname) ?? VIEWS.find((view) => view.href === remembered) ?? DEFAULT_VIEW
}
