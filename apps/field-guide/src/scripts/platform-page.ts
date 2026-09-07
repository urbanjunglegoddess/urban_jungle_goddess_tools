/**
 * Platform page island.
 *
 * Two small jobs: copy the proposal line, and toggle the handout view.
 *
 * The handout is what makes the blueprint rule real rather than stated — it
 * removes the [data-internal] element outright rather than styling it away, so
 * build notes and stack flags cannot be read out of a screenshot, a print, or
 * the DOM while the view is on. Phase 3 adds the print stylesheet and export.
 */
const copyBtn = document.getElementById("copy-proposal");
const proposal = document.getElementById("proposal-text");

if (copyBtn && proposal) {
  copyBtn.addEventListener("click", async () => {
    const text = proposal.textContent?.trim() ?? "";
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = "Copied";
    } catch {
      // Clipboard is blocked in some contexts; select it so she can copy manually.
      const range = document.createRange();
      range.selectNodeContents(proposal);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      copyBtn.textContent = "Selected — press Ctrl+C";
    }
    setTimeout(() => (copyBtn.textContent = "Copy"), 2500);
  });
}

const handoutBtn = document.getElementById("handout");
const handoutNote = document.getElementById("handout-note");

if (handoutBtn) {
  // Every internal element is detached, not hidden, so while the handout view
  // is on it is genuinely absent from the DOM — not merely invisible to a
  // screenshot, a print, or someone reading over her shoulder.
  const hosts = Array.from(document.querySelectorAll("[data-internal]"));
  const parked: { node: Element; anchor: Comment }[] = [];

  handoutBtn.addEventListener("click", () => {
    if (parked.length) {
      for (const { node, anchor } of parked.splice(0)) anchor.replaceWith(node);
      document.body.classList.remove("handout");
      handoutBtn.textContent = "Client handout view";
      if (handoutNote) handoutNote.textContent = "Strips every internal field, then prints.";
    } else {
      for (const node of hosts) {
        const anchor = document.createComment("internal");
        node.replaceWith(anchor);
        parked.push({ node, anchor });
      }
      document.body.classList.add("handout");
      handoutBtn.textContent = "Back to internal view";
      if (handoutNote) handoutNote.textContent = "Internal fields removed — safe to show.";
    }
  });
}
