import { useEffect, useState } from 'react';
import api from '../../api/client';
import type { Service } from '../../types';
import { useBooking } from '../../context/BookingContext';
import LoadingSpinner from '../shared/LoadingSpinner';

export default function ServiceSelector() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const { setService } = useBooking();

  useEffect(() => {
    api.get<Service[]>('/services').then(r => {
      setServices(r.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSpinner />;

  if (services.length === 0)
    return (
      <div className="text-center py-12 text-muted">
        <p className="text-4xl mb-3">✦</p>
        <p>No hay servicios disponibles por el momento.</p>
        <p className="text-sm mt-1">Volvé más tarde o contactá al local.</p>
      </div>
    );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {services.map(svc => (
        <button
          key={svc.id}
          onClick={() => setService(svc)}
          className="card text-left hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-white group-hover:text-primary transition-colors">{svc.name}</h3>
            {svc.price_cents > 0 && (
              <span className="text-cyan text-sm font-medium">${(svc.price_cents / 100).toFixed(0)}</span>
            )}
          </div>
          <p className="text-muted text-sm">{svc.duration_min} minutos</p>
        </button>
      ))}
    </div>
  );
}
