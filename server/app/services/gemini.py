"""Gemini 민원 문안 생성. 원칙: LLM은 {제목, 내용}만 쓴다.

구조화 필드(유형·주소·시각·좌표·사진)는 코드가 채운다. 키가 없거나 호출이 실패하면
템플릿 문안으로 폴백해 접수 플로우가 절대 막히지 않게 한다.
"""
import json
import os

CLASS_KR = {
    "sidewalk_damaged": "보도(인도) 파손",
    "braille_damaged": "점자블록 파손",
    "sidewalk_normal": "정상 보도",
    "braille_normal": "정상 점자블록",
}

PROMPT = """당신은 시민을 대신해 지자체에 제출할 생활불편 민원 문안을 작성하는 보조자입니다.
첨부된 사진은 반려견 산책 중 AI가 '{class_kr}'(으)로 탐지한 장면입니다 (탐지 신뢰도 {conf}%).
발견 위치: {address}
발견 시각: {detected_at}

작성 규칙:
- 사진에서 실제로 관찰되는 사실만 서술합니다. 추측하거나 과장하지 않습니다.
- 공적이고 정중한 문체로 2~4문장.
- 보행자 안전 관점에서 조치가 필요한 이유를 1문장 포함합니다.
- 제목은 위치와 유형이 드러나게 한 줄로.

JSON으로만 응답: {{"title": "...", "content": "..."}}"""


def _template(class_name: str, address: str, detected_at: str) -> dict:
    kr = CLASS_KR.get(class_name, class_name)
    return {
        "title": f"{address} {kr} 신고",
        "content": (
            f"{detected_at}경 {address}에서 {kr} 상태를 발견하여 신고합니다. "
            "보행자가 걸려 넘어지는 등 안전사고 우려가 있으니 현장 확인과 보수 조치를 요청드립니다. "
            "첨부한 현장 사진을 참고 부탁드립니다."
        ),
    }


def _openai(image_bytes: bytes, prompt: str, key: str) -> dict:
    """OpenAI 호환 폴백 — 팀 키가 sk-* (OpenAI) 형식일 때 사용."""
    import base64

    import httpx

    b64 = base64.b64encode(image_bytes).decode()
    mime = "image/png" if image_bytes[:8].startswith(b"\x89PNG") else "image/jpeg"
    resp = httpx.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {key}"},
        json={
            "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
            "max_tokens": 400,
        },
        timeout=25,
    )
    resp.raise_for_status()
    return json.loads(resp.json()["choices"][0]["message"]["content"])


def generate_complaint(
    image_bytes: bytes,
    class_name: str,
    confidence: float,
    address: str,
    detected_at: str,
) -> tuple[dict, str]:
    """반환: ({title, content}, source) — source는 'gemini' 또는 'template'."""
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key:
        return _template(class_name, address, detected_at), "template"

    # sk-* 는 OpenAI 키 — Gemini SDK 대신 OpenAI 비전 호출로 자동 전환
    if key.startswith("sk-"):
        try:
            prompt = PROMPT.format(
                class_kr=CLASS_KR.get(class_name, class_name),
                conf=round(confidence * 100),
                address=address,
                detected_at=detected_at,
            )
            data = _openai(image_bytes, prompt, key)
            if not data.get("title") or not data.get("content"):
                raise ValueError("empty title/content")
            return {"title": data["title"], "content": data["content"]}, "gemini"
        except Exception:
            return _template(class_name, address, detected_at), "template"

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=key)
        prompt = PROMPT.format(
            class_kr=CLASS_KR.get(class_name, class_name),
            conf=round(confidence * 100),
            address=address,
            detected_at=detected_at,
        )
        resp = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                prompt,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema={
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "content": {"type": "string"},
                    },
                    "required": ["title", "content"],
                },
            ),
        )
        data = json.loads(resp.text)
        if not data.get("title") or not data.get("content"):
            raise ValueError("empty title/content")
        return {"title": data["title"], "content": data["content"]}, "gemini"
    except Exception:
        return _template(class_name, address, detected_at), "template"
