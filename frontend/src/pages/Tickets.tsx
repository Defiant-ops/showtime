import { useEffect, useState } from "react";
import { TicketCheck } from "lucide-react";
import { api, type IssuedTicket, type TicketType, type User } from "../lib/api";

export default function Tickets({ user }: { user: User }) {
  const [tickets, setTickets] = useState<IssuedTicket[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [message, setMessage] = useState("");
  const isAdmin = user.role === "ADMIN";

  useEffect(() => {
    Promise.all([
      isAdmin ? api.adminTickets(user.user_id) : api.tickets(user.user_id),
      api.ticketTypes(),
    ])
      .then(([issuedTickets, types]) => {
        setTickets(issuedTickets);
        setTicketTypes(types);
      })
      .catch((err: unknown) => {
        setMessage(err instanceof Error ? err.message : "Could not load tickets");
      });
  }, [isAdmin, user.user_id]);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">SHOWTIME / TICKET REGISTRY</div>
          <h1>Tickets</h1>
          <p>{isAdmin ? "Issued tickets and available ticket types." : "Your issued tickets and available ticket types."}</p>
        </div>
        <div className="metric">
          <b>{tickets.length}</b>
          <span>ISSUED TICKETS</span>
        </div>
      </div>

      {message && <div className="notice">{message}</div>}

      <section className="ticket-section">
        <div className="section-heading">
          <h2>Issued tickets</h2>
          <span className="eyebrow">{tickets.length.toString().padStart(2, "0")} RECORDS</span>
        </div>
        <div className="event-table">
          <div className="table-row table-header">
            <span>TICKET</span>
            <span>EVENT / OWNER</span>
            <span>TYPE</span>
            <span>SEAT</span>
            <span>PRICE</span>
            <span>STATUS</span>
          </div>
          {tickets.map((ticket) => (
            <div className="table-row ticket-row" key={ticket.ticket_id}>
              <span className="event-title-cell"><TicketCheck size={15} /><strong>#{ticket.ticket_id}</strong></span>
              <span className="ticket-event">
                <strong>{ticket.event_title}</strong>
                {isAdmin && <small>{ticket.owner_name}</small>}
              </span>
              <span><span className="tag">{ticket.ticket_type}</span></span>
              <span className="mono">{ticket.seat || "UNASSIGNED"}</span>
              <span className="price">{Number(ticket.price) === 0 ? "FREE" : `₹${ticket.price}`}</span>
              <span><span className="status open">{ticket.status}</span></span>
            </div>
          ))}
          {tickets.length === 0 && <div className="empty">NO ISSUED TICKETS</div>}
        </div>
      </section>

      <section className="ticket-section">
        <div className="section-heading">
          <h2>Ticket types</h2>
          <span className="eyebrow">{ticketTypes.length.toString().padStart(2, "0")} TYPES</span>
        </div>
        <div className="event-table">
          <div className="table-row table-header ticket-type-row">
            <span>TYPE</span>
            <span>LOUNGE ACCESS</span>
            <span>COMPLIMENTARY FOOD</span>
          </div>
          {ticketTypes.map((type) => (
            <div className="table-row ticket-type-row" key={type.ticket_type_id}>
              <span className="event-title-cell"><strong>{type.type_name}</strong></span>
              <span><span className={`status ${type.lounge_access === "Y" ? "open" : ""}`}>{type.lounge_access === "Y" ? "INCLUDED" : "NOT INCLUDED"}</span></span>
              <span><span className={`status ${type.complimentary_food === "Y" ? "open" : ""}`}>{type.complimentary_food === "Y" ? "INCLUDED" : "NOT INCLUDED"}</span></span>
            </div>
          ))}
          {ticketTypes.length === 0 && <div className="empty">NO TICKET TYPES CONFIGURED</div>}
        </div>
      </section>
    </>
  );
}