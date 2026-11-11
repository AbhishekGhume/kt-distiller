import { html, mount, $, $$, mmss, icon, store } from "../../util.js";

const sessions = new Map(); // keeps progress when you switch tabs
const LETTERS = "ABCD";

export function quiz(el, ctx) {
  const qs = ctx.pack.quiz || [];
  const key = `kt:${ctx.id}:best`;
  if (!qs.length) {
    mount(el, html`<header><h2>Quiz</h2></header><div class="empty">This pack has no quiz questions. Questions are only written for chapters with enough spoken content.</div>`);
    return;
  }
  let s = sessions.get(ctx.id);
  if (!s) sessions.set(ctx.id, s = { i: -1, picks: [] });

  const intro = () => {
    const best = store(key);
    mount(el, html`<header><h2>Quiz</h2><p>${qs.length} questions based only on what was said in the session.</p></header>
      <div class="card quiz-card">
        <p class="reading">Each question tells you where in the recording the answer comes from, so you can go back and listen to it.</p>
        ${best != null ? html`<p class="muted" style="margin-top:10px">Your best score: ${best} of ${qs.length}</p>` : ""}
        <div style="margin-top:20px"><button class="btn primary" id="start">Start quiz</button></div>
      </div>`);
    $("#start", el).onclick = () => { s.i = 0; s.picks = []; question(); };
  };

  const question = () => {
    const q = qs[s.i], picked = s.picks[s.i];
    const done = picked != null;
    mount(el, html`<header><h2>Quiz</h2></header>
      <div class="card quiz-card">
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${qs.length}" aria-valuenow="${s.i + (done ? 1 : 0)}"><i style="width:${(s.i + (done ? 1 : 0)) / qs.length * 100}%"></i></div>
        <div class="q-meta"><span>Question ${s.i + 1} of ${qs.length}</span><span>${q.chapter}</span></div>
        <h3 class="q-text">${q.question}</h3>
        <div class="opts" role="group" aria-label="Answers">
          ${q.options.map((o, oi) => {
            const cls = !done ? "" : oi === q.answer_index ? "right" : oi === picked ? "wrong" : "dim";
            return html`<button class="opt ${cls}" data-o="${oi}" ${done ? html`disabled` : ""}>
              <span class="k">${q.type === "tf" ? (oi ? "F" : "T") : LETTERS[oi]}</span><span>${o}</span>
              <span class="mark">${cls === "right" ? icon.check : cls === "wrong" ? icon.x : ""}</span></button>`;
          })}
        </div>
        ${done ? html`<div class="feedback" role="status">
          <div><b class="${picked === q.answer_index ? "ok" : "no"}">${picked === q.answer_index ? "Correct." : "Not quite."}</b> ${q.explanation}</div>
          <div class="small muted">Heard in “${q.chapter}” at <button class="chip-time" data-seek="${q.at}">${ctx.hasVideo ? icon.play : ""}${mmss(q.at)}</button></div></div>` : ""}
        <div class="q-actions">
          <button class="btn quiet sm" id="quit">Leave quiz</button>
          ${done ? html`<button class="btn primary" id="next">${s.i + 1 < qs.length ? "Next question" : "See results"}</button>` : ""}
        </div>
      </div>`);
    $$(".opt", el).forEach((b) => b.onclick = () => { s.picks[s.i] = +b.dataset.o; question(); $("#next", el)?.focus(); });
    $("#quit", el).onclick = () => { s.i = -1; s.picks = []; intro(); };
    $("#next", el)?.addEventListener("click", () => { s.i++; s.i < qs.length ? question() : results(); });
  };

  const results = () => {
    const score = qs.filter((q, i) => s.picks[i] === q.answer_index).length;
    const best = Math.max(score, store(key) ?? 0); store(key, best);
    const C = 2 * Math.PI * 54, off = C * (1 - score / qs.length);
    mount(el, html`<header><h2>Quiz results</h2></header>
      <div class="card quiz-card">
        <div class="result">
          <div class="score-ring"><svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="54"/><circle class="fg" cx="60" cy="60" r="54" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${off}"/></svg><b>${score}/${qs.length}</b></div>
          <div><p class="h-sec">${score === qs.length ? "Every answer correct." : score >= qs.length * .7 ? "Solid grasp of the session." : "Worth another look at a few chapters."}</p>
            <p class="muted">Best score: ${best} of ${qs.length}</p>
            <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="again">Try again</button><a class="btn" href="#/jobs/${ctx.id}/chapters">Review chapters</a></div></div>
        </div>
        <h3 class="sub-h" style="margin-top:28px">Your answers</h3>
        <div class="review">${qs.map((q, i) => {
          const ok = s.picks[i] === q.answer_index;
          return html`<div class="row ${ok ? "ok" : "no"}">${ok ? icon.check : icon.x}<div><div>${q.question}</div>
            ${ok ? "" : html`<div class="small muted">Answer: ${q.options[q.answer_index]}</div>`}
            <div class="small"><button class="chip-time" data-seek="${q.at}">${ctx.hasVideo ? icon.play : ""}${mmss(q.at)}</button> <span class="muted">${q.chapter}</span></div></div></div>`;
        })}</div>
      </div>`);
    requestAnimationFrame(() => requestAnimationFrame(() => { const f = $(".fg", el); if (f) f.style.strokeDashoffset = f.dataset.off; }));
    $("#again", el).onclick = () => { s.i = 0; s.picks = []; question(); };
  };

  s.i < 0 ? intro() : s.i >= qs.length ? results() : question();
}
