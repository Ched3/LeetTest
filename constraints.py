import os
from openai import OpenAI
import json

MODEL_NAME = "grok-beta"
XAI_API_KEY = os.getenv("XAI_API_KEY")

client = OpenAI(
    api_key=XAI_API_KEY,
    base_url="https://api.x.ai/v1",
)

messages = [
    {"role": "system", "content": "You are a helpful webpage navigation assistant. Use the supplied tools to assist the user."},
    {"role": "user", "content": "Hi, can you go to the career page of xAI website?"}
]

response = client.chat.completions.create(
    model=MODEL_NAME,
    messages=messages,
    tools=tools,
)