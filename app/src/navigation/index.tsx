import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import HomeScreen from '../screens/HomeScreen';
import MyScreen from '../screens/MyScreen';
import RecordDetailScreen from '../screens/RecordDetailScreen';
import RecordsScreen from '../screens/RecordsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import WalkMapScreen from '../screens/WalkMapScreen';
import WalkScreen from '../screens/WalkScreen';
import WalkSummaryScreen from '../screens/WalkSummaryScreen';
import { colors } from '../theme';

export type RootStackParamList = {
  Tabs: undefined;
  Walk: undefined;
  WalkSummary: undefined;
  Records: undefined;
  RecordDetail: { walkId: number };
};

export type TabParamList = {
  Home: undefined;
  WalkMap: undefined;
  Reports: undefined;
  My: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, [string, string]> = {
  Home: ['home', 'home-outline'],
  WalkMap: ['map', 'map-outline'],
  Reports: ['alert-circle', 'alert-circle-outline'],
  My: ['person', 'person-outline'],
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.subtext,
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons
            name={(focused ? TAB_ICONS[route.name][0] : TAB_ICONS[route.name][1]) as never}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '홈' }} />
      <Tab.Screen name="WalkMap" component={WalkMapScreen} options={{ title: '산책 지도' }} />
      <Tab.Screen name="Reports" component={ReportsScreen} options={{ title: '신고 현황' }} />
      <Tab.Screen name="My" component={MyScreen} options={{ title: '마이' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="Walk"
        component={WalkScreen}
        options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
      />
      <Stack.Screen
        name="WalkSummary"
        component={WalkSummaryScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="Records"
        component={RecordsScreen}
        options={{ title: '산책 기록', headerBackTitle: '' }}
      />
      <Stack.Screen
        name="RecordDetail"
        component={RecordDetailScreen}
        options={{ title: '산책 상세', headerBackTitle: '' }}
      />
    </Stack.Navigator>
  );
}
