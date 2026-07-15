FROM python:3.11-slim

WORKDIR /srv

# libgl 등 ultralytics(opencv) 런타임 의존성
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-ml.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir -r requirements-ml.txt

COPY app ./app
COPY models ./models

# 배포 환경변수 (플랫폼 대시보드에서 주입):
#   DATABASE_URL  — Supabase PostgreSQL URI
#   MODEL_PATH    — 예: /srv/models/best.pt
#   GEMINI_API_KEY, KAKAO_REST_API_KEY
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
