import { html, mount, $, $$, mmss, icon, store } from "../../util.js";

export function notes(el, ctx) {
  const { pack, id } = ctx;
  const gl = pack.glossary || [], actions = pack.action_items || [], promises = pack.promises || [];
  const key = `kt:${id}:done`;
  const done = new Set(store(key) || []);

  const chip = (t) => html`<button class="chip-time" data-seek="${t}">${ctx.hasVideo ? icon.play : ""}${mmss(t)}</button>`;
  mount(el, html`
    <header><h2>Notes</h2><p>Terms, follow-ups and promises pulled from the session.</p></header>
    <section class="card"><h3 class="h-sec">Action items and decisions</h3>
      ${actions.length ? html`<div style="margin-top:8px">${actions.map((a, i) => html`<label class="todo"><input type="checkbox" data-a="${i}" ${done.has(i) ? html`checked` : ""}><span>${a.text}</span>${chip(a.at)}</label>`)}</div>`
        : html`<p class="muted" style="margin-top:6px">None were mentioned.</p>`}</section>
    <section class="card"><h3 class="h-sec">Promised for later</h3>
      ${promises.length ? html`<div class="list-rows" style="margin-top:8px">${promises.map((p) => html`<div class="row">${chip(p.at)}<span>${p.text}</span></div>`)}</div>`
        : html`<p class="muted" style="margin-top:6px">The speaker didn't promise to cover anything later.</p>`}</section>
    <section><div class="toolbar" style="margin-bottom:12px"><h3 class="h-sec">Glossary <span class="muted small" id="gc">${gl.length}</span></h3></div>
      ${gl.length ? html`<input class="search" id="gs" type="search" placeholder="Search terms" aria-label="Search glossary">
        <dl class="card glossary" id="gl" style="margin-top:12px">${gl.map((g) => html`<div class="term"><dt>${g.term}</dt><dd>${g.meaning}</dd></div>`)}</dl>`
        : html`<div class="empty">No glossary terms were extracted.</div>`}</section>`);

  $$("[data-a]", el).forEach((c) => c.onchange = () => {
    c.checked ? done.add(+c.dataset.a) : done.delete(+c.dataset.a); store(key, [...done]);
  });
  $("#gs", el)?.addEventListener("input", (e) => {
    const v = e.target.value.trim().toLowerCase(); let n = 0;
    $$(".term", el).forEach((t) => { const hit = !v || t.textContent.toLowerCase().includes(v); t.hidden = !hit; n += hit; });
    $("#gc", el).textContent = n;
  });
}
