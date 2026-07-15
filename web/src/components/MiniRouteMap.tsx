import { useEffect, useRef } from 'react';

import MapFallback from '../naver/MapFallback';
import { useNaverMaps } from '../naver/useNaverMaps';
import type { RoutePoint } from '../types';

const ROUTE_BLUE = '#407fff'; // 시안 경로 Blue
const CORAL = '#fd7565';

// 시안(113:663) 신고 완료 마커: 코랄 라벨 + 코랄 링 안 흰 원 + 에러 아이콘
const REPORTED_ICON = `<div style="display:flex;flex-direction:column;align-items:center;gap:5px;white-space:nowrap;font-family:Pretendard,sans-serif">
  <span style="background:${CORAL};color:#fff;font-size:11px;font-weight:500;letter-spacing:-0.22px;padding:4px 6px;border-radius:6px">보행 장애물 신고 완료</span>
  <span style="width:33px;height:33px;border-radius:50%;background:${CORAL};display:flex;align-items:center;justify-content:center">
    <span style="width:27px;height:27px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center">
      <img src="/assets/icon-error-circle.svg" style="width:27px;height:27px"/>
    </span>
  </span>
</div>`;

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
          icon: { content: REPORTED_ICON, anchor: new n.Point(60, 55) },
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
