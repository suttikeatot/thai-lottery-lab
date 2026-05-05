"""Stats router for FastAPI."""

from __future__ import annotations

from fastapi import APIRouter, Query

from .compute import compute_gap, compute_rolling, compute_stats

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("")
def get_stats(
    window: str = Query("5y", pattern="^(5y|10y|15y|20y|lastN)$"),
    n: int = Query(50, ge=1, le=1000),
) -> dict:
    return compute_stats(window, n)


@router.get("/rolling")
def get_rolling(
    number: str = Query(..., pattern="^\\d{2}$"),
    window_size: int = Query(20, ge=2, le=200),
) -> dict:
    return compute_rolling(number, window_size)


@router.get("/gap")
def get_gap(
    number: str = Query(..., pattern="^\\d{2}$"),
) -> dict:
    return compute_gap(number)
