/** Pictures on whiteboard cards. The card keeps only an id; the bytes live in the app's media store. */

export const MEDIA_URL = "/api/media"

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

export type ImageType = (typeof IMAGE_TYPES)[number]

export const IMAGE_EXTENSION: Record<ImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export const IMAGE_ACCEPT = IMAGE_TYPES.join(",")

/** A file over this many bytes is refused. */
export const IMAGE_MAX_BYTES = 20 * 1024 * 1024

/** The long side of a kept picture, in pixels. A larger picture is scaled down. */
export const IMAGE_MAX_SIDE = 3000

const MEDIA_ID = /^[0-9a-f-]{36}\.(jpg|png|webp)$/

export function isMediaId(value: unknown): value is string {
  return typeof value === "string" && MEDIA_ID.test(value)
}

export function mediaUrl(id: string) {
  return `${MEDIA_URL}/${id}`
}

export function isImageType(value: string): value is ImageType {
  return (IMAGE_TYPES as readonly string[]).includes(value)
}

/** The picture type the first bytes announce, or null when they are none of the three. */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  const starts = (...head: number[]) => head.every((byte, i) => bytes[i] === byte)
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg"
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png"
  const riff = starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  return riff ? "image/webp" : null
}

export type StoreFailure = "type" | "size" | "failed"

export type StoreResult = { ok: true; id: string } | { ok: false; reason: StoreFailure }

/** The size a picture is kept at: the long side is at most IMAGE_MAX_SIDE, and the shape is unchanged. */
export function fitSide(width: number, height: number) {
  const long = Math.max(width, height)
  if (long <= IMAGE_MAX_SIDE) return { width, height }
  const scale = IMAGE_MAX_SIDE / long
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

async function scaledBlob(file: File, type: ImageType): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const size = fitSide(bitmap.width, bitmap.height)
    if (size.width === bitmap.width && size.height === bitmap.height) return file
    const canvas = document.createElement("canvas")
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext("2d")
    if (!context) throw new Error("No canvas")
    context.imageSmoothingQuality = "high"
    context.drawImage(bitmap, 0, 0, size.width, size.height)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No picture"))), type, 0.9)
    })
  } finally {
    bitmap.close()
  }
}

/** Checks, scales and copies one picture into the media store. Resolves with the id to keep on the card. */
export async function storeImage(file: File): Promise<StoreResult> {
  if (!isImageType(file.type)) return { ok: false, reason: "type" }
  if (file.size > IMAGE_MAX_BYTES) return { ok: false, reason: "size" }
  try {
    const blob = await scaledBlob(file, file.type)
    if (blob.size > IMAGE_MAX_BYTES) return { ok: false, reason: "size" }
    const response = await fetch(MEDIA_URL, { method: "POST", headers: { "Content-Type": file.type }, body: blob })
    if (!response.ok) return { ok: false, reason: "failed" }
    const body: unknown = await response.json()
    const id = typeof body === "object" && body !== null && "id" in body ? body.id : null
    return isMediaId(id) ? { ok: true, id } : { ok: false, reason: "failed" }
  } catch {
    return { ok: false, reason: "failed" }
  }
}
