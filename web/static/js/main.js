import { html, mount, $, icon, store } from "./util.js";
import { library } from "./views/library.js";
import { processing } from "./views/processing.js";
import { workspace, leaveWorkspace, forget } from "./views/workspace.js";
import * as player from "./player.js";

const view = $("#view");
let cleanup = null, token = 0, lastJob = null;

export function go(path, replace = false) {
  if (replace) history.replaceState(null, "", "#" + path), route(); else location.hash = path;
}

async function route() {
  const t = ++token;
  const parts = (location.hash.slice(1) || "/").split("/").filter(Boolean);
  cleanup?.(); cleanup = null;
  document.querySelector("dialog.sheet[open]")?.close();
  $("#navLib").setAttribute("aria-current", parts.length ? "false" : "page");

  let fn, title = "KT Distiller";
  if (parts[0] === "jobs" && parts[1]) {
    const [, id, tab, arg] = parts;
    if (lastJob && lastJob !== id) leaveWorkspace();
    lastJob = id;
    if (tab === "processing") { fn = processing(view, { id, go }); }
    else fn = workspace(view, { id, tab, arg, go });
    if (tab !== "chapters" || arg == null) window.scrollTo(0, 0);
  } else {
    if (lastJob) { leaveWorkspace(); lastJob = null; }
    fn = library(view, { go });
    window.scrollTo(0, 0);
  }
  const c = await fn;
  if (t !== token) { c?.(); return; }
  cleanup = c;
  document.title = title;
}

// Timestamps and other data-seek buttons work from any view.
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-seek]");
  if (!b || b.closest(".strip")) return;
  const t = parseFloat(b.dataset.seek);
  if (Number.isFinite(t)) window.dispatchEvent(new CustomEvent("kt:seek", { detail: t }));
});

// Theme
const root = document.documentElement;
const setTheme = (t) => { root.dataset.theme = t; $("#theme").innerHTML = (t === "dark" ? icon.sun : icon.moon).s; $("#theme").setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme"); };
setTheme(root.dataset.theme);
$("#theme").onclick = () => { const t = root.dataset.theme === "dark" ? "light" : "dark"; setTheme(t); store("kt:theme", t); };
$("#logo").innerHTML = icon.logo.s;

addEventListener("hashchange", route);
route();
export { forget };
