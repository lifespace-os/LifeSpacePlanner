import type { Metadata } from "next"
import { TodoScreen } from "@/components/todo/todo-screen"

export const metadata: Metadata = { title: "Todo list — LifeSpace Planner" }

export default function TodoListPage() {
  return <TodoScreen />
}
