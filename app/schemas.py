from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, validator


class TemplateCreate(BaseModel):
    name: str
    difficulty_percentage: float

    @validator("difficulty_percentage")
    def validate_percentage(cls, value: float) -> float:
        if not 0 < value <= 100:
            raise ValueError("difficulty_percentage must be between 0 and 100")
        return value


class TemplateRead(BaseModel):
    id: int
    name: str
    difficulty_percentage: float
    is_active: bool

    class Config:
        orm_mode = True


class WeeklyPoolStart(BaseModel):
    week_start: date
    base_amount: float

    @validator("base_amount")
    def validate_amount(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("base_amount must be greater than zero")
        return value


class WeeklyPoolRead(BaseModel):
    id: int
    week_start: date
    base_amount: float
    bonus_carryover: float
    total_pool: float
    available_amount: float

    class Config:
        orm_mode = True


class DailyChoreCreate(BaseModel):
    date: Optional[date] = None


class DailyChoreRead(BaseModel):
    id: int
    date: date
    status: str
    reward_amount: float
    name: str
    difficulty_percentage: float
    completed_by: Optional[str]
    completed_at: Optional[datetime]


class CompleteChoreRequest(BaseModel):
    member_name: str


class RolloverRequest(BaseModel):
    date: date


class MessageResponse(BaseModel):
    message: str
