from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlmodel import Field, Relationship, SQLModel


class ChoreTemplate(SQLModel, table=True):
    __tablename__ = "chore_templates"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    difficulty_percentage: float = Field(description="Percentage of the weekly pool allocated to this chore")
    is_active: bool = Field(default=True, index=True)

    chores: list[DailyChore] = Relationship(back_populates="template")  # type: ignore[name-defined]


class WeeklyPool(SQLModel, table=True):
    __tablename__ = "weekly_pools"

    id: Optional[int] = Field(default=None, primary_key=True)
    week_start: date = Field(index=True)
    base_amount: float
    bonus_carryover: float = Field(default=0.0)
    total_pool: float = Field(description="Base amount plus bonus carryover")
    available_amount: float = Field(description="Remaining pool available for payouts")

    chores: list[DailyChore] = Relationship(back_populates="week")  # type: ignore[name-defined]


class SystemState(SQLModel, table=True):
    __tablename__ = "system_state"

    id: Optional[int] = Field(default=1, primary_key=True)
    active_week_id: Optional[int] = Field(default=None, foreign_key="weekly_pools.id")
    pending_bonus: float = Field(default=0.0, description="Bonus to add to the next week's pool")

    active_week: Optional[WeeklyPool] = Relationship()


class DailyChore(SQLModel, table=True):
    __tablename__ = "daily_chores"

    id: Optional[int] = Field(default=None, primary_key=True)
    date: date = Field(index=True)
    status: str = Field(default="pending", index=True)
    reward_amount: float
    template_id: int = Field(foreign_key="chore_templates.id")
    week_id: int = Field(foreign_key="weekly_pools.id")
    completed_by: Optional[str] = Field(default=None, index=True)
    completed_at: Optional[datetime] = Field(default=None)

    template: ChoreTemplate = Relationship(back_populates="chores")
    week: WeeklyPool = Relationship(back_populates="chores")
