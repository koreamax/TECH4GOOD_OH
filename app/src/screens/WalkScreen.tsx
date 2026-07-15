import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

import { postDetection } from '../api/client';
import DetectionDetailModal from '../components/DetectionDetailModal';
import PrimaryButton from '../components/PrimaryButton';
import SegmentPill from '../components/SegmentPill';
import { ALERT_CONFIDENCE_THRESHOLD, CLASS_KR, USE_TFLITE } from '../config';
import { MockDetector } from '../detection/mockDetector';
import { useTfliteFrameProcessor } from '../detection/tfliteDetector';
import type { RootStackParamList } from '../navigation';
import { useWalkStore } from '../store/walkStore';
import { colors, radius, shadow } from '../theme';
import { formatDistance, formatDuration } from '../utils/geo';

type Props = NativeStackScreenProps<RootStackParamList, 'Walk'>;

const SEOUL = { latitude: 37.5665, longitude: 126.978, latitudeDelta: 0.005, longitudeDelta: 0.005 };
const DETECTION_COOLDOWN_MS = 15_000;

export default function WalkScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const [introVisible, setIntroVisible] = useState(true);
  const [view, setView] = useState<0 | 1>(0); // 0 지도 뷰, 1 카메라 뷰
  const [elapsedS, setElapsedS] = useState(0);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);

  const status = useWalkStore((s) => s.status);
  const route = useWalkStore((s) => s.route);
  const distanceM = useWalkStore((s) => s.distanceM);
  const detections = useWalkStore((s) => s.detections);
  const pendingAlertIndex = useWalkStore((s) => s.pendingAlertIndex);

  const watcher = useRef<Location.LocationSubscription | null>(null);
  const mock = useRef(new MockDetector());
  const lastLoc = useRef<{ lat: number; lng: number } | null>(null);
  const lastDetectionAt = useRef(0);
  const busy = useRef(false);

  // 권한
  useEffect(() => {
    (async () => {
      if (!hasPermission) await requestPermission();
      await Location.requestForegroundPermissionsAsync();
    })();
  }, [hasPermission, requestPermission]);

  // 타이머
  useEffect(() => {
    if (status !== 'walking') return;
    const startedAt = useWalkStore.getState().startedAt;
    const id = setInterval(() => {
      if (startedAt) setElapsedS(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  // 탐지 이벤트 공통 처리 (목/TFLite 동일 경로): 캡처 → 서버 저장 → 임계값 게이트
  const handleDetection = useCallback(async (e: { className: string; confidence: number }) => {
    const now = Date.now();
    if (busy.current || now - lastDetectionAt.current < DETECTION_COOLDOWN_MS) return;
    busy.current = true;
    lastDetectionAt.current = now;
    try {
      const loc = lastLoc.current ?? { lat: SEOUL.latitude, lng: SEOUL.longitude };
      let imageUri = '';
      try {
        const photo = await cameraRef.current?.takePhoto({ enableShutterSound: false });
        if (photo) imageUri = `file://${photo.path}`;
      } catch {
        // 시뮬레이터 등 캡처 불가 환경 — 이미지 없이 진행
      }
      let serverId: number | null = null;
      if (imageUri) {
        try {
          const res = await postDetection({
            imageUri,
            className: e.className,
            confidence: e.confidence,
            lat: loc.lat,
            lng: loc.lng,
          });
          serverId = res.id;
        } catch {
          // 서버 불가 시에도 로컬 세션에는 남긴다
        }
      }
      const alert = e.confidence >= ALERT_CONFIDENCE_THRESHOLD;
      useWalkStore.getState().addDetection(
        {
          serverId,
          className: e.className,
          confidence: e.confidence,
          lat: loc.lat,
          lng: loc.lng,
          imageUri,
          status: 'pending',
        },
        alert, // 임계값 미만이면 알람 없이 조용히 축적 (선 승인 게이트)
      );
      if (alert) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      }
    } finally {
      busy.current = false;
    }
  }, []);

  // 온디바이스 추론 (모델 탑재 + USE_TFLITE=true 일 때만 활성)
  const frameProcessor = useTfliteFrameProcessor(
    USE_TFLITE && !introVisible && status === 'walking',
    handleDetection,
  );

  const startSession = async () => {
    setIntroVisible(false);
    useWalkStore.getState().startWalk();
    try {
      const current = await Location.getCurrentPositionAsync({});
      lastLoc.current = { lat: current.coords.latitude, lng: current.coords.longitude };
      useWalkStore.getState().addRoutePoint(current.coords.latitude, current.coords.longitude);
      watcher.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5 },
        (loc) => {
          lastLoc.current = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          useWalkStore.getState().addRoutePoint(loc.coords.latitude, loc.coords.longitude);
        },
      );
    } catch {
      // 위치 불가 환경에서도 세션은 진행
    }
    if (!USE_TFLITE) mock.current.start(handleDetection);
  };

  const stopSensors = () => {
    watcher.current?.remove();
    watcher.current = null;
    mock.current.stop();
  };

  const confirmEnd = () => {
    Alert.alert('산책 종료', '오늘의 산책을 마칠까요?', [
      { text: '계속 산책하기', style: 'cancel' },
      {
        text: '종료하기',
        style: 'destructive',
        onPress: () => {
          stopSensors();
          useWalkStore.getState().endWalk();
          navigation.replace('WalkSummary');
        },
      },
    ]);
  };

  useEffect(() => stopSensors, []);

  const last = route[route.length - 1];
  const mapRegion = last
    ? { latitude: last.lat, longitude: last.lng, latitudeDelta: 0.004, longitudeDelta: 0.004 }
    : SEOUL;
  const currentDetection = detailIndex != null ? detections[detailIndex] ?? null : null;

  return (
    <View style={styles.container}>
      {/* 카메라는 항상 마운트 (지도 뷰일 때도 백그라운드 탐지 유지) */}
      {device != null && hasPermission ? (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={!introVisible}
          photo
          frameProcessor={frameProcessor}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.noCamera]}>
          <Text style={styles.noCameraText}>카메라를 사용할 수 없어요</Text>
        </View>
      )}

      {/* 지도 뷰 오버레이 */}
      {view === 0 && (
        <MapView style={StyleSheet.absoluteFill} region={mapRegion}>
          {route.length > 1 && (
            <Polyline
              coordinates={route.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
              strokeColor={colors.primary}
              strokeWidth={4}
              lineDashPattern={[12, 8]}
            />
          )}
          {route.length > 0 && (
            <Marker coordinate={{ latitude: route[0].lat, longitude: route[0].lng }}>
              <View style={styles.startDot} />
            </Marker>
          )}
          {last && (
            <Marker coordinate={{ latitude: last.lat, longitude: last.lng }}>
              <View style={styles.dogPin}>
                <Text style={styles.dogPinEmoji}>🐶</Text>
              </View>
            </Marker>
          )}
          {detections.map((d, i) =>
            d.status !== 'rejected' ? (
              <Marker key={i} coordinate={{ latitude: d.lat, longitude: d.lng }}>
                <Text style={styles.detMarker}>⚠️</Text>
              </Marker>
            ) : null,
          )}
        </MapView>
      )}

      {/* 상단 토글 */}
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <SegmentPill
          options={['지도 뷰', '카메라 뷰']}
          selectedIndex={view}
          onSelect={(i) => setView(i as 0 | 1)}
        />
      </View>

      {/* 장애물 감지 → 알림 카드 (S-11) */}
      {pendingAlertIndex != null && detailIndex == null && !introVisible && (
        <TouchableOpacity
          style={[styles.alertCard, { top: insets.top + 60 }]}
          activeOpacity={0.9}
          onPress={() => {
            setDetailIndex(pendingAlertIndex);
            useWalkStore.getState().clearAlert();
          }}
        >
          <Text style={styles.alertEmoji}>⚠️</Text>
          <View style={styles.alertBody}>
            <Text style={styles.alertTitle}>위험 요소를 발견했어요!</Text>
            <Text style={styles.alertSub}>
              {CLASS_KR[detections[pendingAlertIndex]?.className] ?? ''} 의심 · 눌러서 확인하기
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* 하단 통계 + 종료 */}
      {!introVisible && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.statsCard}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatDuration(elapsedS)}</Text>
              <Text style={styles.statLabel}>시간</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatDistance(distanceM)}</Text>
              <Text style={styles.statLabel}>거리</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {detections.filter((d) => d.status === 'reported').length}
              </Text>
              <Text style={styles.statLabel}>신고</Text>
            </View>
          </View>
          <PrimaryButton label="산책 종료" variant="danger" onPress={confirmEnd} />
        </View>
      )}

      {/* 산책 시작 모달 (S-10 인트로) */}
      {introVisible && (
        <View style={styles.introBackdrop}>
          <View style={styles.introCard}>
            <TouchableOpacity style={styles.introClose} onPress={() => navigation.goBack()}>
              <Text style={styles.introCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.introTitle}>카메라가 켜졌어요!</Text>
            <Text style={styles.introBody}>
              산책 중 발견한 우리 동네 위험 요소를 신고하면{'\n'}다른 산책자와 이웃의 안전한
              이동에 도움이 됩니다.
            </Text>
            <PrimaryButton label="확인했어요 🐾" onPress={startSession} />
          </View>
        </View>
      )}

      {/* 장애물 감지 → 상세/신고 완료 (S-12, S-13) */}
      <DetectionDetailModal
        visible={detailIndex != null}
        detection={currentDetection}
        onResolved={(patch) => {
          if (detailIndex != null) useWalkStore.getState().updateDetection(detailIndex, patch);
        }}
        onClose={() => setDetailIndex(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  noCamera: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#222' },
  noCameraText: { color: '#aaa' },
  topBar: { position: 'absolute', alignSelf: 'center' },
  alertCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: radius.card,
    padding: 14,
    gap: 10,
    ...shadow.card,
  },
  alertEmoji: { fontSize: 26 },
  alertBody: { flex: 1 },
  alertTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  alertSub: { fontSize: 13, color: colors.subtext, marginTop: 2 },
  bottomBar: { position: 'absolute', left: 16, right: 16, bottom: 0, gap: 10 },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: radius.card,
    paddingVertical: 12,
    ...shadow.card,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },
  startDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: '#fff',
  },
  dogPin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    ...shadow.card,
  },
  dogPinEmoji: { fontSize: 22 },
  detMarker: { fontSize: 24 },
  introBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.dim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  introCard: {
    alignSelf: 'stretch',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    ...shadow.card,
  },
  introClose: { position: 'absolute', top: 14, right: 14, zIndex: 1, padding: 4 },
  introCloseText: { fontSize: 16, color: colors.subtext },
  introTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 10 },
  introBody: { fontSize: 13, color: colors.subtext, lineHeight: 20, marginBottom: 60 },
});
