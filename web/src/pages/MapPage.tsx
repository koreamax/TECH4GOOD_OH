import { useEffect, useRef, useState } from 'react';

import { getMarkers } from '../api';
import { CLASS_KR } from '../config';
import { SEOUL } from '../geo';
import MapFallback from '../naver/MapFallback';
import { useNaverMaps } from '../naver/useNaverMaps';
import type { MapMarkerData } from '../types';

const LEVEL_COLORS: Record<MapMarkerData['level'], string> = {
  gray: '#9E9E9E',
  yellow: '#FFC24B',
  orange: '#FF9142',
  red: '#FF4D4D',
};

function markerContent(m: MapMarkerData): string {
  return `<div style="width:30px;height:30px;border-radius:50%;background:${LEVEL_COLORS[m.level]};border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.25)">${m.detection_count}</div>`;
}

/** 산책 지도 탭 (S-02) — 동네 위험 마커 (신뢰도 점수별 색상), Naver Maps */
export default function MapPage() {
  const mapState = useNaverMaps();
  const elRef = useRef<HTMLDivElement>(null);
  const [markers, setMarkers] = useState<MapMarkerData[]>([]);

  useEffect(() => {
    getMarkers().then(setMarkers).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (mapState !== 'ready' || !elRef.current || !window.naver?.maps) return;
    const n = window.naver.maps;
    const center = markers.length > 0 ? [markers[0].lat, markers[0].lng] : SEOUL;
    const map = new n.Map(elRef.current, {
      center: new n.LatLng(center[0], center[1]),
      zoom: 15,
      logoControl: false,
      mapDataControl: false,
      scaleControl: false,
    });

    const info = new n.InfoWindow({ content: '', borderWidth: 0, disableAnchor: true });
    const objs: naver.maps.Marker[] = [];
    markers.forEach((m) => {
      const marker = new n.Marker({
        position: new n.LatLng(m.lat, m.lng),
        map,
        icon: { content: markerContent(m), anchor: new n.Point(15, 15) },
      });
      n.Event.addListener(marker, 'click', () => {
        info.setContent(
          `<div style="padding:10px 12px;font-size:12px;line-height:1.5;min-width:150px">
             <b>${CLASS_KR[m.class_name] ?? m.class_name}</b><br/>
             신뢰도 점수 ${m.score} · 관측 ${m.detection_count}회 · 승인 ${m.confirmed_count}회<br/>
             <span style="color:#888">최근 관측 ${m.last_seen.slice(0, 10)}</span>
           </div>`,
        );
        info.open(map, marker);
      });
      objs.push(marker);
    });

    return () => {
      objs.forEach((o) => o.setMap(null));
      map.destroy();
    };
  }, [mapState, markers]);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {mapState === 'ready' ? (
        <div ref={elRef} style={{ height: '100%' }} />
      ) : (
        <MapFallback state={mapState} />
      )}

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
