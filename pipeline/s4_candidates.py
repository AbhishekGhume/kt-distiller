import sys
import shutil
import numpy as np
from PIL import Image
from pipeline.common import job_dir, load_json, save_json
from pipeline.timeutil import mmss

STEP = 4
DIFF_MIN = 0.01


def load_gray(path):
    return np.asarray(Image.open(path).convert("L").resize((640, 360)), dtype=np.int16)


def ink_of(g):
    bg = np.median(g)
    return float((np.abs(g - bg) > 40).mean())


def smooth(vals):
    out = []
    for i in range(len(vals)):
        w = vals[max(0, i - 1):i + 2]
        out.append(sorted(w)[len(w) // 2])
    return out


def main(video):
    jd = job_dir(video)
    files = sorted((jd / "frames_all").glob("f_*.jpg"))
    grays = [load_gray(f) for f in files]
    ink = smooth([ink_of(g) for g in grays])

    print("Ink level (share of board covered) about every minute:")
    for i in range(0, len(ink), 15):
        print(f"  {mmss(i * STEP)}  {ink[i]:.3f}")

    cands = {}

    def add(idx, why):
        idx = max(0, min(idx, len(files) - 1))
        cands.setdefault(idx, []).append(why)

    seg_start, run_max, run_idx = 0, 0.0, 0
    for i, v in enumerate(ink):
        if v >= run_max:
            run_max, run_idx = v, i
        if run_max > 0.02 and v < 0.6 * run_max:
            add(run_idx, "peak before board cleared")
            seg_start, run_max, run_idx = i, v, i
    add(run_idx, "final board state")

    summary = load_json(jd / "summary.json")
    for c in summary["chapters"]:
        if c.get("importance") != "skippable":
            add(int((c["end"] - STEP) / STEP), "end of chapter: " + c["title"])

    kept = []
    for idx in sorted(cands):
        if kept and (np.abs(grays[idx] - grays[kept[-1]]) > 40).mean() < DIFF_MIN:
            cands[kept[-1]].extend(cands[idx])
            continue
        kept.append(idx)

    out_dir = jd / "candidates"
    shutil.rmtree(out_dir, ignore_errors=True)
    out_dir.mkdir()
    result = []
    for n, idx in enumerate(kept, start=1):
        t = idx * STEP
        name = out_dir / f"c{n:02d}_{mmss(t).replace(':', '-')}.jpg"
        shutil.copy(files[idx], name)
        result.append({"n": n, "t": t, "file": str(name),
                       "ink": round(ink[idx], 3), "why": cands[idx]})
    save_json(jd / "candidates.json", result)

    print(f"\n{len(result)} candidate snapshots saved to {out_dir}")
    for r in result:
        print(f"  c{r['n']:02d}  {mmss(r['t'])}  ink={r['ink']}  {r['why'][0]}")


if __name__ == "__main__":
    main(sys.argv[1])