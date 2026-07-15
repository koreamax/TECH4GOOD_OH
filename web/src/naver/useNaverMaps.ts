import { useEffect, useState } from 'react';

import { NAVER_MAP_CLIENT_ID } from '../config';

type LoadState = 'loading' | 'ready' | 'no-key' | 'error';

let loadPromise: Promise<void> | null = null;

/** Naver Maps v3 스크립트를 1회만 주입하고 로드 완료를 기다린다.
 *  스크립트 파일은 받아졌어도(인증 500/도메인 미등록 등) `naver.maps` 가 안 뜰 수 있어,
 *  onload 시 실제 네임스페이스와 authFailure 콜백까지 확인해 성공/실패를 가른다. */
function loadNaverScript(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise<void>((resolve, reject) => {
    if (window.naver?.maps) return resolve();

    // 인증 실패(잘못된 Client ID·미등록 URL·전파 지연 등) 시 Naver 가 호출하는 전역 훅
    (window as unknown as { navermap_authFailure?: () => void }).navermap_authFailure = () =>
      reject(new Error('naver maps auth failure'));

    const s = document.createElement('script');
    // 신규 NCP 콘솔 키는 ncpKeyId 사용 (구형 ncpClientId 와 혼용하면 인증이 꼬일 수 있음)
    s.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_MAP_CLIENT_ID}`;
    s.async = true;
    s.onload = () => {
      // 인증 검증이 onload 직후 비동기로 끝나므로 한 틱 양보 후, 실제 생성자(maps.Map)
      // 존재로 성공을 확정한다(500/미등록 시엔 naver.maps 가 비어 폴백 처리).
      setTimeout(() => {
        if (window.naver?.maps?.Map) resolve();
        else reject(new Error('naver maps unavailable (인증 실패/미전파 가능)'));
      }, 400);
    };
    s.onerror = () => reject(new Error('naver maps script load failed'));
    document.head.appendChild(s);
  });
  return loadPromise;
}

/** 지도 SDK 로드 상태. 키가 없으면 'no-key', 인증/네트워크 실패면 'error' 로 폴백 UI. */
export function useNaverMaps(): LoadState {
  const [state, setState] = useState<LoadState>(
    NAVER_MAP_CLIENT_ID ? 'loading' : 'no-key',
  );

  useEffect(() => {
    if (!NAVER_MAP_CLIENT_ID) return;
    let alive = true;
    loadNaverScript()
      .then(() => alive && setState('ready'))
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
