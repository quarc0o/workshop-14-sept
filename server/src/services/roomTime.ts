/**
 * Rommene står i Oslo og flytter seg ikke. Når en serie skal falle på samme
 * klokkeslett hver uke, er det veggklokka i denne tidssonen som er fasit,
 * ikke UTC. Databasen og API-et lagrer fortsatt UTC; denne modulen brukes
 * bare når vi regner ut neste forekomst.
 */
export const ROOM_TIME_ZONE = 'Europe/Oslo';

type WallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  weekday: number;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: ROOM_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  weekday: 'short',
});

function toWallClock(instant: Date): WallClock {
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== 'literal') {
      parts[part.type] = part.value;
    }
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    millisecond: instant.getUTCMilliseconds(),
    weekday: WEEKDAYS.indexOf(parts.weekday ?? ''),
  };
}

function wallClockAsUtcMillis(clock: Omit<WallClock, 'weekday'>): number {
  return Date.UTC(
    clock.year,
    clock.month - 1,
    clock.day,
    clock.hour,
    clock.minute,
    clock.second,
    clock.millisecond,
  );
}

/**
 * Finner UTC-instansen som viser denne veggklokka i romtidssonen. Vi gjetter
 * først at veggklokka er UTC, ser hva den gjetningen viser i Oslo, og
 * justerer med differansen. To runder holder også rundt sommertidsskiftene.
 */
function fromWallClock(clock: Omit<WallClock, 'weekday'>): Date {
  const wanted = wallClockAsUtcMillis(clock);
  let guess = wanted;
  for (let round = 0; round < 2; round++) {
    const seen = wallClockAsUtcMillis(toWallClock(new Date(guess)));
    guess += wanted - seen;
  }
  return new Date(guess);
}

/** Ukedag i romtidssonen, 0 = søndag … 6 = lørdag. */
export function weekdayInRoomTime(instant: Date): number {
  return toWallClock(instant).weekday;
}

/** Legger til hele dager og beholder veggklokka i romtidssonen, også over sommertid. */
export function addDaysInRoomTime(instant: Date, days: number): Date {
  const clock = toWallClock(instant);
  const shifted = new Date(wallClockAsUtcMillis({ ...clock, day: clock.day + days }));
  return fromWallClock({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: clock.hour,
    minute: clock.minute,
    second: clock.second,
    millisecond: clock.millisecond,
  });
}

/** Dato i romtidssonen som YYYY-MM-DD, til bruk i feilmeldinger. */
export function formatDateInRoomTime(instant: Date): string {
  const clock = toWallClock(instant);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${clock.year}-${pad(clock.month)}-${pad(clock.day)}`;
}
