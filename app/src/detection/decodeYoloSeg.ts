/** yolo11n-seg TFLite 출력 디코더 (박스 전용 — 마스크 proto 는 사용하지 않는다).
 *
 * 가정 (ml/export_tflite.py, nms=False 기준 — 실모델 탑재 시 shape 로그로 검증할 것):
 * - output0 shape = [1, 4+numClasses+32, N] (attribute-major, N = anchor 수)
 * - 박스 = cx, cy, w, h (0~1 정규화), 클래스 점수 = 0~1
 */
export interface DecodedDetection {
  classId: number;
  confidence: number;
  box: { cx: number; cy: number; w: number; h: number };
}

function iou(a: DecodedDetection, b: DecodedDetection): number {
  'worklet';
  const ax1 = a.box.cx - a.box.w / 2;
  const ay1 = a.box.cy - a.box.h / 2;
  const ax2 = a.box.cx + a.box.w / 2;
  const ay2 = a.box.cy + a.box.h / 2;
  const bx1 = b.box.cx - b.box.w / 2;
  const by1 = b.box.cy - b.box.h / 2;
  const bx2 = b.box.cx + b.box.w / 2;
  const by2 = b.box.cy + b.box.h / 2;
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(ax1, bx1));
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(ay1, by1));
  const inter = ix * iy;
  const union = a.box.w * a.box.h + b.box.w * b.box.h - inter;
  return union <= 0 ? 0 : inter / union;
}

export function decodeYoloSeg(
  output: Float32Array,
  numClasses: number,
  confMin = 0.35,
  iouThr = 0.45,
): DecodedDetection[] {
  'worklet';
  const C = 4 + numClasses + 32; // 4 box + 클래스 + 32 mask coef
  const N = Math.floor(output.length / C);
  if (N <= 0) return [];

  const candidates: DecodedDetection[] = [];
  for (let i = 0; i < N; i++) {
    let bestClass = -1;
    let bestScore = 0;
    for (let c = 0; c < numClasses; c++) {
      const s = output[(4 + c) * N + i];
      if (s > bestScore) {
        bestScore = s;
        bestClass = c;
      }
    }
    if (bestScore < confMin) continue;
    candidates.push({
      classId: bestClass,
      confidence: bestScore,
      box: {
        cx: output[0 * N + i],
        cy: output[1 * N + i],
        w: output[2 * N + i],
        h: output[3 * N + i],
      },
    });
  }

  candidates.sort((a, b) => b.confidence - a.confidence);
  const kept: DecodedDetection[] = [];
  for (let i = 0; i < candidates.length && kept.length < 20; i++) {
    const cand = candidates[i];
    let suppressed = false;
    for (let k = 0; k < kept.length; k++) {
      if (kept[k].classId === cand.classId && iou(kept[k], cand) > iouThr) {
        suppressed = true;
        break;
      }
    }
    if (!suppressed) kept.push(cand);
  }
  return kept;
}
