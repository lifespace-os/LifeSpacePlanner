import { cp, mkdir } from "fs/promises"
import path from "path"

const root = process.cwd()
const standalone = path.join(root, ".next", "standalone")
const staticSrc = path.join(root, ".next", "static")
const staticDest = path.join(standalone, ".next", "static")

await mkdir(path.dirname(staticDest), { recursive: true })
await cp(staticSrc, staticDest, { recursive: true })
