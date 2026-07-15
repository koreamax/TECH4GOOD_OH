# 서버 추론용 모델 가중치

학습된 `best.pt` 를 이 폴더에 두고 환경변수 `MODEL_PATH=/srv/models/best.pt`(도커)
또는 `MODEL_PATH=models/best.pt`(로컬)로 지정하면 `/infer` 가 활성화된다.

가중치가 없으면 `/infer` 는 `{"model": "absent"}` 를 반환하고 웹 프론트는 목 탐지 모드로 동작한다.
(.pt 는 git 미추적 — 팀원에게 직접 전달)
