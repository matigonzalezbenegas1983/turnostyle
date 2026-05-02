import type { Appointment, Barber } from '../../types';
import AppointmentCard from './AppointmentCard';

const OPEN_HOUR = 9;
const CLOSE_HOUR = 20;
const TOTAL_MIN = (CLOSE_HOUR - OPEN_HOUR) * 60;
const PX_PER_MIN = 1.5;
const TIMELINE_HEIGHT = TOTAL_MIN * PX_PER_MIN;
const OPEN_MIN = OPEN_HOUR * 60;

const hours = Array.from({ length: CLOSE_HOUR - OPEN_HOUR + 1 }, (_, i) => OPEN_HOUR + i);

interface Props {
  barber: Barber & { appointments: Appointment[] };
  onUpdate: () => void;
}

export default function DayTimeline({ barber, onUpdate }: Props) {
  return (
    <div className="flex-1 min-w-[140px]">
      <div className="sticky top-14 z-10 bg-surface border-b border-border px-2 py-2 text-center">
        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm mx-auto mb-1">
          {barber.name.charAt(0)}
        </div>
        <p className="text-xs font-medium text-white truncate">{barber.name}</p>
        <p className="text-[10px] text-muted">{barber.appointments.filter(a => a.status === 'scheduled').length} pendientes</p>
      </div>

      <div className="relative border-l border-border" style={{ height: TIMELINE_HEIGHT }}>
        {hours.map(h => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t border-border/40"
            style={{ top: (h - OPEN_HOUR) * 60 * PX_PER_MIN }}
          />
        ))}

        {barber.appointments.map(appt => (
          <AppointmentCard
            key={appt.id}
            appt={appt}
            pixelsPerMin={PX_PER_MIN}
            openMin={OPEN_MIN}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </div>
  );
}
