import { mkdir, rename, writeFile } from "fs/promises"
import path from "path"
import { mediaDir } from "@/lib/data-dir"
import { IMAGE_EXTENSION, IMAGE_MAX_BYTES, isImageType, sniffImageType } from "@/lib/media"

/** Copies one picture into the media store and answers with the id the card keeps. */
export async function POST(request: Request) {
  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase()
  if (!isImageType(type)) return Response.json({ error: "Only JPEG, PNG and WebP pictures are kept." }, { status: 415 })

  const declared = Number(request.headers.get("content-length"))
  if (Number.isFinite(declared) && declared > IMAGE_MAX_BYTES) {
    return Response.json({ error: "The picture is over 20 MB." }, { status: 413 })
  }

  const bytes = new Uint8Array(await request.arrayBuffer())
  if (bytes.length === 0) return Response.json({ error: "The picture is empty." }, { status: 400 })
  if (bytes.length > IMAGE_MAX_BYTES) return Response.json({ error: "The picture is over 20 MB." }, { status: 413 })
  if (sniffImageType(bytes) !== type) return Response.json({ error: "The file is not the picture it says it is." }, { status: 415 })

  const id = `${crypto.randomUUID()}.${IMAGE_EXTENSION[type]}`
  const dir = mediaDir()
  const filePath = path.join(/*turbopackIgnore: true*/ dir, id)
  await mkdir(dir, { recursive: true })
  await writeFile(`${filePath}.tmp`, bytes)
  await rename(`${filePath}.tmp`, filePath)
  return Response.json({ id })
}
