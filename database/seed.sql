INSERT INTO users (name, email, password, role)
SELECT 'Admin User', 'admin@example.com', 'password123', 'ADMIN' FROM dual
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@example.com');

INSERT INTO users (name, email, password, role)
SELECT 'Raghav Demo', 'raghav@example.com', 'password123', 'USER' FROM dual
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'raghav@example.com');

INSERT INTO events (title, description, category, venue, event_date, capacity, price, status)
SELECT
    'Build Night',
    'A practical evening for students to build small software and hardware projects.',
    'TECH',
    'Innovation Lab',
    TIMESTAMP '2026-10-05 17:30:00',
    120,
    0,
    'OPEN'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM events WHERE title = 'Build Night' AND venue = 'Innovation Lab');

INSERT INTO events (title, description, category, venue, event_date, capacity, price, status)
SELECT
    'AI Systems Workshop',
    'Hands-on introduction to neural networks, APIs and deployment.',
    'AI',
    'Seminar Hall 2',
    TIMESTAMP '2026-10-12 10:00:00',
    80,
    199,
    'OPEN'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM events WHERE title = 'AI Systems Workshop' AND venue = 'Seminar Hall 2');

INSERT INTO events (title, description, category, venue, event_date, capacity, price, status)
SELECT
    'Hackathon 2026',
    'A 24-hour student hackathon focused on practical engineering problems.',
    'HACKATHON',
    'Main Auditorium',
    TIMESTAMP '2026-11-01 09:00:00',
    300,
    299,
    'OPEN'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM events WHERE title = 'Hackathon 2026' AND venue = 'Main Auditorium');

INSERT INTO events (title, description, category, venue, event_date, capacity, price, status)
SELECT
    'Design Systems Meetup',
    'A compact meetup about interface systems, typography and product design.',
    'DESIGN',
    'Design Studio',
    TIMESTAMP '2026-11-14 15:00:00',
    60,
    99,
    'OPEN'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM events WHERE title = 'Design Systems Meetup' AND venue = 'Design Studio');

INSERT INTO ticket_type (type_name, lounge_access, complimentary_food)
SELECT 'STANDARD', 'N', 'N' FROM dual
WHERE NOT EXISTS (SELECT 1 FROM ticket_type WHERE type_name = 'STANDARD');

INSERT INTO ticket_type (type_name, lounge_access, complimentary_food)
SELECT 'VIP', 'Y', 'Y' FROM dual
WHERE NOT EXISTS (SELECT 1 FROM ticket_type WHERE type_name = 'VIP');

INSERT INTO ticket_type (type_name, lounge_access, complimentary_food)
SELECT 'ACCESSIBLE', 'N', 'N' FROM dual
WHERE NOT EXISTS (SELECT 1 FROM ticket_type WHERE type_name = 'ACCESSIBLE');

INSERT INTO bookings (user_id, event_id, booking_date, status)
SELECT u.user_id, e.event_id, CURRENT_TIMESTAMP, 'CONFIRMED'
FROM users u CROSS JOIN events e
WHERE u.email = 'raghav@example.com'
  AND e.title IN ('Build Night', 'AI Systems Workshop', 'Hackathon 2026', 'Design Systems Meetup')
  AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.user_id = u.user_id AND b.event_id = e.event_id
  );

INSERT INTO ticket (booking_id, ticket_type_id, status, price, seat, issued_at)
SELECT
    b.booking_id,
    tt.ticket_type_id,
    'ACTIVE',
    e.price,
    'A-' || TO_CHAR(ROW_NUMBER() OVER (ORDER BY e.event_date), 'FM000'),
    CURRENT_TIMESTAMP
FROM bookings b
JOIN users u ON u.user_id = b.user_id
JOIN events e ON e.event_id = b.event_id
JOIN ticket_type tt ON tt.type_name = CASE
    WHEN e.category = 'HACKATHON' THEN 'VIP'
    ELSE 'STANDARD'
END
WHERE u.email = 'raghav@example.com'
  AND e.title IN ('Build Night', 'AI Systems Workshop', 'Hackathon 2026', 'Design Systems Meetup')
  AND NOT EXISTS (SELECT 1 FROM ticket t WHERE t.booking_id = b.booking_id);

COMMIT;
