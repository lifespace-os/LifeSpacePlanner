/** One Web link on a card or task: an address and an optional name. It is not a hashtag and not a line between cards. */
export type WebLink = {
  id: string
  /** A full http or https address, as the URL parser writes it. */
  url: string
  /** What the person called it. Missing or empty means the site name is shown. */
  name?: string
}

export const MAX_WEB_LINKS = 8
export const MAX_WEB_LINK_NAME = 40
const MAX_ADDRESS_LENGTH = 2000

export type WebAddressResult = { ok: true; url: string } | { ok: false; reason: "empty" | "scheme" | "invalid" }

/** A word such as "localhost:3000" or "example.com:8080/path" is a host and port, not a scheme. */
const HOST_AND_PORT = /^[^\s/:@]+:\d+(?:[/?#]|$)/
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i

/**
 * Reads what the person typed. Only http and https are accepted. A bare site such as "example.com" is read as https.
 * Anything else with a scheme (mailto, javascript, file, ftp, data) is refused.
 */
export function parseWebAddress(input: string): WebAddressResult {
  const text = input.trim()
  if (!text) return { ok: false, reason: "empty" }
  if (text.length > MAX_ADDRESS_LENGTH || /\s/.test(text)) return { ok: false, reason: "invalid" }
  const needsScheme = !HAS_SCHEME.test(text) || HOST_AND_PORT.test(text)
  if (!needsScheme && !/^https?:\/\//i.test(text)) return { ok: false, reason: "scheme" }
  try {
    const url = new URL(needsScheme ? `https://${text}` : text)
    if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, reason: "scheme" }
    if (!url.hostname) return { ok: false, reason: "invalid" }
    return { ok: true, url: url.href }
  } catch {
    return { ok: false, reason: "invalid" }
  }
}

/** True for a stored address that is a full http or https address. */
export function isWebUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > MAX_ADDRESS_LENGTH) return false
  try {
    const url = new URL(value)
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname !== ""
  } catch {
    return false
  }
}

export function isWebLinkList(value: unknown): value is WebLink[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_WEB_LINKS &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as WebLink).id === "string" &&
        isWebUrl((item as WebLink).url) &&
        ((item as WebLink).name === undefined || typeof (item as WebLink).name === "string"),
    )
  )
}

/** The site name of an address, without a leading "www.". */
export function siteOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "")
  } catch {
    return url
  }
}

/** What a link is called on screen: the name the person gave it, otherwise its site. */
export function webLinkLabel(link: WebLink) {
  return link.name?.trim() || siteOf(link.url)
}

export function sameWebLinks(a: readonly WebLink[], b: readonly WebLink[]) {
  return a.length === b.length && a.every((item, index) => item.id === b[index]?.id && item.url === b[index]?.url && (item.name ?? "") === (b[index]?.name ?? ""))
}

export function newWebLinkId() {
  return `w${Math.random().toString(36).slice(2, 10)}`
}
