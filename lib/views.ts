export const VIEWS = [
  { href: "/views/calendar", label: "Calendar" },
  { href: "/views/gantt", label: "Gantt" },
  { href: "/views/todo-list", label: "Todo list" },
] as const

export function openViewFor(pathname: string) {
  return VIEWS.find((view) => pathname === view.href || pathname.startsWith(`${view.href}/`)) ?? null
}
