from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Booking, Event
from ..admin import require_admin
from ..schemas import EventCreate, EventOut

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=list[EventOut])
def list_events(db: Session = Depends(get_db)):
    return db.query(Event).order_by(Event.event_date.asc()).all()


@router.post("", response_model=EventOut, status_code=201)
def create_event(
    data: EventCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin),
):
    event = Event(**data.model_dump(), status="OPEN")
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=204)
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin),
):
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if db.query(Booking).filter(Booking.event_id == event_id).first():
        raise HTTPException(status_code=409, detail="Delete the event's bookings before deleting this event")
    db.delete(event)
    db.commit()


@router.get("/{event_id}", response_model=EventOut)
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.event_id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.get("/{event_id}/booked-count")
def booked_count(event_id: int, db: Session = Depends(get_db)):
    count = (
        db.query(func.count(Booking.booking_id))
        .filter(Booking.event_id == event_id)
        .scalar()
    )
    return {"event_id": event_id, "booked": count or 0}
