"use client"

import { useId, useState } from "react"
import { X } from "lucide-react"
import { useT } from "@/components/language-provider"
import {
  MAX_WEB_LINKS,
  MAX_WEB_LINK_NAME,
  newWebLinkId,
  parseWebAddress,
  siteOf,
  type WebLink,
} from "@/lib/web-links"

type Props = {
  links: readonly WebLink[]
  onChange: (links: WebLink[]) => void
}

const FIELD =
  "h-8 w-full rounded-md border border-line bg-board px-2 text-sm text-ink placeholder:text-ink-soft/60 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/30"

/** Adds, names and removes the Web links of one card. It holds no form, so it can sit inside a window that has one. */
export function WebLinksEditor({ links, onChange }: Props) {
  const t = useT()
  const id = useId()
  const [address, setAddress] = useState("")
  const [name, setName] = useState("")
  const [refusal, setRefusal] = useState<string | null>(null)
  const full = links.length >= MAX_WEB_LINKS

  function add() {
    if (!address.trim()) return
    if (full) {
      setRefusal(t("webLinks.tooMany", { max: MAX_WEB_LINKS }))
      return
    }
    const result = parseWebAddress(address)
    if (!result.ok) {
      setRefusal(t(result.reason === "scheme" ? "webLinks.refusedScheme" : "webLinks.refusedInvalid"))
      return
    }
    const clean = name.trim()
    onChange([...links, { id: newWebLinkId(), url: result.url, ...(clean ? { name: clean } : {}) }])
    setAddress("")
    setName("")
    setRefusal(null)
  }

  function onEnter(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return
    event.preventDefault()
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
    add()
  }

  function rename(linkId: string, value: string) {
    onChange(
      links.map((link) => {
        if (link.id !== linkId) return link
        const { name: _name, ...rest } = link
        return value.trim() ? { ...rest, name: value } : rest
      }),
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {links.length > 0 ? (
        <ul aria-label={t("webLinks.title")} className="flex flex-col gap-1.5">
          {links.map((link) => (
            <li key={link.id} className="flex items-center gap-1.5 rounded-md border border-line px-2 py-1.5">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <input
                  type="text"
                  value={link.name ?? ""}
                  maxLength={MAX_WEB_LINK_NAME}
                  placeholder={siteOf(link.url)}
                  aria-label={t("webLinks.rename", { address: link.url })}
                  onChange={(event) => rename(link.id, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.preventDefault()
                  }}
                  className="h-7 w-full rounded border border-transparent bg-transparent px-1 text-sm font-medium text-ink placeholder:text-ink-soft hover:border-line focus-visible:border-accent focus-visible:bg-board focus-visible:outline-2 focus-visible:outline-accent/30"
                />
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate px-1 text-xs text-ink-soft underline-offset-2 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  {link.url}
                </a>
              </div>
              <button
                type="button"
                aria-label={t("webLinks.remove", { address: link.url })}
                onClick={() => onChange(links.filter((item) => item.id !== link.id))}
                className="flex size-7 shrink-0 items-center justify-center rounded text-ink-soft hover:bg-line/50 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-address`} className="sr-only">
          {t("webLinks.address")}
        </label>
        <input
          id={`${id}-address`}
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={address}
          placeholder={t("webLinks.addressPlaceholder")}
          aria-invalid={refusal ? true : undefined}
          aria-describedby={refusal ? `${id}-refusal` : undefined}
          onChange={(event) => {
            setAddress(event.target.value)
            setRefusal(null)
          }}
          onKeyDown={onEnter}
          className={FIELD}
        />
        <div className="flex items-center gap-1.5">
          <label htmlFor={`${id}-name`} className="sr-only">
            {t("webLinks.name")}
          </label>
          <input
            id={`${id}-name`}
            type="text"
            autoComplete="off"
            value={name}
            maxLength={MAX_WEB_LINK_NAME}
            placeholder={t("webLinks.name")}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={onEnter}
            className={FIELD}
          />
          <button
            type="button"
            onClick={add}
            disabled={!address.trim()}
            className="h-8 shrink-0 rounded-md bg-ink px-2.5 text-xs font-medium text-board transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("webLinks.add")}
          </button>
        </div>
        {refusal ? (
          <p id={`${id}-refusal`} role="alert" className="text-xs text-release">
            {refusal}
          </p>
        ) : null}
      </div>
    </div>
  )
}
