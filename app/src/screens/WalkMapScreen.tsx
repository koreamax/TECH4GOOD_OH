import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getMarkers } from '../api/client';
import { CLASS_KR } from '../config';
import { colors, radius, shadow } from '../theme';
import type { MapMarkerData } from '../types';

const LEVEL_COLORS: Record<MapMarkerData['level'], string> = {
  gray: '#9E9E9E',
  yellow: '#FFC24B',
  orange: '#FF9142',
  red: '#FF4D4D',
};

const SEOUL = { latitude: 37.5665, longitude: 126.978, latitudeDelta: 0.05, longitudeDelta: 0.05 };

/** 산책 지도 탭 — 동네 위험 마커 (신뢰도 점수별 색상) */
export default function WalkMapScreen() {
  const insets = useSafeAreaInsets();
  const [markers, setMarkers] = useState<MapMarkerData[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getMarkers()
        .then((m) => alive && setMarkers(m))
        .catch(() => undefined);
      return () => {
        alive = false;
      };
    }, []),
  );

  const initialRegion =
    markers.length > 0
      ? { latitude: markers[0].lat, longitude: markers[0].lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }
      : SEOUL;

  return (
    <View style={styles.container}>
      <MapView style={StyleSheet.absoluteFill} initialRegion={initialRegion} showsUserLocation>
        {markers.map((m) => (
          <Marker key={m.cluster_id} coordinate={{ latitude: m.lat, longitude: m.lng }}>
            <View style={[styles.marker, { backgroundColor: LEVEL_COLORS[m.level] }]}>
              <Text style={styles.markerText}>{m.detection_count}</Text>
            </View>
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{CLASS_KR[m.class_name] ?? m.class_name}</Text>
                <Text style={styles.calloutSub}>
                  신뢰도 점수 {m.score} · 관측 {m.detection_count}회 · 승인 {m.confirmed_count}회
                </Text>
                <Text style={styles.calloutDate}>최근 관측 {m.last_seen.slice(0, 10)}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View style={[styles.legend, { top: insets.top + 10 }]}>
        <Text style={styles.legendTitle}>우리 동네 위험 지도</Text>
        <View style={styles.legendRow}>
          {(['yellow', 'orange', 'red'] as const).map((level) => (
            <View key={level} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: LEVEL_COLORS[level] }]} />
              <Text style={styles.legendLabel}>
                {level === 'yellow' ? '관측됨' : level === 'orange' ? '검증됨' : '반복 확인'}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  marker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    ...shadow.card,
  },
  markerText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  callout: { width: 190, padding: 4 },
  calloutTitle: { fontWeight: '800', fontSize: 14, color: colors.text },
  calloutSub: { fontSize: 12, color: colors.subtext, marginTop: 3 },
  calloutDate: { fontSize: 11, color: colors.subtext, marginTop: 2 },
  legend: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: radius.card,
    padding: 12,
    ...shadow.card,
  },
  legendTitle: { fontWeight: '800', fontSize: 14, color: colors.text, marginBottom: 6 },
  legendRow: { flexDirection: 'row', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, color: colors.subtext },
});
