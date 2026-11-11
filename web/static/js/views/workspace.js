import { html, mount, $, mmss, mins, plural, icon } from "../util.js";
import { api } from "../api.js";
import { renderStrip, stripLegend } from "../strip.js";
import * as player from "../player.js";
import { overview } from "./tabs/overview.js";
import { chapters } from "./tabs/chapters.js";
import { boards } from "./tabs/boards.js";
import { quiz } from "./tabs/quiz.js";
import { ask } from "./tabs/ask.js";
import { notes } from "./tabs/notes.js";

const TABS = { overview, chapters, boards, quiz, ask, notes };
const cache = new Map();

async function load(id) {
  if (cache.has(id)) return cache.get(id);
  const s = await api.status(id);
  if (s.state !== "done") return { pending: true };
  const [meta, pack] = await Promise.all([api.meta(id), api.pack(id)]);
  const flat = [];
  pack.chapters.forEach((c, ci) => (c.boards || []).forEach((b) => flat.push({ ...b, chapter: ci })));
  const data = { meta, pack, flat };
  cache.set(id, data);
  return data;
}
export const forget = (id) => cache.delete(id);

export async function workspace(root, { id, tab, arg, go }) {
  const ac = new AbortController();
  mount(root, html`<div class="wrap"><div class="ws-head"><div class="skeleton" style="height:44px;width:50%"></div><div class="skeleton" style="height:36px;margin-top:20px"></div></div></div>`);
  let data;
  try { data = await load(id); }
  catch (e) {
    mount(root, html`<div class="wrap"><div class="empty" style="margin-top:48px"><strong style="color:var(--ink)">${e.status === 404 ? "This study pack doesn't exist" : "Couldn't open this study pack"}</strong><br>${e.message}<br><br><a class="btn" href="#/">Back to library</a></div></div>`);
    return;
  }
  if (data.pending) { go(`/jobs/${id}/processing`, true); return; }
  const { meta, pack, flat } = data;
  if (ac.signal.aborted) return;
  const hasVideo = !!meta.video;
  if (hasVideo) player.setJob(id);

  const ctx = {
    id, meta, pack, boards: flat, hasVideo, signal: ac.signal, go,
    openChapter: (i) => go(`/jobs/${id}/chapters/${i}`),
    seek(t) {
      if (hasVideo) return player.open(t);
      const i = pack.chapters.findIndex((c) => t >= c.start && t < c.end);
      go(`/jobs/${id}/chapters/${Math.max(i, 0)}`);
    },
  };

  window.addEventListener("kt:seek", (e) => ctx.seek(e.detail), { signal: ac.signal });
  const name = TABS[tab] ? tab : "overview";
  const nav = [
    ["overview", "Overview", ""],
    ["chapters", "Chapters", pack.chapters.length],
    ["boards", "Boards", flat.length],
    ["quiz", "Quiz", (pack.quiz || []).length],
    ["ask", "Ask the KT", ""],
    ["notes", "Notes", (pack.glossary || []).length + (pack.action_items || []).length + (pack.promises || []).length],
  ];

  mount(root, html`<div class="wrap">
    <header class="ws-head">
      <div class="crumbs"><a href="#/">Library</a><span>/</span><span>${meta.name}</span></div>
      <div class="ws-title">
        <h1 class="display h-page">${meta.name}</h1>
        <div class="tools">
          ${hasVideo ? html`<button class="btn" id="watch">${icon.film} Watch recording</button>` : ""}
          <a class="btn quiet" href="/jobs/${id}/pack.html" target="_blank" rel="noopener">${icon.print} Printable version</a>
        </div>
      </div>
      <div id="strip"></div>
      ${stripLegend}
    </header>
    <div class="ws">
      <nav class="side" aria-label="Study pack sections">
        ${nav.map(([k, label, n]) => html`<a href="#/jobs/${id}/${k}" ${k === name ? html`aria-current="page"` : ""}>${label}${n !== "" ? html`<span class="n">${n}</span>` : ""}</a>`)}
      </nav>
      <main class="pane" id="pane"></main>
    </div>
  </div>`);

  renderStrip($("#strip", root), { chapters: pack.chapters, duration: pack.duration, boards: flat },
    { onPick: ctx.openChapter, signal: ac.signal, legend: true });
  $("#watch", root)?.addEventListener("click", () => player.open(0));

  const cleanup = TABS[name]($("#pane", root), ctx, arg);
  return () => { ac.abort(); cleanup?.(); };
}

export function leaveWorkspace() { player.reset(); }
