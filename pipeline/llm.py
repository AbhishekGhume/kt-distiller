import os
import re
import json
import base64
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
_client = OpenAI(
    base_url=os.environ["FOUNDRY_ENDPOINT"].rstrip("/") + "/openai/v1/",
    api_key=os.environ["FOUNDRY_KEY"],
)
MODEL = os.environ["MODEL_DEPLOYMENT"]
usage = {"in": 0, "out": 0}


def _call(messages, json_mode, model=None, effort=None):
    kwargs = {"model": model or MODEL, "messages": messages}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    if effort:
        kwargs["reasoning_effort"] = effort
    r = _client.chat.completions.create(**kwargs)
    usage["in"] += r.usage.prompt_tokens
    usage["out"] += r.usage.completion_tokens
    return r.choices[0].message.content


def chat_json(system, user):
    msgs = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    try:
        text = _call(msgs, True)
    except Exception:
        text = _call(msgs, False)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.S)
        return json.loads(m.group(0))

def vision_json(system, text, image_paths, detail="low", model=None):
    effort = os.environ.get("DIAGRAM_EFFORT") if detail == "high" else None
    content = [{"type": "text", "text": text}]
    for p in image_paths:
        with open(p, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        content.append({"type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": detail}})
    msgs = [{"role": "system", "content": system}, {"role": "user", "content": content}]
    try:
        out = _call(msgs, True, model, effort)
    except Exception:
        out = _call(msgs, False, model)
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        return json.loads(re.search(r"\{.*\}", out, re.S).group(0))