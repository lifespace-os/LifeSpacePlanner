import {
  DARK_DOT,
  DARK_RULE,
  LIGHT_DOT,
  LIGHT_RULE,
  themeOf,
  type Theme,
  type ThemeColors,
  type ThemeKey,
} from "@/lib/themes"

/** A theme the person loaded from a file. Only a name, a mode and the ten interface colors are kept. */
export type CustomTheme = {
  id: `custom-${string}`
  name: string
  mode: Theme["mode"]
  colors: ThemeColors
}

export const COLOR_NAMES = [
  "desk",
  "board",
  "card",
  "ink",
  "inkSoft",
  "line",
  "accent",
  "accentSoft",
  "release",
  "link",
] as const satisfies readonly (keyof ThemeColors)[]

export const MAX_CUSTOM_THEMES = 8
export const MIN_INK_CONTRAST = 4.5
const NAME_MAX = 32
const FILE_MAX_CHARS = 20_000

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const SAVED_HEX = /^#[0-9a-f]{6}$/
const SAVED_ID = /^custom-[a-z0-9-]{1,64}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeHex(value: unknown): string | null {
  if (typeof value !== "string" || !HEX.test(value)) return null
  const digits = value.slice(1).toLowerCase()
  const full = digits.length === 3 ? [...digits].map((digit) => digit + digit).join("") : digits
  return `#${full}`
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5]
    .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(first: string, second: string) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

function cleanName(value: unknown) {
  if (typeof value !== "string") return ""
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX)
    .trim()
}

/** The same name always gives the same id, so loading a file twice replaces the theme instead of copying it. */
function idForName(name: string): CustomTheme["id"] {
  const lower = name.toLowerCase()
  const slug = lower
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24)
  let hash = 5381
  for (const character of lower) hash = ((hash * 33) ^ (character.codePointAt(0) ?? 0)) >>> 0
  return `custom-${slug ? `${slug}-` : ""}${hash.toString(36)}`
}

const INK_SURFACES = ["board", "card", "desk"] as const

export type ThemeFileResult = { ok: true; theme: CustomTheme } | { ok: false; reason: string }

/** Reads the parsed contents of a theme file. Keys other than the name and the ten colors are ignored. */
export function parseThemeFile(value: unknown): ThemeFileResult {
  if (!isRecord(value)) return { ok: false, reason: "That file is not a theme, so nothing was loaded." }
  const name = cleanName(value.name)
  if (!name) return { ok: false, reason: "The theme file has no name, so nothing was loaded." }
  if (!isRecord(value.colors)) return { ok: false, reason: "The theme file has no colors, so nothing was loaded." }

  const colors = {} as ThemeColors
  for (const colorName of COLOR_NAMES) {
    const hex = normalizeHex(value.colors[colorName])
    if (!hex) {
      return {
        ok: false,
        reason: `The color "${colorName}" is missing or is not a hex color like #2f5d50, so the theme was not loaded.`,
      }
    }
    colors[colorName] = hex
  }

  for (const surface of INK_SURFACES) {
    const ratio = contrastRatio(colors.ink, colors[surface])
    if (ratio < MIN_INK_CONTRAST) {
      return {
        ok: false,
        reason: `The ink is too faint to read on the ${surface} (${ratio.toFixed(1)} to 1, it needs at least ${MIN_INK_CONTRAST} to 1), so the theme was not loaded.`,
      }
    }
  }

  const mode = luminance(colors.board) < 0.18 ? "dark" : "light"
  return { ok: true, theme: { id: idForName(name), name, mode, colors } }
}

/** Reads the text of a theme file. */
export function parseThemeText(text: string): ThemeFileResult {
  if (text.length > FILE_MAX_CHARS) return { ok: false, reason: "That file is too large to be a theme, so nothing was loaded." }
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, reason: "That file is not valid JSON, so nothing was loaded." }
  }
  return parseThemeFile(json)
}

/** The text of the file Download theme saves: the name and the ten colors, each as a hex color. */
export function themeFileText(theme: Theme) {
  const colors: Record<string, string> = {}
  for (const colorName of COLOR_NAMES) colors[colorName] = theme.colors[colorName]
  return `${JSON.stringify({ name: theme.name, colors }, null, 2)}\n`
}

export function themeFileName(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return `${slug || "theme"}-theme.json`
}

export function themeFromCustom(custom: CustomTheme): Theme {
  const dark = custom.mode === "dark"
  return { ...custom, boardDot: dark ? DARK_DOT : LIGHT_DOT, taskRule: dark ? DARK_RULE : LIGHT_RULE }
}

/** The theme for a key: a loaded theme when the list has it, otherwise a built-in one. */
export function themeFor(key: ThemeKey | undefined, customs: readonly CustomTheme[] | undefined): Theme {
  const custom = customs?.find((entry) => entry.id === key)
  return custom ? themeFromCustom(custom) : themeOf(key)
}

export function withCustomTheme(
  list: readonly CustomTheme[],
  theme: CustomTheme,
): { ok: true; list: CustomTheme[]; replaced: boolean } | { ok: false } {
  const at = list.findIndex((entry) => entry.id === theme.id)
  if (at >= 0) return { ok: true, list: list.map((entry, index) => (index === at ? theme : entry)), replaced: true }
  if (list.length >= MAX_CUSTOM_THEMES) return { ok: false }
  return { ok: true, list: [...list, theme], replaced: false }
}

function isCustomTheme(value: unknown): value is CustomTheme {
  if (!isRecord(value)) return false
  if (typeof value.id !== "string" || !SAVED_ID.test(value.id)) return false
  if (typeof value.name !== "string" || value.name.length < 1 || value.name.length > NAME_MAX) return false
  if (value.mode !== "light" && value.mode !== "dark") return false
  if (!isRecord(value.colors)) return false
  return COLOR_NAMES.every((colorName) => {
    const hex = (value.colors as Record<string, unknown>)[colorName]
    return typeof hex === "string" && SAVED_HEX.test(hex)
  })
}

export function isCustomThemeList(value: unknown): value is CustomTheme[] {
  if (!Array.isArray(value) || value.length > MAX_CUSTOM_THEMES) return false
  if (!value.every(isCustomTheme)) return false
  return new Set(value.map((entry) => entry.id)).size === value.length
}
