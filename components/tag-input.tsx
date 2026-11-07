"use client"

import { useId, useMemo, useState } from "react"
import clsx from "clsx"
import { useGoals } from "@/components/goals-provider"
import { useKanban } from "@/components/kanban/kanban-provider"
import { useT } from "@/components/language-provider"
import { collectTags, suggestTags } from "@/lib/tag-suggestions"

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "role" | "autoComplete" | "type"
> & {
  value: string
  onValue: (value: string) => void
  /** The tags this card already carries. They are not offered. */
  own: string[]
  /** Called with a tag chosen from the list. */
  onPick: (tag: string) => void
  /** Drawn inside the field, before the text (an icon). */
  leading?: React.ReactNode
}

/**
 * A tag field that offers the tags already on whiteboard cards and kanban tasks.
 * The list is in the flow below the field, so a scrolling window never clips it.
 */
export function TagInput({ value, onValue, own, onPick, leading, className, onKeyDown, onFocus, onBlur, ...rest }: Props) {
  const t = useT()
  const { notes } = useGoals()
  const { cards } = useKanban()
  const listId = useId()
  const [focused, setFocused] = useState(false)
  const [open, setOpen] = useState(true)
  const [active, setActive] = useState(-1)

  const all = useMemo(() => collectTags(notes, cards), [notes, cards])
  const suggestions = useMemo(() => suggestTags(all, value, own), [all, value, own])
  const shown = focused && open && suggestions.length > 0

  function choose(tag: string) {
    setOpen(false)
    setActive(-1)
    onPick(tag)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event)
    if (event.defaultPrevented) return
    if (event.nativeEvent.isComposing || event.keyCode === 229) {
      if (event.key === "Enter") event.preventDefault()
      return
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (suggestions.length === 0) return
      event.preventDefault()
      if (!shown) {
        setOpen(true)
        setActive(event.key === "ArrowDown" ? 0 : suggestions.length - 1)
        return
      }
      const step = event.key === "ArrowDown" ? 1 : -1
      setActive((current) => (current + step + suggestions.length) % suggestions.length)
    } else if (event.key === "Enter" && shown && active >= 0 && suggestions[active]) {
      event.preventDefault()
      choose(suggestions[active])
    } else if (event.key === "Escape" && shown) {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      setActive(-1)
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="relative">
        {leading}
        <input
          {...rest}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={shown}
          aria-controls={listId}
          aria-activedescendant={shown && active >= 0 ? `${listId}-${active}` : undefined}
          value={value}
          onChange={(event) => {
            onValue(event.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onFocus={(event) => {
            setFocused(true)
            onFocus?.(event)
          }}
          onBlur={(event) => {
            setFocused(false)
            setActive(-1)
            onBlur?.(event)
          }}
          onKeyDown={handleKeyDown}
          className={className}
        />
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label={t("tags.suggestions")}
        hidden={!shown}
        onMouseDown={(event) => event.preventDefault()}
        className="max-h-36 overflow-y-auto rounded-md border border-line bg-card py-1 text-sm text-ink shadow-sm"
      >
        {shown
          ? suggestions.map((tag, index) => (
              <li
                key={tag}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onClick={() => choose(tag)}
                onMouseEnter={() => setActive(index)}
                className={clsx("cursor-pointer truncate px-2.5 py-1.5", index === active ? "bg-line/60" : "hover:bg-line/40")}
              >
                #{tag}
              </li>
            ))
          : null}
      </ul>
    </div>
  )
}
