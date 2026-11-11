// Thin wrapper around the FastAPI endpoints.
async function request(path, opts) {
  let res;
  try { res = await fetch(path, opts); }
  catch { throw new Error("Can't reach the server. Is it still running?"); }
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch { /* not json */ }
    const err = new Error(detail); err.status = res.status; throw err;
  }
  return res.json();
}
export const api = {
  jobs: () => request("/jobs"),
  meta: (id) => request(`/jobs/${id}/meta`),
  status: (id) => request(`/jobs/${id}`),
  pack: (id) => request(`/jobs/${id}/pack`),
  remove: (id) => request(`/jobs/${id}`, { method: "DELETE" }),
  ask: (id, question) => request(`/jobs/${id}/ask`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }),
  }),
  /** Upload with progress. Resolves to {jobId}. */
  upload(file, onProgress) {
    return new Promise((resolve, reject) => {
      const fd = new FormData(); fd.append("file", file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/jobs");
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
      xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
      xhr.onload = () => {
        let body = {}; try { body = JSON.parse(xhr.responseText); } catch { /* ignore */ }
        xhr.status >= 200 && xhr.status < 300 ? resolve(body) : reject(new Error(body.detail || "Upload failed."));
      };
      xhr.send(fd);
    });
  },
};
export const frameUrl = (id, image) => `/jobs/${id}/${image}`;
