"use client"

import { useState, type ComponentProps } from "react"
import clsx from "clsx"

/** Marks a drag as a calendar task, so other drags do not light the cells. */
export const TASK_DRAG_TYPE = "application/x-calendar-task"

type Props = Omit<ComponentProps<"div">, "onDrop"> & {
  onDropTask: (taskId: string) => void
  /** Classes added while a task is held over the cell. */
  overClassName?: string
}

export function DropCell({ onDropTask, overClassName = "bg-accent-soft", className, children, ...rest }: Props) {
  const [over, setOver] = useState(false)
  return (
    <div
      {...rest}
      className={clsx(className, over && overClassName)}
      onDragOver={(event) => {
        if (!Array.from(event.dataTransfer.types).includes(TASK_DRAG_TYPE)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
        setOver(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false)
      }}
      onDrop={(event) => {
        const taskId = event.dataTransfer.getData(TASK_DRAG_TYPE)
        setOver(false)
        if (!taskId) return
        event.preventDefault()
        onDropTask(taskId)
      }}
    >
      {children}
    </div>
  )
}
