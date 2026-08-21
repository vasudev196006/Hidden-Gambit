export interface BoardTheme {
  id: string;
  name: string;
  dark: string;
  light: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  { id: "green", name: "Classic Green", dark: "#769656", light: "#eeeed2" },
  { id: "wood", name: "Classic Wood", dark: "#b58863", light: "#f0d9b5" },
  { id: "ocean", name: "Ocean Blue", dark: "#4b7399", light: "#eae9d2" },
  { id: "cyber", name: "Cyber Crimson", dark: "#6e1e24", light: "#262630" },
  { id: "slate", name: "Monochrome Slate", dark: "#4e5359", light: "#e2e4e6" },
  { id: "purple", name: "Amethyst Purple", dark: "#7d4a88", light: "#e3cde6" },
];

export function getStoredTheme(): BoardTheme {
  if (typeof window === "undefined") return BOARD_THEMES[0];
  const storedId = localStorage.getItem("boardTheme");
  return BOARD_THEMES.find((t) => t.id === storedId) || BOARD_THEMES[0];
}

export function setStoredTheme(themeId: string): BoardTheme {
  const theme = BOARD_THEMES.find((t) => t.id === themeId) || BOARD_THEMES[0];
  if (typeof window !== "undefined") {
    localStorage.setItem("boardTheme", theme.id);
    window.dispatchEvent(new CustomEvent("boardThemeChanged", { detail: theme }));
  }
  return theme;
}
