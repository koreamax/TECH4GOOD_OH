import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { getWalks } from '../api/client';
import WalkListItem from '../components/WalkListItem';
import type { RootStackParamList } from '../navigation';
import { colors } from '../theme';
import type { Walk } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Records'>;

/** 산책 기록 (S-20) */
export default function RecordsScreen({ navigation }: Props) {
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

  return (
    <View style={styles.container}>
      <FlatList
        data={walks}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <WalkListItem
            walk={item}
            onPress={() => navigation.navigate('RecordDetail', { walkId: item.id })}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>아직 산책 기록이 없어요.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 20 },
  empty: { textAlign: 'center', color: colors.subtext, paddingVertical: 60 },
});
