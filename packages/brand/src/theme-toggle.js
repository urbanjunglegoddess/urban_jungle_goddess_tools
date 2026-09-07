/**
 * @ujg/brand — theme switching.
 *
 * Three states: an explicit "dark" or "light" stamps data-theme on <html> and
 * wins over the media query; "system" removes the attribute and lets
 * prefers-color-scheme decide. The choice persists in localStorage, which can
 * throw in a private window, so every access is guarded.
 */
const KEY = "ujg-theme";
const ORDER = ["system", "dark", "light"];

function read() {
  try {
    const v = localStorage.getItem(KEY);
    return ORDER.includes(v) ? v : "system";
  } catch {
    return "system";
  }
}

function write(v) {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* storage unavailable — the theme still applies for this page view */
  }
}

export function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
}

export function getTheme() {
  return read();
}

export function setTheme(mode) {
  const next = ORDER.includes(mode) ? mode : "system";
  write(next);
  applyTheme(next);
  return next;
}

export function cycleTheme() {
  return setTheme(ORDER[(ORDER.indexOf(read()) + 1) % ORDER.length]);
}

/** Call before first paint to avoid a flash of the wrong theme. */
export function initTheme() {
  applyTheme(read());
}
