"""FastAPI entry for the Thai Lottery Lab worker."""

from fastapi import FastAPI

app = FastAPI(title="thai-lottery-worker", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
