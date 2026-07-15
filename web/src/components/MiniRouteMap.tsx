import { MapContainer, Polyline, TileLayer } from 'react-leaflet';

import { routeBounds } from '../geo';
import type { RoutePoint } from '../types';

const PRIMARY = '#5fc98e';

interface Props {
  route: RoutePoint[];
  height?: number;
}

/** 카드용 미니 경로 지도 (비인터랙티브) */
export default function MiniRouteMap({ route, height = 150 }: Props) {
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
  return (
    <div style={{ height, pointerEvents: 'none' }}>
      <MapContainer
        bounds={routeBounds(route)}
        boundsOptions={{ padding: [24, 24] }}
        style={{ height: '100%' }}
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polyline
          positions={route.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={{ color: PRIMARY, weight: 4, dashArray: '12 8' }}
        />
      </MapContainer>
    </div>
  );
}
