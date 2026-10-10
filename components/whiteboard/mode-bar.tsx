"use client"

import { createContext, useContext, useEffect, useId, useState } from "react"
import clsx from "clsx"
import type { ClusterView, MODES, MissionView, Note } from "@/lib/board-data"

type ModeInfo = (typeof MODES)[number]

const HINT_VISIBLE_MS = 5000

const CLUSTER_HINTS: Record<ClusterView, string> = {
  wantmust:
    "Drop a card in Want for #want or in Must for #must. Moving it out removes the hashtag. A card may stay outside both.",
  groups: "Drop a card in a group to give it that group's hashtag. Moving it out removes it. A card may stay ungrouped.",
}

const IKIGAI_HINT = "Pick a step or a circle, then drop cards on it to add its hashtag. Cards stay where they are."

const MARKERS_HINT =
  "Pick a marker, then drop cards on it to add its hashtag. Cards stay where they are. Ten markers do not write the sentence by themselves."

export function ModeBar({
  mode,
  notes,
  clusterView,
  missionView,
  missionText,
}: {
  mode: ModeInfo
  notes: Note[]
  clusterView: ClusterView
  missionView: MissionView
  missionText: string
}) {
  const isMission = mode.id === "mission"
  const saved = missionText.length > 0

  let hint = mode.hint
  if (mode.id === "clusters") hint = CLUSTER_HINTS[clusterView]
  if (isMission) {
    if (missionView === "ikigai") hint = IKIGAI_HINT
    else if (missionView === "markers") hint = MARKERS_HINT
    else if (saved) hint = "Mark each card Keep or Release against this sentence. To change it, choose Sentence."
    else hint = "No mission sentence yet. Choose Sentence to write one in the window."
  }

  const kept = notes.filter((n) => n.mission === "keep").length
  const released = notes.filter((n) => n.mission === "release").length
  const open = notes.length - kept - released

  return (
    <CornerCard name={mode.name} tone={isMission ? "mission" : "plain"}>
      {isMission && saved ? (
        <blockquote className="mt-1 line-clamp-3 font-serif text-xl leading-snug italic text-ink text-pretty break-words">
          {`\u201C${missionText}\u201D`}
        </blockquote>
      ) : null}
      <Explanation>
        <p className="text-sm text-ink-soft text-pretty">{hint}</p>
        <p className="mt-1.5 text-sm text-ink-soft tabular-nums">
          {isMission && saved && missionView === "sentence" ? (
            <>
              {kept} kept <span aria-hidden="true">·</span> {released} released <span aria-hidden="true">·</span> {open}{" "}
              open
            </>
          ) : (
            <>{notes.length} cards</>
          )}
        </p>
      </Explanation>
    </CornerCard>
  )
}

function CornerCard({
  name,
  tone,
  children,
}: {
  name: string
  tone: "plain" | "mission"
  children: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(true)
  const regionId = useId()

  useEffect(() => {
    if (!expanded) return
    const timer = window.setTimeout(() => setExpanded(false), HINT_VISIBLE_MS)
    return () => window.clearTimeout(timer)
  }, [expanded])

  return (
    <ExplanationContext.Provider value={{ expanded, regionId }}>
      <section
        aria-label={`${name} mode`}
        className={clsx(
          "pointer-events-auto w-fit max-w-md rounded-2xl border px-4 py-3 shadow-[0_12px_32px_-14px_rgba(35,39,43,0.45)] backdrop-blur",
          tone === "mission" ? "max-w-xl border-accent/30 bg-accent-soft/95" : "border-line bg-board/95",
        )}
      >
        <h1 className="font-serif text-3xl leading-tight font-medium tracking-tight">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={regionId}
            onClick={() => setExpanded((value) => !value)}
            className="rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {name}
          </button>
        </h1>
        {children}
      </section>
    </ExplanationContext.Provider>
  )
}

const ExplanationContext = createContext<{ expanded: boolean; regionId: string }>({ expanded: true, regionId: "" })

function Explanation({ children }: { children: React.ReactNode }) {
  const { expanded, regionId } = useContext(ExplanationContext)
  return (
    <div
      id={regionId}
      inert={!expanded}
      className={clsx(
        "mt-1 transition-[opacity,display] duration-500 transition-discrete motion-reduce:transition-none",
        expanded ? "block opacity-100 starting:opacity-0" : "hidden opacity-0",
      )}
    >
      {children}
    </div>
  )
}
