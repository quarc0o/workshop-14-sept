import type { Request, Response } from 'express';
import { z } from 'zod';
import * as bookingService from '../services/bookingService.ts';
import { parseBody, parseNumericParam } from './validation.ts';

const newBookingSchema = z.object({
  roomId: z.number().int().positive(),
  title: z.string(),
  bookedBy: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
});

const newBookingSeriesSchema = newBookingSchema.extend({
  weekday: z.number().int().min(0).max(6),
  weeks: z.number().int().positive(),
});

export function list(_req: Request, res: Response): void {
  res.json(bookingService.listBookings());
}

export function listForRoom(req: Request, res: Response): void {
  const roomId = parseNumericParam(req.params.id, 'id');
  res.json(bookingService.listBookingsForRoom(roomId));
}

export function create(req: Request, res: Response): void {
  const booking = bookingService.createBooking(parseBody(newBookingSchema, req.body));
  res.status(201).json(booking);
}

export function createSeries(req: Request, res: Response): void {
  const bookings = bookingService.createBookingSeries(parseBody(newBookingSeriesSchema, req.body));
  res.status(201).json(bookings);
}
