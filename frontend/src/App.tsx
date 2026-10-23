import { useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { CalendarDays, Code2, CreditCard, LogOut, Menu, Ticket, TicketCheck, X } from "lucide-react";
import { api, type User } from "./lib/api";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Events from "./pages/Events";
import Bookings from "./pages/Bookings";
import Payments from "./pages/Payments";
import Tickets from "./pages/Tickets";
import Query from "./pages/Query";

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("event_user");
    return raw ? JSON.parse(raw) : null;
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (user) localStorage.setItem("event_user", JSON.stringify(user));
    else localStorage.removeItem("event_user");
  }, [user]);

  const navigate = useNavigate();

  if (!user) {
    return (
      <Routes>
        <Route
          path="/signup"
          element={<Signup onLogin={setUser} onSwitchToLogin={() => navigate("/login")} />}
        />
        <Route
          path="*"
          element={<Login onLogin={setUser} onSwitchToSignup={() => navigate("/signup")} />}
        />
      </Routes>
    );
  }

  function logout() {
    setUser(null);
    navigate("/");
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">ST</span>
          <span>SHOWTIME</span>
        </div>
        <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <nav className={mobileOpen ? "nav open" : "nav"}>
          <NavLink to="/events" onClick={() => setMobileOpen(false)}>
            <CalendarDays size={15} /> Events
          </NavLink>
          <NavLink to="/bookings" onClick={() => setMobileOpen(false)}>
            <Ticket size={15} /> Bookings
          </NavLink>
          <NavLink to="/payments" onClick={() => setMobileOpen(false)}>
            <CreditCard size={15} /> Payments
          </NavLink>
          <NavLink to="/tickets" onClick={() => setMobileOpen(false)}>
            <TicketCheck size={15} /> Tickets
          </NavLink>
          <NavLink to="/query" onClick={() => setMobileOpen(false)}>
            <Code2 size={15} /> Query
          </NavLink>
        </nav>
        <div className="user-area">
          <span className="user-name">{user.name}</span>
          <button className="icon-button" title="Log out" onClick={logout}>
            <LogOut size={15} />
          </button>
        </div>
      </header>

      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/events" replace />} />
          <Route path="/events" element={<Events user={user} />} />
          <Route path="/bookings" element={<Bookings user={user} />} />
          <Route path="/payments" element={<Payments user={user} />} />
          <Route path="/tickets" element={<Tickets user={user} />} />
          <Route path="/query" element={<Query user={user} />} />
          <Route path="*" element={<Navigate to="/events" replace />} />
        </Routes>
      </main>

      <footer className="footer">
        <span>SHOWTIME / EVENT REGISTRY</span>
        <span>FASTAPI · SQLALCHEMY · ORACLE DB</span>
      </footer>
    </div>
  );
}
