import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { postWalk } from '../api/client';
import PrimaryButton from '../components/PrimaryButton';
import { DOG_NAME, USER_NAME } from '../config';
import type { RootStackParamList } from '../navigation';
import { useWalkStore } from '../store/walkStore';
import { colors, radius, shadow } from '../theme';
import { formatDistance, formatDurationKr, routeToRegion } from '../utils/geo';

type Props = NativeStackScreenProps<RootStackParamList, 'WalkSummary'>;

export default function WalkSummaryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { route, distanceM, detections, startedAt, endedAt } = useWalkStore();
  const [dogPhoto, setDogPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const durationS =
    startedAt && endedAt
      ? Math.max(0, (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000)
      : 0;
  const reportedCount = detections.filter((d) => d.status === 'reported').length;

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setDogPhoto(result.assets[0].uri);
  };

  const leave = () => {
    useWalkStore.getState().reset();
    navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
  };

  const save = async () => {
    setSaving(true);
    try {
      await postWalk({
        route,
        startedAt: startedAt ?? new Date().toISOString(),
        endedAt: endedAt ?? new Date().toISOString(),
        distanceM: Math.round(distanceM),
        durationS: Math.round(durationS),
        detectionIds: detections
          .map((d) => d.serverId)
          .filter((id): id is number => id != null),
        userName: USER_NAME,
        dogPhotoUri: dogPhoto,
      });
      leave();
    } catch (e) {
      Alert.alert(
        '저장 실패',
        `서버에 연결할 수 없어요. config.ts 의 API_URL 을 확인해주세요.\n${
          e instanceof Error ? e.message : ''
        }`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
    >
      <Text style={styles.title}>산책 완료! 🐾</Text>
      <Text style={styles.subtitle}>{DOG_NAME}와 함께한 오늘의 순찰 기록이에요</Text>

      <View style={styles.mapCard} pointerEvents="none">
        {route.length > 1 ? (
          <MapView style={styles.map} initialRegion={routeToRegion(route)}>
            <Polyline
              coordinates={route.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
              strokeColor={colors.primary}
              strokeWidth={4}
              lineDashPattern={[12, 8]}
            />
          </MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text style={{ fontSize: 40 }}>🗺️</Text>
          </View>
        )}
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatDistance(distanceM)}</Text>
          <Text style={styles.statLabel}>거리</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatDurationKr(durationS)}</Text>
          <Text style={styles.statLabel}>시간</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{detections.length}</Text>
          <Text style={styles.statLabel}>발견</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, reportedCount > 0 && { color: colors.accent }]}>
            {reportedCount}
          </Text>
          <Text style={styles.statLabel}>신고</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.photoCard} activeOpacity={0.8} onPress={pickPhoto}>
        {dogPhoto ? (
          <Image source={{ uri: dogPhoto }} style={styles.photo} />
        ) : (
          <View style={styles.photoEmpty}>
            <Text style={{ fontSize: 26 }}>📷</Text>
            <Text style={styles.photoEmptyText}>오늘의 {DOG_NAME} 사진 남기기</Text>
          </View>
        )}
      </TouchableOpacity>

      <PrimaryButton label="기록 저장하기" onPress={save} loading={saving} />
      <TouchableOpacity onPress={leave}>
        <Text style={styles.skip}>저장하지 않고 나가기</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.subtext, marginTop: 6, marginBottom: 18 },
  mapCard: {
    height: 200,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: '#F2F2F2',
    ...shadow.card,
  },
  map: { flex: 1 },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsGrid: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: colors.card,
  },
  statValue: { fontSize: 17, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 12, color: colors.subtext, marginTop: 3 },
  photoCard: {
    marginTop: 16,
    marginBottom: 20,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  photo: { width: '100%', height: 180 },
  photoEmpty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  photoEmptyText: { color: colors.subtext, fontSize: 13 },
  skip: { textAlign: 'center', color: colors.subtext, fontSize: 13, padding: 14 },
});
