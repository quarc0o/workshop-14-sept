export type Room = {
  id: number;
  name: string;
  floor: number;
  capacity: number;
};

export type Booking = {
  id: number;
  roomId: number;
  title: string;
  bookedBy: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
};

export type NewBooking = {
  roomId: number;
  title: string;
  bookedBy: string;
  startsAt: string;
  endsAt: string;
};

export type NewBookingSeries = NewBooking & {
  /** 0 = søndag … 6 = lørdag, som Date.getDay() */
  weekday: number;
  weeks: number;
};
