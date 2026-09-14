import { Router } from 'express';
import * as bookingController from '../controllers/bookingController.ts';

export const bookingRoutes = Router();

bookingRoutes.get('/', bookingController.list);
bookingRoutes.post('/', bookingController.create);
bookingRoutes.post('/series', bookingController.createSeries);
