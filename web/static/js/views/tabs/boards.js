import { html, mount, $, $$, plural } from "../../util.js";
import { boardThumb, openBoard, kindLabel } from "../../board.js";

export function boards(el, ctx) {
  const { boards: all, id } = ctx;
  let kind = "all";
  const kinds = ["all", ...new Set(all.map((b) => b.kind))];
  const draw = () => {
    const shown = all.map((b, i) => [b, i]).filter(([b]) => kind === "all" || b.kind === kind);
    mount(el, html`
      <header><h2>Boards</h2><p>Every whiteboard, diagram and note shown during the session. Open one to compare the original with the redrawn version.</p></header>
      ${all.length ? html`
        ${kinds.length > 2 ? html`<div class="seg-ctl" role="group" aria-label="Filter by type" style="justify-self:start">
          ${kinds.map((k) => html`<button data-k="${k}" aria-pressed="${String(k === kind)}">${k === "all" ? `All (${all.length})` : kindLabel[k] || k}</button>`)}</div>` : ""}
        <div class="board-grid">${shown.map(([b, i]) => boardThumb(id, b, i))}</div>`
        : html`<div class="empty">No whiteboards were found in this recording.</div>`}`);
    $$("[data-k]", el).forEach((b) => b.onclick = () => { kind = b.dataset.k; draw(); $(`[data-k="${kind}"]`, el)?.focus(); });
    $$("[data-board]", el).forEach((b) => b.onclick = () => openBoard(ctx, all[+b.dataset.board]));
  };
  draw();
}
