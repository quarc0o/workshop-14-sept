import type { FormEvent } from 'react';
import { useState } from 'react';
import * as api from '../api.ts';
import type { Room } from '../types.ts';

type Props = {
  rooms: Room[];
  onCreated: () => Promise<void>;
};

function localInputValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const WEEKDAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

function defaultTime(hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, 0, 0, 0);
  return localInputValue(date);
}

export function BookingForm({ rooms, onCreated }: Props) {
  const [roomId, setRoomId] = useState(String(rooms[0]?.id ?? ''));
  const [title, setTitle] = useState('');
  const [bookedBy, setBookedBy] = useState('');
  const [startsAt, setStartsAt] = useState(defaultTime(9));
  const [endsAt, setEndsAt] = useState(defaultTime(10));
  const [repeat, setRepeat] = useState(false);
  const [weekday, setWeekday] = useState(String(new Date(defaultTime(9)).getDay()));
  const [weeks, setWeeks] = useState('4');
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setConfirmation(null);
    setSaving(true);

    const payload = {
      roomId: Number(roomId),
      title,
      bookedBy,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
    };

    try {
      if (repeat) {
        const bookings = await api.createBookingSeries({
          ...payload,
          weekday: Number(weekday),
          weeks: Number(weeks),
        });
        setConfirmation(
          `Booked ${rooms.find((room) => room.id === payload.roomId)?.name} ${bookings.length} times.`,
        );
      } else {
        const booking = await api.createBooking(payload);
        setConfirmation(`Booked ${rooms.find((room) => room.id === booking.roomId)?.name}.`);
      }
      setTitle('');
      await onCreated();
    } catch (caught) {
      setError(caught instanceof api.ApiError ? caught.message : 'Could not reach the API');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="booking-form">
      <h2>Book a room</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Room
          <select value={roomId} onChange={(event) => setRoomId(event.target.value)}>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Meeting
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What is it about?"
            required
          />
        </label>

        <label>
          Your name
          <input
            value={bookedBy}
            onChange={(event) => setBookedBy(event.target.value)}
            placeholder="firstname.lastname"
            required
          />
        </label>

        <label>
          From
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            required
          />
        </label>

        <label>
          To
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            required
          />
        </label>

        <label className="toggle">
          <input
            type="checkbox"
            checked={repeat}
            onChange={(event) => setRepeat(event.target.checked)}
          />
          Repeat weekly
        </label>

        {repeat && (
          <>
            <label>
              Weekday
              <select value={weekday} onChange={(event) => setWeekday(event.target.value)}>
                {WEEKDAYS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Number of weeks
              <input
                type="number"
                min={1}
                max={52}
                value={weeks}
                onChange={(event) => setWeeks(event.target.value)}
                required
              />
            </label>
          </>
        )}

        <button type="submit" disabled={saving}>
          {saving ? 'Booking…' : repeat ? 'Book series' : 'Book room'}
        </button>

        {error && <p className="form-message form-error">{error}</p>}
        {confirmation && <p className="form-message form-confirmation">{confirmation}</p>}
      </form>
    </section>
  );
}
