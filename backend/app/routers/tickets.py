from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..admin import require_admin
from ..database import get_db
from ..models import Booking, Event, Ticket, TicketType, User
from ..schemas import TicketOut, TicketTypeOut

router = APIRouter(tags=["tickets"])


def _ticket_rows(db: Session, user_id: int | None = None):
    query = (
        db.query(Ticket, TicketType.type_name, Event.title, User.name)
        .join(Booking, Booking.booking_id == Ticket.booking_id)
        .join(TicketType, TicketType.ticket_type_id == Ticket.ticket_type_id)
        .join(Event, Event.event_id == Booking.event_id)
        .join(User, User.user_id == Booking.user_id)
    )
    if user_id is not None:
        query = query.filter(Booking.user_id == user_id)
    rows = query.order_by(Ticket.issued_at.desc()).all()
    return [
        {
            "ticket_id": ticket.ticket_id,
            "booking_id": ticket.booking_id,
            "ticket_type_id": ticket.ticket_type_id,
            "ticket_type": type_name,
            "event_title": event_title,
            "owner_name": owner_name,
            "status": ticket.status,
            "price": ticket.price,
            "seat": ticket.seat,
            "issued_at": ticket.issued_at,
        }
        for ticket, type_name, event_title, owner_name in rows
    ]


@router.get("/api/tickets/user/{user_id}", response_model=list[TicketOut])
def user_tickets(user_id: int, db: Session = Depends(get_db)):
    return _ticket_rows(db, user_id)


@router.get("/api/tickets/admin", response_model=list[TicketOut])
def all_tickets(
    db: Session = Depends(get_db),
    _: object = Depends(require_admin),
):
    return _ticket_rows(db)


@router.get("/api/ticket-types", response_model=list[TicketTypeOut])
def list_ticket_types(db: Session = Depends(get_db)):
    return db.query(TicketType).order_by(TicketType.ticket_type_id.asc()).all()