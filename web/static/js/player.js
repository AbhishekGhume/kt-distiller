// Floating video dock. Timestamps anywhere in the app call seek().
import { html, mount, mmss, icon } from "./util.js";

let dock = null, video = null, jobId = null;

export function setJob(id) { if (jobId !== id) { close(); jobId = id; } }
export function reset() { close(); jobId = null; }

export function open(t = 0) {
  if (!jobId) return;
  if (!dock) {
    dock = document.createElement("aside");
    dock.className = "dock";
    dock.setAttribute("aria-label", "Recording player");
    mount(dock, html`<header><span>Recording <span class="time" id="dockTime">00:00</span></span>
      <button class="icon-btn" aria-label="Close player">${icon.x}</button></header>
      <video controls preload="metadata" playsinline src="/jobs/${jobId}/video"></video>`);
    document.body.append(dock);
    video = dock.querySelector("video");
    dock.querySelector("button").onclick = close;
    video.addEventListener("timeupdate", () => {
      dock.querySelector("#dockTime").textContent = mmss(video.currentTime);
      window.dispatchEvent(new CustomEvent("kt:time", { detail: video.currentTime }));
    });
    video.addEventListener("loadedmetadata", () => { if (video._seekTo != null) { video.currentTime = video._seekTo; video._seekTo = null; } });
  }
  if (video.readyState >= 1) video.currentTime = t; else video._seekTo = t;
  video.play().catch(() => { /* autoplay can be blocked; controls are visible */ });
}

export function close() {
  window.dispatchEvent(new CustomEvent("kt:time", { detail: null }));
  dock?.remove(); dock = video = null;
}
