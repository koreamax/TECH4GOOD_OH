import L from 'leaflet';
import { useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

import { getMarkers } from '../api';
import { CLASS_KR } from '../config';
import { SEOUL } from '../geo';
import type { MapMarkerData } from '../types';

const LEVEL_COLORS: Record<MapMarkerData['level'], string> = {
  gray: '#9E9E9E',
  yellow: '#FFC24B',
  orange: '#FF9142',
  red: '#FF4D4D',
};

function clusterIcon(m: MapMarkerData) {
  return L.divIcon({
    className: '',
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${LEVEL_COLORS[m.level]};border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.25)">${m.detection_count}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

/** 산책 지도 탭 (S-02) — 동네 위험 마커 (신뢰도 점수별 색상) */
export default function MapPage() {
  const [markers, setMarkers] = useState<MapMarkerData[]>([]);

  useEffect(() => {
    getMarkers().then(setMarkers).catch(() => undefined);
  }, []);

  const center: [number, number] = markers.length > 0 ? [markers[0].lat, markers[0].lng] : SEOUL;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <MapContainer center={center} zoom={15} style={{ height: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        />
        {markers.map((m) => (
          <Marker key={m.cluster_id} position={[m.lat, m.lng]} icon={clusterIcon(m)}>
            <Popup>
              <b>{CLASS_KR[m.class_name] ?? m.class_name}</b>
              <br />
              신뢰도 점수 {m.score} · 관측 {m.detection_count}회 · 승인 {m.confirmed_count}회
              <br />
              <small>최근 관측 {m.last_seen.slice(0, 10)}</small>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div
        className="card"
        style={{ position: 'absolute', top: 14, left: 16, right: 16, zIndex: 500, padding: 12 }}
      >
        <b style={{ fontSize: 14 }}>우리 동네 위험 지도</b>
        <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
          {(
            [
              ['yellow', '관측됨'],
              ['orange', '검증됨'],
              ['red', '반복 확인'],
            ] as const
          ).map(([level, label]) => (
            <span key={level} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--subtext)' }}>
              <span
                style={{ width: 10, height: 10, borderRadius: 5, background: LEVEL_COLORS[level] }}
              />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
