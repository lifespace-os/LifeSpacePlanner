import { access, chmod, copyFile, cp, mkdir, rm } from "fs/promises"
import { realpathSync } from "fs"
import path from "path"

const root = process.cwd()
const buildDir = path.join(root, "build")
const standaloneDest = path.join(buildDir, "standalone")
const seedDir = path.join(buildDir, "seed")
const nodeDest = path.join(buildDir, "node")

await rm(standaloneDest, { recursive: true, force: true })
await rm(nodeDest, { force: true })
await rm(seedDir, { recursive: true, force: true })
await mkdir(seedDir, { recursive: true })

await cp(path.join(root, ".next", "standalone"), standaloneDest, { recursive: true, dereference: true })

const nodeSrc = realpathSync(process.execPath)
await copyFile(nodeSrc, nodeDest)
await chmod(nodeDest, 0o755)

const seedSrc = path.join(root, "data", "workspace.json")
try {
  await access(seedSrc)
  await copyFile(seedSrc, path.join(seedDir, "workspace.json"))
} catch {
  // No seed in the project. The first launch shows demo cards until the first edit.
}
