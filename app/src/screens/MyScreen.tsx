import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getWalks } from '../api/client';
import { DOG_NAME, USER_NAME } from '../config';
import type { RootStackParamList } from '../navigation';
import { colors, radius, shadow } from '../theme';
import type { Walk } from '../types';
import { formatDistance } from '../utils/geo';

/** 마이 탭 — 강아지 프로필 + 누적 순찰 기여 */
export default function MyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [walks, setWalks] = useState<Walk[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getWalks(100)
        .then((w) => alive && setWalks(w))
        .catch(() => undefined);
      return () => {
        alive = false;
      };
    }, []),
  );

  const totalDistance = walks.reduce((sum, w) => sum + w.distance_m, 0);
  const totalReports = walks.reduce((sum, w) => sum + w.report_count, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top + 16 }}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>🐶</Text>
        </View>
        <View>
          <Text style={styles.dogName}>{DOG_NAME}</Text>
          <Text style={styles.userName}>{USER_NAME} · Paw Patrol 순찰대원</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{walks.length}</Text>
          <Text style={styles.statLabel}>총 산책</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatDistance(totalDistance)}</Text>
          <Text style={styles.statLabel}>총 거리</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, totalReports > 0 && { color: colors.accent }]}>
            {totalReports}
          </Text>
          <Text style={styles.statLabel}>총 신고</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.menuRow} onPress={() => navigation.navigate('Records')}>
        <Text style={styles.menuLabel}>산책 기록 전체 보기</Text>
        <Text style={styles.menuChevron}>›</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        {DOG_NAME}의 산책이 우리 동네를 더 안전하게 만들고 있어요 🐾
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: radius.card,
    backgroundColor: colors.primaryLight,
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  avatarEmoji: { fontSize: 30 },
  dogName: { fontSize: 20, fontWeight: '800', color: colors.text },
  userName: { fontSize: 13, color: colors.subtext, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statValue: { fontSize: 17, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 12, color: colors.subtext, marginTop: 3 },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  menuChevron: { fontSize: 20, color: colors.subtext },
  footer: { textAlign: 'center', color: colors.subtext, fontSize: 12, paddingVertical: 30 },
});
