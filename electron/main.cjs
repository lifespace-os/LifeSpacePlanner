const { app, BrowserWindow } = require("electron")
const { spawn, execFileSync } = require("child_process")
const fs = require("fs")
const path = require("path")

app.setName("LifeSpace Planner")

const PORT = 4010
const ORIGIN = `http://127.0.0.1:${PORT}`
const START_TIMEOUT_MS = 120_000

const START_PAGE = `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
<meta charset="utf-8">
<title>LifeSpace Planner</title>
<style>
  html, body { height: 100%; margin: 0; }
  body { display: flex; align-items: center; justify-content: center; background: #181B23; color: #F3F7FC; font-family: sans-serif; }
  main { width: min(40rem, calc(100% - 3rem)); }
  h1 { font-weight: 500; font-size: 1.4rem; }
  pre { white-space: pre-wrap; color: #A9B5C6; font-size: 0.85rem; }
</style>
<main>
  <h1>Starting LifeSpace Planner…</h1>
  <pre id="log"></pre>
</main>`)}`

let mainWindow = null
let server = null
let spawnedServer = false
let quitting = false
let pageReady = false
let statusTitle = "Starting LifeSpace Planner…"
const logLines = []

function findRoot(start) {
  let dir = start
  const nextBin = path.join("node_modules", "next", "dist", "bin", "next")
  while (dir !== path.dirname(dir)) {
    const pkgPath = path.join(dir, "package.json")
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
      if (pkg.name === "lifespace-planner" && fs.existsSync(path.join(dir, nextBin))) return dir
    } catch {
      // Keep walking. The copy inside the app bundle has the name and not the Next binary.
    }
    dir = path.dirname(dir)
  }
  return null
}

function nodeVersion(nodePath) {
  try {
    const text = execFileSync(nodePath, ["-p", "process.versions.node"], { encoding: "utf8", timeout: 5000 }).trim()
    const [major, minor] = text.split(".").map(Number)
    return major * 1000 + minor
  } catch {
    return 0
  }
}

function findNode() {
  const min = 20 * 1000 + 9
  const found = []
  const add = (candidate) => {
    if (!candidate || found.includes(candidate) || !fs.existsSync(candidate)) return
    if (nodeVersion(candidate) >= min) found.push(candidate)
  }
  try {
    const shell = process.env.SHELL || "/bin/zsh"
    add(execFileSync(shell, ["-lc", "command -v node"], { encoding: "utf8", timeout: 8000 }).trim())
  } catch {
    // A Dock launch has a short PATH. nvm versions below are the fallback.
  }
  const nvmRoot = process.env.NVM_DIR || path.join(process.env.HOME || "", ".nvm")
  const versionsDir = path.join(nvmRoot, "versions", "node")
  if (fs.existsSync(versionsDir)) {
    for (const version of fs.readdirSync(versionsDir).sort().reverse()) {
      add(path.join(versionsDir, version, "bin", "node"))
    }
  }
  add("/opt/homebrew/bin/node")
  add("/usr/local/bin/node")
  return found[0] || null
}

function serverIsUp() {
  return fetch(`${ORIGIN}/api/workspace`)
    .then((response) => response.status > 0)
    .catch(() => false)
}

function waitForServer() {
  const deadline = Date.now() + START_TIMEOUT_MS
  return new Promise((resolve) => {
    const tick = () => {
      serverIsUp().then((up) => {
        if (up) resolve(true)
        else if (Date.now() >= deadline) resolve(false)
        else setTimeout(tick, 300)
      })
    }
    tick()
  })
}

function paint() {
  if (!pageReady || !mainWindow) return
  const script = `document.querySelector("h1").textContent = ${JSON.stringify(statusTitle)}; document.getElementById("log").textContent = ${JSON.stringify(logLines.join("\n"))}`
  mainWindow.webContents.executeJavaScript(script).catch(() => {})
}

function appendLog(text) {
  for (const line of text.replace(/\r/g, "").split("\n")) {
    if (!line) continue
    logLines.push(line)
    if (logLines.length > 12) logLines.shift()
  }
  paint()
}

function showStatus(title) {
  statusTitle = title
  paint()
}

function startServer(nodePath, serverPath, dataDir, seedPath) {
  const pathEnv = `${path.dirname(nodePath)}${path.delimiter}${process.env.PATH || ""}`
  server = spawn(nodePath, [serverPath], {
    cwd: path.dirname(serverPath),
    env: {
      ...process.env,
      PATH: pathEnv,
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
      LIFESPACE_DATA_DIR: dataDir,
      LIFESPACE_SEED: seedPath,
    },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  })
  spawnedServer = true
  const onData = (chunk) => appendLog(chunk.toString())
  server.stdout.on("data", onData)
  server.stderr.on("data", onData)
  server.on("exit", (code) => {
    if (spawnedServer && code) appendLog(`Server exited with code ${code}.`)
  })
}

function stopServer() {
  if (!spawnedServer || !server || server.killed) return
  const pid = server.pid
  spawnedServer = false
  server = null
  try {
    process.kill(-pid, "SIGTERM")
  } catch {
    try {
      process.kill(pid, "SIGTERM")
    } catch {
      // The server has already exited.
    }
  }
}

function openWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
    return
  }
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "LifeSpace Planner",
    show: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  })
  mainWindow.loadURL(START_PAGE)
  mainWindow.webContents.on("did-finish-load", () => {
    if (mainWindow.webContents.getURL().startsWith("data:")) {
      pageReady = true
      paint()
    }
  })
  mainWindow.on("closed", () => {
    mainWindow = null
    pageReady = false
  })
}

function serverPaths() {
  if (app.isPackaged) {
    return {
      nodePath: path.join(process.resourcesPath, "node"),
      serverPath: path.join(process.resourcesPath, "standalone", "server.js"),
      seedPath: path.join(process.resourcesPath, "seed", "workspace.json"),
    }
  }
  const root = findRoot(__dirname)
  if (!root) return { missingRoot: true }
  return {
    nodePath: findNode(),
    serverPath: path.join(root, ".next", "standalone", "server.js"),
    seedPath: path.join(root, "data", "workspace.json"),
  }
}

async function launch() {
  openWindow()
  const paths = serverPaths()
  if (paths.missingRoot) {
    showStatus("Could not find the project folder.")
    return
  }
  if (!paths.nodePath || !fs.existsSync(paths.nodePath)) {
    showStatus("Could not find Node.")
    if (!app.isPackaged) appendLog("Install Node, or start the app once from a terminal.")
    return
  }
  if (!fs.existsSync(paths.serverPath)) {
    showStatus("Could not find the app server.")
    if (!app.isPackaged) appendLog("Run npm run build, then start the app again.")
    return
  }
  const dataDir = app.getPath("userData")
  fs.mkdirSync(dataDir, { recursive: true })
  appendLog(`Using ${paths.nodePath}`)
  if (!(await serverIsUp())) startServer(paths.nodePath, paths.serverPath, dataDir, paths.seedPath)
  if (!(await waitForServer())) {
    showStatus("The app did not start in time.")
    return
  }
  pageReady = false
  mainWindow.loadURL(ORIGIN)
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on("second-instance", openWindow)
  app.on("before-quit", () => {
    if (quitting) return
    quitting = true
    stopServer()
  })
  app.on("window-all-closed", () => app.quit())
  app.whenReady().then(() => {
    const logo = path.join(__dirname, "..", "docs", "logo.png")
    if (process.platform === "darwin" && fs.existsSync(logo)) app.dock.setIcon(logo)
    return launch()
  })
}
