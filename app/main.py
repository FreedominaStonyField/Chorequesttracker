from datetime import date
from pathlib import Path
from typing import List

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .database import init_db
from .models import DailyChore
from .schemas import (
    CompleteChoreRequest,
    DailyChoreCreate,
    DailyChoreRead,
    MessageResponse,
    RolloverRequest,
    TemplateCreate,
    TemplateRead,
    WeeklyPoolRead,
    WeeklyPoolStart,
)
from .services import ChoreService


BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="Chore Quest Tracker", version="0.2.0")

templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/", response_class=HTMLResponse)
def home(request: Request) -> HTMLResponse:
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/templates", response_model=TemplateRead, status_code=201)
def create_template(payload: TemplateCreate) -> TemplateRead:
    template = ChoreService.create_template(payload.name, payload.difficulty_percentage)
    return TemplateRead.from_orm(template)


@app.get("/templates", response_model=List[TemplateRead])
def list_templates() -> List[TemplateRead]:
    templates = ChoreService.list_templates()
    return [TemplateRead.from_orm(template) for template in templates]


@app.post("/weeks/start", response_model=WeeklyPoolRead, status_code=201)
def start_week(payload: WeeklyPoolStart) -> WeeklyPoolRead:
    week = ChoreService.start_week(payload.week_start, payload.base_amount)
    return WeeklyPoolRead.from_orm(week)


@app.get("/weeks/active", response_model=WeeklyPoolRead)
def get_active_week() -> WeeklyPoolRead:
    try:
        week = ChoreService.get_active_week_details()
    except ValueError as exc:  # pragma: no cover - FastAPI handles response
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return WeeklyPoolRead.from_orm(week)


@app.post("/chores/distribute", response_model=List[DailyChoreRead], status_code=201)
def distribute_day(payload: DailyChoreCreate) -> List[DailyChoreRead]:
    target_date = payload.date or date.today()
    chores = ChoreService.distribute_day(target_date)
    return [serialize_chore(chore) for chore in chores]


@app.get("/chores", response_model=List[DailyChoreRead])
def get_daily_chores(target_date: date | None = None, status: str = "pending") -> List[DailyChoreRead]:
    target = target_date or date.today()
    allowed_statuses = {"pending", "completed", "expired", "all"}
    if status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"status must be one of {sorted(allowed_statuses)}")
    chores = ChoreService.get_daily_chores(target, status)
    return [serialize_chore(chore) for chore in chores]


@app.post("/chores/{chore_id}/complete", response_model=DailyChoreRead)
def complete_chore(chore_id: int, payload: CompleteChoreRequest) -> DailyChoreRead:
    try:
        chore = ChoreService.complete_chore(chore_id, payload.member_name)
    except ValueError as exc:  # pragma: no cover - FastAPI handles response
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return serialize_chore(chore)


@app.post("/chores/rollover", response_model=MessageResponse)
def rollover_day(payload: RolloverRequest) -> MessageResponse:
    total = ChoreService.rollover_day(payload.date)
    return MessageResponse(message=f"Rolled over ${total:.2f} into next week's bonus")


def serialize_chore(chore: DailyChore) -> DailyChoreRead:
    return DailyChoreRead(
        id=chore.id,
        date=chore.date,
        status=chore.status,
        reward_amount=chore.reward_amount,
        name=chore.template.name,
        difficulty_percentage=chore.template.difficulty_percentage,
        completed_by=chore.completed_by,
        completed_at=chore.completed_at,
    )
