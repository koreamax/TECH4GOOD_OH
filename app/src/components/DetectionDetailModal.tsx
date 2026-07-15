import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { generateComplaint, patchDetection, postReport } from '../api/client';
import { CLASS_KR } from '../config';
import { colors, radius, shadow } from '../theme';
import type { ComplaintDraft, SessionDetection } from '../types';
import PrimaryButton from './PrimaryButton';

interface Props {
  visible: boolean;
  detection: SessionDetection | null;
  onResolved: (patch: Partial<SessionDetection>) => void;
  onClose: () => void;
}

/** 장애물 감지 → 상세(S-12) + 신고 완료(S-13). 선 승인 게이트의 실제 화면. */
export default function DetectionDetailModal({ visible, detection, onResolved, onClose }: Props) {
  const [draft, setDraft] = useState<ComplaintDraft | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [receiptNo, setReceiptNo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !detection) return;
    setDraft(null);
    setReceiptNo(null);
    setError(null);
    setLoadingDraft(true);
    generateComplaint({
      imageUri: detection.imageUri,
      className: detection.className,
      confidence: detection.confidence,
      lat: detection.lat,
      lng: detection.lng,
    })
      .then(setDraft)
      .catch(() =>
        // 서버 불가 시에도 승인 플로우가 막히지 않도록 로컬 템플릿 폴백
        setDraft({
          title: `${CLASS_KR[detection.className] ?? detection.className} 신고`,
          content:
            '산책 중 보행 위험 요소를 발견하여 신고합니다. 보행자 안전사고 우려가 있으니 현장 확인과 조치를 요청드립니다.',
          address: `위도 ${detection.lat.toFixed(5)}, 경도 ${detection.lng.toFixed(5)} 지점`,
          source: 'template',
        }),
      )
      .finally(() => setLoadingDraft(false));
  }, [visible, detection]);

  if (!detection) return null;

  const report = async () => {
    if (!draft) return;
    setError(null);
    setReporting(true);
    try {
      if (detection.serverId == null) {
        throw new Error('서버 연결이 필요합니다 (config.ts 의 API_URL 확인)');
      }
      const r = await postReport({
        detectionId: detection.serverId,
        title: draft.title,
        content: draft.content,
        address: draft.address,
      });
      setReceiptNo(r.receipt_no);
      onResolved({ status: 'reported', receiptNo: r.receipt_no });
    } catch (e) {
      setError(e instanceof Error ? e.message : '신고에 실패했습니다');
    } finally {
      setReporting(false);
    }
  };

  const reject = async () => {
    if (detection.serverId != null) {
      patchDetection(detection.serverId, 'rejected').catch(() => undefined);
    }
    onResolved({ status: 'rejected' });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {receiptNo ? (
            // ===== 신고 완료 (S-13) =====
            <View style={styles.doneWrap}>
              <View style={styles.doneCircle}>
                <Text style={styles.doneEmoji}>🐾</Text>
              </View>
              <Text style={styles.doneTitle}>신고가 접수되었어요!</Text>
              <Text style={styles.doneSub}>
                이웃들의 안전한 산책길에{'\n'}콩이가 힘을 보탰어요
              </Text>
              <View style={styles.receiptCard}>
                <Text style={styles.receiptLabel}>접수번호</Text>
                <Text style={styles.receiptNo}>{receiptNo}</Text>
                <Text style={styles.receiptStatus}>접수완료 · 처리 현황은 신고 현황 탭에서</Text>
              </View>
              <PrimaryButton label="산책 계속하기 🐾" onPress={onClose} />
            </View>
          ) : (
            // ===== 장애물 감지 상세 (S-12) =====
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.grabber} />
              <Text style={styles.title}>위험 요소를 발견했어요!</Text>
              {!!detection.imageUri && (
                <Image source={{ uri: detection.imageUri }} style={styles.photo} />
              )}
              <View style={styles.chipRow}>
                <View style={styles.chipType}>
                  <Text style={styles.chipTypeText}>
                    {CLASS_KR[detection.className] ?? detection.className}
                  </Text>
                </View>
                <View style={styles.chipConf}>
                  <Text style={styles.chipConfText}>
                    AI 신뢰도 {Math.round(detection.confidence * 100)}%
                  </Text>
                </View>
              </View>
              {loadingDraft ? (
                <View style={styles.draftLoading}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.draftLoadingText}>AI가 민원 문안을 작성하고 있어요…</Text>
                </View>
              ) : draft ? (
                <View style={styles.draftCard}>
                  <View style={styles.draftHeader}>
                    <Text style={styles.draftLabel}>AI가 작성한 민원 문안</Text>
                    <Text style={styles.draftSource}>
                      {draft.source === 'gemini' ? 'Gemini' : '기본 양식'}
                    </Text>
                  </View>
                  <Text style={styles.draftAddress}>📍 {draft.address}</Text>
                  <Text style={styles.draftTitle}>{draft.title}</Text>
                  <Text style={styles.draftContent}>{draft.content}</Text>
                </View>
              ) : null}
              {!!error && <Text style={styles.error}>{error}</Text>}
              <View style={styles.buttonRow}>
                <PrimaryButton label="아니에요" variant="ghost" onPress={reject} style={styles.flex1} />
                <PrimaryButton
                  label="신고하기"
                  onPress={report}
                  loading={reporting}
                  disabled={loadingDraft}
                  style={styles.flex2}
                />
              </View>
              <Text style={styles.hint}>
                '아니에요'로 알려주신 내용도 AI 학습에 활용돼요
              </Text>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.dim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '88%',
    ...shadow.card,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  title: { fontSize: 19, fontWeight: '800', color: colors.text, marginBottom: 12 },
  photo: { width: '100%', height: 200, borderRadius: radius.card, backgroundColor: '#eee' },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chipType: {
    backgroundColor: '#FFF1EC',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipTypeText: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  chipConf: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipConfText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
  draftLoading: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  draftLoadingText: { color: colors.subtext, fontSize: 13 },
  draftCard: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 14,
  },
  draftHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  draftLabel: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  draftSource: { fontSize: 11, color: colors.subtext },
  draftAddress: { fontSize: 13, color: colors.subtext, marginBottom: 8 },
  draftTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 },
  draftContent: { fontSize: 14, color: colors.text, lineHeight: 21 },
  error: { color: colors.danger, fontSize: 13, marginTop: 10 },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  hint: { textAlign: 'center', color: colors.subtext, fontSize: 12, marginTop: 12, marginBottom: 4 },
  doneWrap: { alignItems: 'stretch', paddingVertical: 8 },
  doneCircle: {
    alignSelf: 'center',
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  doneEmoji: { fontSize: 38 },
  doneTitle: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  doneSub: { textAlign: 'center', color: colors.subtext, lineHeight: 20, marginBottom: 18 },
  receiptCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: 'center',
    marginBottom: 18,
  },
  receiptLabel: { fontSize: 12, color: colors.subtext },
  receiptNo: { fontSize: 18, fontWeight: '800', color: colors.text, marginVertical: 4 },
  receiptStatus: { fontSize: 12, color: colors.primaryDark },
});
