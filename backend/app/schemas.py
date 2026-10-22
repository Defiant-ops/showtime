from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class LoginRequest(BaseModel):
    email: str
    password: str


class UserCreate(BaseModel):
    name: str
    email: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    name: str
    email: str
    role: str


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_id: int
    title: str
    description: str
    category: str
    venue: str
    event_date: datetime
    capacity: int
    price: Decimal
    status: str


class EventCreate(BaseModel):
    title: str
    description: str
    category: str
    venue: str
    event_date: datetime
    capacity: int
    price: Decimal


class BookingCreate(BaseModel):
    user_id: int
    event_id: int


class BookingOut(BaseModel):
    booking_id: int
    user_id: int
    event_id: int
    booking_date: datetime
    status: str
    event_title: str


class PaymentOut(BaseModel):
    payment_id: int
    booking_id: int
    amount: Decimal
    payment_method: str
    payment_status: str
    transaction_ref: str


class TicketOut(BaseModel):
    ticket_id: int
    booking_id: int
    ticket_type_id: int
    ticket_type: str
    event_title: str
    owner_name: str
    status: str
    price: Decimal
    seat: str | None
    issued_at: datetime


class TicketTypeOut(BaseModel):
    ticket_type_id: int
    type_name: str
    lounge_access: str
    complimentary_food: str
