import { useEffect, useRef } from 'react';

import MapFallback from '../naver/MapFallback';
import { useNaverMaps } from '../naver/useNaverMaps';
import type { RoutePoint } from '../types';

const PRIMARY = '#407fff'; // 시안 경로 Blue

interface Props {
  route: RoutePoint[];
  height?: number;
}

/** 카드용 미니 경로 지도 (비인터랙티브, Naver Maps) */
export default function MiniRouteMap({ route, height = 150 }: Props) {
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
      strokeColor: PRIMARY,
      strokeWeight: 4,
      strokeOpacity: 0.95,
      strokeStyle: 'shortdash',
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
    });
    const bounds = new n.LatLngBounds(path[0], path[0]);
    path.forEach((ll) => bounds.extend(ll));
    map.fitBounds(bounds);
    return () => map.destroy();
  }, [mapState, route]);

  if (route.length < 2) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f2f2f2',
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
