import { useEffect, useRef } from 'react';

import MapFallback from '../naver/MapFallback';
import { useNaverMaps } from '../naver/useNaverMaps';
import type { RoutePoint } from '../types';

const ROUTE_BLUE = '#407fff'; // 시안 경로 Blue
const CORAL = '#fd7565';

// 미니 지도의 신고 완료 지점: 라벨 없이 작은 X 점만 (카드에 여러 개가 겹치지 않게)
const REPORTED_DOT = `<div style="width:22px;height:22px;border-radius:50%;background:#fff;border:2px solid ${CORAL};color:${CORAL};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;box-shadow:0 2px 5px rgba(0,0,0,.16);font-family:Pretendard,sans-serif">✕</div>`;

interface Props {
  route: RoutePoint[];
  height?: number;
  /** 신고 완료 지점 마커 (산책 종료 화면 '오늘의 산책 코스') */
  markers?: { lat: number; lng: number }[];
}

/** 카드용 미니 경로 지도 (비인터랙티브, Naver Maps) */
export default function MiniRouteMap({ route, height = 150, markers = [] }: Props) {
  const mapState = useNaverMaps();
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mapState !== 'ready' || !elRef.current || route.length < 2 || !window.naver?.maps) return;
    const n = window.naver.maps;
    const map = new n.Map(elRef.current, {
      center: new n.LatLng(route[0].lat, route[0].lng),
      zoom: 16,
      zoomControl: false,
      scrollWheel: false,
      draggable: false,
      disableDoubleClickZoom: true,
      logoControl: false,
      mapDataControl: false,
      scaleControl: false,
      tileTransition: false,
    });
    const path = route.map((p) => new n.LatLng(p.lat, p.lng));
    new n.Polyline({
      map,
      path,
      strokeColor: ROUTE_BLUE,
      strokeWeight: 4,
      strokeOpacity: 0.95,
      strokeStyle: 'shortdash',
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
    });
    markers.forEach(
      (m) =>
        new n.Marker({
          position: new n.LatLng(m.lat, m.lng),
          map,
          // 작은 X 원의 중심이 실제 신고 좌표와 일치해 점선 동선 위에 놓인다.
          icon: { content: REPORTED_DOT, anchor: new n.Point(11, 11) },
        }),
    );
    const bounds = new n.LatLngBounds(path[0], path[0]);
    path.forEach((ll) => bounds.extend(ll));
    map.fitBounds(bounds);
    return () => map.destroy();
  }, [mapState, route, markers]);

  if (route.length < 2) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f2f5f6',
          fontSize: 32,
        }}
      >
        🐾
      </div>
    );
  }

  if (mapState !== 'ready') return <MapFallback state={mapState} height={height} />;

  return <div ref={elRef} style={{ height, pointerEvents: 'none' }} />;
}
