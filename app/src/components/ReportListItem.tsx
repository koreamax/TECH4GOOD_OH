import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { mediaUrl } from '../api/client';
import { CLASS_KR } from '../config';
import { colors, radius } from '../theme';
import type { Report } from '../types';

export default function ReportListItem({ report }: { report: Report }) {
  const thumb = mediaUrl(report.detection?.image_url ?? null);
  return (
    <View style={styles.row}>
      {thumb ? (
        <Image source={{ uri: thumb }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Text>⚠️</Text>
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {report.title}
        </Text>
        <Text style={styles.sub}>
          {report.detection ? `${CLASS_KR[report.detection.class_name] ?? ''} · ` : ''}
          {report.receipt_no}
        </Text>
        <Text style={styles.date}>{report.created_at.slice(0, 10)}</Text>
      </View>
      <View style={styles.statusChip}>
        <Text style={styles.statusText}>{report.status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 12,
    marginBottom: 10,
    backgroundColor: colors.card,
  },
  thumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: '#F2F2F2' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, marginLeft: 12 },
  title: { fontSize: 14, fontWeight: '700', color: colors.text },
  sub: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  date: { fontSize: 11, color: colors.subtext, marginTop: 2 },
  statusChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
});
