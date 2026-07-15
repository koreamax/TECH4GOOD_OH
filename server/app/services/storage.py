from pathlib import Path

from fastapi import UploadFile

MEDIA_DIR = Path(__file__).resolve().parent.parent.parent / "media"


def save_upload(file: UploadFile, subdir: str, name: str) -> str:
    """업로드 파일을 media/<subdir>/<name> 에 저장하고 /media 상대 URL을 돌려준다."""
    target_dir = MEDIA_DIR / subdir
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / name
    target.write_bytes(file.file.read())
    return f"/media/{subdir}/{name}"
