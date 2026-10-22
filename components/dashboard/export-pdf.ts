export const PDF_WIDTH = 595.28
export const PDF_HEIGHT = 841.89

export type PdfPage = { jpeg: Uint8Array; width: number; height: number }

/** A PDF with one full-page JPEG per page. Written by hand, so the export needs no extra package. */
export function buildPdf(pages: PdfPage[]): Blob {
  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = []
  const offsets: number[] = []
  let length = 0

  const push = (part: Uint8Array | string) => {
    const bytes = typeof part === "string" ? encoder.encode(part) : part
    chunks.push(bytes)
    length += bytes.length
  }
  const begin = (id: number) => {
    offsets[id] = length
    push(`${id} 0 obj\n`)
  }

  push("%PDF-1.4\n")
  begin(1)
  push("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
  begin(2)
  push(
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ")}] /Count ${pages.length} >>\nendobj\n`,
  )

  pages.forEach((page, i) => {
    const pageId = 3 + i * 3
    const contentId = pageId + 1
    const imageId = pageId + 2
    const content = `q ${PDF_WIDTH} 0 0 ${PDF_HEIGHT} 0 0 cm /Im0 Do Q`

    begin(pageId)
    push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_WIDTH} ${PDF_HEIGHT}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
    )
    begin(contentId)
    push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`)
    begin(imageId)
    push(
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`,
    )
    push(page.jpeg)
    push("\nendstream\nendobj\n")
  })

  const count = 2 + pages.length * 3
  const xref = length
  push(`xref\n0 ${count + 1}\n0000000000 65535 f \n`)
  for (let id = 1; id <= count; id += 1) push(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`)
  push(`trailer\n<< /Size ${count + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`)

  return new Blob(chunks as BlobPart[], { type: "application/pdf" })
}
