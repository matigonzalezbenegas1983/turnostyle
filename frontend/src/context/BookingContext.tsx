import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { BookingState, BookingStep, Service, Barber, Slot } from '../types';

interface BookingContextValue {
  state: BookingState;
  setStep: (step: BookingStep) => void;
  setService: (s: Service) => void;
  setBarber: (b: Barber) => void;
  setDate: (d: string) => void;
  setSlot: (s: Slot) => void;
  setCustomer: (name: string, phone: string) => void;
  reset: () => void;
}

const initial: BookingState = {
  step: 1,
  service: null,
  barber: null,
  date: '',
  slot: null,
  customerName: '',
  customerPhone: '',
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BookingState>(initial);

  const setStep = (step: BookingStep) => setState(s => ({ ...s, step }));
  const setService = (service: Service) => setState(s => ({ ...s, service, barber: null, date: '', slot: null, step: 2 }));
  const setBarber = (barber: Barber) => setState(s => ({ ...s, barber, date: '', slot: null, step: 3 }));
  const setDate = (date: string) => setState(s => ({ ...s, date, slot: null }));
  const setSlot = (slot: Slot) => setState(s => ({ ...s, slot, step: 4 }));
  const setCustomer = (customerName: string, customerPhone: string) =>
    setState(s => ({ ...s, customerName, customerPhone }));
  const reset = () => setState(initial);

  return (
    <BookingContext.Provider value={{ state, setStep, setService, setBarber, setDate, setSlot, setCustomer, reset }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be inside BookingProvider');
  return ctx;
}
