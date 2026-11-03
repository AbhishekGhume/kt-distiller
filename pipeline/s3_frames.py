import sys
import subprocess
from pipeline.common import FFMPEG, job_dir
from pipeline.timeutil import mmss

STEP = 4  # seconds between frames; s4_candidates.py uses the same value


def sample_frames(video, fdir):
    fdir.mkdir(exist_ok=True)
    if not any(fdir.glob("f_*.jpg")):
        subprocess.run([FFMPEG, "-y", "-i", str(video), "-vf", f"fps=1/{STEP},scale=1280:-2",
                        "-q:v", "3", str(fdir / "f_%05d.jpg")], check=True, capture_output=True)
    return sorted(fdir.glob("f_*.jpg"))


def main(video):
    jd = job_dir(video)
    files = sample_frames(video, jd / "frames_all")
    print(f"{len(files)} frames (one every {STEP} s, up to {mmss(len(files) * STEP)}) "
          f"in {jd / 'frames_all'}")
    print("No model calls in this step. Next: python -m pipeline.s4_candidates <video>")


if __name__ == "__main__":
    main(sys.argv[1])