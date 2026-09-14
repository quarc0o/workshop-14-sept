import type { Booking, NewBooking, NewBookingSeries, Room } from './types.ts';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, payload?.error?.message ?? 'The request failed');
  }

  return payload as T;
}

export function listRooms(): Promise<Room[]> {
  return request<Room[]>('/api/rooms');
}

export function listBookings(): Promise<Booking[]> {
  return request<Booking[]>('/api/bookings');
}

export function createBooking(booking: NewBooking): Promise<Booking> {
  return request<Booking>('/api/bookings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(booking),
  });
}

export function createBookingSeries(series: NewBookingSeries): Promise<Booking[]> {
  return request<Booking[]>('/api/bookings/series', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(series),
  });
}
