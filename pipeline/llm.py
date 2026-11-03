import os
import re
import json
import base64
import openai
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
_client = OpenAI(
    base_url=os.environ["FOUNDRY_ENDPOINT"].rstrip("/") + "/openai/v1/",
    api_key=os.environ["FOUNDRY_KEY"],
    max_retries=5,
    timeout=300.0,
)
MODEL = os.environ["MODEL_DEPLOYMENT"]
# Optional: low | medium | high. Only used for the diagram (vision, detail="high") calls.
DIAGRAM_EFFORT = os.environ.get("DIAGRAM_EFFORT") or None
usage = {"in": 0, "out": 0}


def _call(messages, json_mode, effort=None):
    kwargs = {"model": MODEL, "messages": messages}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    if effort:
        kwargs["reasoning_effort"] = effort
    r = _client.chat.completions.create(**kwargs)
    if r.usage:
        usage["in"] += r.usage.prompt_tokens
        usage["out"] += r.usage.completion_tokens
    return r.choices[0].message.content or ""


def _ask(messages, effort=None):
    """Try JSON mode with effort, then JSON mode alone, then plain text.

    Only a 400 (bad request) triggers the fallback. A wrong deployment name (404),
    a bad key (401) and similar errors stop immediately with the real message.
    """
    tries = []
    if effort:
        tries.append((True, effort))
    tries += [(True, None), (False, None)]
    last = None
    for json_mode, eff in tries:
        try:
            return _call(messages, json_mode, eff)
        except openai.BadRequestError as e:
            last = e
    raise last


def _parse_json(text):
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.S)
        if not m:
            raise ValueError("The model did not return JSON: " + text[:200])
        return json.loads(m.group(0))


def chat_json(system, user):
    msgs = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    return _parse_json(_ask(msgs))


def vision_json(system, text, image_paths, detail="low"):
    effort = DIAGRAM_EFFORT if detail == "high" else None
    content = [{"type": "text", "text": text}]
    for p in image_paths:
        with open(p, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        content.append({"type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": detail}})
    msgs = [{"role": "system", "content": system}, {"role": "user", "content": content}]
    return _parse_json(_ask(msgs, effort))