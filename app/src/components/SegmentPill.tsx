import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, radius } from '../theme';

interface Props {
  options: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

/** 시안의 다크 캡슐 토글 (지도 뷰 ↔ 카메라 뷰) — 선택 세그먼트만 민트그린 */
export default function SegmentPill({ options, selectedIndex, onSelect }: Props) {
  return (
    <View style={styles.pill}>
      {options.map((label, i) => (
        <TouchableOpacity
          key={label}
          onPress={() => onSelect(i)}
          style={[styles.segment, i === selectedIndex && styles.selected]}
        >
          <Text style={styles.label}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    padding: 4,
  },
  segment: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  selected: { backgroundColor: colors.primary },
  label: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
