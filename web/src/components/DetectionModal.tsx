import { useEffect, useState } from 'react';

import { generateComplaint, patchDetection, postReport } from '../api';
import { CLASS_KR } from '../config';
import type { ComplaintDraft, SessionDetection } from '../types';

interface Props {
  detection: SessionDetection | null;
  onResolved: (patch: Partial<SessionDetection>) => void;
  onClose: () => void;
}

/** 장애물 감지 플로우 (피그마 시안 4단계)
 *  verify(확인-1) → review(확인-2 문안 검토) → edit(상세 수정) → done(신고 완료 모달) */
type Step = 'verify' | 'review' | 'edit' | 'done';

const field: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
  background: '#fff',
};

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  margin: '14px 0 6px',
};

const Req = () => <span style={{ color: 'var(--accent)' }}> *</span>;

export default function DetectionModal({ detection, onResolved, onClose }: Props) {
  const [step, setStep] = useState<Step>('verify');
  const [draft, setDraft] = useState<ComplaintDraft | null>(null);
  const [reporting, setReporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 상세 수정 폼 상태
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editType, setEditType] = useState('');

  // 열리는 즉시 문안을 미리 생성 → 확인-2 진입 시 대기 없이 표시
  useEffect(() => {
    if (!detection) return;
    setStep('verify');
    setDraft(null);
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
    generateComplaint({
      imageBlob: detection.imageBlob,
      className: detection.className,
      confidence: detection.confidence,
      lat: detection.lat,
      lng: detection.lng,
    })
      .then(setDraft)
      .catch(() => setDraft(fallback)); // 서버 불가 시에도 승인 플로우 무중단
  }, [detection]);

  if (!detection) return null;

  // 승인 화면에는 박스·마스크가 그려진 주석 프레임을 우선 표시(있으면).
  const displayUrl = detection.annotatedUrl ?? detection.imageUrl;

  const reject = () => {
    if (detection.serverId != null) {
      patchDetection(detection.serverId, 'rejected').catch(() => undefined);
    }
    onResolved({ status: 'rejected' });
    onClose();
  };

  const submit = async () => {
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
      onResolved({ status: 'reported', receiptNo: r.receipt_no });
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : '신고에 실패했습니다');
    } finally {
      setReporting(false);
    }
  };

  const openEdit = () => {
    if (!draft) return;
    setEditTitle(draft.title);
    setEditContent(draft.content);
    setEditAddress(draft.address);
    setEditType(CLASS_KR[detection.className] ?? '');
    setStep('edit');
  };

  const applyEdit = () => {
    if (!draft) return;
    setDraft({ ...draft, title: editTitle, content: editContent, address: editAddress });
    setStep('review');
  };

  // ===== 신고 완료 (100:2869) — 중앙 모달 + 일러스트 =====
  if (step === 'done') {
    return (
      <div
        className="sheet-backdrop"
        style={{ alignItems: 'center', justifyContent: 'center', padding: 21 }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: '24px 18px',
            width: 360,
            maxWidth: '100%',
            display: 'grid',
            gap: 18,
            boxShadow: '0 4px 10px rgba(0,0,0,.05)',
          }}
        >
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
                신고가 완료되었어요!
              </h2>
              <button onClick={onClose} style={{ fontSize: 18, color: 'var(--ink)' }}>
                ✕
              </button>
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--gray500)', lineHeight: 1.4, letterSpacing: '-0.28px' }}>
              발견한 위험 요소가 안전신문고에 전달되었어요.
              <br />
              당신의 산책이 더 안전한 도시를 만들고 있어요.
            </p>
          </div>
          <img
            src="/assets/illust-report-done.svg"
            alt=""
            style={{ height: 160, objectFit: 'contain', justifySelf: 'center' }}
          />
          <button className="btn" onClick={onClose}>
            확인했어요
            <img src="/assets/logo-paw.svg" alt="" width={16} height={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sheet-backdrop">
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        {step === 'verify' && (
          <>
            {/* 확인-1 (100:2080) */}
            <div className="grabber" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <img src="/assets/notice-red.svg" alt="" width={22} height={22} />
                <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
                  보행 장애물이 감지되었어요!
                </h2>
              </span>
              <button onClick={onClose} style={{ fontSize: 18, color: 'var(--ink)' }}>
                ✕
              </button>
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--gray500)', lineHeight: 1.4, letterSpacing: '-0.28px', margin: '4px 0 18px' }}>
              앞쪽 산책 경로에서 위험 요소가 발견되었어요.
              <br />
              확인 후 신고하면 안전신문고를 통해 우리 지역에 전달돼요.
            </p>
            {displayUrl && (
              <img
                src={displayUrl}
                alt="탐지 캡처"
                style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8 }}
              />
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingBottom: 4 }}>
              <button
                onClick={reject}
                style={{
                  width: 120,
                  padding: '14px 10px',
                  borderRadius: 8,
                  background: '#e3e8ec',
                  color: 'var(--gray600)',
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: '-0.28px',
                }}
              >
                감지 오류
              </button>
              <button
                onClick={() => setStep('review')}
                style={{
                  flex: 1,
                  padding: '14px 10px',
                  borderRadius: 8,
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: '-0.28px',
                }}
              >
                위험 요소 신고하기
              </button>
            </div>
          </>
        )}

        {step === 'review' && (
          <>
            {/* 확인-2 (100:2182) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
                안전신문고 신고 내용을 확인해주세요
              </h2>
              <button onClick={onClose} style={{ fontSize: 18, color: 'var(--ink)' }}>
                ✕
              </button>
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--gray500)', lineHeight: 1.4, letterSpacing: '-0.28px', margin: '4px 0 14px' }}>
              AI가 감지한 정보를 바탕으로 신고 내용을 작성했어요.
              <br />
              제출 전 마지막으로 보호자님의 검토가 필요해요.
            </p>
            <div style={{ position: 'relative' }}>
              {displayUrl && (
                <img
                  src={displayUrl}
                  alt="탐지 캡처"
                  style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8 }}
                />
              )}
              <button
                onClick={openEdit}
                disabled={!draft}
                style={{
                  position: 'absolute',
                  right: 10,
                  bottom: 10,
                  background: 'rgba(17,24,29,.75)',
                  color: '#fff',
                  borderRadius: 999,
                  padding: '7px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                ✏️ 신고 내용 상세 수정
              </button>
            </div>
            {!draft ? (
              <p style={{ textAlign: 'center', color: 'var(--subtext)', padding: '24px 0', fontSize: 14 }}>
                ✍️ AI가 신고 내용을 작성하고 있어요…
              </p>
            ) : (
              <div
                style={{
                  background: '#f2f5f6',
                  borderRadius: 8,
                  padding: 16,
                  marginTop: 14,
                  fontSize: 14,
                  display: 'grid',
                  gridTemplateColumns: '76px 1fr',
                  rowGap: 12,
                  lineHeight: 1.5,
                }}
              >
                <b style={{ fontWeight: 600 }}>발생지역</b>
                <span style={{ color: 'var(--gray600)' }}>{draft.address}</span>
                <b style={{ fontWeight: 600 }}>제목</b>
                <span style={{ color: 'var(--gray600)' }}>{draft.title}</span>
                <b style={{ fontWeight: 600 }}>신고내용</b>
                <span style={{ color: 'var(--gray600)' }}>{draft.content}</span>
              </div>
            )}
            {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{error}</p>}
            <button
              className="btn accent"
              style={{ marginTop: 16 }}
              onClick={submit}
              disabled={!draft || reporting}
            >
              {reporting ? '제출 중…' : '제출할게요'}
              <img src="/assets/logo-paw.svg" alt="" width={16} height={16} />
            </button>
          </>
        )}

        {step === 'edit' && (
          <>
            {/* 신고 내용 상세 수정 (100:2324) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setStep('review')} style={{ fontSize: 20 }}>
                ‹
              </button>
              <h2 style={{ fontSize: 17, fontWeight: 600, flex: 1, textAlign: 'center' }}>
                신고 내용 상세 수정
              </h2>
              <button onClick={() => setStep('review')} style={{ fontSize: 18, color: 'var(--ink)' }}>
                ✕
              </button>
            </div>
            {displayUrl && (
              <img
                src={displayUrl}
                alt="탐지 캡처"
                style={{ width: 'calc(100% + 40px)', margin: '12px -20px 0', height: 200, objectFit: 'cover', display: 'block' }}
              />
            )}
            <label style={label}>
              신고유형
              <Req />
            </label>
            <select style={field} value={editType} onChange={(e) => setEditType(e.target.value)}>
              <option value="">유형을 선택해 주세요</option>
              <option>보도 파손</option>
              <option>점자블록 파손</option>
              <option>기타 보행 장애물</option>
            </select>
            <label style={label}>
              발생지역
              <Req />
            </label>
            <input style={field} value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
            <label style={label}>
              제목
              <Req />
            </label>
            <input style={field} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            <label style={label}>
              신고내용
              <Req />
            </label>
            <textarea
              style={{ ...field, height: 110, resize: 'none' }}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 14, marginTop: 14, fontSize: 13 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                <input type="checkbox" defaultChecked style={{ accentColor: 'var(--ink)' }} /> 추천 단어
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--subtext)' }}>
                <input type="checkbox" disabled /> 주민점검신청제
              </label>
            </div>
            <label style={label}>
              휴대전화
              <Req />
            </label>
            <input style={field} placeholder="010-0000-0000" inputMode="tel" />
            <label style={label}>
              인증번호
              <Req />
            </label>
            <input style={field} placeholder="010-0000-0000" inputMode="numeric" />
            <button className="btn accent" style={{ marginTop: 18 }} onClick={applyEdit}>
              수정했어요
              <img src="/assets/logo-paw.svg" alt="" width={16} height={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
