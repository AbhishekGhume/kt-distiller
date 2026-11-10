"""Run every stage for one video and write work/<job>/status.json after each step.

CLI:  python -m pipeline.run_all samples/myvideo.mp4
"""
import sys
import traceback
import importlib
from pipeline.common import job_dir, save_json

STAGES = [
    ("Transcribing audio", "s1_transcribe"),
    ("Summarising and chaptering", "s2_summarize"),
    ("Extracting frames", "s3_frames"),
    ("Finding whiteboard candidates", "s4_candidates"),
    ("Reading diagrams", "s5_diagrams"),
    ("Building study pack", "s6_curate"),
    ("Writing quiz", "s7_quiz"),
    ("Indexing for Ask-the-KT", "s8_ask"),
]


def run(video):
    jd = job_dir(video)
    names = [n for n, _ in STAGES]
    status = {"state": "running", "stage": 0, "stages": names, "error": ""}
    save_json(jd / "status.json", status)
    try:
        for i, (_, mod) in enumerate(STAGES):
            status["stage"] = i
            save_json(jd / "status.json", status)
            m = importlib.import_module(f"pipeline.{mod}")
            if mod == "s8_ask":
                m.build_index(jd)
            else:
                m.main(video)
        status.update(state="done", stage=len(STAGES))
    except BaseException as e:  # stages call sys.exit() on problems, so catch SystemExit too
        traceback.print_exc()
        status.update(state="error", error=str(e) or e.__class__.__name__)
    save_json(jd / "status.json", status)


if __name__ == "__main__":
    run(sys.argv[1])