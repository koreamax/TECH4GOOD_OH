import os

import httpx

# Naver Cloud(NCP) Reverse Geocoding — 지도와 같은 NCP 인증키 사용
NAVER_URL = "https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc"
KAKAO_URL = "https://dapi.kakao.com/v2/local/geo/coord2address.json"


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
    parts = [
        region.get(k, {}).get("name", "")
        for k in ("area1", "area2", "area3")
    ]
    land = r.get("land") or {}
    road = land.get("name", "")
    number = land.get("number1", "")
    if number and land.get("number2"):
        number = f"{number}-{land['number2']}"
    tail = " ".join(p for p in (road, number) if p)
    address = " ".join(p for p in (*parts, tail) if p)
    return address or None


def _kakao(lat: float, lng: float, key: str) -> str | None:
    resp = httpx.get(
        KAKAO_URL,
        params={"x": lng, "y": lat},
        headers={"Authorization": f"KakaoAK {key}"},
        timeout=5,
    )
    resp.raise_for_status()
    docs = resp.json().get("documents", [])
    if not docs:
        return None
    road = docs[0].get("road_address")
    if road and road.get("address_name"):
        return road["address_name"]
    addr = docs[0].get("address")
    if addr and addr.get("address_name"):
        return addr["address_name"]
    return None


def reverse_geocode(lat: float, lng: float) -> str:
    """좌표 → 주소. Naver(NCP) 우선, Kakao 예비, 둘 다 없거나 실패하면 좌표 문자열."""
    fallback = f"위도 {lat:.5f}, 경도 {lng:.5f} 지점"

    naver_id = os.getenv("NAVER_MAP_CLIENT_ID", "").strip()
    naver_secret = os.getenv("NAVER_MAP_CLIENT_SECRET", "").strip()
    if naver_id and naver_secret:
        try:
            return _naver(lat, lng, naver_id, naver_secret) or fallback
        except Exception:
            pass

    kakao_key = os.getenv("KAKAO_REST_API_KEY", "").strip()
    if kakao_key:
        try:
            return _kakao(lat, lng, kakao_key) or fallback
        except Exception:
            pass

    return fallback
