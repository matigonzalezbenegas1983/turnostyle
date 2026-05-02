export interface Service {
  id: number;
  name: string;
  duration_min: number;
  price_cents: number;
}

export interface Barber {
  id: number;
  name: string;
}

export interface Slot {
  start: string;
  end: string;
  available: boolean;
}

export interface Appointment {
  id: number;
  barber_id: number;
  service_id: number;
  customer_name: string;
  customer_phone: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  barberName?: string;
  serviceName?: string;
  serviceDuration?: number;
  service_name?: string;
  duration_min?: number;
  price_cents?: number;
}

export interface AdminSchedule {
  date: string;
  barbers: Array<{
    id: number;
    name: string;
    appointments: Appointment[];
  }>;
}

export type BookingStep = 1 | 2 | 3 | 4;

export interface BookingState {
  step: BookingStep;
  service: Service | null;
  barber: Barber | null;
  date: string;
  slot: Slot | null;
  customerName: string;
  customerPhone: string;
}
