import { useEffect, useState } from 'react';
import api from '../../api/client';
import type { Slot } from '../../types';
import { useBooking } from '../../context/BookingContext';
import LoadingSpinner from '../shared/LoadingSpinner';

export default function SlotGrid() {
  const { state, setSlot } = useBooking();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!state.barber || !state.date || !state.service) return;
    setLoading(true);
    api
      .get<{ slots: Slot[] }>(`/barbers/${state.barber.id}/slots`, {
        params: { date: state.date, serviceId: state.service.id },
      })
      .then(r => {
        setSlots(r.data.slots);
        setLoading(false);
      });
  }, [state.barber, state.date, state.service]);

  if (!state.date) return <p className="text-muted text-sm text-center py-4">Seleccioná una fecha para ver los horarios disponibles.</p>;
  if (loading) return <LoadingSpinner text="Cargando horarios..." />;

  const available = slots.filter(s => s.available);

  if (available.length === 0)
    return (
      <div className="text-center py-8 text-muted">
        <p className="text-3xl mb-2">📅</p>
        <p>No hay horarios disponibles para este día.</p>
        <p className="text-sm mt-1">Probá con otra fecha u otro estilista.</p>
      </div>
    );

  const byHour = slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    const hour = slot.start.split(':')[0] + ':00';
    if (!acc[hour]) acc[hour] = [];
    acc[hour].push(slot);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(byHour).map(([hour, group]) => {
        const hasAvailable = group.some(s => s.available);
        if (!hasAvailable) return null;
        return (
          <div key={hour}>
            <p className="text-xs text-muted mb-2 font-medium">{hour}</p>
            <div className="flex flex-wrap gap-2">
              {group.map(slot => (
                <button
                  key={slot.start}
                  disabled={!slot.available}
                  onClick={() => setSlot(slot)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150
                    ${slot.available
                      ? 'border-border hover:border-primary hover:bg-primary/10 hover:text-primary text-white cursor-pointer'
                      : 'border-border/30 text-muted/30 cursor-not-allowed'
                    }`}
                >
                  {slot.start}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
