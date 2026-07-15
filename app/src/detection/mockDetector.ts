/** 목 탐지기 — 모델 탑재 전 데모용. 실제 카메라 캡처·GPS·서버 연동은 동일하게 탄다.
 *
 * 데모 동선에 맞춰 타이밍을 바꾸려면 FIRST_DELAY_MS / INTERVAL 을 조정할 것.
 */
export interface MockDetectionEvent {
  className: string;
  confidence: number;
}

const FIRST_DELAY_MS = 15_000;
const INTERVAL_MIN_MS = 25_000;
const INTERVAL_JITTER_MS = 15_000;

export class MockDetector {
  private timer: ReturnType<typeof setTimeout> | null = null;

  start(onDetect: (e: MockDetectionEvent) => void) {
    const schedule = (delay: number) => {
      this.timer = setTimeout(() => {
        const className = Math.random() < 0.7 ? 'sidewalk_damaged' : 'braille_damaged';
        // 8할은 임계값(0.6) 이상 → 알람, 2할은 미만 → 조용한 축적 경로 시연
        const confidence =
          Math.random() < 0.8
            ? 0.62 + Math.random() * 0.31
            : 0.4 + Math.random() * 0.19;
        onDetect({ className, confidence: Math.round(confidence * 100) / 100 });
        schedule(INTERVAL_MIN_MS + Math.random() * INTERVAL_JITTER_MS);
      }, delay);
    };
    schedule(FIRST_DELAY_MS);
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
