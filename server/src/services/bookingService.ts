import { BookingConflictError, ValidationError } from '../errors.ts';
import * as bookingRepository from '../repositories/bookingRepository.ts';
import type { Booking, NewBooking, NewBookingSeries, Room } from '../types.ts';
import { getRoom } from './roomService.ts';
import { addDaysInRoomTime, formatDateInRoomTime, weekdayInRoomTime } from './roomTime.ts';

const MAX_DURATION_HOURS = 8;
const MAX_SERIES_WEEKS = 52;

export function listBookings(): Booking[] {
  return bookingRepository.findAll();
}

export function listBookingsForRoom(roomId: number): Booking[] {
  getRoom(roomId);
  return bookingRepository.findByRoom(roomId);
}

export function createBooking(input: NewBooking): Booking {
  const { booking, room } = validateBooking(input);
  assertNoOverlap(booking, room);
  return bookingRepository.insert(booking);
}

/**
 * En serie er hel eller ingenting: alle forekomstene sjekkes for overlapp
 * før noe skrives, og skrivingen skjer i ett statement.
 */
export function createBookingSeries(input: NewBookingSeries): Booking[] {
  const { booking, room } = validateBooking(input);

  if (input.weeks > MAX_SERIES_WEEKS) {
    throw new ValidationError(`A series can last at most ${MAX_SERIES_WEEKS} weeks`);
  }

  const occurrences = expandSeries(booking, input.weekday, input.weeks);

  for (const occurrence of occurrences) {
    assertNoOverlap(occurrence, room, formatDateInRoomTime(new Date(occurrence.startsAt)));
  }

  return bookingRepository.insertMany(occurrences);
}

/**
 * Forretningsreglene for én booking, i denne rekkefølgen: tomme felter,
 * gyldige tidspunkter, slutt etter start, maks varighet, rommet finnes.
 * Returnerer bookingen normalisert til UTC, klar til å lagres.
 */
function validateBooking(input: NewBooking): { booking: NewBooking; room: Room } {
  const title = input.title.trim();
  const bookedBy = input.bookedBy.trim();

  if (title.length === 0) {
    throw new ValidationError('title must not be empty');
  }
  if (bookedBy.length === 0) {
    throw new ValidationError('bookedBy must not be empty');
  }

  const startsAt = parseTimestamp(input.startsAt, 'startsAt');
  const endsAt = parseTimestamp(input.endsAt, 'endsAt');

  if (endsAt <= startsAt) {
    throw new ValidationError('endsAt must be after startsAt');
  }

  const durationHours = (endsAt.getTime() - startsAt.getTime()) / 3_600_000;
  if (durationHours > MAX_DURATION_HOURS) {
    throw new ValidationError(`A booking can last at most ${MAX_DURATION_HOURS} hours`);
  }

  const room = getRoom(input.roomId);

  return {
    room,
    booking: {
      roomId: room.id,
      title,
      bookedBy,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    },
  };
}

function assertNoOverlap(booking: NewBooking, room: Room, date?: string): void {
  const overlapping = bookingRepository.findOverlapping(
    booking.roomId,
    booking.startsAt,
    booking.endsAt,
  );

  if (overlapping.length > 0) {
    const when = date ? `on ${date}` : 'the selected time';
    throw new BookingConflictError(`${room.name} already has a booking that overlaps ${when}`);
  }
}

/**
 * Første forekomst er den første dagen på eller etter startsAt som faller på
 * ønsket ukedag. Deretter sju dager om gangen. Dagene telles i rommets
 * tidssone, slik at klokkeslettet står fast gjennom sommertidsskiftene.
 */
function expandSeries(template: NewBooking, weekday: number, weeks: number): NewBooking[] {
  const start = new Date(template.startsAt);
  const end = new Date(template.endsAt);
  const daysUntilFirst = (weekday - weekdayInRoomTime(start) + 7) % 7;

  const occurrences: NewBooking[] = [];
  for (let week = 0; week < weeks; week++) {
    const offset = daysUntilFirst + week * 7;
    occurrences.push({
      ...template,
      startsAt: addDaysInRoomTime(start, offset).toISOString(),
      endsAt: addDaysInRoomTime(end, offset).toISOString(),
    });
  }
  return occurrences;
}

function parseTimestamp(value: string, field: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${field} must be a valid ISO 8601 timestamp`);
  }
  return date;
}
