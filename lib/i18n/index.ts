import { en } from "@/lib/i18n/en"
import { ru } from "@/lib/i18n/ru"

/**
 * Every interface word lives in one list per language (en.ts, ru.ts).
 * To add a language: write its list, then add one line here and one to LANGUAGES.
 */
export const LANGUAGES = [
  { id: "en", name: "English", locale: "en-US", messages: en },
  { id: "ru", name: "Русский", locale: "ru-RU", messages: ru },
] as const

export type Language = (typeof LANGUAGES)[number]["id"]
export type MessageKey = keyof typeof en
export type MessageVars = Record<string, string | number>

export const DEFAULT_LANGUAGE: Language = "en"

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language.id === value)
}

function entryFor(lang: Language) {
  return LANGUAGES.find((language) => language.id === lang) ?? LANGUAGES[0]
}

export function localeFor(lang: Language) {
  return entryFor(lang).locale
}

/** The words of one language, filling any gap from English. */
export function translate(lang: Language, key: MessageKey, vars?: MessageVars): string {
  const messages = entryFor(lang).messages as Record<string, string>
  let text = messages[key] ?? (en as Record<string, string>)[key] ?? key
  if (vars) {
    for (const [name, value] of Object.entries(vars)) text = text.split(`{${name}}`).join(String(value))
  }
  return text
}

/** Picks the form for a count: key.one, key.few, key.many or key.other, by the language's plural rules. */
export function translateCount(lang: Language, key: string, count: number, vars?: MessageVars): string {
  const messages = entryFor(lang).messages as Record<string, string>
  const rule = new Intl.PluralRules(localeFor(lang)).select(count)
  const found = [rule, "other"].map((form) => `${key}.${form}`).find((name) => name in messages)
  return translate(lang, (found ?? `${key}.other`) as MessageKey, { count, ...vars })
}

export type Translate = (key: MessageKey, vars?: MessageVars) => string
export type TranslateCount = (key: string, count: number, vars?: MessageVars) => string
