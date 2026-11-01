import re
import json
import subprocess
from pathlib import Path
from dotenv import load_dotenv
import imageio_ffmpeg

load_dotenv()
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def job_dir(video_path):
    d = Path("work") / Path(video_path).stem
    d.mkdir(parents=True, exist_ok=True)
    return d


def video_duration_seconds(path):
    p = subprocess.run([FFMPEG, "-i", str(path)], capture_output=True,
                       text=True, encoding="utf-8", errors="ignore")
    m = re.search(r"Duration: (\d+):(\d+):(\d+(?:\.\d+)?)", p.stderr)
    h, mi, s = m.groups()
    return int(h) * 3600 + int(mi) * 60 + float(s)


def save_json(path, data):
    Path(path).write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def load_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))