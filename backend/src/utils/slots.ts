import { getDb } from '../db/database';
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

export function getAvailableSlots(
  barberId: number,
  date: string,
  durationMin: number,
  excludeAppointmentId?: number
): Slot[] {
  const db = getDb();

  let query = `
    SELECT start_time, end_time FROM appointments
    WHERE barber_id = ? AND date = ? AND status = 'scheduled'
  `;
  const params: (number | string)[] = [barberId, date];

  if (excludeAppointmentId !== undefined) {
    query += ' AND id != ?';
    params.push(excludeAppointmentId);
  }

  const existing = db.prepare(query).all(...params) as ExistingAppt[];

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

export function isSlotAvailable(
  barberId: number,
  date: string,
  startTime: string,
  durationMin: number,
  excludeAppointmentId?: number
): boolean {
  const slots = getAvailableSlots(barberId, date, durationMin, excludeAppointmentId);
  return slots.some(s => s.start === startTime && s.available);
}

export function calcEndTime(startTime: string, durationMin: number): string {
  return addMinutes(startTime, durationMin);
}
