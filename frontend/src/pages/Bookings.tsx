import { useEffect, useState } from "react";
import { ArrowUpRight, CreditCard, Ticket, X, CheckCircle2, Trash2 } from "lucide-react";
import { api, type Booking, type Payment, type User } from "../lib/api";

export default function Bookings({ user }: { user: User }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [message, setMessage] = useState("");

  // Demo Payment Modal state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "UPI" | "NETBANKING">("CARD");
  const [paying, setPaying] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const isAdmin = user.role === "ADMIN";

  async function load() {
    try {
      const [userBookings, userPayments] = await Promise.all([
        isAdmin ? api.adminBookings(user.user_id) : api.bookings(user.user_id),
        isAdmin ? api.adminPayments(user.user_id) : api.payments(user.user_id),
      ]);
      setBookings(userBookings);
      setPayments(userPayments);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not load bookings");
    }
  }

  async function deleteBooking(booking: Booking) {
    if (!window.confirm(`Delete booking #${booking.booking_id}? Any associated payment will also be removed.`)) return;
    try {
      await api.deleteBooking(user.user_id, booking.booking_id);
      await load();
      setMessage("Booking deleted.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not delete booking");
    }
  }

  useEffect(() => {
    load();
  }, [user.user_id]);

  const paidBookingIds = new Set(payments.map((p) => p.booking_id));

  async function handleConfirmPayment() {
    if (!selectedBooking) return;
    setPaying(true);
    setSuccessMsg("");
    try {
      await api.demoPayment(selectedBooking.booking_id);
      setSuccessMsg(`Demo payment successfully recorded for #${selectedBooking.booking_id}!`);
      await load();
      setTimeout(() => {
        setSelectedBooking(null);
        setSuccessMsg("");
      }, 1500);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">SHOWTIME / BOOKINGS</div>
          <h1>Bookings</h1>
          <p>{isAdmin ? "All event reservations and payment status." : "Your event reservations and payment status."}</p>
        </div>
        <div className="metric">
          <b>{bookings.length}</b>
          <span>RESERVATIONS</span>
        </div>
      </div>

      {message && <div className="notice">{message}</div>}

      <div className="event-table">
        <div className="table-row table-header">
          <span>EVENT</span>
          <span>BOOKING ID</span>
          <span>BOOKED AT</span>
          <span>STATUS</span>
          <span>PAYMENT</span>
          <span />
        </div>

        {bookings.map((booking) => {
          const isPaid = paidBookingIds.has(booking.booking_id);
          return (
            <div className="table-row" key={booking.booking_id}>
              <span className="event-title-cell">
                <Ticket size={15} />
                <strong>{booking.event_title}</strong>
              </span>
              <span className="mono">#{booking.booking_id}</span>
              <span className="muted">{new Date(booking.booking_date).toLocaleString()}</span>
              <span>
                <span className="status open">{booking.status}</span>
              </span>
              <span>
                {isAdmin ? (
                  <span className={isPaid ? "tag" : "muted"}>{isPaid ? "PAID" : "UNPAID"}</span>
                ) : isPaid ? (
                  <span className="tag" style={{ borderColor: "#3d4c32", color: "#91a971" }}>
                    PAID
                  </span>
                ) : (
                  <button
                    className="primary-button compact"
                    onClick={() => {
                      setSelectedBooking(booking);
                      setSuccessMsg("");
                    }}
                  >
                    PAY NOW
                  </button>
                )}
              </span>
              {isAdmin ? (
                <button className="icon-button delete-button" title="Delete booking" onClick={() => deleteBooking(booking)}>
                  <Trash2 size={14} />
                </button>
              ) : <ArrowUpRight size={15} />}
            </div>
          );
        })}

        {bookings.length === 0 && <div className="empty">NO BOOKINGS YET</div>}
      </div>

      {/* Demo Payment Modal */}
      {selectedBooking && (
        <div className="modal-backdrop" onClick={() => setSelectedBooking(null)}>
          <div className="event-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <div>
                <div className="eyebrow">DEMO PAYMENT GATEWAY</div>
                <h2>Checkout #{selectedBooking.booking_id}</h2>
              </div>
              <button className="close" onClick={() => setSelectedBooking(null)}>
                <X size={20} />
              </button>
            </div>

            <p className="muted" style={{ margin: "12px 0 16px" }}>
              Event: <strong>{selectedBooking.event_title}</strong>
            </p>

            {successMsg ? (
              <div className="notice" style={{ borderColor: "#3d4c32", color: "#91a971", background: "#151e12" }}>
                <CheckCircle2 size={18} style={{ verticalAlign: "middle", marginRight: "8px" }} />
                {successMsg}
              </div>
            ) : (
              <>
                <div style={{ fontSize: "11px", color: "#68655f", letterSpacing: ".1em", fontWeight: 700 }}>
                  SELECT PAYMENT METHOD
                </div>

                <div className="payment-methods">
                  <div
                    className={`payment-option ${paymentMethod === "CARD" ? "selected" : ""}`}
                    onClick={() => setPaymentMethod("CARD")}
                  >
                    <CreditCard size={18} />
                    <span>Card</span>
                  </div>
                  <div
                    className={`payment-option ${paymentMethod === "UPI" ? "selected" : ""}`}
                    onClick={() => setPaymentMethod("UPI")}
                  >
                    <Ticket size={18} />
                    <span>UPI / QR</span>
                  </div>
                  <div
                    className={`payment-option ${paymentMethod === "NETBANKING" ? "selected" : ""}`}
                    onClick={() => setPaymentMethod("NETBANKING")}
                  >
                    <ArrowUpRight size={18} />
                    <span>NetBanking</span>
                  </div>
                </div>

                <div className="detail-grid">
                  <div>
                    <span>Mode:</span> <strong>{paymentMethod} (Simulated)</strong>
                  </div>
                  <div>
                    <span>Action:</span> <strong>Direct DB insertion</strong>
                  </div>
                </div>

                <div className="modal-bottom">
                  <div>
                    <span className="muted" style={{ fontSize: "10px", display: "block" }}>STATUS</span>
                    <strong style={{ color: "#91a971" }}>READY TO PROCESS</strong>
                  </div>
                  <button className="primary-button" onClick={handleConfirmPayment} disabled={paying}>
                    {paying ? "RECORDING..." : "CONFIRM DEMO PAYMENT"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
