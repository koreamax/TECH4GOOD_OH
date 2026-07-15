# server — FastAPI 백엔드

신고 저장 · 위험 지도(신뢰도 점수) · 산책 기록 · Gemini 민원 문안 프록시 · 역지오코딩.

## 실행

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # 키 입력 (없어도 폴백으로 전부 동작)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Swagger: `http://localhost:8000/docs` · 명세: [`../docs/API.md`](../docs/API.md)
- DB: `pawpatrol.db` (SQLite, 자동 생성) · 업로드: `media/` (자동 생성)
- 데모장에서는 맥과 폰을 같은 와이파이에 두고 앱 `src/config.ts` 의 `API_URL` 을 맥 IP로.

## 환경변수 (.env)

| 키 | 없을 때 |
|----|---------|
| `GEMINI_API_KEY` | 민원 문안 템플릿 폴백 (`source: "template"`) |
| `GEMINI_MODEL` | 기본 `gemini-2.5-flash` |
| `KAKAO_REST_API_KEY` | 주소 대신 좌표 문자열 |
