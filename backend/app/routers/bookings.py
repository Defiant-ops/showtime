from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import commit_with_retry, get_db
from ..models import Booking, Event, User
from ..admin import require_admin
from ..schemas import BookingCreate, BookingOut

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


def _booking_rows(db: Session, user_id: int | None = None):
    query = db.query(Booking, Event.title).join(Event, Event.event_id == Booking.event_id)
    if user_id is not None:
        query = query.filter(Booking.user_id == user_id)
    rows = query.order_by(Booking.booking_date.desc()).all()
    return [
        {
            "booking_id": booking.booking_id,
            "user_id": booking.user_id,
            "event_id": booking.event_id,
            "booking_date": booking.booking_date,
            "status": booking.status,
            "event_title": title,
        }
        for booking, title in rows
    ]


@router.get("/user/{user_id}", response_model=list[BookingOut])
def user_bookings(user_id: int, db: Session = Depends(get_db)):
    return _booking_rows(db, user_id)


@router.get("/admin", response_model=list[BookingOut])
def all_bookings(
    db: Session = Depends(get_db),
    _: object = Depends(require_admin),
):
    return _booking_rows(db)


@router.delete("/{booking_id}", status_code=204)
def delete_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_admin),
):
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.payment:
        db.delete(booking.payment)
    db.delete(booking)
    commit_with_retry(db)


@router.post("", response_model=BookingOut)
def create_booking(data: BookingCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_id == data.user_id).first()
    event = db.query(Event).filter(Event.event_id == data.event_id).first()

    if not user or not event:
        raise HTTPException(status_code=404, detail="User or event not found")

    if event.status != "OPEN":
        raise HTTPException(status_code=400, detail="Event is not open")

    existing = (
        db.query(Booking)
        .filter(
            Booking.user_id == data.user_id,
            Booking.event_id == data.event_id,
            Booking.status == "CONFIRMED",
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="You already booked this event")

    booking = Booking(user_id=data.user_id, event_id=data.event_id)
    db.add(booking)
    commit_with_retry(db)
    db.refresh(booking)

    return {
        "booking_id": booking.booking_id,
        "user_id": booking.user_id,
        "event_id": booking.event_id,
        "booking_date": booking.booking_date,
        "status": booking.status,
        "event_title": event.title,
    }
