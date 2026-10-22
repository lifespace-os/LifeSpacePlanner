export type ThemeId =
  | "morning-paper"
  | "daylight"
  | "warm-noon"
  | "dusk"
  | "evening"
  | "night"
  | "late-night"

/** One of the seven themes, or a theme the person loaded from a file. */
export type ThemeKey = ThemeId | `custom-${string}`

export type ThemeColors = {
  desk: string
  board: string
  card: string
  ink: string
  inkSoft: string
  line: string
  accent: string
  accentSoft: string
  release: string
  link: string
}

export type Theme = {
  id: ThemeKey
  name: string
  mode: "light" | "dark"
  colors: ThemeColors
  /** The faint dots on the board and the ruled lines in the task window. */
  boardDot: string
  taskRule: string
}

export const DEFAULT_THEME: ThemeId = "morning-paper"

export const LIGHT_DOT = "rgba(35, 39, 43, 0.07)"
export const LIGHT_RULE = "rgba(59, 110, 165, 0.12)"
export const DARK_DOT = "rgba(255, 255, 255, 0.07)"
export const DARK_RULE = "rgba(140, 180, 230, 0.14)"

export const THEMES: Theme[] = [
  {
    id: "morning-paper",
    name: "Morning paper",
    mode: "light",
    boardDot: LIGHT_DOT,
    taskRule: LIGHT_RULE,
    colors: {
      desk: "#ece6da",
      board: "#faf7f0",
      card: "#fffdf8",
      ink: "#23272b",
      inkSoft: "#5f5b53",
      line: "#d8cfbf",
      accent: "#2f5d50",
      accentSoft: "#dfe9e3",
      release: "#a8432f",
      link: "#1f5b8c",
    },
  },
  {
    id: "daylight",
    name: "Daylight",
    mode: "light",
    boardDot: LIGHT_DOT,
    taskRule: LIGHT_RULE,
    colors: {
      desk: "#e4eaf0",
      board: "#f6f8fb",
      card: "#ffffff",
      ink: "#18222d",
      inkSoft: "#4a5666",
      line: "#c8d2de",
      accent: "#1d5f8e",
      accentSoft: "#d9e7f2",
      release: "#ad362a",
      link: "#1658a0",
    },
  },
  {
    id: "warm-noon",
    name: "Warm noon",
    mode: "light",
    boardDot: LIGHT_DOT,
    taskRule: LIGHT_RULE,
    colors: {
      desk: "#f0dcbc",
      board: "#fbefd9",
      card: "#fff8e8",
      ink: "#2b2217",
      inkSoft: "#5f4d35",
      line: "#d9c298",
      accent: "#8a4210",
      accentSoft: "#f2d9b0",
      release: "#9e3522",
      link: "#1d5878",
    },
  },
  {
    id: "dusk",
    name: "Dusk",
    mode: "dark",
    boardDot: DARK_DOT,
    taskRule: DARK_RULE,
    colors: {
      desk: "#262b38",
      board: "#303645",
      card: "#3a4254",
      ink: "#edeff4",
      inkSoft: "#b8bfcc",
      line: "#4b5469",
      accent: "#86c9b4",
      accentSoft: "#2c4a4b",
      release: "#f29a85",
      link: "#92c4f2",
    },
  },
  {
    id: "evening",
    name: "Evening",
    mode: "dark",
    boardDot: DARK_DOT,
    taskRule: DARK_RULE,
    colors: {
      desk: "#2a2622",
      board: "#35302a",
      card: "#403a31",
      ink: "#f2ece1",
      inkSoft: "#c2b9a8",
      line: "#554e42",
      accent: "#e2b862",
      accentSoft: "#4b4027",
      release: "#f49b82",
      link: "#93c5e8",
    },
  },
  {
    id: "night",
    name: "Night",
    mode: "dark",
    boardDot: DARK_DOT,
    taskRule: DARK_RULE,
    colors: {
      desk: "#141920",
      board: "#1b212b",
      card: "#242b37",
      ink: "#e9edf2",
      inkSoft: "#a9b3c0",
      line: "#343d4b",
      accent: "#68b6e6",
      accentSoft: "#1e3a52",
      release: "#ff9480",
      link: "#82baf8",
    },
  },
  {
    id: "late-night",
    name: "Late night",
    mode: "dark",
    boardDot: DARK_DOT,
    taskRule: DARK_RULE,
    colors: {
      desk: "#07090c",
      board: "#0e1115",
      card: "#161a20",
      ink: "#e3e7eb",
      inkSoft: "#9ea8b4",
      line: "#272e37",
      accent: "#8ed6a8",
      accentSoft: "#17301f",
      release: "#ff8f7d",
      link: "#7db6f6",
    },
  },
]

const THEME_BY_ID = new Map(THEMES.map((theme) => [theme.id, theme]))

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEME_BY_ID.has(value as ThemeId)
}

const CUSTOM_KEY = /^custom-[a-z0-9-]{1,64}$/

export function isThemeKey(value: unknown): value is ThemeKey {
  return isThemeId(value) || (typeof value === "string" && CUSTOM_KEY.test(value))
}

/** A built-in theme, or Morning paper for any other key. Loaded themes are found with `themeFor`. */
export function themeOf(id: ThemeKey | undefined): Theme {
  return THEME_BY_ID.get(id ?? DEFAULT_THEME) ?? THEMES[0]
}

export const THEME_VARIABLES = [
  "--t-desk",
  "--t-board",
  "--t-card",
  "--t-ink",
  "--t-ink-soft",
  "--t-line",
  "--t-accent",
  "--t-accent-soft",
  "--t-release",
  "--t-link",
  "--t-board-dot",
  "--t-task-rule",
  "color-scheme",
] as const

export function themeVariables(theme: Theme): [(typeof THEME_VARIABLES)[number], string][] {
  const c = theme.colors
  return [
    ["--t-desk", c.desk],
    ["--t-board", c.board],
    ["--t-card", c.card],
    ["--t-ink", c.ink],
    ["--t-ink-soft", c.inkSoft],
    ["--t-line", c.line],
    ["--t-accent", c.accent],
    ["--t-accent-soft", c.accentSoft],
    ["--t-release", c.release],
    ["--t-link", c.link],
    ["--t-board-dot", theme.boardDot],
    ["--t-task-rule", theme.taskRule],
    ["color-scheme", theme.mode],
  ]
}

function declarations(theme: Theme) {
  return themeVariables(theme)
    .map(([name, value]) => `${name}:${value}`)
    .join(";")
}

/** The theme variables as one stylesheet. Morning paper is also the root default. */
export function themeCss() {
  const root = `:root{${declarations(THEMES[0])}}`
  const each = THEMES.map((theme) => `:root[data-theme="${theme.id}"]{${declarations(theme)}}`)
  return [root, ...each].join("\n")
}
