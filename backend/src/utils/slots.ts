import { getPool } from '../db/database';
import { timeToMinutes, minutesToTime, addMinutes, todayDate, nowTime } from './timeUtils';

const OPEN_MIN = 9 * 60;   // 09:00
const CLOSE_MIN = 20 * 60; // 20:00
const GRANULARITY = 15;

interface ExistingAppt {
  start_time: string;
  end_time: string;
}

export interface Slot {
  start: string;
  end: string;
  available: boolean;
}

/** Pure calculation — no DB access */
export function computeSlots(
  existing: ExistingAppt[],
  durationMin: number,
  date: string
): Slot[] {
  const isToday = date === todayDate();
  const nowMin = isToday ? timeToMinutes(nowTime()) + 5 : 0;

  const slots: Slot[] = [];
  let cursor = OPEN_MIN;

  while (cursor + durationMin <= CLOSE_MIN) {
    const slotStart = cursor;
    const slotEnd = cursor + durationMin;

    const overlaps = existing.some(appt => {
      const s = timeToMinutes(appt.start_time);
      const e = timeToMinutes(appt.end_time);
      return slotStart < e && slotEnd > s;
    });

    const isPast = isToday && slotStart < nowMin;

    slots.push({
      start: minutesToTime(slotStart),
      end: minutesToTime(slotEnd),
      available: !overlaps && !isPast,
    });

    cursor += GRANULARITY;
  }

  return slots;
}

/** Check availability from already-fetched rows (use this inside transactions) */
export function isSlotAvailableFromRows(
  rows: ExistingAppt[],
  date: string,
  startTime: string,
  durationMin: number
): boolean {
  return computeSlots(rows, durationMin, date).some(
    s => s.start === startTime && s.available
  );
}

export async function getAvailableSlots(
  barberId: number,
  date: string,
  durationMin: number,
  excludeAppointmentId?: number
): Promise<Slot[]> {
  const pool = getPool();
  const params: (number | string)[] = [barberId, date];
  let query = `
    SELECT start_time, end_time FROM appointments
    WHERE barber_id = $1 AND date = $2 AND status = 'scheduled'
  `;
  if (excludeAppointmentId !== undefined) {
    params.push(excludeAppointmentId);
    query += ` AND id != $${params.length}`;
  }
  const { rows } = await pool.query(query, params);
  return computeSlots(rows as ExistingAppt[], durationMin, date);
}

export async function isSlotAvailable(
  barberId: number,
  date: string,
  startTime: string,
  durationMin: number,
  excludeAppointmentId?: number
): Promise<boolean> {
  const slots = await getAvailableSlots(barberId, date, durationMin, excludeAppointmentId);
  return slots.some(s => s.start === startTime && s.available);
}

export function calcEndTime(startTime: string, durationMin: number): string {
  return addMinutes(startTime, durationMin);
}
