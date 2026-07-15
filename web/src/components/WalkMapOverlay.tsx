import { useEffect, useRef } from 'react';

import { SEOUL } from '../geo';
import MapFallback from '../naver/MapFallback';
import { useNaverMaps } from '../naver/useNaverMaps';
import type { RoutePoint, SessionDetection } from '../types';

const ROUTE_BLUE = '#407fff'; // 시안 Blue
const CORAL = '#fd7565'; // 시안 Red

// 시안 원본 에셋: 그린 핀 벡터 + 강아지 사진 (public/assets)
const DOG_ICON = `<div style="position:relative;width:64px;height:78px;filter:drop-shadow(0 4px 8px rgba(0,0,0,.25))">
  <img src="/assets/pin-vector.svg" style="position:absolute;inset:0;width:100%;height:100%"/>
  <div style="position:absolute;left:50%;top:8px;transform:translateX(-50%);width:46px;height:46px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden">
    <img src="/assets/dog-photo.png" style="width:42px;height:42px;border-radius:50%;object-fit:cover"/>
  </div>
</div>`;
const START_ICON = `<img src="/assets/start-dot.svg" style="width:28px;height:28px;display:block"/>`;
const WARN_ICON = `<div style="font-size:24px">⚠️</div>`;
// 신고 완료 지점: 코랄 라벨 + X 마커 (시안 '신고 완료 후 표시')
const REPORTED_ICON = `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;white-space:nowrap;font-family:Pretendard,sans-serif">
  <span style="background:${CORAL};color:#fff;font-size:11px;font-weight:600;padding:4px 10px;border-radius:999px;box-shadow:0 2px 6px rgba(0,0,0,.2)">보행 장애물 신고 완료</span>
  <span style="width:26px;height:26px;border-radius:50%;background:#fff;border:2px solid ${CORAL};color:${CORAL};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,.2)">✕</span>
</div>`;

interface Props {
  route: RoutePoint[];
  detections: SessionDetection[];
}

/** 산책 중 지도 뷰 (Naver Maps) — 경로 폴리라인 + 현재 위치(강아지) + 위험 마커 */
export default function WalkMapOverlay({ route, detections }: Props) {
  const mapState = useNaverMaps();
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const polylineRef = useRef<naver.maps.Polyline | null>(null);
  const dogRef = useRef<naver.maps.Marker | null>(null);
  const startRef = useRef<naver.maps.Marker | null>(null);
  const warnRef = useRef<naver.maps.Marker[]>([]);

  // 지도 1회 초기화
  useEffect(() => {
    if (mapState !== 'ready' || !elRef.current || mapRef.current || !window.naver?.maps) return;
    const n = window.naver.maps;
    const first = route[0];
    mapRef.current = new n.Map(elRef.current, {
      center: new n.LatLng(first?.lat ?? SEOUL[0], first?.lng ?? SEOUL[1]),
      zoom: 17,
      zoomControl: false,
      logoControl: false,
      mapDataControl: false,
      scaleControl: false,
    });
    return () => {
      mapRef.current?.destroy();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapState]);

  // 경로/위치/마커 갱신
  useEffect(() => {
    const map = mapRef.current;
    if (mapState !== 'ready' || !map || !window.naver?.maps) return;
    const n = window.naver.maps;
    const path = route.map((p) => new n.LatLng(p.lat, p.lng));

    if (path.length > 1) {
      if (!polylineRef.current) {
        polylineRef.current = new n.Polyline({
          map,
          path,
          strokeColor: ROUTE_BLUE, // 시안: 파란 점선 경로
          strokeWeight: 4,
          strokeOpacity: 0.95,
          strokeStyle: 'shortdash',
          strokeLineCap: 'round',
          strokeLineJoin: 'round',
        });
      } else {
        polylineRef.current.setPath(path);
      }
    }

    if (path.length > 0) {
      const start = path[0];
      if (!startRef.current) {
        startRef.current = new n.Marker({
          position: start,
          map,
          icon: { content: START_ICON, anchor: new n.Point(14, 14) },
        });
      }
      const last = path[path.length - 1];
      if (!dogRef.current) {
        dogRef.current = new n.Marker({
          position: last,
          map,
          icon: { content: DOG_ICON, anchor: new n.Point(32, 74) },
          zIndex: 100,
        });
      } else {
        dogRef.current.setPosition(last);
      }
      map.setCenter(last);
    }

    // 위험 마커 재구성 (rejected 제외, 신고 완료는 시안 코랄 라벨 마커)
    warnRef.current.forEach((m) => m.setMap(null));
    warnRef.current = detections
      .filter((dn) => dn.status !== 'rejected')
      .map((dn) =>
        dn.status === 'reported'
          ? new n.Marker({
              position: new n.LatLng(dn.lat, dn.lng),
              map,
              icon: { content: REPORTED_ICON, anchor: new n.Point(60, 48) },
              zIndex: 50,
            })
          : new n.Marker({
              position: new n.LatLng(dn.lat, dn.lng),
              map,
              icon: { content: WARN_ICON, anchor: new n.Point(12, 12) },
            }),
      );
  }, [mapState, route, detections]);

  if (mapState !== 'ready') return <MapFallback state={mapState} />;
  return <div ref={elRef} style={{ height: '100%' }} />;
}
