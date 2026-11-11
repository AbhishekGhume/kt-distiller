import { html, mount, $, $$, mmss, mins, ago, plural, icon, toast } from "../util.js";
import { api } from "../api.js";
import { renderStrip } from "../strip.js";

const sampleTape = [[3,"skippable"],[9,"core"],[7,"useful"],[12,"core"],[6,"core"],[2,"skippable"],[10,"useful"],[8,"core"],[5,"useful"]];

export function library(root, { go }) {
  const ac = new AbortController();
  let timer = null, jobs = [];

  mount(root, html`
  <div class="wrap">
    <section class="library-hero">
      <div>
        <h1 class="display h-page" style="font-size:clamp(2.2rem,1.4rem + 3.4vw,3.8rem)">Turn a long KT recording into a study pack.</h1>
        <p class="lede">Upload the video. You get chapters you can skim, the whiteboards redrawn as diagrams, a quiz, and a way to ask questions that answers with timestamps.</p>
        <p class="note">${icon.lock}<span>Only upload recordings you are approved to process, in a company-approved subscription.</span></p>
      </div>
      <label class="drop" id="drop">
        <div class="tape strip slim" aria-hidden="true"><div class="bar">${sampleTape.map(([w, k]) => html`<span class="seg" data-imp="${k}" style="flex-grow:${w}"></span>`)}</div></div>
        <div id="dropBody"><strong>Drop an .mp4 here</strong><div class="sub">or click to choose a file</div></div>
        <input id="file" type="file" accept=".mp4,video/mp4" aria-label="Choose an .mp4 recording">
      </label>
    </section>

    <section aria-labelledby="packs-h">
      <div class="section-head"><h2 class="h-sec" id="packs-h">Your study packs</h2><span class="muted small" id="count"></span></div>
      <div id="list" class="job-grid"><div class="skeleton" style="height:168px"></div><div class="skeleton" style="height:168px"></div></div>
    </section>
  </div>`);

  // ---- upload ----
  const drop = $("#drop", root), input = $("#file", root), body = $("#dropBody", root);
  const idle = body.innerHTML;
  const pick = async (f) => {
    if (!f) return;
    if (!/\.mp4$/i.test(f.name)) { showErr("Choose an .mp4 file. Other formats aren't supported yet."); return; }
    body.innerHTML = `<strong></strong><div class="upload-bar" role="progressbar" aria-label="Upload progress"><i></i></div><div class="sub">Uploading</div>`;
    body.querySelector("strong").textContent = f.name;
    drop.style.pointerEvents = "none";
    try {
      const { jobId } = await api.upload(f, (p) => { body.querySelector("i").style.width = (p * 100) + "%"; if (p >= 1) body.querySelector(".sub").textContent = "Starting…"; });
      go(`/jobs/${jobId}`);
    } catch (e) { drop.style.pointerEvents = ""; showErr(e.message); }
  };
  const showErr = (m) => { body.innerHTML = idle; const p = document.createElement("div"); p.className = "form-error"; p.setAttribute("role", "alert"); p.textContent = m; body.append(p); };
  input.addEventListener("change", () => pick(input.files[0]));
  ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", (e) => pick(e.dataTransfer.files[0]));

  // ---- list ----
  const card = (j) => {
    const done = j.state === "done";
    const state = done ? "" : j.state === "error"
      ? html`<span class="state error"><i></i>Failed</span>`
      : html`<span class="state running"><i></i>Step ${Math.min(j.stage + 1, j.stages || 8)} of ${j.stages || 8}</span>`;
    return html`<a class="job" href="#/jobs/${j.id}">
      <h3>${j.name}</h3>
      ${state}
      ${j.state === "error" ? html`<p class="hint">Processing stopped. Open it to see what went wrong.</p>` : j.state === "running" ? html`<p class="hint">Still processing. This page updates by itself.</p>` : ""}
      ${done && j.chapters?.length ? html`<div class="strip slim" data-strip="${j.id}"></div>` : ""}
      ${done && j.overview ? html`<p>${j.overview}</p>` : ""}
      <div class="meta">
        ${done ? html`<span>${mins(j.duration || 0)}</span><span>${plural(j.chapters?.length || 0, "chapter")}</span><span>${plural(j.boards || 0, "board")}</span>` : ""}
        <span>${ago(j.created)}</span>
      </div>
      <button class="icon-btn del" data-del="${j.id}" aria-label="Delete ${j.name}" title="Delete">${icon.trash}</button>
    </a>`;
  };
  const draw = () => {
    $("#count", root).textContent = jobs.length ? plural(jobs.length, "pack") : "";
    const list = $("#list", root);
    if (!jobs.length) {
      mount(list, html`<div class="empty" style="grid-column:1/-1"><strong style="color:var(--ink)">No study packs yet</strong><br>Drop a recording above to make your first one.</div>`);
      return;
    }
    mount(list, html`${jobs.map(card)}`);
    $$("[data-strip]", list).forEach((el) => {
      const j = jobs.find((x) => x.id === el.dataset.strip);
      renderStrip(el, { chapters: j.chapters, duration: j.duration }, { slim: true, legend: false });
      el.querySelectorAll(".seg").forEach((s) => s.style.pointerEvents = "none");
    });
  };
  async function refresh() {
    try { jobs = await api.jobs(); draw(); } catch (e) { $("#list", root).textContent = e.message; }
    clearTimeout(timer);
    if (jobs.some((j) => j.state === "running")) timer = setTimeout(refresh, 3000);
  }
  $("#list", root).addEventListener("click", async (e) => {
    const b = e.target.closest("[data-del]");
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const j = jobs.find((x) => x.id === b.dataset.del);
    if (!confirm(`Delete “${j.name}”? The study pack and the uploaded video will be removed.`)) return;
    try { await api.remove(j.id); toast("Deleted"); refresh(); } catch (err) { toast(err.message); }
  });
  refresh();
  return () => { clearTimeout(timer); ac.abort(); };
}
