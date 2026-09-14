import { getDatabase } from '../db/database.ts';
import type { Booking, NewBooking } from '../types.ts';

type BookingRow = {
  id: number;
  room_id: number;
  title: string;
  booked_by: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
};

const columns = 'id, room_id, title, booked_by, starts_at, ends_at, created_at';

function toBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    roomId: row.room_id,
    title: row.title,
    bookedBy: row.booked_by,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
  };
}

export function findAll(): Booking[] {
  const rows = getDatabase()
    .prepare(`SELECT ${columns} FROM bookings ORDER BY starts_at`)
    .all() as BookingRow[];

  return rows.map(toBooking);
}

export function findById(id: number): Booking | null {
  const row = getDatabase().prepare(`SELECT ${columns} FROM bookings WHERE id = ?`).get(id);

  return row ? toBooking(row as BookingRow) : null;
}

export function findByRoom(roomId: number): Booking[] {
  const rows = getDatabase()
    .prepare(`SELECT ${columns} FROM bookings WHERE room_id = ? ORDER BY starts_at`)
    .all(roomId) as BookingRow[];

  return rows.map(toBooking);
}

export function findOverlapping(roomId: number, startsAt: string, endsAt: string): Booking[] {
  const rows = getDatabase()
    .prepare(
      `SELECT ${columns} FROM bookings
       WHERE room_id = ? AND starts_at < ? AND ends_at > ?
       ORDER BY starts_at`,
    )
    .all(roomId, endsAt, startsAt) as BookingRow[];

  return rows.map(toBooking);
}

export function insert(booking: NewBooking): Booking {
  const result = getDatabase()
    .prepare(
      `INSERT INTO bookings (room_id, title, booked_by, starts_at, ends_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(booking.roomId, booking.title, booking.bookedBy, booking.startsAt, booking.endsAt);

  const created = findById(Number(result.lastInsertRowid));
  if (!created) {
    throw new Error('Klarte ikke å lese tilbake bookingen som nettopp ble lagret');
  }

  return created;
}

/**
 * Skriver alle bookingene i ett INSERT-statement, slik at enten alle eller
 * ingen havner i databasen. RETURNING gir oss radene tilbake uten et nytt
 * oppslag; rekkefølgen fra RETURNING er ikke garantert, så vi sorterer selv.
 */
export function insertMany(bookings: NewBooking[]): Booking[] {
  if (bookings.length === 0) {
    return [];
  }

  const placeholders = bookings.map(() => '(?, ?, ?, ?, ?)').join(', ');
  const values = bookings.flatMap((booking) => [
    booking.roomId,
    booking.title,
    booking.bookedBy,
    booking.startsAt,
    booking.endsAt,
  ]);

  const rows = getDatabase()
    .prepare(
      `INSERT INTO bookings (room_id, title, booked_by, starts_at, ends_at)
       VALUES ${placeholders}
       RETURNING ${columns}`,
    )
    .all(...values) as BookingRow[];

  return rows.map(toBooking).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
