import os from "os"
import path from "path"

const DATA_DIR_NAME = "LifeSpace Planner"

/** The folder that holds the workspace file and the media store. */
export function dataDir() {
  return process.env.LIFESPACE_DATA_DIR || path.join(os.homedir(), "Library", "Application Support", DATA_DIR_NAME)
}

export function mediaDir() {
  return path.join(dataDir(), "media")
}
