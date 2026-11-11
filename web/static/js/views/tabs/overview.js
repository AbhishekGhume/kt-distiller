import { html, mount, mmss, mins, plural, icon } from "../../util.js";

export function overview(el, ctx) {
  const { pack, boards, id } = ctx;
  const skipSec = pack.chapters.filter((c) => c.importance === "skippable").reduce((t, c) => t + (c.end - c.start), 0);
  const nSkip = pack.chapters.filter((c) => c.importance === "skippable").length;
  const core = pack.chapters.map((c, i) => ({ ...c, i })).filter((c) => c.importance === "core");
  const promises = pack.promises || [];
  mount(el, html`
    <header><h2>Overview</h2></header>
    <p class="reading lead">${pack.overview}</p>
    <div class="saving">${icon.bulb}<div>
      ${skipSec > 0
        ? html`<b>Watch ${mins(pack.duration - skipSec)} instead of ${mins(pack.duration)}.</b> ${plural(nSkip, "chapter")} (${mins(skipSec)} in total) ${nSkip === 1 ? "is" : "are"} marked skippable, such as greetings or promotion.`
        : html`<b>Nothing to skip.</b> Every chapter in this session carries content.`}
    </div></div>
    <dl class="facts">
      <div><dt>Length</dt><dd>${mins(pack.duration)}</dd></div>
      <div><dt>Chapters</dt><dd>${pack.chapters.length}</dd></div>
      <div><dt>Boards</dt><dd>${boards.length}</dd></div>
      <div><dt>Quiz questions</dt><dd>${(pack.quiz || []).length}</dd></div>
      <div><dt>Glossary terms</dt><dd>${(pack.glossary || []).length}</dd></div>
    </dl>
    ${core.length ? html`<section class="card">
      <h3 class="h-sec" style="margin-bottom:6px">Start with these chapters</h3>
      <p class="muted small">The ones marked core are where the main ideas live.</p>
      <div class="list-rows" style="margin-top:8px">
        ${core.slice(0, 5).map((c) => html`<div class="row"><a class="chip-time" href="#/jobs/${id}/chapters/${c.i}">${mmss(c.start)}</a><div><b>${c.title}</b><div class="muted small">${c.summary}</div></div></div>`)}
      </div>
      ${core.length > 5 ? html`<p style="margin-top:10px"><a href="#/jobs/${id}/chapters">See all ${pack.chapters.length} chapters</a></p>` : ""}
    </section>` : ""}
    ${promises.length ? html`<section class="card">
      <h3 class="h-sec" style="margin-bottom:6px">Promised for later</h3>
      <p class="muted small">The speaker said they would cover these in another session.</p>
      <div class="list-rows" style="margin-top:8px">
        ${promises.map((p) => html`<div class="row"><button class="chip-time" data-seek="${p.at}">${icon.play}${mmss(p.at)}</button><span>${p.text}</span></div>`)}
      </div></section>` : ""}
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      ${(pack.quiz || []).length ? html`<a class="btn primary" href="#/jobs/${id}/quiz">Take the quiz</a>` : ""}
      <a class="btn" href="#/jobs/${id}/ask">Ask a question</a>
    </div>`);
}
