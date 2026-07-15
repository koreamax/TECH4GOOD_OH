import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getReports } from '../api/client';
import ReportListItem from '../components/ReportListItem';
import { colors } from '../theme';
import type { Report } from '../types';

/** 신고 현황 탭 — 내 신고 리스트와 처리 상태 */
export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<Report[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getReports()
        .then((r) => alive && setReports(r))
        .catch(() => undefined);
      return () => {
        alive = false;
      };
    }, []),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>신고 현황</Text>
      <Text style={styles.subtitle}>내 산책이 만든 변화를 확인해보세요</Text>
      <FlatList
        data={reports}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ReportListItem report={item} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            아직 신고 내역이 없어요.{'\n'}산책 중 발견한 위험 요소를 신고해보세요!
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.subtext, marginTop: 4, marginBottom: 16 },
  empty: { textAlign: 'center', color: colors.subtext, lineHeight: 22, paddingVertical: 60 },
});
