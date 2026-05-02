import { useState } from 'react';
import { format, addDays, startOfDay, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { useBooking } from '../../context/BookingContext';

const DAYS_AHEAD = 30;

export default function DatePicker() {
  const { state, setDate, setStep } = useBooking();
  const today = startOfDay(new Date());
  const [selected, setSelected] = useState<Date | null>(state.date ? new Date(state.date + 'T12:00:00') : null);

  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i));

  const handleSelect = (d: Date) => {
    setSelected(d);
    setDate(format(d, 'yyyy-MM-dd'));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {days.map(d => {
          const isSelected = selected && format(d, 'yyyy-MM-dd') === format(selected, 'yyyy-MM-dd');
          const isPast = isBefore(d, today);
          return (
            <button
              key={d.toISOString()}
              disabled={isPast}
              onClick={() => handleSelect(d)}
              className={`flex flex-col items-center py-3 px-1 rounded-lg border transition-all duration-150 cursor-pointer
                ${isSelected
                  ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30'
                  : 'border-border hover:border-primary/50 hover:bg-surface text-muted hover:text-white'
                }
                disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              <span className="text-xs uppercase">{format(d, 'EEE', { locale: es })}</span>
              <span className="text-lg font-bold">{format(d, 'd')}</span>
              <span className="text-xs">{format(d, 'MMM', { locale: es })}</span>
            </button>
          );
        })}
      </div>
      <button onClick={() => setStep(2)} className="btn-ghost text-sm">← Volver</button>
    </div>
  );
}
