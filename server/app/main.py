from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402

from .db import Base, engine  # noqa: E402
from .routers import complaints, detections, feed, infer, mapdata, reports, walks  # noqa: E402
from .services.geocode import reverse_geocode  # noqa: E402
from .services.storage import MEDIA_DIR  # noqa: E402

Base.metadata.create_all(engine)
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Paw Patrol Network API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

for router_module in (walks, detections, reports, complaints, mapdata, feed, infer):
    app.include_router(router_module.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/geocode/reverse")
def geocode(lat: float, lng: float):
    return {"address": reverse_geocode(lat, lng)}
