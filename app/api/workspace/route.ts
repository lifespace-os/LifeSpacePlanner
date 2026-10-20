import { mkdir, readFile, rename, writeFile } from "fs/promises"
import path from "path"
import { parseWorkspace, type WorkspaceDoc } from "@/lib/workspace"

const filePath = path.join(process.cwd(), "data", "workspace.json")

type Stored = { missing: true } | { missing: false; doc: WorkspaceDoc } | { missing: false; error: string }

/** Reads the workspace file. A missing file is an empty workspace, not an error. A broken file is left as it is. */
export async function GET() {
  const stored = await readStored()
  if (stored.missing) return Response.json({ doc: null })
  if ("error" in stored) return Response.json({ error: stored.error }, { status: 422 })
  return Response.json({ doc: stored.doc })
}

/** Writes the workspace when the caller's revision still matches the file. */
export async function PUT(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "The save request is not valid JSON." }, { status: 400 })
  }
  if (!isRecord(body) || typeof body.baseRevision !== "number" || !Number.isInteger(body.baseRevision)) {
    return Response.json({ error: "The save request is missing a revision." }, { status: 400 })
  }
  const parsed = parseWorkspace(body.doc)
  if (!parsed.ok) return Response.json({ error: parsed.reason }, { status: 400 })

  const stored = await readStored()
  if (!stored.missing && "error" in stored) return Response.json({ error: stored.error }, { status: 422 })
  const current = stored.missing ? 0 : stored.doc.revision
  if (current !== body.baseRevision) {
    return Response.json(
      { doc: stored.missing ? null : stored.doc, error: "The workspace changed somewhere else." },
      { status: 409 },
    )
  }

  const next: WorkspaceDoc = { ...parsed.doc, revision: body.baseRevision + 1 }
  await mkdir(path.dirname(filePath), { recursive: true })
  const temporary = `${filePath}.tmp`
  await writeFile(temporary, JSON.stringify(next, null, 2))
  await rename(temporary, filePath)
  return Response.json({ revision: next.revision })
}

async function readStored(): Promise<Stored> {
  try {
    const text = await readFile(filePath, "utf8")
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      return { missing: false, error: "The workspace file is not valid JSON." }
    }
    const parsed = parseWorkspace(json)
    if (!parsed.ok) return { missing: false, error: parsed.reason }
    return { missing: false, doc: parsed.doc }
  } catch (error) {
    if (isEnoent(error)) return { missing: true }
    return { missing: false, error: "Could not read the workspace file." }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isEnoent(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"
}
