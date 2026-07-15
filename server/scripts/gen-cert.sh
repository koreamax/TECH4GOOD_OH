#!/bin/sh
# 자체 서명(self-signed) 인증서 생성 — 로컬/IP HTTPS 테스트용.
# 사용: sh scripts/gen-cert.sh [CN]   (기본 CN=localhost)
# 웹 카메라 대체 영상 업로드는 HTTPS 백엔드로 전송되므로, 배포 전 HTTPS 확인에 사용.
#
# -subj 대신 설정 파일을 써서 Git Bash/MSYS 의 경로 변환 문제를 피한다(리눅스에서도 동일 동작).
set -e
CN="${1:-localhost}"
DIR="$(cd "$(dirname "$0")/.." && pwd)/certs"
mkdir -p "$DIR"
CONF="$DIR/openssl.cnf"

cat > "$CONF" <<EOF
[req]
distinguished_name = dn
x509_extensions = v3_ext
prompt = no
[dn]
CN = $CN
[v3_ext]
subjectAltName = @alt
basicConstraints = critical,CA:false
[alt]
DNS.1 = localhost
DNS.2 = $CN
IP.1 = 127.0.0.1
EOF

openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout "$DIR/key.pem" -out "$DIR/cert.pem" \
  -days 365 -config "$CONF"
rm -f "$CONF"

echo "생성 완료: $DIR/cert.pem, $DIR/key.pem (CN=$CN)"
echo "브라우저는 자체 서명 인증서에 1회 경고를 표시합니다(정상)."
