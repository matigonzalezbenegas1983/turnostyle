import api from '../../api/client';
import type { Appointment } from '../../types';

interface Props {
  appt: Appointment;
  pixelsPerMin: number;
  openMin: number;
  onUpdate: () => void;
}

export default function AppointmentCard({ appt, pixelsPerMin, openMin, onUpdate }: Props) {
  const startMin = timeToMin(appt.start_time);
  const endMin = timeToMin(appt.end_time);
  const top = (startMin - openMin) * pixelsPerMin;
  const height = Math.max((endMin - startMin) * pixelsPerMin, 24);

  const statusColors: Record<string, string> = {
    scheduled: 'bg-primary/20 border-primary/50 text-white',
    completed: 'bg-surface border-border text-muted line-through',
    cancelled: 'bg-red-900/20 border-red-800/50 text-red-400 line-through',
  };

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Cancelar turno de ${appt.customer_name}?`)) return;
    await api.patch(`/admin/appointments/${appt.id}/cancel`);
    onUpdate();
  };

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await api.patch(`/admin/appointments/${appt.id}/complete`);
    onUpdate();
  };

  return (
    <div
      className={`absolute left-1 right-1 rounded-lg border p-1.5 overflow-hidden text-xs transition-all
        ${statusColors[appt.status] ?? statusColors.scheduled}`}
      style={{ top, height }}
    >
      <p className="font-semibold leading-tight truncate">{appt.customer_name}</p>
      <p className="text-[10px] opacity-70 truncate">{appt.service_name ?? appt.serviceName}</p>
      <p className="text-[10px] opacity-70">{appt.start_time} – {appt.end_time}</p>

      {appt.status === 'scheduled' && height >= 56 && (
        <div className="flex gap-1 mt-1">
          <button onClick={handleComplete} className="flex-1 bg-primary/30 hover:bg-primary/50 rounded px-1 py-0.5 text-[10px] text-primary transition-colors">✓</button>
          <button onClick={handleCancel} className="flex-1 bg-red-900/30 hover:bg-red-900/50 rounded px-1 py-0.5 text-[10px] text-red-400 transition-colors">✕</button>
        </div>
      )}
    </div>
  );
}

function timeToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
