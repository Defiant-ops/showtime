import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, Calendar, Users, ArrowUpRight, Plus, Trash2, X } from "lucide-react";
import { api, type Event, type EventCreate, type User } from "../lib/api";

export default function Events({ user }: { user: User }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [selected, setSelected] = useState<Event | null>(null);
  const [message, setMessage] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    venue: "",
    event_date: "",
    capacity: "",
    price: "0",
  });
  const isAdmin = user.role === "ADMIN";

  useEffect(() => {
    api.events().then(setEvents).catch((err) => setMessage(err.message));
  }, []);

  async function loadEvents() {
    setEvents(await api.events());
  }

  const categories = useMemo(
    () => ["ALL", ...Array.from(new Set(events.map((event) => event.category)))],
    [events],
  );

  const filtered = events.filter((event) => {
    const haystack = `${event.title} ${event.description} ${event.venue} ${event.category}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) &&
      (category === "ALL" || event.category === category);
  });

  async function book(eventId: number) {
    try {
      await api.book(user.user_id, eventId);
      setMessage("Booking created successfully.");
      setSelected(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Booking failed");
    }
  }

  async function addEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const event: EventCreate = {
        ...form,
        event_date: new Date(form.event_date).toISOString(),
        capacity: Number(form.capacity),
      };
      await api.createEvent(user.user_id, event);
      await loadEvents();
      setAdding(false);
      setMessage("Event added successfully.");
      setForm({ title: "", description: "", category: "", venue: "", event_date: "", capacity: "", price: "0" });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not add event");
    }
  }

  async function deleteEvent(event: Event) {
    if (!window.confirm(`Delete event “${event.title}”?`)) return;
    try {
      await api.deleteEvent(user.user_id, event.event_id);
      await loadEvents();
      setMessage("Event deleted.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not delete event");
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">SHOWTIME / {events.length.toString().padStart(2, "0")} EVENTS</div>
          <h1>Events</h1>
          <p>Browse upcoming events and reserve a place.</p>
        </div>
        {isAdmin ? (
          <button className="primary-button compact" onClick={() => setAdding(true)}>
            <Plus size={14} /> ADD EVENT
          </button>
        ) : (
          <div className="head-status"><span className="status-dot" /> DATABASE ONLINE</div>
        )}
      </div>

      {message && <div className="notice">{message}</div>}

      <div className="toolbar">
        <div className="search">
          <Search size={15} />
          <input
            placeholder="Search events, venues, categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>

      <div className="event-table">
        <div className="table-row table-header">
          <span>EVENT</span>
          <span>CATEGORY</span>
          <span>DATE / VENUE</span>
          <span>PRICE</span>
          <span>STATUS</span>
          <span />
        </div>

        {filtered.map((event, index) => (
          <div
            className="table-row event-row"
            key={event.event_id}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              if (!(e.target as HTMLElement).closest("button")) setSelected(event);
            }}
            onKeyDown={(e) => {
              if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                setSelected(event);
              }
            }}
          >
            <span className="event-title-cell">
              <b>{String(index + 1).padStart(2, "0")}</b>
              <strong>{event.title}</strong>
            </span>
            <span><span className="tag">{event.category}</span></span>
            <span className="muted">
              {new Date(event.event_date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
              <br />
              {event.venue}
            </span>
            <span className="price">{Number(event.price) === 0 ? "FREE" : `₹${event.price}`}</span>
            <span><span className="status open">{event.status}</span></span>
            <span className="row-actions">
              {isAdmin && (
                <button className="icon-button delete-button" title="Delete event" onClick={() => deleteEvent(event)}>
                  <Trash2 size={14} />
                </button>
              )}
              <ArrowUpRight size={15} />
            </span>
          </div>
        ))}

        {filtered.length === 0 && <div className="empty">NO MATCHING EVENTS</div>}
      </div>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section className="event-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <span className="eyebrow">{selected.category}</span>
              <button className="close" onClick={() => setSelected(null)}>×</button>
            </div>
            <h2>{selected.title}</h2>
            <p>{selected.description}</p>
            <div className="detail-grid">
              <div><Calendar size={15} /><span>{new Date(selected.event_date).toLocaleString()}</span></div>
              <div><MapPin size={15} /><span>{selected.venue}</span></div>
              <div><Users size={15} /><span>{selected.capacity} capacity</span></div>
            </div>
            <div className="modal-bottom">
              <span className="big-price">{Number(selected.price) === 0 ? "FREE" : `₹${selected.price}`}</span>
              {!isAdmin && (
                <button className="primary-button compact" onClick={() => book(selected.event_id)}>
                  RESERVE PLACE
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {adding && (
        <div className="modal-backdrop" onClick={() => setAdding(false)}>
          <section className="event-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <div>
                <div className="eyebrow">ADMIN / EVENT REGISTRY</div>
                <h2>Add event</h2>
              </div>
              <button className="close" title="Close" onClick={() => setAdding(false)}><X size={20} /></button>
            </div>
            <form className="admin-form" onSubmit={addEvent}>
              <label>EVENT TITLE<input required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
              <label>DESCRIPTION<textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
              <div className="form-pair">
                <label>CATEGORY<input required maxLength={80} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
                <label>VENUE<input required maxLength={200} value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></label>
              </div>
              <div className="form-pair">
                <label>DATE & TIME<input required type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></label>
                <label>CAPACITY<input required type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></label>
              </div>
              <label>PRICE<input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
              <div className="modal-bottom">
                <span className="muted">New event status: OPEN</span>
                <button className="primary-button compact" type="submit">ADD EVENT</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
