import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, radius } from '../theme';
import type { Walk } from '../types';
import { formatDistance, formatDurationKr, todayKr } from '../utils/geo';

interface Props {
  walk: Walk;
  onPress: () => void;
}

export default function WalkListItem({ walk, onPress }: Props) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.row}>
      <View style={styles.thumb}>
        <Text style={styles.thumbEmoji}>🐾</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{todayKr(walk.started_at)} 산책</Text>
        <Text style={styles.sub}>
          {formatDistance(walk.distance_m)} · {formatDurationKr(walk.duration_s)} 소요
        </Text>
      </View>
      {walk.report_count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>신고 {walk.report_count}건</Text>
        </View>
      ) : (
        <Text style={styles.chevron}>›</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  thumbEmoji: { fontSize: 20 },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.subtext, marginTop: 2 },
  badge: {
    backgroundColor: '#FFF1EC',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  chevron: { fontSize: 22, color: colors.subtext },
});
