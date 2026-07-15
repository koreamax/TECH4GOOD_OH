import os

import httpx

# Naver Cloud(NCP) Reverse Geocoding — 웹 지도와 같은 NCP Application 인증키 사용
NAVER_URL = "https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc"


def _naver(lat: float, lng: float, client_id: str, secret: str) -> str | None:
    resp = httpx.get(
        NAVER_URL,
        params={"coords": f"{lng},{lat}", "output": "json", "orders": "roadaddr,addr"},
        headers={
            "x-ncp-apigw-api-key-id": client_id,
            "x-ncp-apigw-api-key": secret,
        },
        timeout=5,
    )
    resp.raise_for_status()
    results = resp.json().get("results", [])
    if not results:
        return None
    r = results[0]
    region = r.get("region", {})
    parts = [region.get(k, {}).get("name", "") for k in ("area1", "area2", "area3")]
    land = r.get("land") or {}
    road = land.get("name", "")
    number = land.get("number1", "")
    if number and land.get("number2"):
        number = f"{number}-{land['number2']}"
    tail = " ".join(p for p in (road, number) if p)
    address = " ".join(p for p in (*parts, tail) if p)
    return address or None


def reverse_geocode(lat: float, lng: float) -> str:
    """좌표 → 주소 (Naver). 키가 없거나 실패하면 좌표 문자열 폴백."""
    fallback = f"위도 {lat:.5f}, 경도 {lng:.5f} 지점"
    client_id = os.getenv("NAVER_MAP_CLIENT_ID", "").strip()
    secret = os.getenv("NAVER_MAP_CLIENT_SECRET", "").strip()
    if not client_id or not secret:
        return fallback
    try:
        return _naver(lat, lng, client_id, secret) or fallback
    except Exception:
        return fallback
