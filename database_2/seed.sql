INSERT INTO users (user_id, name, email, password, role)
VALUES
    (1, 'Admin User', 'admin@example.com', 'password123', 'ADMIN'),
    (2, 'Raghav Demo', 'raghav@example.com', 'password123', 'USER')
ON CONFLICT (email) DO NOTHING;

INSERT INTO events (event_id, title, description, category, venue, event_date, capacity, price, status)
VALUES
    (1, 'Build Night', 'A practical evening for students to build small software and hardware projects.', 'TECH', 'Innovation Lab', '2026-10-05T17:30:00Z', 120, 0, 'OPEN'),
    (2, 'AI Systems Workshop', 'Hands-on introduction to neural networks, APIs and deployment.', 'AI', 'Seminar Hall 2', '2026-10-12T10:00:00Z', 80, 199, 'OPEN'),
    (3, 'Hackathon 2026', 'A 24-hour student hackathon focused on practical engineering problems.', 'HACKATHON', 'Main Auditorium', '2026-11-01T09:00:00Z', 300, 299, 'OPEN'),
    (4, 'Design Systems Meetup', 'A compact meetup about interface systems, typography and product design.', 'DESIGN', 'Design Studio', '2026-11-14T15:00:00Z', 60, 99, 'OPEN')
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO ticket_type (ticket_type_id, type_name, lounge_access, complimentary_food)
VALUES
    (1, 'STANDARD', 'N', 'N'),
    (2, 'VIP', 'Y', 'Y'),
    (3, 'ACCESSIBLE', 'N', 'N')
ON CONFLICT (type_name) DO NOTHING;

INSERT INTO bookings (booking_id, user_id, event_id, booking_date, status)
VALUES
    (1, 2, 1, now(), 'CONFIRMED'),
    (2, 2, 2, now(), 'CONFIRMED'),
    (3, 2, 3, now(), 'CONFIRMED'),
    (4, 2, 4, now(), 'CONFIRMED')
ON CONFLICT (booking_id) DO NOTHING;

INSERT INTO ticket (ticket_id, booking_id, ticket_type_id, status, price, seat, issued_at)
VALUES
    (1, 1, 1, 'ACTIVE', 0, 'A-001', now()),
    (2, 2, 1, 'ACTIVE', 199, 'A-002', now()),
    (3, 3, 2, 'ACTIVE', 299, 'A-003', now()),
    (4, 4, 1, 'ACTIVE', 99, 'A-004', now())
ON CONFLICT (booking_id) DO NOTHING;
