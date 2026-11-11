// The recording strip: the whole session as one bar. Segment width = chapter length,
// fill = how much it matters, dots = whiteboards. Click a segment to open that chapter.
import { html, mount, mmss, esc } from "./util.js";

const LABEL = { core: "Core", useful: "Useful", skippable: "Skippable" };

export function renderStrip(el, { chapters, duration, boards = [] }, { slim = false, onPick, signal, legend = true } = {}) {
  const total = duration || chapters.at(-1)?.end || 1;
  const segs = chapters.map((c, i) => {
    const imp = c.importance || "useful";
    return html`<button class="seg" data-i="${i}" data-imp="${imp}" style="flex-grow:${Math.max(c.end - c.start, 1)}"
      aria-label="${c.title}, ${mmss(c.start)} to ${mmss(c.end)}, ${LABEL[imp] || imp}"></button>`;
  });
  const ticks = boards.map((b) => html`<i class="tick" style="left:${(b.t / total * 100).toFixed(2)}%"></i>`);
  mount(el, html`<div class="strip ${slim ? "slim" : ""}">
    ${ticks}<div class="bar">${segs}</div><i class="head"></i>
    ${legend ? html`<div class="axis"><span>00:00</span><span>${mmss(total)}</span></div>` : ""}
  </div>`);
  const root = el.firstElementChild, bar = root.querySelector(".bar"), head = root.querySelector(".head");

  let tip = null;
  const showTip = (btn) => {
    hideTip();
    const c = chapters[+btn.dataset.i];
    tip = document.createElement("div"); tip.className = "tip";
    tip.innerHTML = `${esc(c.title)}<small>${mmss(c.start)} – ${mmss(c.end)} · ${LABEL[c.importance] || "Useful"}</small>`;
    const r = btn.getBoundingClientRect(), pr = root.getBoundingClientRect();
    tip.style.left = Math.min(Math.max(r.left - pr.left + r.width / 2, 90), pr.width - 90) + "px";
    root.append(tip);
  };
  const hideTip = () => { tip?.remove(); tip = null; };
  bar.addEventListener("pointerover", (e) => { const b = e.target.closest(".seg"); b && showTip(b); });
  bar.addEventListener("focusin", (e) => { const b = e.target.closest(".seg"); b && showTip(b); });
  bar.addEventListener("pointerleave", hideTip);
  bar.addEventListener("focusout", hideTip);
  bar.addEventListener("click", (e) => { const b = e.target.closest(".seg"); if (b) onPick?.(+b.dataset.i); });

  window.addEventListener("kt:time", (e) => {
    if (e.detail == null) { head.classList.remove("on"); return; }
    head.classList.add("on"); head.style.left = (e.detail / total * 100) + "%";
  }, { signal });
}

export const stripLegend = html`<div class="legend">
  <span><i style="background:var(--blue)"></i>Core</span>
  <span><i style="background:color-mix(in srgb,var(--blue) 42%,var(--panel))"></i>Useful</span>
  <span><i style="background:repeating-linear-gradient(135deg,var(--line-strong) 0 3px,transparent 3px 6px);box-shadow:inset 0 0 0 1px var(--line-strong)"></i>Skippable</span>
  <span><i style="width:7px;height:7px;border-radius:50%;background:var(--ink)"></i>Whiteboard</span>
</div>`;
