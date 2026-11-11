import { html, mount, $, esc, parseTs, mmss, icon } from "../../util.js";
import { api } from "../../api.js";

const threads = new Map();

/** Escape the answer, then turn [mm:ss] citations into clickable timestamp chips. */
function withChips(text, ctx) {
  return esc(text).replace(/\[(\d+(?::\d+){1,2})\]/g, (_, ts) =>
    `<button class="chip-time" data-seek="${parseTs(ts)}">${ctx.hasVideo ? icon.play.s : ""}${mmss(parseTs(ts))}</button>`);
}

export function ask(el, ctx) {
  const thread = threads.get(ctx.id) ?? (threads.set(ctx.id, []), threads.get(ctx.id));
  const firstCore = ctx.pack.chapters.find((c) => c.importance === "core");
  const suggestions = [
    "What was left to share later?",
    "What are the main trade-offs discussed?",
    firstCore ? `Explain “${firstCore.title}” in simple terms` : null,
  ].filter(Boolean);

  mount(el, html`<header><h2>Ask the KT</h2><p>Answers come only from this recording and cite the moment they came from.</p></header>
    <div class="chat">
      <div class="thread" id="thread" aria-live="polite"></div>
      <form class="composer" id="form">
        <label class="sr" for="q">Your question</label>
        <textarea id="q" rows="1" maxlength="500" placeholder="Ask about this session…"></textarea>
        <button class="btn primary" type="submit" aria-label="Send question">${icon.send}</button>
      </form>
    </div>`);
  const box = $("#thread", el), q = $("#q", el);

  const bubble = (m) => m.role === "user"
    ? `<div class="msg user"><div class="who">You</div><div class="bubble">${esc(m.text)}</div></div>`
    : `<div class="msg bot ${m.none ? "none" : ""}"><div class="who">KT</div><div class="bubble">${m.pending ? '<span class="dots" aria-label="Thinking"><i></i><i></i><i></i></span>' : m.error ? esc(m.text) : withChips(m.text, ctx)}</div></div>`;
  const draw = () => {
    if (!thread.length) {
      mount(box, html`<div class="card flat" style="border-style:dashed"><p class="muted" style="margin-bottom:12px">Try one of these:</p>
        <div class="suggest">${suggestions.map((s) => html`<button type="button" data-s="${s}">${s}</button>`)}</div></div>`);
      box.querySelectorAll("[data-s]").forEach((b) => b.onclick = () => send(b.dataset.s));
    } else box.innerHTML = thread.map(bubble).join("");
    box.lastElementChild?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  let busy = false;
  async function send(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true; q.value = ""; grow();
    thread.push({ role: "user", text });
    const m = { role: "bot", pending: true }; thread.push(m); draw();
    try {
      const r = await api.ask(ctx.id, text);
      m.pending = false; m.text = r.answer; m.none = !r.citations?.length;
    } catch (e) { m.pending = false; m.error = true; m.text = `Couldn't get an answer: ${e.message}`; }
    busy = false; draw(); q.focus();
  }
  const grow = () => { q.style.height = "auto"; q.style.height = Math.min(q.scrollHeight, 160) + "px"; };
  q.addEventListener("input", grow);
  q.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(q.value); } });
  $("#form", el).onsubmit = (e) => { e.preventDefault(); send(q.value); };
  draw();
}
