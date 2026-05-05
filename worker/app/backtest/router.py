"""Backtest router for FastAPI."""

from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .engine import list_target_dates, run_walk_forward, summarize_results
from .strategies import resolve_strategy

router = APIRouter(prefix="/backtest", tags=["backtest"])


class BacktestRunRequest(BaseModel):
    strategy_key: Literal["random_baseline", "hot_n", "cold_n", "gap_weighted"]
    params: dict[str, Any] = Field(default_factory=dict)
    window_spec: dict[str, Any] = Field(default_factory=dict)
    k: int = Field(default=5, ge=1, le=100)


@router.post("/run")
def run_backtest(request: BacktestRunRequest) -> dict[str, Any]:
    try:
        strategy_fn = resolve_strategy(request.strategy_key)
        target_dates = list_target_dates(request.window_spec)
        predictions = run_walk_forward(
            strategy_fn=strategy_fn,
            params=request.params,
            target_dates=target_dates,
            k=request.k,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    metrics = summarize_results(predictions, request.k)
    return {
        "strategy_key": request.strategy_key,
        "params": request.params,
        "window_spec": request.window_spec,
        "start_date": predictions[0].target_date.isoformat() if predictions else None,
        "end_date": predictions[-1].target_date.isoformat() if predictions else None,
        "metrics": metrics,
        "predictions": [prediction.to_dict() for prediction in predictions],
    }
