from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class Walk(Base):
    __tablename__ = "walks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    started_at: Mapped[str] = mapped_column(String)
    ended_at: Mapped[str] = mapped_column(String)
    distance_m: Mapped[float] = mapped_column(Float, default=0)
    duration_s: Mapped[int] = mapped_column(Integer, default=0)
    route_json: Mapped[str] = mapped_column(Text, default="[]")
    dog_photo_path: Mapped[str | None] = mapped_column(String, nullable=True)
    user_name: Mapped[str] = mapped_column(String, default="익명의 순찰대원")


class Detection(Base):
    __tablename__ = "detections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    walk_id: Mapped[int | None] = mapped_column(ForeignKey("walks.id"), nullable=True)
    class_name: Mapped[str] = mapped_column(String)
    confidence: Mapped[float] = mapped_column(Float)
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    image_path: Mapped[str | None] = mapped_column(String, nullable=True)
    # pending(미검증) / confirmed(맞아요) / rejected(아니에요 = 오탐, 재학습 데이터)
    verified: Mapped[str] = mapped_column(String, default="pending")
    created_at: Mapped[str] = mapped_column(String)


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    detection_id: Mapped[int] = mapped_column(ForeignKey("detections.id"))
    title: Mapped[str] = mapped_column(String)
    content: Mapped[str] = mapped_column(Text)
    address: Mapped[str] = mapped_column(String, default="")
    receipt_no: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="접수완료")
    created_at: Mapped[str] = mapped_column(String)
