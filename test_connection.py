import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI(
    base_url=os.environ["FOUNDRY_ENDPOINT"].rstrip("/") + "/openai/v1/",
    api_key=os.environ["FOUNDRY_KEY"],
)
r = client.chat.completions.create(
    model=os.environ["MODEL_DEPLOYMENT"],
    messages=[{"role": "user", "content": "Reply with the single word: ready"}],
)
print(r.choices[0].message.content)