const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export type Event = {
  event_id: number;
  title: string;
  description: string;
  category: string;
  venue: string;
  event_date: string;
  capacity: number;
  price: string;
  status: string;
};

export type EventCreate = Omit<Event, "event_id" | "status">;

export type User = {
  user_id: number;
  name: string;
  email: string;
  role: string;
};

export type Booking = {
  booking_id: number;
  user_id: number;
  event_id: number;
  booking_date: string;
  status: string;
  event_title: string;
};

export type Payment = {
  payment_id: number;
  booking_id: number;
  amount: string;
  payment_method: string;
  payment_status: string;
  transaction_ref: string;
};

export type IssuedTicket = {
  ticket_id: number;
  booking_id: number;
  ticket_type_id: number;
  ticket_type: string;
  event_title: string;
  owner_name: string;
  status: string;
  price: string;
  seat: string | null;
  issued_at: string;
};

export type TicketType = {
  ticket_type_id: number;
  type_name: string;
  lounge_access: string;
  complimentary_food: string;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers as Record<string, string> | undefined),
    },
  });

  const data = response.status === 204 ? undefined : await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Request failed");
  }

  return data;
}

export const api = {
  register: (name: string, email: string, password: string) =>
    request<User>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    request<User>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  events: () => request<Event[]>("/api/events"),

  createEvent: (userId: number, event: EventCreate) =>
    request<Event>("/api/events", {
      method: "POST",
      headers: { "X-User-ID": String(userId) },
      body: JSON.stringify(event),
    }),

  deleteEvent: (userId: number, eventId: number) =>
    request<void>(`/api/events/${eventId}`, {
      method: "DELETE",
      headers: { "X-User-ID": String(userId) },
    }),

  bookings: (userId: number) =>
    request<Booking[]>(`/api/bookings/user/${userId}`),

  adminBookings: (userId: number) =>
    request<Booking[]>("/api/bookings/admin", {
      headers: { "X-User-ID": String(userId) },
    }),

  deleteBooking: (userId: number, bookingId: number) =>
    request<void>(`/api/bookings/${bookingId}`, {
      method: "DELETE",
      headers: { "X-User-ID": String(userId) },
    }),

  book: (userId: number, eventId: number) =>
    request<Booking>("/api/bookings", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, event_id: eventId }),
    }),

  payments: (userId: number) =>
    request<Payment[]>(`/api/payments/user/${userId}`),

  adminPayments: (userId: number) =>
    request<Payment[]>("/api/payments/admin", {
      headers: { "X-User-ID": String(userId) },
    }),

  deletePayment: (userId: number, paymentId: number) =>
    request<void>(`/api/payments/${paymentId}`, {
      method: "DELETE",
      headers: { "X-User-ID": String(userId) },
    }),

  demoPayment: (bookingId: number) =>
    request<Payment>(`/api/payments/demo/${bookingId}`, { method: "POST" }),

  tickets: (userId: number) =>
    request<IssuedTicket[]>(`/api/tickets/user/${userId}`),

  adminTickets: (userId: number) =>
    request<IssuedTicket[]>("/api/tickets/admin", {
      headers: { "X-User-ID": String(userId) },
    }),

  ticketTypes: () => request<TicketType[]>("/api/ticket-types"),
};
