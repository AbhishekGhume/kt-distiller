// Board detail sheet: original frame, redrawn diagram, explanation, key points.
import { html, mount, mmss, icon, $ } from "./util.js";
import { frameUrl } from "./api.js";

let mermaidReady = null;
function loadMermaid() {
  if (window.mermaid) return Promise.resolve(window.mermaid);
  mermaidReady ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js";
    s.onload = () => { window.mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" }); resolve(window.mermaid); };
    s.onerror = () => { mermaidReady = null; reject(new Error("offline")); };
    document.head.append(s);
  });
  return mermaidReady;
}

let dlg = null, uid = 0;
export const kindLabel = { diagram: "Diagram", notes: "Notes", sketch: "Sketch" };

export function boardThumb(jobId, b, idx) {
  return html`<button class="thumb" data-board="${idx}">
    <span class="img"><img loading="lazy" src="${frameUrl(jobId, b.image)}" alt=""></span>
    <span class="cap"><b>${b.title}</b><span>${kindLabel[b.kind] || b.kind} · ${mmss(b.t)}</span></span></button>`;
}

export function openBoard(ctx, b) {
  if (!dlg) {
    dlg = document.createElement("dialog");
    dlg.className = "sheet";
    dlg.setAttribute("aria-label", "Board detail");
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
    document.body.append(dlg);
  }
  const hasDiagram = !!b.mermaid;
  let view = hasDiagram ? "both" : "orig";
  const img = html`<figure><img src="${frameUrl(ctx.id, b.image)}" alt="Original whiteboard frame: ${b.title}"></figure>`;

  const draw = () => {
    mount(dlg, html`
      <div class="sheet-head">
        <div><h3>${b.title}</h3><span class="muted small">${kindLabel[b.kind] || b.kind} · shown at ${mmss(b.t)}</span></div>
        <div style="display:flex;gap:8px;align-items:center">
          ${hasDiagram ? html`<div class="seg-ctl" role="group" aria-label="View">
            <button data-v="orig" aria-pressed="${String(view === "orig")}">Original</button>
            <button data-v="diagram" aria-pressed="${String(view === "diagram")}">Redrawn</button>
            <button data-v="both" aria-pressed="${String(view === "both")}">Both</button></div>` : ""}
          <button class="icon-btn" data-close aria-label="Close">${icon.x}</button>
        </div>
      </div>
      <div class="sheet-body">
        ${b.confidence === "low" ? html`<div class="notice">${icon.warn}<span>The redrawn version may contain mistakes. Compare it with the original frame.</span></div>` : ""}
        <div class="board-views ${view === "both" ? "both" : ""}">
          ${view !== "diagram" ? img : ""}
          ${hasDiagram && view !== "orig" ? html`<figure><div class="diagram" id="dgm"><span class="muted small">Drawing diagram…</span></div></figure>` : ""}
        </div>
        <div class="reading">${b.explanation}</div>
        <div class="two-col">
          ${b.key_points?.length ? html`<div><h4 class="sub-h">What the speaker stressed</h4><ul class="points">${b.key_points.map((p) => html`<li>${p}</li>`)}</ul></div>` : ""}
          ${b.connections?.length ? html`<div><h4 class="sub-h">Connections on the board</h4><ul class="conn">${b.connections.map((c) => html`<li>${c}</li>`)}</ul></div>` : ""}
          ${b.board_text?.length ? html`<div><h4 class="sub-h">Text on the board</h4><div class="board-text">${b.board_text.join("\n")}</div></div>` : ""}
        </div>
        ${ctx.hasVideo ? html`<div><button class="btn" data-seek="${b.t}">${icon.play} Watch from ${mmss(b.t)}</button></div>` : ""}
      </div>`);
    dlg.querySelector("[data-close]").onclick = () => dlg.close();
    dlg.querySelectorAll("[data-v]").forEach((x) => x.onclick = () => { view = x.dataset.v; draw(); });
    dlg.querySelector("[data-seek]")?.addEventListener("click", () => dlg.close());
    const host = dlg.querySelector("#dgm");
    if (host) loadMermaid().then((m) => m.render("mm" + ++uid, b.mermaid)).then(({ svg }) => { if (host.isConnected) host.innerHTML = svg; })
      .catch(() => { if (host.isConnected) host.innerHTML = `<span class="muted small">The redrawn diagram needs an internet connection. The connections are listed below.</span>`; });
  };
  draw();
  dlg.showModal();
}
