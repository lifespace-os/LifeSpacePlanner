"use client"

import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react"
import {
  HAPPINESS_COLORS,
  SCORE_MAX,
  SECTOR_COLORS,
  SECTOR_NAME_MAX,
  hasHashtag,
  nextSectorColor,
  sectorTag,
  startingSectorLists,
  type LabelView,
  type Note,
  type SectorListId,
  type SphereSetId,
} from "@/lib/board-data"

/**
 * Sector lists for the Labels mode. Each ready list keeps its own edits, so switching sets never
 * touches the other set's sectors or the hashtags already on cards.
 */
export function useSectors(setNotes: Dispatch<SetStateAction<Note[]>>) {
  const [view, setView] = useState<LabelView>("spheres")
  /** The Wheel view: the same wheel of the chosen set, without the card board. */
  const [wheelOnly, setWheelOnly] = useState(false)
  const [setId, setSetId] = useState<SphereSetId>("five")
  const [lists, setLists] = useState(startingSectorLists)
  const [openSectorId, setOpenSectorId] = useState<string | null>(null)
  const nextId = useRef(0)

  const activeId: SectorListId = view === "happiness" ? "happiness" : setId
  const otherId: SectorListId = view === "happiness" ? setId : "happiness"
  const sectors = lists[activeId]
  /** The sector whose cards are listed in the window. It belongs to the chosen set, so switching sets closes it. */
  const openSector = sectors.find((sector) => sector.id === openSectorId) ?? null

  /** A hashtag the other view's list also uses stays on the cards when this list drops or renames it. */
  const usedByOtherView = useCallback(
    (tag: string) => lists[otherId].some((sector) => sectorTag(sector.name) === tag),
    [lists, otherId],
  )

  const addSector = useCallback(
    (name: string): string | null => {
      const clean = name.trim().slice(0, SECTOR_NAME_MAX)
      const tag = sectorTag(clean)
      if (!tag) return "Give the sector a name."
      if (sectors.some((sector) => sectorTag(sector.name) === tag)) return "This list already has that sector."
      const id = `${activeId}-new-${nextId.current++}`
      const color = nextSectorColor(sectors, activeId === "happiness" ? [...HAPPINESS_COLORS, ...SECTOR_COLORS] : SECTOR_COLORS)
      setLists((prev) => ({ ...prev, [activeId]: [...prev[activeId], { id, name: clean, color }] }))
      return null
    },
    [activeId, sectors],
  )

  const renameSector = useCallback(
    (id: string, name: string): string | null => {
      const current = sectors.find((sector) => sector.id === id)
      if (!current) return null
      const clean = name.trim().slice(0, SECTOR_NAME_MAX)
      const nextTag = sectorTag(clean)
      const oldTag = sectorTag(current.name)
      if (!nextTag) return "A sector needs a name."
      if (sectors.some((sector) => sector.id !== id && sectorTag(sector.name) === nextTag)) {
        return "This list already has that sector."
      }
      if (clean === current.name) return null
      setLists((prev) => ({
        ...prev,
        [activeId]: prev[activeId].map((sector) => (sector.id === id ? { ...sector, name: clean } : sector)),
      }))
      if (nextTag !== oldTag && !usedByOtherView(oldTag)) {
        setNotes((prev) =>
          prev.map((note) => {
            if (!hasHashtag(note, oldTag)) return note
            const rest = note.hashtags.filter((t) => t.toLowerCase() !== oldTag)
            return { ...note, hashtags: hasHashtag(note, nextTag) ? rest : [...rest, nextTag] }
          }),
        )
      }
      return null
    },
    [activeId, sectors, setNotes, usedByOtherView],
  )

  const removeSector = useCallback(
    (id: string) => {
      const current = sectors.find((sector) => sector.id === id)
      if (!current) return
      const tag = sectorTag(current.name)
      setLists((prev) => ({ ...prev, [activeId]: prev[activeId].filter((sector) => sector.id !== id) }))
      if (usedByOtherView(tag)) return
      setNotes((prev) =>
        prev.map((note) =>
          hasHashtag(note, tag) ? { ...note, hashtags: note.hashtags.filter((t) => t.toLowerCase() !== tag) } : note,
        ),
      )
    },
    [activeId, sectors, setNotes, usedByOtherView],
  )

  const setOnCards = useCallback(
    (ids: string[], tag: string, on: boolean) => {
      setNotes((prev) =>
        prev.map((note) => {
          if (!ids.includes(note.id) || hasHashtag(note, tag) === on) return note
          return {
            ...note,
            hashtags: on ? [...note.hashtags, tag] : note.hashtags.filter((t) => t.toLowerCase() !== tag),
          }
        }),
      )
    },
    [setNotes],
  )

  /**
   * Cards dropped on a sector get its hashtag and its color. Hashtags already on a card stay, so a card can
   * belong to several sectors, and its paper keeps the color of the latest drop.
   */
  const dropOnSector = useCallback(
    (ids: string[], sectorId: string): boolean => {
      const sector = sectors.find((item) => item.id === sectorId)
      if (!sector || ids.length === 0) return false
      const tag = sectorTag(sector.name)
      setNotes((prev) =>
        prev.map((note) => {
          if (!ids.includes(note.id)) return note
          return { ...note, color: sector.color, hashtags: hasHashtag(note, tag) ? note.hashtags : [...note.hashtags, tag] }
        }),
      )
      return true
    },
    [sectors, setNotes],
  )

  /** Saves a satisfaction score for a life sphere, or clears it with null. Happiness components never take one. */
  const setScore = useCallback(
    (id: string, score: number | null) => {
      if (activeId === "happiness") return
      const value = score === null ? undefined : Math.min(SCORE_MAX, Math.max(0, Math.round(score)))
      setLists((prev) => ({
        ...prev,
        [activeId]: prev[activeId].map((sector) => (sector.id === id ? { ...sector, score: value } : sector)),
      }))
    },
    [activeId],
  )

  const closeSector = useCallback(() => setOpenSectorId(null), [])

  return {
    view,
    setView,
    wheelOnly,
    setWheelOnly,
    setScore,
    setId,
    setSetId,
    sectors,
    openSector,
    setOpenSectorId,
    closeSector,
    usedByOtherView,
    addSector,
    renameSector,
    removeSector,
    setOnCards,
    dropOnSector,
  }
}
