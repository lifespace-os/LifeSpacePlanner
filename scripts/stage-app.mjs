import { access, chmod, copyFile, cp, mkdir, rm } from "fs/promises"
import { realpathSync } from "fs"
import path from "path"

const root = process.cwd()
const buildDir = path.join(root, "build")
const standaloneDest = path.join(buildDir, "standalone")
const seedDir = path.join(buildDir, "seed")
const runtimeDir = path.join(buildDir, "runtime")
const nodeDest = path.join(runtimeDir, process.platform === "win32" ? "node.exe" : "node")

await rm(standaloneDest, { recursive: true, force: true })
await rm(path.join(buildDir, "node"), { force: true })
await rm(runtimeDir, { recursive: true, force: true })
await rm(seedDir, { recursive: true, force: true })
await mkdir(seedDir, { recursive: true })
await mkdir(runtimeDir, { recursive: true })

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
