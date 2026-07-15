import { useEffect, useState } from 'react';

import { generateComplaint, patchDetection, postReport } from '../api';
import { CLASS_KR } from '../config';
import type { ComplaintDraft, SessionDetection } from '../types';

interface Props {
  detection: SessionDetection | null;
  onResolved: (patch: Partial<SessionDetection>) => void;
  onClose: () => void;
}

/** 장애물 감지 → 상세(S-12) + 신고 완료(S-13). 선 승인 게이트의 실제 화면. */
export default function DetectionModal({ detection, onResolved, onClose }: Props) {
  const [draft, setDraft] = useState<ComplaintDraft | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [receiptNo, setReceiptNo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!detection) return;
    setDraft(null);
    setReceiptNo(null);
    setError(null);

    const fallback: ComplaintDraft = {
      title: `${CLASS_KR[detection.className] ?? detection.className} 신고`,
      content:
        '산책 중 보행 위험 요소를 발견하여 신고합니다. 보행자 안전사고 우려가 있으니 현장 확인과 조치를 요청드립니다.',
      address: `위도 ${detection.lat.toFixed(5)}, 경도 ${detection.lng.toFixed(5)} 지점`,
      source: 'template',
    };

    if (!detection.imageBlob) {
      setDraft(fallback);
      return;
    }
    setLoadingDraft(true);
    generateComplaint({
      imageBlob: detection.imageBlob,
      className: detection.className,
      confidence: detection.confidence,
      lat: detection.lat,
      lng: detection.lng,
    })
      .then(setDraft)
      .catch(() => setDraft(fallback)) // 서버 불가 시에도 승인 플로우 무중단
      .finally(() => setLoadingDraft(false));
  }, [detection]);

  if (!detection) return null;

  const report = async () => {
    if (!draft) return;
    setError(null);
    setReporting(true);
    try {
      if (detection.serverId == null) {
        throw new Error('서버 연결이 필요합니다 (VITE_API_URL 확인)');
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

  const reject = () => {
    if (detection.serverId != null) {
      patchDetection(detection.serverId, 'rejected').catch(() => undefined);
    }
    onResolved({ status: 'rejected' });
    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={receiptNo ? onClose : undefined}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        {receiptNo ? (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: '50%',
                background: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 38,
                margin: '8px auto 14px',
              }}
            >
              🐾
            </div>
            <h2 style={{ fontSize: 20, marginBottom: 6 }}>신고가 접수되었어요!</h2>
            <p style={{ color: 'var(--subtext)', lineHeight: 1.5, marginBottom: 18 }}>
              이웃들의 안전한 산책길에
              <br />
              힘을 보탰어요
            </p>
            <div
              className="card"
              style={{ background: '#fafafa', padding: 16, marginBottom: 18 }}
            >
              <div style={{ fontSize: 12, color: 'var(--subtext)' }}>접수번호</div>
              <div style={{ fontSize: 18, fontWeight: 800, margin: '4px 0' }}>{receiptNo}</div>
              <div style={{ fontSize: 12, color: 'var(--primary-dark)' }}>
                접수완료 · 처리 현황은 신고 현황 탭에서
              </div>
            </div>
            <button className="btn" onClick={onClose}>
              산책 계속하기 🐾
            </button>
          </div>
        ) : (
          <>
            <div className="grabber" />
            <h2 style={{ fontSize: 19, marginBottom: 12 }}>위험 요소를 발견했어요!</h2>
            {detection.imageUrl && (
              <img
                src={detection.imageUrl}
                alt="탐지 캡처"
                style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 16 }}
              />
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <span className="chip orange">
                {CLASS_KR[detection.className] ?? detection.className}
              </span>
              <span className="chip green">
                AI 신뢰도 {Math.round(detection.confidence * 100)}%
              </span>
            </div>

            {loadingDraft ? (
              <p style={{ textAlign: 'center', color: 'var(--subtext)', padding: '28px 0' }}>
                ✍️ AI가 민원 문안을 작성하고 있어요…
              </p>
            ) : draft ? (
              <div className="card" style={{ padding: 14, marginTop: 14 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                    fontSize: 12,
                  }}
                >
                  <b style={{ color: 'var(--primary-dark)' }}>AI가 작성한 민원 문안</b>
                  <span style={{ color: 'var(--subtext)' }}>
                    {draft.source === 'gemini' ? 'Gemini' : '기본 양식'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--subtext)', marginBottom: 8 }}>
                  📍 {draft.address}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{draft.title}</div>
                <div style={{ fontSize: 14, lineHeight: 1.55 }}>{draft.content}</div>
              </div>
            ) : null}

            {error && (
              <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn ghost" style={{ flex: 1 }} onClick={reject}>
                아니에요
              </button>
              <button
                className="btn"
                style={{ flex: 2 }}
                onClick={report}
                disabled={loadingDraft || reporting}
              >
                {reporting ? '접수 중…' : '신고하기'}
              </button>
            </div>
            <p
              style={{
                textAlign: 'center',
                color: 'var(--subtext)',
                fontSize: 12,
                margin: '12px 0 4px',
              }}
            >
              '아니에요'로 알려주신 내용도 AI 학습에 활용돼요
            </p>
          </>
        )}
      </div>
    </div>
  );
}
