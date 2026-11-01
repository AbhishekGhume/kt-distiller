import os
import sys
import json
import subprocess
import requests
from pathlib import Path
from pipeline.common import FFMPEG, job_dir, video_duration_seconds, save_json, load_json

CHUNK_SECONDS = 20 * 60


def extract_audio_chunks(video, out_dir):
    out_dir.mkdir(exist_ok=True)
    total = video_duration_seconds(video)
    chunks, start, i = [], 0, 0
    while start < total:
        out = out_dir / f"chunk_{i:03d}.mp3"
        if not out.exists():
            subprocess.run(
                [FFMPEG, "-y", "-ss", str(start), "-t", str(CHUNK_SECONDS),
                 "-i", str(video), "-vn", "-ac", "1", "-ar", "16000",
                 "-b:a", "48k", str(out)],
                check=True, capture_output=True)
        chunks.append((out, start))
        start += CHUNK_SECONDS
        i += 1
    return chunks


def transcribe_chunk(audio_path):
    cache = audio_path.with_suffix(".json")
    if cache.exists():
        return load_json(cache)
    region = os.environ["SPEECH_REGION"]
    url = f"https://{region}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe"
    definition = {"locales": ["en-US"]}
    with open(audio_path, "rb") as f:
        r = requests.post(
            url,
            params={"api-version": "2024-11-15"},
            headers={"Ocp-Apim-Subscription-Key": os.environ["SPEECH_KEY"]},
            files={
                "audio": (audio_path.name, f, "audio/mpeg"),
                "definition": (None, json.dumps(definition), "application/json"),
            },
            timeout=900,
        )
    if r.status_code != 200:
        print("Speech error", r.status_code, r.text[:500])
        r.raise_for_status()
    data = r.json()
    save_json(cache, data)
    return data


def main(video):
    jd = job_dir(video)
    chunks = extract_audio_chunks(video, jd / "audio")
    print(f"Audio chunks: {len(chunks)}")
    segments = []
    for path, offset in chunks:
        print("Transcribing", path.name)
        data = transcribe_chunk(path)
        for p in data.get("phrases", []):
            s = offset + p["offsetMilliseconds"] / 1000
            e = s + p["durationMilliseconds"] / 1000
            segments.append({"start": round(s, 1), "end": round(e, 1), "text": p["text"]})
    save_json(jd / "transcript.json", segments)
    print(f"Saved {len(segments)} segments to {jd / 'transcript.json'}")
    for seg in segments[:5]:
        print(seg)
    print("...")
    for seg in segments[-3:]:
        print(seg)


if __name__ == "__main__":
    main(sys.argv[1])