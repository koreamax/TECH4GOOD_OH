#!/bin/sh
# 인증서(SSL_CERTFILE/SSL_KEYFILE)가 있으면 HTTPS, 없으면 HTTP 로 기동.
# 배포 플랫폼이 TLS 종료를 대신하면 인증서 없이 HTTP 로 두면 된다.
set -e
: "${PORT:=8000}"

if [ -n "$SSL_CERTFILE" ] && [ -n "$SSL_KEYFILE" ] && [ -f "$SSL_CERTFILE" ] && [ -f "$SSL_KEYFILE" ]; then
  echo "[start] HTTPS on :${PORT} (cert: $SSL_CERTFILE)"
  exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT}" \
    --ssl-certfile "$SSL_CERTFILE" --ssl-keyfile "$SSL_KEYFILE"
else
  echo "[start] HTTP on :${PORT} (인증서 없음 — 상위에서 TLS 종료 가정)"
  exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT}"
fi
