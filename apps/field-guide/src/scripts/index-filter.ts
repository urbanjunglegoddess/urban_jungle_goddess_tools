/**
 * Index filtering — a small vanilla island, no framework.
 *
 * All 228 cards are rendered server-side, so filtering is a class toggle over
 * nodes that already exist: instant, works offline, and works with no network.
 * That matters because this page gets opened live in a client call.
 *
 * Pagefind is layered on top and is strictly optional. It reaches inside the
 * detail pages (build notes, migration steps, limits) which the cards do not
 * carry. If the index is missing — dev server, or a build that skipped it —
 * the card filter above is untouched.
 */

/**
 * Pagefind's own bundle, written into dist/ after the Astro build. TypeScript
 * cannot resolve an absolute path specifier and Rollup cannot bundle a file
 * that does not exist yet, so the URL is held in a variable and the shape is
 * declared here — narrow, and only what this page calls.
 */
const PAGEFIND_URL = "/pagefind/pagefind.js";

interface PagefindHit {
  url: string;
  meta: { title?: string };
  excerpt: string;
}
interface PagefindResult {
  data(): Promise<PagefindHit>;
}
interface Pagefind {
  search(query: string): Promise<{ results: PagefindResult[] }>;
}

/** The five toggles, as a type so the state object and the predicates agree. */
type ToggleKey = "stack" | "nocode" | "selfrun" | "owns" | "hideDead";

const grid = document.getElementById("grid");
const input = document.getElementById("q") as HTMLInputElement | null;
const countEl = document.getElementById("count");
const clearBtn = document.getElementById("clear") as HTMLButtonElement | null;
const emptyEl = document.getElementById("empty");
const deepEl = document.getElementById("deep");
const deepList = document.getElementById("deephits");

if (grid && input && countEl && clearBtn && emptyEl) {
  const cards = Array.from(grid.querySelectorAll<HTMLElement>(".card"));
  const total = cards.length;

  const state: { q: string; cats: Set<string> } & Record<ToggleKey, boolean> = {
    q: "",
    cats: new Set<string>(),
    stack: false,
    nocode: false,
    selfrun: false,
    owns: false,
    hideDead: false,
  };

  /** Each toggle is one predicate over a card's data attributes. */
  const TESTS: Record<ToggleKey, (el: HTMLElement) => boolean> = {
    stack: (el) => el.dataset.stack === "1",
    nocode: (el) => el.dataset.skill === "No-code",
    selfrun: (el) => el.dataset.edits === "Client alone",
    owns: (el) => el.dataset.exit === "You own the code" || el.dataset.exit === "Exports to code",
    hideDead: (el) => el.dataset.status === "active",
  };

  function matches(el: HTMLElement): boolean {
    if (state.q && !(el.dataset.hay ?? "").includes(state.q)) return false;

    if (state.cats.size) {
      const own = (el.dataset.cats ?? "").split(" ");
      if (!own.some((c) => state.cats.has(c))) return false;
    }

    for (const key of Object.keys(TESTS) as ToggleKey[]) {
      if (state[key] && !TESTS[key](el)) return false;
    }
    return true;
  }

  function dirty(): boolean {
    return Boolean(
      state.q ||
        state.cats.size ||
        state.stack ||
        state.nocode ||
        state.selfrun ||
        state.owns ||
        state.hideDead
    );
  }

  function render() {
    let shown = 0;
    for (const el of cards) {
      const ok = matches(el);
      el.hidden = !ok;
      if (ok) shown++;
    }
    countEl!.textContent = `${shown} of ${total} shown`;
    emptyEl!.hidden = shown !== 0;
    clearBtn!.hidden = !dirty();
    void deepSearch(state.q);
  }

  /* --- chips --- */
  for (const b of document.querySelectorAll<HTMLButtonElement>("[data-cat]")) {
    b.addEventListener("click", () => {
      const key = b.dataset.cat!;
      if (state.cats.has(key)) state.cats.delete(key);
      else state.cats.add(key);
      b.setAttribute("aria-pressed", state.cats.has(key) ? "true" : "false");
      render();
    });
  }

  for (const b of document.querySelectorAll<HTMLButtonElement>("[data-toggle]")) {
    b.addEventListener("click", () => {
      const key = b.dataset.toggle as ToggleKey;
      state[key] = !state[key];
      b.setAttribute("aria-pressed", state[key] ? "true" : "false");
      render();
    });
  }

  input.addEventListener("input", () => {
    state.q = input.value.trim().toLowerCase();
    render();
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    state.q = "";
    state.cats.clear();
    state.stack = state.nocode = state.selfrun = state.owns = state.hideDead = false;
    for (const c of document.querySelectorAll(".chip")) c.setAttribute("aria-pressed", "false");
    render();
    input.focus();
  });

  document.addEventListener("keydown", (e) => {
    const tag = (document.activeElement as HTMLElement | null)?.tagName;
    if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
      e.preventDefault();
      input.focus();
    }
  });

  /* --- Pagefind, optional --- */
  let pagefind: Pagefind | null | undefined;
  let seq = 0;

  async function loadPagefind(): Promise<Pagefind | null> {
    if (pagefind !== undefined) return pagefind;
    try {
      // Absent in dev and in any build that skipped indexing, which is why
      // every use of it is guarded.
      pagefind = (await import(/* @vite-ignore */ PAGEFIND_URL)) as Pagefind;
    } catch {
      pagefind = null;
    }
    return pagefind;
  }

  async function deepSearch(q: string) {
    if (!deepEl || !deepList) return;
    if (q.length < 3) {
      deepEl.hidden = true;
      return;
    }
    const pf = await loadPagefind();
    if (!pf) return;

    const mine = ++seq;
    const { results } = await pf.search(q);
    if (mine !== seq) return; // a newer keystroke won

    const top = await Promise.all(results.slice(0, 6).map((r) => r.data()));
    deepList.innerHTML = "";
    for (const hit of top) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = hit.url;
      a.textContent = hit.meta.title ?? hit.url;
      const p = document.createElement("p");
      p.innerHTML = hit.excerpt;
      li.append(a, p);
      deepList.append(li);
    }
    deepEl.hidden = top.length === 0;
  }

  render();
}
