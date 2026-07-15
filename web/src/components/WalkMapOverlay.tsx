import { useEffect, useRef } from 'react';

import { SEOUL } from '../geo';
import MapFallback from '../naver/MapFallback';
import { useNaverMaps } from '../naver/useNaverMaps';
import type { RoutePoint, SessionDetection } from '../types';

const PRIMARY = '#5fc98e';

const DOG_ICON = `<div style="width:44px;height:44px;border-radius:50%;background:${PRIMARY};border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 4px 12px rgba(0,0,0,.2)">🐶</div>`;
const WARN_ICON = `<div style="font-size:24px">⚠️</div>`;

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
  const startRef = useRef<naver.maps.Circle | null>(null);
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
          strokeColor: PRIMARY,
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
        startRef.current = new n.Circle({
          map,
          center: start,
          radius: 6,
          strokeColor: '#fff',
          strokeWeight: 3,
          fillColor: PRIMARY,
          fillOpacity: 1,
        });
      }
      const last = path[path.length - 1];
      if (!dogRef.current) {
        dogRef.current = new n.Marker({
          position: last,
          map,
          icon: { content: DOG_ICON, anchor: new n.Point(22, 22) },
          zIndex: 100,
        });
      } else {
        dogRef.current.setPosition(last);
      }
      map.setCenter(last);
    }

    // 위험 마커 재구성 (rejected 제외)
    warnRef.current.forEach((m) => m.setMap(null));
    warnRef.current = detections
      .filter((dn) => dn.status !== 'rejected')
      .map(
        (dn) =>
          new n.Marker({
            position: new n.LatLng(dn.lat, dn.lng),
            map,
            icon: { content: WARN_ICON, anchor: new n.Point(12, 12) },
          }),
      );
  }, [mapState, route, detections]);

  if (mapState !== 'ready') return <MapFallback state={mapState} />;
  return <div ref={elRef} style={{ height: '100%' }} />;
}
