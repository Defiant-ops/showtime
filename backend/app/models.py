from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(150), unique=True)
    password: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(30), default="USER")

    bookings: Mapped[list["Booking"]] = relationship(back_populates="user")


class Event(Base):
    __tablename__ = "events"

    event_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(80))
    venue: Mapped[str] = mapped_column(String(200))
    event_date: Mapped[datetime] = mapped_column(DateTime)
    capacity: Mapped[int] = mapped_column(Integer)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    status: Mapped[str] = mapped_column(String(30), default="OPEN")

    bookings: Mapped[list["Booking"]] = relationship(back_populates="event")


class Booking(Base):
    __tablename__ = "bookings"

    booking_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"))
    event_id: Mapped[int] = mapped_column(ForeignKey("events.event_id"))
    booking_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    status: Mapped[str] = mapped_column(String(30), default="CONFIRMED")

    user: Mapped["User"] = relationship(back_populates="bookings")
    event: Mapped["Event"] = relationship(back_populates="bookings")
    payment: Mapped["Payment | None"] = relationship(back_populates="booking", uselist=False)
    ticket: Mapped["Ticket | None"] = relationship(
        back_populates="booking", uselist=False, cascade="all, delete-orphan"
    )


class Payment(Base):
    __tablename__ = "payments"

    payment_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.booking_id"), unique=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    payment_method: Mapped[str] = mapped_column(String(40))
    payment_status: Mapped[str] = mapped_column(String(30), default="PAID")
    transaction_ref: Mapped[str] = mapped_column(String(100))

    booking: Mapped["Booking"] = relationship(back_populates="payment")


class TicketType(Base):
    __tablename__ = "ticket_type"

    ticket_type_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type_name: Mapped[str] = mapped_column(String(40), unique=True)
    lounge_access: Mapped[str] = mapped_column(String(1), default="N")
    complimentary_food: Mapped[str] = mapped_column(String(1), default="N")

    tickets: Mapped[list["Ticket"]] = relationship(back_populates="ticket_type")


class Ticket(Base):
    __tablename__ = "ticket"

    ticket_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.booking_id"), unique=True)
    ticket_type_id: Mapped[int] = mapped_column(ForeignKey("ticket_type.ticket_type_id"))
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    seat: Mapped[str | None] = mapped_column(String(20), nullable=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    booking: Mapped["Booking"] = relationship(back_populates="ticket")
    ticket_type: Mapped["TicketType"] = relationship(back_populates="tickets")
