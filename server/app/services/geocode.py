import os

import httpx

KAKAO_URL = "https://dapi.kakao.com/v2/local/geo/coord2address.json"


def reverse_geocode(lat: float, lng: float) -> str:
    """좌표 → 주소. Kakao 키가 없거나 실패하면 좌표 문자열 폴백."""
    key = os.getenv("KAKAO_REST_API_KEY", "").strip()
    fallback = f"위도 {lat:.5f}, 경도 {lng:.5f} 지점"
    if not key:
        return fallback
    try:
        resp = httpx.get(
            KAKAO_URL,
            params={"x": lng, "y": lat},
            headers={"Authorization": f"KakaoAK {key}"},
            timeout=5,
        )
        resp.raise_for_status()
        docs = resp.json().get("documents", [])
        if not docs:
            return fallback
        road = docs[0].get("road_address")
        if road and road.get("address_name"):
            return road["address_name"]
        addr = docs[0].get("address")
        if addr and addr.get("address_name"):
            return addr["address_name"]
        return fallback
    except Exception:
        return fallback
