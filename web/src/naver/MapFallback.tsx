interface Props {
  state: 'loading' | 'no-key' | 'error';
  height?: number | string;
}

/** Naver 지도 키 미설정/로드 실패 시 자리표시 UI. 데모 플로우는 계속 진행된다. */
export default function MapFallback({ state, height = '100%' }: Props) {
  const msg =
    state === 'loading'
      ? '지도를 불러오는 중…'
      : state === 'error'
        ? '지도를 불러오지 못했어요'
        : 'Naver 지도 키를 설정하면 지도가 표시됩니다';
  return (
    <div
      style={{
        height,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        background:
          'repeating-linear-gradient(45deg, #eef1ee, #eef1ee 12px, #e7ebe7 12px, #e7ebe7 24px)',
        color: '#8a938a',
        fontSize: 13,
      }}
    >
      <span style={{ fontSize: 30 }}>🗺️</span>
      <span>{msg}</span>
      {state === 'no-key' && (
        <code style={{ fontSize: 11, color: '#a3aaa3' }}>VITE_NAVER_MAP_CLIENT_ID</code>
      )}
    </div>
  );
}
