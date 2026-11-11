import { html, mount, $, $$, mmss, mins, plural, icon, store } from "../../util.js";
import { boardThumb, openBoard } from "../../board.js";

const TAG = { core: "Core", useful: "Useful", skippable: "Skippable" };

export function chapters(el, ctx, arg) {
  const { pack, id, boards } = ctx;
  let hideSkip = !!store(`kt:${id}:hideSkip`);
  const target = arg != null && arg !== "" ? +arg : null;

  const chapter = (c, i) => {
    const imp = c.importance || "useful";
    return html`<details class="chapter is-${imp}" id="ch-${i}" ${imp !== "skippable" && target === i ? html`open` : ""} ${imp === "skippable" && hideSkip ? html`hidden` : ""} data-imp="${imp}">
      <summary>
        <span class="when">${mmss(c.start)}–${mmss(c.end)}</span>
        <div><h3>${c.title}<span class="tag ${imp}">${TAG[imp] || imp}</span></h3>
          <p class="muted small clamp">${c.summary}${c.boards?.length ? ` · ${plural(c.boards.length, "board")}` : ""}</p></div>
        <span class="chev">${icon.chev}</span>
      </summary>
      <div class="body">
        <p class="reading">${c.summary}</p>
        ${imp === "skippable" && c.skip_reason ? html`<p class="skip-why">Why you can skip it: ${c.skip_reason}</p>` : ""}
        ${c.boards?.length ? html`<div><h4 class="sub-h">Whiteboards in this chapter</h4><div class="boards-inline">${c.boards.map((b) => boardThumb(id, b, boards.findIndex((x) => x.n === b.n && x.t === b.t)))}</div></div>` : ""}
        <div><button class="btn sm" data-seek="${c.start}">${icon.play} ${ctx.hasVideo ? `Watch from ${mmss(c.start)}` : `Starts at ${mmss(c.start)}`}</button></div>
      </div>
    </details>`;
  };

  mount(el, html`
    <header><h2>Chapters</h2><p>Open a chapter to read the summary and see its whiteboards.</p></header>
    <div class="toolbar">
      <label class="switch"><input type="checkbox" id="hide" ${hideSkip ? html`checked` : ""}><span class="track"></span>Hide skippable chapters</label>
      <button class="btn quiet sm" id="all">Expand all</button>
    </div>
    <div class="chapters">${pack.chapters.map(chapter)}</div>`);

  const list = $(".chapters", el);
  $("#hide", el).onchange = (e) => {
    hideSkip = e.target.checked; store(`kt:${id}:hideSkip`, hideSkip);
    $$('[data-imp="skippable"]', list).forEach((d) => d.hidden = hideSkip);
  };
  let open = false;
  $("#all", el).onclick = (e) => {
    open = !open; $$("details", list).forEach((d) => { if (!d.hidden) d.open = open; });
    e.target.textContent = open ? "Collapse all" : "Expand all";
  };
  list.addEventListener("click", (e) => {
    const t = e.target.closest("[data-board]");
    if (t) { e.preventDefault(); openBoard(ctx, boards[+t.dataset.board]); }
  });
  if (target != null) {
    const d = $(`#ch-${target}`, el);
    if (d) { d.open = true; d.hidden = false; requestAnimationFrame(() => { d.scrollIntoView({ block: "start", behavior: "smooth" }); d.classList.add("flash"); }); }
  }
}
