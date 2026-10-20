"use client"

import { Fragment, createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { WORKSPACE_URL, demoWorkspace, parseWorkspace, type WorkspaceDoc, type WorkspaceSliceKey } from "@/lib/workspace"

const SAVE_DELAY = 500

export type SaveStatus = "saving" | "saved" | "error" | "conflict" | null

type WorkspaceContextValue = {
  doc: WorkspaceDoc
  status: SaveStatus
  report: <K extends WorkspaceSliceKey>(key: K, value: WorkspaceDoc[K]) => void
  /** Swaps the whole workspace, saves it, and rebuilds every page from it. False when it could not be saved. */
  replace: (next: WorkspaceDoc) => Promise<boolean>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

/** Loads the workspace before the pages mount, then writes later edits back to it. */
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"loading" | "ready" | "invalid">("loading")
  const [error, setError] = useState("")
  const [doc, setDoc] = useState<WorkspaceDoc | null>(null)
  const [status, setStatus] = useState<SaveStatus>(null)
  const docRef = useRef<WorkspaceDoc | null>(null)
  const savedRevision = useRef(0)
  const pending = useRef<WorkspaceDoc | null>(null)
  const timer = useRef<number | null>(null)
  const blocked = useRef(false)
  const flushRef = useRef<(keepalive: boolean) => void>(() => {})
  const inflight = useRef<Promise<void>>(Promise.resolve())
  const [epoch, setEpoch] = useState(0)

  const flushNow = useCallback(async (keepalive: boolean) => {
    if (blocked.current || !pending.current) return
    const body = pending.current
    pending.current = null
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    setStatus("saving")
    try {
      const response = await sendWorkspace(body, savedRevision.current, keepalive)
      if (response.status === 409) {
        blocked.current = true
        pending.current = null
        setStatus("conflict")
        return
      }
      if (!response.ok) {
        pending.current = docRef.current
        setStatus("error")
        return
      }
      const payload = (await response.json()) as { revision?: unknown }
      if (typeof payload.revision !== "number") {
        pending.current = docRef.current
        setStatus("error")
        return
      }
      savedRevision.current = payload.revision
      const current = docRef.current
      if (current) {
        const saved = { ...current, revision: payload.revision }
        docRef.current = saved
        setDoc(saved)
      }
      setStatus(pending.current ? "saving" : "saved")
    } catch {
      pending.current = docRef.current
      setStatus("error")
    }
  }, [])

  const flush = useCallback(
    (keepalive: boolean) => {
      const run = flushNow(keepalive)
      inflight.current = run
      return run
    },
    [flushNow],
  )

  flushRef.current = (keepalive) => {
    void flush(keepalive)
  }

  const replace = useCallback(
    async (next: WorkspaceDoc) => {
      if (blocked.current) return false
      if (timer.current !== null) {
        window.clearTimeout(timer.current)
        timer.current = null
      }
      pending.current = null
      await inflight.current
      if (blocked.current) return false
      const incoming = { ...next, revision: savedRevision.current }
      docRef.current = incoming
      pending.current = incoming
      setDoc(incoming)
      setEpoch((value) => value + 1)
      await flush(false)
      return !blocked.current && pending.current === null
    },
    [flush],
  )

  const schedule = useCallback((next: WorkspaceDoc) => {
    if (blocked.current) return
    pending.current = next
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => flushRef.current(false), SAVE_DELAY)
  }, [])

  const report = useCallback(
    <K extends WorkspaceSliceKey>(key: K, value: WorkspaceDoc[K]) => {
      const current = docRef.current
      if (!current || same(current[key], value)) return
      const next = { ...current, [key]: value }
      docRef.current = next
      setDoc(next)
      schedule(next)
    },
    [schedule],
  )

  useEffect(() => {
    let cancel = false
    fetch(WORKSPACE_URL, { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as { doc?: unknown; error?: unknown }
        if (cancel) return
        if (!response.ok) {
          setError(typeof body.error === "string" ? body.error : "Could not read the workspace file.")
          setPhase("invalid")
          return
        }
        if (body.doc == null) {
          const demo = demoWorkspace()
          docRef.current = demo
          savedRevision.current = 0
          setDoc(demo)
          setPhase("ready")
          return
        }
        const parsed = parseWorkspace(body.doc)
        if (!parsed.ok) {
          setError(parsed.reason)
          setPhase("invalid")
          return
        }
        docRef.current = parsed.doc
        savedRevision.current = parsed.doc.revision
        setDoc(parsed.doc)
        setStatus("saved")
        setPhase("ready")
      })
      .catch(() => {
        if (cancel) return
        setError("Could not read the workspace file.")
        setPhase("invalid")
      })
    return () => {
      cancel = true
    }
  }, [])

  useEffect(() => {
    if (phase !== "ready") return
    const flushNow = () => flushRef.current(true)
    const onHide = () => {
      if (document.visibilityState === "hidden") flushNow()
    }
    window.addEventListener("pagehide", flushNow)
    document.addEventListener("visibilitychange", onHide)
    return () => {
      window.removeEventListener("pagehide", flushNow)
      document.removeEventListener("visibilitychange", onHide)
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [phase])

  if (phase === "loading") {
    return <p className="flex min-h-dvh items-center justify-center text-sm text-ink-soft">Loading your cards…</p>
  }
  if (phase === "invalid" || !doc) {
    return <p className="flex min-h-dvh items-center justify-center px-6 text-center text-sm text-ink-soft">{error}</p>
  }

  return (
    <WorkspaceContext.Provider value={{ doc, status, report, replace }}>
      <Fragment key={epoch}>{children}</Fragment>
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext)
  if (!value) throw new Error("useWorkspace must be used inside WorkspaceProvider")
  return value
}

/** Writes one part of the workspace when it differs from the loaded document. */
export function useWorkspaceSlice<K extends WorkspaceSliceKey>(key: K, value: WorkspaceDoc[K]) {
  const { report } = useWorkspace()
  useEffect(() => {
    report(key, value)
  }, [key, report, value])
}

function same(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}

async function sendWorkspace(doc: WorkspaceDoc, baseRevision: number, keepalive: boolean) {
  const init: RequestInit = {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ doc, baseRevision }),
    keepalive,
  }
  try {
    return await fetch(WORKSPACE_URL, init)
  } catch (error) {
    if (!keepalive) throw error
    return fetch(WORKSPACE_URL, { ...init, keepalive: false })
  }
}
