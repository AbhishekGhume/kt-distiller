import { html, mount, $, icon } from "../util.js";
import { api } from "../api.js";

const HINTS = [
  "Turning speech into text",
  "Splitting the session into chapters and finding action items",
  "Pulling still frames from the video",
  "Picking the frames that show a whiteboard",
  "Reading the drawings and their arrows",
  "Writing a short explanation for each board",
  "Drafting questions based on what was said",
  "Preparing search so you can ask questions",
];

export function processing(root, { id, go }) {
  let timer = null, alive = true;
  const started = Date.now();
  mount(root, html`<div class="wrap"><div class="proc">
    <div class="crumbs"><a href="#/">Library</a><span>/</span><span id="nm">Processing</span></div>
    <h1 class="display h-page" id="ttl">Processing your recording</h1>
    <p class="muted" style="margin-top:8px" id="sub">This usually takes a few minutes for each hour of video. You can leave this page; the job keeps running.</p>
    <ol class="steps" id="steps" aria-live="polite"></ol>
    <div id="err"></div>
  </div></div>`);

  async function tick() {
    if (!alive) return;
    let s, m;
    try { [s, m] = await Promise.all([api.status(id), api.meta(id)]); }
    catch (e) {
      if (e.status === 404) { mount($("#err", root), html`<div class="err-box"><b>This job doesn't exist.</b><a class="btn" href="#/">Back to library</a></div>`); return; }
      timer = setTimeout(tick, 4000); return;
    }
    $("#nm", root).textContent = m.name;
    if (s.state === "done") { go(`/jobs/${id}/overview`, true); return; }
    const failed = s.state === "error";
    $("#steps", root).innerHTML = (s.stages || []).map((n, i) => {
      const cls = failed && i === s.stage ? "fail" : i < s.stage ? "done" : i === s.stage ? "now" : "wait";
      const dot = cls === "done" ? icon.check.s : cls === "fail" ? icon.x.s : i + 1;
      return `<li class="step ${cls}"><span class="dot">${dot}</span><span class="lbl">${n}${cls === "now" ? `<small>${HINTS[i] || ""}</small>` : ""}</span></li>`;
    }).join("");
    if (failed) {
      $("#ttl", root).textContent = "Processing stopped";
      $("#sub", root).textContent = `It failed at “${(s.stages || [])[s.stage] || "an unknown step"}”.`;
      const box = $("#err", root);
      mount(box, html`<div class="err-box" role="alert"><div><b>What went wrong</b><div class="small" style="margin-top:4px;overflow-wrap:anywhere"></div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn primary" href="#/">Upload another file</a></div></div>`);
      box.querySelector(".small").textContent = s.error || "Unknown error";
      return;
    }
    timer = setTimeout(tick, 2000);
  }
  tick();
  return () => { alive = false; clearTimeout(timer); };
}
