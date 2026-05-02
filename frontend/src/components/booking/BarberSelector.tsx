import { useEffect, useState } from 'react';
import api from '../../api/client';
import type { Barber } from '../../types';
import { useBooking } from '../../context/BookingContext';
import LoadingSpinner from '../shared/LoadingSpinner';

export default function BarberSelector() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const { setBarber, setStep } = useBooking();

  useEffect(() => {
    api.get<Barber[]>('/barbers').then(r => {
      setBarbers(r.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {barbers.map(b => (
          <button
            key={b.id}
            onClick={() => setBarber(b)}
            className="card text-left hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 transition-all duration-200 cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold">
                {b.name.charAt(0)}
              </div>
              <span className="font-medium text-white group-hover:text-primary transition-colors">{b.name}</span>
            </div>
          </button>
        ))}
      </div>
      <button onClick={() => setStep(1)} className="btn-ghost text-sm">← Volver</button>
    </div>
  );
}
