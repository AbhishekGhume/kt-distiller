def mmss(sec):
    sec = int(sec)
    h, rem = divmod(sec, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


def parse_ts(v):
    if isinstance(v, (int, float)):
        return float(v)
    total = 0.0
    for part in str(v).strip().strip("[]").split(":"):
        total = total * 60 + float(part)
    return total