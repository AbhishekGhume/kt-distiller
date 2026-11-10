"""Run from the repo root:  uvicorn api.main:app --port 8000   then open http://localhost:8000"""
import re
import uuid
import shutil
import threading
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from pipeline.common import load_json

WORK, SAMPLES, WEB = Path("work"), Path("samples"), Path("web")
ID_RE = re.compile(r"^[A-Za-z0-9_\-]{1,64}$")
app = FastAPI(title="KT Distiller")


def jdir(job_id):
    if not ID_RE.match(job_id) or not (WORK / job_id).is_dir():
        raise HTTPException(404, "Unknown job")
    return WORK / job_id


@app.get("/")
def home():
    return FileResponse(WEB / "index.html")


@app.get("/jobs")
def list_jobs():
    out = []
    if WORK.exists():
        for d in sorted(WORK.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
            if (d / "study_pack.json").exists() or (d / "status.json").exists():
                st = load_json(d / "status.json") if (d / "status.json").exists() else {"state": "done"}
                out.append({"id": d.name, "state": st["state"]})
    return out


@app.post("/jobs")
def create_job(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".mp4"):
        raise HTTPException(400, "Please upload an .mp4 file")
    job_id = "kt" + uuid.uuid4().hex[:8]
    SAMPLES.mkdir(exist_ok=True)
    video = SAMPLES / f"{job_id}.mp4"
    with open(video, "wb") as f:
        shutil.copyfileobj(file.file, f)
    from pipeline.run_all import run  # imported late so the API starts fast
    (WORK / job_id).mkdir(parents=True, exist_ok=True)
    threading.Thread(target=run, args=(str(video),), daemon=True).start()
    return {"jobId": job_id}


@app.get("/jobs/{job_id}")
def status(job_id: str):
    jd = jdir(job_id)
    p = jd / "status.json"
    if p.exists():
        return load_json(p)
    return {"state": "done" if (jd / "study_pack.json").exists() else "running", "stage": 0, "stages": [], "error": ""}


@app.get("/jobs/{job_id}/pack")
def pack(job_id: str):
    p = jdir(job_id) / "study_pack.json"
    if not p.exists():
        raise HTTPException(404, "Study pack not ready")
    return JSONResponse(load_json(p))


@app.get("/jobs/{job_id}/pack.html")
def pack_html(job_id: str):
    p = jdir(job_id) / "study_pack.html"
    if not p.exists():
        raise HTTPException(404, "Study pack not ready")
    return FileResponse(p, media_type="text/html")


@app.get("/jobs/{job_id}/candidates/{name}")
def frame(job_id: str, name: str):
    if not re.match(r"^[A-Za-z0-9_\-.]+$", name):
        raise HTTPException(404)
    p = jdir(job_id) / "candidates" / name
    if not p.exists():
        raise HTTPException(404)
    return FileResponse(p)


class Ask(BaseModel):
    question: str


@app.post("/jobs/{job_id}/ask")
def ask(job_id: str, body: Ask):
    jd = jdir(job_id)
    if not body.question.strip():
        raise HTTPException(400, "Empty question")
    from pipeline.s8_ask import ask as ask_kt
    try:
        return ask_kt(jd, body.question)
    except Exception as e:
        raise HTTPException(500, f"Ask failed: {e}")