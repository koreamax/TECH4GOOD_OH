import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getReports, getWalks } from '../api/client';
import PrimaryButton from '../components/PrimaryButton';
import ReportListItem from '../components/ReportListItem';
import WalkListItem from '../components/WalkListItem';
import { DOG_NAME } from '../config';
import type { RootStackParamList } from '../navigation';
import { colors, radius, shadow } from '../theme';
import type { Report, Walk } from '../types';
import { formatDistance, formatDurationKr, routeToRegion, todayKr } from '../utils/geo';

const SEGMENTS = ['나의 코스', '산책 기록', '신고 현황'];

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [segment, setSegment] = useState(0);
  const [walks, setWalks] = useState<Walk[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([getWalks(10), getReports()])
        .then(([w, r]) => {
          if (alive) {
            setWalks(w);
            setReports(r);
          }
        })
        .catch(() => undefined); // 서버 미기동 시에도 홈은 뜬다
      return () => {
        alive = false;
      };
    }, []),
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Ionicons name="menu" size={24} color={colors.text} />
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
        </View>

        <Text style={styles.greeting}>
          안녕하세요, {DOG_NAME} 보호자님! 🐾{'\n'}오늘도 안전한 산책을 시작해볼까요?
        </Text>

        <View style={styles.segmentRow}>
          {SEGMENTS.map((label, i) => (
            <TouchableOpacity key={label} onPress={() => setSegment(i)} style={styles.segmentTab}>
              <Text
                style={[
                  styles.segmentLabel,
                  segment === i && { color: i === 2 ? colors.accent : colors.primaryDark },
                ]}
              >
                {label}
              </Text>
              {segment === i && (
                <View
                  style={[
                    styles.segmentUnderline,
                    { backgroundColor: i === 2 ? colors.accent : colors.primary },
                  ]}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {segment === 0 && (
          <View style={styles.section}>
            {walks.length === 0 && (
              <Text style={styles.empty}>아직 산책 기록이 없어요.{'\n'}첫 산책을 시작해볼까요?</Text>
            )}
            {walks.slice(0, 3).map((walk) => (
              <View key={walk.id} style={styles.courseCard}>
                <View style={styles.courseMapWrap} pointerEvents="none">
                  {walk.route.length > 1 ? (
                    <MapView
                      style={styles.courseMap}
                      initialRegion={routeToRegion(walk.route)}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      rotateEnabled={false}
                      pitchEnabled={false}
                    >
                      <Polyline
                        coordinates={walk.route.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
                        strokeColor={colors.primary}
                        strokeWidth={4}
                        lineDashPattern={[12, 8]}
                      />
                    </MapView>
                  ) : (
                    <View style={styles.courseMapPlaceholder}>
                      <Text style={{ fontSize: 32 }}>🐾</Text>
                    </View>
                  )}
                </View>
                <View style={styles.courseBody}>
                  {walk.report_count > 0 && (
                    <Text style={styles.courseReports}>나의 신고 내역 {walk.report_count}건</Text>
                  )}
                  <View style={styles.courseTitleRow}>
                    <Text style={styles.courseTitle}>{todayKr(walk.started_at)} 산책</Text>
                    <TouchableOpacity
                      style={styles.courseButton}
                      onPress={() => navigation.navigate('RecordDetail', { walkId: walk.id })}
                    >
                      <Text style={styles.courseButtonText}>최근 경로 보기</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.courseSub}>
                    📍 {formatDistance(walk.distance_m)} · {formatDurationKr(walk.duration_s)} 소요
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {segment === 1 && (
          <View style={styles.section}>
            {walks.length === 0 && <Text style={styles.empty}>아직 산책 기록이 없어요.</Text>}
            {walks.map((walk) => (
              <WalkListItem
                key={walk.id}
                walk={walk}
                onPress={() => navigation.navigate('RecordDetail', { walkId: walk.id })}
              />
            ))}
            {walks.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('Records')}>
                <Text style={styles.moreLink}>전체 보기 ›</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {segment === 2 && (
          <View style={styles.section}>
            {reports.length === 0 && <Text style={styles.empty}>아직 신고 내역이 없어요.</Text>}
            {reports.map((report) => (
              <ReportListItem key={report.id} report={report} />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + 10 }]}>
        <PrimaryButton
          label="오늘의 산책 시작하기! 🐾"
          onPress={() => navigation.navigate('Walk')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 29,
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  segmentRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  segmentTab: { marginRight: 22, paddingBottom: 10, alignItems: 'center' },
  segmentLabel: { fontSize: 14, fontWeight: '600', color: colors.subtext },
  segmentUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },
  section: { paddingHorizontal: 20, paddingTop: 16 },
  empty: {
    textAlign: 'center',
    color: colors.subtext,
    lineHeight: 22,
    paddingVertical: 40,
  },
  courseCard: {
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: 'hidden',
    ...shadow.card,
  },
  courseMapWrap: { height: 150, backgroundColor: '#F2F2F2' },
  courseMap: { flex: 1 },
  courseMapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  courseBody: { padding: 14 },
  courseReports: { color: colors.accent, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  courseTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  courseTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  courseButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  courseButtonText: { fontSize: 12, color: colors.text, fontWeight: '600' },
  courseSub: { fontSize: 13, color: colors.subtext, marginTop: 6 },
  moreLink: { textAlign: 'center', color: colors.primaryDark, fontWeight: '700', padding: 8 },
  ctaWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
});
