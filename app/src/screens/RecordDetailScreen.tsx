import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { getWalk, mediaUrl } from '../api/client';
import ReportListItem from '../components/ReportListItem';
import type { RootStackParamList } from '../navigation';
import { colors, radius } from '../theme';
import type { WalkDetail } from '../types';
import { formatDistance, formatDurationKr, routeToRegion, todayKr } from '../utils/geo';

type Props = NativeStackScreenProps<RootStackParamList, 'RecordDetail'>;

/** 기록 상세 (S-21) — 경로 + 사진 아카이브 + 신고 내역 */
export default function RecordDetailScreen({ route }: Props) {
  const [walk, setWalk] = useState<WalkDetail | null>(null);

  useEffect(() => {
    getWalk(route.params.walkId)
      .then(setWalk)
      .catch(() => undefined);
  }, [route.params.walkId]);

  if (!walk) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>불러오는 중…</Text>
      </View>
    );
  }

  const photos = [
    ...(walk.dog_photo_url ? [walk.dog_photo_url] : []),
    ...walk.detections.map((d) => d.image_url).filter((u): u is string => !!u),
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={styles.mapCard} pointerEvents="none">
        {walk.route.length > 1 ? (
          <MapView style={styles.map} initialRegion={routeToRegion(walk.route)}>
            <Polyline
              coordinates={walk.route.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
              strokeColor={colors.primary}
              strokeWidth={4}
              lineDashPattern={[12, 8]}
            />
            {walk.detections.map((d) => (
              <Marker key={d.id} coordinate={{ latitude: d.lat, longitude: d.lng }}>
                <Text style={{ fontSize: 20 }}>⚠️</Text>
              </Marker>
            ))}
          </MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text style={{ fontSize: 36 }}>🗺️</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>{todayKr(walk.started_at)} 산책</Text>
        <Text style={styles.sub}>
          {formatDistance(walk.distance_m)} · {formatDurationKr(walk.duration_s)} 소요 · 발견{' '}
          {walk.detection_count}건 · 신고 {walk.report_count}건
        </Text>

        {photos.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>사진 아카이브</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {photos.map((p, i) => (
                <Image key={i} source={{ uri: mediaUrl(p) ?? p }} style={styles.photo} />
              ))}
            </ScrollView>
          </>
        )}

        {walk.reports.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>신고 내역</Text>
            {walk.reports.map((r) => (
              <ReportListItem
                key={r.id}
                report={{
                  ...r,
                  detection: walk.detections.find((d) => d.id === r.detection_id) ?? null,
                }}
              />
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.subtext },
  mapCard: { height: 220, backgroundColor: '#F2F2F2' },
  map: { flex: 1 },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  sub: { fontSize: 13, color: colors.subtext, marginTop: 4 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: radius.card,
    marginRight: 10,
    backgroundColor: '#F2F2F2',
  },
});
