import { readFile } from "fs/promises"
import path from "path"
import { mediaDir } from "@/lib/data-dir"
import { isMediaId } from "@/lib/media"

const CONTENT_TYPE: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" }

/** Sends one stored picture. Only ids this app made are served, so no other path can be reached. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!isMediaId(id)) return new Response("Not found", { status: 404 })
  try {
    const bytes = await readFile(path.join(mediaDir(), id))
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": CONTENT_TYPE[id.slice(id.lastIndexOf(".") + 1)],
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch {
    return new Response("Not found", { status: 404 })
  }
}
