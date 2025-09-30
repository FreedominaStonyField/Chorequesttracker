from __future__ import annotations

from datetime import date, datetime
from typing import Iterable, List

from sqlmodel import select

from .database import get_session
from .models import ChoreTemplate, DailyChore, SystemState, WeeklyPool


class ChoreService:
    @staticmethod
    def ensure_state(session) -> SystemState:
        state = session.exec(select(SystemState)).first()
        if not state:
            state = SystemState()
            session.add(state)
            session.commit()
            session.refresh(state)
        return state

    @staticmethod
    def create_template(name: str, difficulty_percentage: float) -> ChoreTemplate:
        with get_session() as session:
            template = ChoreTemplate(name=name, difficulty_percentage=difficulty_percentage)
            session.add(template)
            session.commit()
            session.refresh(template)
            return template

    @staticmethod
    def list_templates(active_only: bool = True) -> List[ChoreTemplate]:
        with get_session() as session:
            query = select(ChoreTemplate)
            if active_only:
                query = query.where(ChoreTemplate.is_active.is_(True))
            return list(session.exec(query))

    @staticmethod
    def start_week(week_start: date, base_amount: float) -> WeeklyPool:
        with get_session() as session:
            state = ChoreService.ensure_state(session)

            bonus = state.pending_bonus
            total_pool = base_amount + bonus
            week = WeeklyPool(
                week_start=week_start,
                base_amount=base_amount,
                bonus_carryover=bonus,
                total_pool=total_pool,
                available_amount=total_pool,
            )
            session.add(week)
            session.flush()

            state.active_week_id = week.id
            state.pending_bonus = 0.0

            session.add(state)
            session.commit()
            session.refresh(week)
            return week

    @staticmethod
    def get_active_week(session) -> WeeklyPool:
        state = ChoreService.ensure_state(session)
        if not state.active_week_id:
            raise ValueError("No active week. Start a week before distributing chores.")
        week = session.get(WeeklyPool, state.active_week_id)
        if not week:
            raise ValueError("Active week record is missing.")
        return week

    @staticmethod
    def distribute_day(date_value: date) -> List[DailyChore]:
        with get_session() as session:
            week = ChoreService.get_active_week(session)
            templates: Iterable[ChoreTemplate] = session.exec(
                select(ChoreTemplate).where(ChoreTemplate.is_active.is_(True))
            )

            for template in templates:
                reward = round((template.difficulty_percentage / 100.0) * week.total_pool, 2)
                chore = DailyChore(
                    date=date_value,
                    reward_amount=reward,
                    template_id=template.id,
                    week_id=week.id,
                )
                session.add(chore)

            session.commit()

            statement = (
                select(DailyChore)
                .where(DailyChore.date == date_value)
                .where(DailyChore.week_id == week.id)
                .join(DailyChore.template)
                .order_by(DailyChore.id)
            )
            return list(session.exec(statement))

    @staticmethod
    def get_daily_chores(date_value: date, status_filter: str = "pending") -> List[DailyChore]:
        with get_session() as session:
            statement = (
                select(DailyChore)
                .where(DailyChore.date == date_value)
                .join(DailyChore.template)
                .order_by(DailyChore.id)
            )
            if status_filter and status_filter != "all":
                statement = statement.where(DailyChore.status == status_filter)
            return list(session.exec(statement))

    @staticmethod
    def get_active_week_details() -> WeeklyPool:
        with get_session() as session:
            state = ChoreService.ensure_state(session)
            if not state.active_week_id:
                raise ValueError("No active week. Start a week before fetching details.")
            week = session.get(WeeklyPool, state.active_week_id)
            if not week:
                raise ValueError("Active week record is missing.")
            session.refresh(week)
            return week

    @staticmethod
    def complete_chore(chore_id: int, member_name: str) -> DailyChore:
        with get_session() as session:
            chore = session.get(DailyChore, chore_id)
            if not chore:
                raise ValueError("Chore not found")
            if chore.status != "pending":
                raise ValueError("Chore is not available for completion")

            week = session.get(WeeklyPool, chore.week_id)
            if not week:
                raise ValueError("Associated weekly pool not found")

            if week.available_amount < chore.reward_amount:
                raise ValueError("Insufficient pool funds for this chore reward")

            chore.status = "completed"
            chore.completed_by = member_name
            chore.completed_at = datetime.utcnow()

            week.available_amount = round(week.available_amount - chore.reward_amount, 2)

            session.add(chore)
            session.add(week)
            session.commit()

            statement = select(DailyChore).where(DailyChore.id == chore.id).join(DailyChore.template)
            return session.exec(statement).one()

    @staticmethod
    def rollover_day(date_value: date) -> float:
        with get_session() as session:
            state = ChoreService.ensure_state(session)

            statement = (
                select(DailyChore)
                .where(DailyChore.date == date_value)
                .where(DailyChore.status == "pending")
            )
            chores = list(session.exec(statement))
            unclaimed_total = round(sum(chore.reward_amount for chore in chores), 2)

            for chore in chores:
                chore.status = "expired"
                session.add(chore)

            state.pending_bonus = round(state.pending_bonus + unclaimed_total, 2)
            session.add(state)

            session.commit()
            return unclaimed_total
