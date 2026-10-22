"use client"

import { createContext, useContext, useEffect, useMemo } from "react"
import { useWorkspace } from "@/components/workspace-provider"
import {
  DEFAULT_LANGUAGE,
  localeFor,
  translate,
  translateCount,
  type Language,
  type Translate,
  type TranslateCount,
} from "@/lib/i18n"

type LanguageValue = {
  lang: Language
  locale: string
  t: Translate
  tn: TranslateCount
}

const LanguageContext = createContext<LanguageValue | null>(null)

/** Reads the saved language and hands every screen its words, plural forms and date locale. */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { doc } = useWorkspace()
  const lang = doc.language ?? DEFAULT_LANGUAGE

  const value = useMemo<LanguageValue>(
    () => ({
      lang,
      locale: localeFor(lang),
      t: (key, vars) => translate(lang, key, vars),
      tn: (key, count, vars) => translateCount(lang, key, count, vars),
    }),
    [lang],
  )

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const value = useContext(LanguageContext)
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider")
  return value
}

export function useT() {
  return useLanguage().t
}
