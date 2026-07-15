import { useEffect, useMemo, useState } from 'react';
import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';
import { runAtTargetFps, useFrameProcessor } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import { useResizePlugin } from 'vision-camera-resize-plugin';

import { CLASSES, DAMAGED_CLASS_IDS, MODEL_INPUT_SIZE } from '../config';
import { decodeYoloSeg, DecodedDetection } from './decodeYoloSeg';

// 모델(app/assets/models/model.tflite) 탑재 후 아래 require 주석을 해제할 것.
// 파일이 없는 상태로 해제하면 Metro 번들이 실패한다 (require 는 정적으로 해석됨).
// const MODEL_ASSET = require('../../assets/models/model.tflite');
const MODEL_ASSET: unknown = null;

export interface TfliteDetectionEvent {
  className: string;
  confidence: number;
}

/** 온디바이스 추론 프레임 프로세서. enabled=false 또는 모델 미탑재면 undefined 반환(목 모드). */
export function useTfliteFrameProcessor(
  enabled: boolean,
  onDetection: (e: TfliteDetectionEvent) => void,
) {
  const [model, setModel] = useState<TensorflowModel | null>(null);
  const { resize } = useResizePlugin();

  useEffect(() => {
    if (!enabled || MODEL_ASSET == null || model != null) return;
    loadTensorflowModel(MODEL_ASSET as never)
      .then((m) => {
        console.log('TFLite 로드 완료. 출력 텐서:', JSON.stringify(m.outputs));
        setModel(m);
      })
      .catch((e) => console.warn('TFLite 로드 실패 — 목 모드로 데모하세요:', e));
  }, [enabled, model]);

  const emit = useMemo(() => Worklets.createRunOnJS(onDetection), [onDetection]);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      if (model == null) return;
      runAtTargetFps(1, () => {
        'worklet';
        const input = resize(frame, {
          scale: { width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE },
          pixelFormat: 'rgb',
          dataType: 'float32',
        });
        const outputs = model.runSync([input]);
        const dets = decodeYoloSeg(outputs[0] as unknown as Float32Array, CLASSES.length);
        let best: DecodedDetection | null = null;
        for (const d of dets) {
          if (DAMAGED_CLASS_IDS.indexOf(d.classId) === -1) continue; // damaged 만 알람 대상
          if (best == null || d.confidence > best.confidence) best = d;
        }
        if (best != null) {
          emit({ className: CLASSES[best.classId], confidence: best.confidence });
        }
      });
    },
    [model, emit],
  );

  return enabled && MODEL_ASSET != null ? frameProcessor : undefined;
}
