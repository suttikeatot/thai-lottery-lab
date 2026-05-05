"""FastAPI entry for the Thai Lottery Lab worker."""

from fastapi import FastAPI

from app.stats.router import router as stats_router

app = FastAPI(title="thai-lottery-worker", version="0.1.0")
app.include_router(stats_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
